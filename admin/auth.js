// ============================================
// Starbot Docs — Admin area auth (OAuth2 Discord)
// Este arquivo é referência — você precisará de um backend (ex: Cloudflare Worker
// ou Vercel Function) para processar o callback OAuth2. Documentação estática
// não pode fazer OAuth2 sozinha.
//
// SOLUÇÃO RECOMENDADA: use Cloudflare Pages Functions (grátis) com este script.
// ============================================

// Configuração OAuth2 — preencha com seus dados do Discord Developer Portal
const OAUTH_CONFIG = {
  clientId: '963572780924809256',
  redirectUri: 'https://doc-starbot.fefeh.fun/admin/oauth-callback',
  scope: 'identify guilds',
  authUrl: 'https://discord.com/oauth2/authorize',
  tokenUrl: 'https://discord.com/api/v10/oauth2/token',
};

// Gera URL de login OAuth2
function getLoginUrl(state) {
  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.clientId,
    redirect_uri: OAUTH_CONFIG.redirectUri,
    response_type: 'code',
    scope: OAUTH_CONFIG.scope,
    state: state,
  });
  return `${OAUTH_CONFIG.authUrl}?${params}`;
}

// Verifica se o usuário está autenticado (cookie de sessão)
function isAuthenticated() {
  return document.cookie.includes('starbot_admin_session=');
}

// Redirect para login se não autenticado
function requireAuth() {
  if (!isAuthenticated()) {
    const state = Math.random().toString(36).substring(2);
    sessionStorage.setItem('oauth_state', state);
    window.location.href = getLoginUrl(state);
    return false;
  }
  return true;
}

// Logout
function logout() {
  document.cookie = 'starbot_admin_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  window.location.href = '/admin/login.html';
}

// Verifica permissão de admin (depois do login)
async function checkAdminPermission() {
  // O backend (Cloudflare Function) já valida isso durante o callback OAuth2.
  // Se chegou aqui com cookie de sessão válido, é admin.
  return true;
}

window.StarbotAuth = { isAuthenticated, requireAuth, logout, checkAdminPermission };
