// ============================================
// Cloudflare Pages Function — processa callback OAuth2 do Discord
// Rota: GET /admin/oauth-callback
//
// Esta função:
//   1. Recebe ?code=xxx&state=yyy do Discord
//   2. Valida state CSRF contra cookie oauth_state
//   3. Troca code por access_token (POST pra Discord com client_secret)
//   4. Busca /users/@me e /users/@me/guilds
//   5. Filtra só guilds onde o user é admin (owner OU permissão ADMINISTRATOR/MANAGE_GUILD)
//   6. Se 0 guilds admin → redirect pro login com erro "sem_admin"
//   7. Cria JWT assinado HMAC-SHA256 com payload {uid, username, avatar, guilds, iat, exp}
//   8. Seta cookie httpOnly starbot_admin_session (7 dias)
//   9. Redireciona pra /admin/setup-avancado.html
//
// SEGURANÇA:
//   - access_token do Discord NUNCA vai pro frontend (só JWT interno)
//   - JWT assinado com JWT_SECRET (HMAC-SHA256) — não dá pra forjar sem o secret
//   - State CSRF com 32 bytes aleatórios, validado contra cookie httpOnly
//   - Cookies httpOnly + Secure + SameSite=Lax
//   - Headers de segurança (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
//   - Rate limit: 10 tentativas por IP a cada 15 min (implementado via Cloudflare WAF)
// ============================================

const DISCORD_TOKEN_URL = 'https://discord.com/api/v10/oauth2/token';
const DISCORD_API_BASE = 'https://discord.com/api/v10';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 dias

function applySecurityHeaders(res) {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return res;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Usuário cancelou login no Discord
  if (error) {
    console.warn('[oauth-callback] Usuário cancelou login:', error);
    return redirectToLogin(url.origin, error);
  }

  // Validações defensivas
  if (!code || !state) {
    console.warn('[oauth-callback] Parâmetros faltando: code=' + !!code + ' state=' + !!state);
    return redirectToLogin(url.origin, 'parametros_invalidos');
  }

  // Valida variáveis de ambiente
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.DISCORD_REDIRECT_URI || !env.JWT_SECRET) {
    console.error('[oauth-callback] Variáveis de ambiente faltando:', {
      clientId: !!env.DISCORD_CLIENT_ID,
      clientSecret: !!env.DISCORD_CLIENT_SECRET,
      redirectUri: !!env.DISCORD_REDIRECT_URI,
      jwtSecret: !!env.JWT_SECRET,
    });
    return applySecurityHeaders(new Response('OAuth2 não configurado no servidor. Contate o administrador.', { status: 500 }));
  }

  // ── ETAPA 1: Verifica state CSRF contra cookie ──
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const storedState = cookies.oauth_state;

  if (!storedState) {
    console.warn('[oauth-callback] Cookie oauth_state ausente');
    return redirectToLogin(url.origin, 'estado_ausente');
  }

  if (storedState !== state) {
    console.warn('[oauth-callback] State CSRF mismatch');
    return redirectToLogin(url.origin, 'estado_invalido');
  }

  try {
    // ── ETAPA 2: Troca code por access_token ──
    const tokenBody = new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.DISCORD_REDIRECT_URI,
    });

    const tokenRes = await fetch(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('[oauth-callback] Token exchange falhou:', tokenRes.status, errBody);
      return redirectToLogin(url.origin, 'token_falhou');
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('[oauth-callback] access_token ausente na resposta do Discord');
      return redirectToLogin(url.origin, 'token_ausente');
    }

    // ── ETAPA 3: Busca user + guilds em paralelo ──
    const [userRes, guildsRes] = await Promise.all([
      fetch(`${DISCORD_API_BASE}/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    if (!userRes.ok || !guildsRes.ok) {
      console.error('[oauth-callback] Fetch user/guilds falhou:', userRes.status, guildsRes.status);
      return redirectToLogin(url.origin, 'fetch_user');
    }

    const discordUser = await userRes.json();
    const allGuilds = await guildsRes.json();

    if (!discordUser || !discordUser.id || !Array.isArray(allGuilds)) {
      console.error('[oauth-callback] Resposta inválida do Discord');
      return redirectToLogin(url.origin, 'resposta_invalida');
    }

    // ── ETAPA 4: Filtra só guilds onde o user é admin ──
    // Discord retorna permissions como string de bits. Checamos:
    //   - g.owner === true → dono do servidor
    //   - (perms & 0x8) → ADMINISTRATOR (todas as permissões)
    //   - (perms & 0x20) → MANAGE_GUILD (gerenciar servidor)
    const adminGuilds = allGuilds
      .filter(g => {
        try {
          if (g.owner) return true;
          const perms = BigInt(g.permissions ?? '0');
          return (perms & 0x8n) === 0x8n || (perms & 0x20n) === 0x20n;
        } catch {
          return false;
        }
      })
      .map(g => ({ id: g.id, name: g.name, icon: g.icon }))
      .slice(0, 50); // limita a 50 guilds no JWT (evita JWT muito grande)

    // Se não é admin em nenhum servidor, bloqueia
    if (adminGuilds.length === 0) {
      console.warn(`[oauth-callback] User ${discordUser.username} (${discordUser.id}) não é admin de nenhum servidor`);
      return redirectToLogin(url.origin, 'sem_admin');
    }

    // ── ETAPA 5: Cria JWT assinado ──
    const payload = {
      uid: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar || null,
      guilds: adminGuilds,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };

    const jwt = await createJWT(payload, env.JWT_SECRET);

    console.log(`[oauth-callback] Login OK: ${discordUser.username} (${discordUser.id}) — ${adminGuilds.length} guilds admin`);

    // ── ETAPA 6: Seta cookie httpOnly + redireciona pro admin ──
    const res = new Response(null, {
      status: 302,
      headers: {
        Location: '/admin/setup-avancado.html',
        // Seta cookie de sessão (7 dias) + limpa cookie oauth_state
        'Set-Cookie': [
          `starbot_admin_session=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`,
          `oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
        ].join(', '),
      },
    });

    return applySecurityHeaders(res);
  } catch (err) {
    console.error('[oauth-callback] Erro inesperado:', err);
    return redirectToLogin(url.origin, 'interno');
  }
}

// ── Helpers ──

function redirectToLogin(origin, erro) {
  const res = new Response(null, {
    status: 302,
    headers: {
      Location: `/admin/login.html?erro=${encodeURIComponent(erro)}`,
      // Limpa cookie oauth_state (já foi usado ou é inválido)
      'Set-Cookie': 'oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
  return applySecurityHeaders(res);
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const k = pair.slice(0, idx).trim();
    const v = pair.slice(idx + 1).trim();
    if (k) cookies[k] = v;
  }
  return cookies;
}

async function createJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const enc = (obj) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  const headerB64 = enc(header);
  const payloadB64 = enc(payload);
  const data = `${headerB64}.${payloadB64}`;

  // Importa chave secreta pra HMAC
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  // Assina
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${sigB64}`;
}
