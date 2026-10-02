// ============================================
// Cloudflare Worker — Starbot Docs
// Servidor único que:
//   1. Processa rotas OAuth2 do Discord (/admin/oauth-*)
//   2. Serve arquivos estáticos (HTML/CSS/JS/imagens)
//   3. Protege rotas /admin/* (exceto as públicas)
//
// IMPORTANTE: Este Worker usa assets binding pra servir estáticos.
// O wrangler.toml DEVE ter:
//   [assets]
//   directory = "."
//   binding = "ASSETS"
// ============================================

import { verifyJWT, createJWT } from './jwt.js';

const DISCORD_AUTH_URL = 'https://discord.com/oauth2/authorize';
const DISCORD_TOKEN_URL = 'https://discord.com/api/v10/oauth2/token';
const DISCORD_API_BASE = 'https://discord.com/api/v10';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

// Rotas públicas (não exigem login)
const PUBLIC_PATHS = new Set([
  '/admin/login.html',
  '/admin/oauth-login',
  '/admin/oauth-callback',
  '/admin/oauth-logout',
]);

// MIME types para arquivos estáticos
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

// Aplica headers de segurança (equivalente ao helmet)
function applySecurityHeaders(headers) {
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return headers;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const headers = new Headers();

    // ── Roteamento OAuth2 ──
    if (path === '/admin/oauth-login') {
      return handleOAuthLogin(request, env);
    }
    if (path === '/admin/oauth-callback') {
      return handleOAuthCallback(request, env);
    }
    if (path === '/admin/oauth-logout') {
      return handleOAuthLogout(request, env);
    }
    if (path === '/admin/api/me') {
      return handleApiMe(request, env);
    }

    // ── Proteção de rotas admin ──
    if (path.startsWith('/admin/') && !PUBLIC_PATHS.has(path)) {
      const user = await getAuthenticatedUser(request, env);
      if (!user) {
        const returnUrl = encodeURIComponent(path + url.search);
        return Response.redirect(`${url.origin}/admin/login.html?redirect=${returnUrl}`, 302);
      }
      // User autenticado — injeta no request pra páginas downstream usarem
      // (no caso de assets, isso não é necessário, mas mantemos pra consistência)
    }

    // ── Servir arquivos estáticos via ASSETS binding ──
    // O ASSETS binding vem do wrangler.toml [assets]
    if (env.ASSETS) {
      try {
        // Tenta servir o arquivo diretamente
        const assetUrl = new URL(request.url);
        // Se não tem extensão e é um path de diretório, tenta index.html
        if (!path.includes('.') || path.endsWith('/')) {
          const indexPath = path.endsWith('/') ? path + 'index.html' : path + '/index.html';
          const assetReq = new Request(new URL(indexPath, assetUrl), request);
          const response = await env.ASSETS.fetch(assetReq);
          if (response.status === 200) {
            const newHeaders = applySecurityHeaders(new Headers(response.headers));
            return new Response(response.body, { status: response.status, headers: newHeaders });
          }
        }

        // Tenta o path original + .html (clean URLs)
        if (!path.includes('.')) {
          const htmlPath = path + '.html';
          const assetReq = new Request(new URL(htmlPath, assetUrl), request);
          const response = await env.ASSETS.fetch(assetReq);
          if (response.status === 200) {
            const newHeaders = applySecurityHeaders(new Headers(response.headers));
            return new Response(response.body, { status: response.status, headers: newHeaders });
          }
        }

        // Path original direto
        const assetReq = new Request(request.url, request);
        const response = await env.ASSETS.fetch(assetReq);
        if (response.status === 200) {
          const newHeaders = applySecurityHeaders(new Headers(response.headers));
          return new Response(response.body, { status: response.status, headers: newHeaders });
        }

        // 404 — retorna página 404 customizada ou mensagem
        return applySecurityHeaders(new Headers()).get('x-content-type-options');
      } catch (err) {
        console.error('[ASSETS] Erro ao servir estático:', err);
      }
    }

    // Fallback: 404
    return new Response('Not Found', { status: 404 });
  },
};

// ============================================
// OAuth2 Handlers
// ============================================

async function handleOAuthLogin(request, env) {
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_REDIRECT_URI) {
    console.error('[oauth-login] Variáveis faltando:', {
      hasClientId: !!env.DISCORD_CLIENT_ID,
      hasRedirectUri: !!env.DISCORD_REDIRECT_URI,
    });
    return jsonResponse({ error: 'OAuth2 não configurado' }, 500);
  }

  // Gera state CSRF (32 bytes hex)
  const stateBytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(stateBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds',
    state,
    prompt: 'consent',
  });

  const res = new Response(null, {
    status: 302,
    headers: {
      Location: `${DISCORD_AUTH_URL}?${params}`,
      'Set-Cookie': `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
  applySecurityHeaders(res.headers);
  return res;
}

async function handleOAuthCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  if (error) {
    return redirectToLogin(url.origin, error);
  }
  if (!code || !state) {
    return redirectToLogin(url.origin, 'parametros_invalidos');
  }

  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.DISCORD_REDIRECT_URI || !env.JWT_SECRET) {
    console.error('[oauth-callback] Variáveis faltando:', {
      clientId: !!env.DISCORD_CLIENT_ID,
      clientSecret: !!env.DISCORD_CLIENT_SECRET,
      redirectUri: !!env.DISCORD_REDIRECT_URI,
      jwtSecret: !!env.JWT_SECRET,
    });
    return jsonResponse({ error: 'OAuth2 não configurado' }, 500);
  }

  // Verifica state CSRF
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const storedState = cookies.oauth_state;
  if (!storedState || storedState !== state) {
    console.warn('[oauth-callback] State CSRF inválido');
    return redirectToLogin(url.origin, 'estado_invalido');
  }

  try {
    // Troca code por access_token
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
      console.error('[oauth-callback] Token exchange falhou:', tokenRes.status);
      return redirectToLogin(url.origin, 'token_falhou');
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return redirectToLogin(url.origin, 'token_ausente');
    }

    // Busca user + guilds
    const [userRes, guildsRes] = await Promise.all([
      fetch(`${DISCORD_API_BASE}/users/@me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    ]);

    if (!userRes.ok || !guildsRes.ok) {
      return redirectToLogin(url.origin, 'fetch_user');
    }

    const discordUser = await userRes.json();
    const allGuilds = await guildsRes.json();

    if (!discordUser?.id || !Array.isArray(allGuilds)) {
      return redirectToLogin(url.origin, 'resposta_invalida');
    }

    // Filtra só guilds admin
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
      .slice(0, 50);

    if (adminGuilds.length === 0) {
      console.warn(`[oauth-callback] User ${discordUser.username} não é admin`);
      return redirectToLogin(url.origin, 'sem_admin');
    }

    // Cria JWT
    const payload = {
      uid: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar || null,
      guilds: adminGuilds,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };

    const jwt = await createJWT(payload, env.JWT_SECRET);

    console.log(`[oauth-callback] Login OK: ${discordUser.username} — ${adminGuilds.length} guilds`);

    const res = new Response(null, {
      status: 302,
      headers: {
        Location: '/admin/setup-avancado.html',
        'Set-Cookie': [
          `starbot_admin_session=${jwt}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`,
          `oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
        ].join(', '),
      },
    });
    applySecurityHeaders(res.headers);
    return res;
  } catch (err) {
    console.error('[oauth-callback] Erro:', err);
    return redirectToLogin(url.origin, 'interno');
  }
}

async function handleOAuthLogout(request, env) {
  const res = new Response(null, {
    status: 302,
    headers: {
      Location: '/admin/login.html?success=logout',
      'Set-Cookie': 'starbot_admin_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
  applySecurityHeaders(res.headers);
  return res;
}

async function handleApiMe(request, env) {
  const user = await getAuthenticatedUser(request, env);
  if (!user) {
    return jsonResponse({ error: 'Não autenticado' }, 401);
  }

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.uid}/${user.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${Number(user.uid) % 5}.png`;

  return jsonResponse({
    id: user.uid,
    username: user.username,
    avatarUrl,
    guilds: user.guilds || [],
  });
}

// ============================================
// Helpers
// ============================================

async function getAuthenticatedUser(request, env) {
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const sessionCookie = cookies.starbot_admin_session;
  if (!sessionCookie || !env.JWT_SECRET) return null;
  return await verifyJWT(sessionCookie, env.JWT_SECRET);
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

function redirectToLogin(origin, erro) {
  const res = new Response(null, {
    status: 302,
    headers: {
      Location: `/admin/login.html?erro=${encodeURIComponent(erro)}`,
      'Set-Cookie': 'oauth_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
  applySecurityHeaders(res.headers);
  return res;
}

function jsonResponse(data, status = 200) {
  const res = new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
  applySecurityHeaders(res.headers);
  return res;
}
