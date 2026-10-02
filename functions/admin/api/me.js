// ============================================
// Cloudflare Pages Function — retorna dados do user logado
// Rota: GET /admin/api/me
//
// Esta rota é protegida pelo _middleware.js (que já validou o JWT
// e injetou context.data.user). Aqui só formatamos a resposta.
// ============================================

function applySecurityHeaders(res) {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
}

export async function onRequestGet(context) {
  const user = context.data?.user;

  if (!user) {
    // Se chegou aqui sem user, o middleware deveria ter redirecionado.
    // Retornar 401 pra garantir.
    return applySecurityHeaders(new Response(JSON.stringify({ error: 'Não autenticado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }));
  }

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.uid}/${user.avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${Number(user.uid) % 5}.png`;

  return applySecurityHeaders(new Response(JSON.stringify({
    id: user.uid,
    username: user.username,
    avatarUrl,
    guilds: user.guilds || [],
  }), {
    headers: { 'Content-Type': 'application/json' },
  }));
}
