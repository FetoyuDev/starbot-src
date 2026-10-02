// ============================================
// Cloudflare Pages Function — inicia login OAuth2 do Discord
// Rota: GET /admin/oauth-login
//
// Esta função:
//   1. Gera state CSRF aleatório (32 bytes hex)
//   2. Salva state em cookie httpOnly (10 min de validade)
//   3. Redireciona pro Discord com client_id + redirect_uri + scopes
//
// Headers de segurança aplicados (equivalente ao helmet no Express):
//   - X-Frame-Options: DENY          (clickjacking)
//   - X-Content-Type-Options: nosniff (MIME sniffing)
//   - Referrer-Policy: strict-origin-when-cross-origin
//   - Permissions-Policy: camera=(), microphone=(), geolocation=()
// ============================================

const DISCORD_AUTH_URL = 'https://discord.com/oauth2/authorize';

// Aplica headers de segurança em todas as respostas (equivalente ao helmet)
function applySecurityHeaders(res) {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return res;
}

export async function onRequestGet(context) {
  const { env } = context;

  // Valida que as variáveis de ambiente estão configuradas
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_REDIRECT_URI) {
    console.error('[oauth-login] Variáveis de ambiente faltando:', {
      hasClientId: !!env.DISCORD_CLIENT_ID,
      hasRedirectUri: !!env.DISCORD_REDIRECT_URI,
    });
    return applySecurityHeaders(new Response('OAuth2 não configurado no servidor. Contate o administrador.', { status: 500 }));
  }

  // Gera state CSRF aleatório (32 bytes hex = 64 chars)
  const stateBytes = crypto.getRandomValues(new Uint8Array(32));
  const state = Array.from(stateBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  // Parâmetros do redirect pro Discord
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    redirect_uri: env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify guilds',
    state,
    prompt: 'consent', // sempre pedir consentimento (evita cache de autorização antiga)
  });

  const redirectUrl = `${DISCORD_AUTH_URL}?${params}`;

  // Cria resposta de redirect com cookie httpOnly + state CSRF
  const res = new Response(null, {
    status: 302,
    headers: {
      Location: redirectUrl,
      // Cookie httpOnly: JavaScript do navegador não consegue ler (protege contra XSS)
      // Secure: só HTTPS (em produção). Mesmo em dev local (http://localhost), o cookie
      // é setado — Cloudflare Pages sempre usa HTTPS.
      // SameSite=Lax: protege contra CSRF cross-site (suficiente pra OAuth2 redirect)
      // Max-Age=600: expira em 10 min (state só é válido por 10 min)
      'Set-Cookie': `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });

  return applySecurityHeaders(res);
}
