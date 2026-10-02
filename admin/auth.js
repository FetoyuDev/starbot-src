// ============================================
// Starbot Docs — Admin area auth helper (client-side)
//
// A maior parte da lógica de auth acontece no backend (Cloudflare Functions
// em /functions/admin/*). Este arquivo só fornece helpers pro frontend:
//   - isAuthenticated(): verifica se cookie de sessão existe
//   - requireAuth(): redireciona pro login se não autenticado
//   - logout(): chama /admin/oauth-logout
//   - getCurrentUser(): busca dados do user logado via API
//
// NÃO contém client_id, client_secret, ou qualquer segredo.
// ============================================

// Verifica se o cookie de sessão existe (não consegue ler o valor por ser httpOnly,
// mas consegue detectar a presença).
function isAuthenticated() {
  return document.cookie.includes('starbot_admin_session=');
}

// Redirect para login se não autenticado. Retorna true se já estava autenticado.
function requireAuth() {
  if (!isAuthenticated()) {
    const currentPath = window.location.pathname + window.location.search;
    window.location.href = '/admin/login.html?redirect=' + encodeURIComponent(currentPath);
    return false;
  }
  return true;
}

// Logout — chama a Cloudflare Function que apaga o cookie
function logout() {
  window.location.href = '/admin/oauth-logout';
}

// Busca dados do user logado (do JWT decodificado no backend).
// Retorna {uid, username, avatar, guilds} ou null se não logado.
async function getCurrentUser() {
  try {
    const res = await fetch('/admin/api/me', { credentials: 'same-origin' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

window.StarbotAuth = { isAuthenticated, requireAuth, logout, getCurrentUser };
