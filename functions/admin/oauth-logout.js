// ============================================
// Cloudflare Pages Function — logout
// Rota: GET /admin/oauth-logout
//
// Simplesmente apaga o cookie de sessão e redireciona pro login.
// ============================================

function applySecurityHeaders(res) {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return res;
}

export async function onRequestGet() {
  const res = new Response(null, {
    status: 302,
    headers: {
      Location: '/admin/login.html',
      // Apaga cookie de sessão (Max-Age=0 = expira imediatamente)
      'Set-Cookie': 'starbot_admin_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
  return applySecurityHeaders(res);
}
