// ============================================
// Cloudflare Pages Function — middleware de proteção da área /admin
// Rota: intercepta TODAS as rotas que começam com /admin/*
//
// Lógica:
//   - Rotas PÚBLICAS (não exigem login): /admin/login.html, /admin/oauth-login,
//     /admin/oauth-callback, /admin/oauth-logout
//   - Rotas PROTEGIDAS (exigem login): TODO o resto de /admin/*
//
// Se user não tem cookie starbot_admin_session válido, redireciona pro login.
// Se tem cookie, decodifica o JWT e injeta os dados do user no request
// (disponível como context.data.user nas functions subsequentes).
// ============================================

import { verifyJWT } from './_jwt.js';

// Rotas que NÃO exigem autenticação
const PUBLIC_PATHS = [
  '/admin/login.html',
  '/admin/oauth-login',
  '/admin/oauth-callback',
  '/admin/oauth-logout',
];

function applySecurityHeaders(res) {
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return res;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Se é rota pública, passa direto
  if (PUBLIC_PATHS.some(p => path === p || path.startsWith(p + '/'))) {
    return next();
  }

  // Verifica cookie de sessão
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const sessionCookie = cookies.starbot_admin_session;

  if (!sessionCookie) {
    // Não logado → redireciona pro login com redirect de volta
    const returnUrl = encodeURIComponent(path + url.search);
    return applySecurityHeaders(Response.redirect(`${url.origin}/admin/login.html?redirect=${returnUrl}`, 302));
  }

  // Valida JWT
  if (!env.JWT_SECRET) {
    console.error('[admin/_middleware] JWT_SECRET não configurado');
    return applySecurityHeaders(new Response('Servidor mal configurado. Contate o administrador.', { status: 500 }));
  }

  const payload = await verifyJWT(sessionCookie, env.JWT_SECRET);
  if (!payload) {
    // JWT inválido ou expirado → limpa cookie e manda pro login
    const res = new Response(null, {
      status: 302,
      headers: {
        Location: '/admin/login.html?erro=sescao_expirada',
        'Set-Cookie': 'starbot_admin_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      },
    });
    return applySecurityHeaders(res);
  }

  // Tudo OK — injeta user no context pra functions downstream usarem
  context.data = context.data || {};
  context.data.user = payload;

  return next();
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
