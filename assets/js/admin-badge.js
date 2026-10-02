// ============================================
// Starbot Docs — Admin user widget
// Adiciona um badge "Logado como X" no topo de cada página admin,
// mostrando o avatar + nome do user + botão de logout.
// ============================================

(function() {
  // Só roda em páginas /admin/ (não em /pt/ ou /en/)
  if (!window.location.pathname.startsWith('/admin/')) return;

  // Não roda na página de login (não faz sentido mostrar "logado como" lá)
  if (window.location.pathname === '/admin/login.html') return;

  document.addEventListener('DOMContentLoaded', async () => {
    const user = await window.StarbotAuth?.getCurrentUser();
    if (!user) return; // não logado, mas o middleware já deveria ter redirecionado

    // Cria o badge
    const badge = document.createElement('div');
    badge.id = 'admin-user-badge';
    badge.innerHTML = `
      <img src="${user.avatarUrl}" alt="Avatar" class="admin-badge-avatar">
      <span class="admin-badge-name">${escapeHtml(user.username)}</span>
      <button class="admin-badge-logout" title="Sair">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </button>
    `;

    // Estilos inline (pra não depender de CSS externo)
    badge.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 14px;
      background: var(--bg-secondary, #f7f8fa);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      backdrop-filter: blur(12px);
      font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: var(--text, #1a1d24);
    `;

    const avatarEl = badge.querySelector('.admin-badge-avatar');
    avatarEl.style.cssText = 'width: 24px; height: 24px; border-radius: 50%;';

    const nameEl = badge.querySelector('.admin-badge-name');
    nameEl.style.cssText = 'font-weight: 600;';

    const logoutBtn = badge.querySelector('.admin-badge-logout');
    logoutBtn.style.cssText = `
      background: transparent;
      border: none;
      color: var(--text-secondary, #6b7280);
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    `;
    logoutBtn.addEventListener('mouseenter', () => {
      logoutBtn.style.background = 'rgba(220,38,38,0.1)';
      logoutBtn.style.color = '#dc2626';
    });
    logoutBtn.addEventListener('mouseleave', () => {
      logoutBtn.style.background = 'transparent';
      logoutBtn.style.color = 'var(--text-secondary, #6b7280)';
    });
    logoutBtn.addEventListener('click', () => {
      window.StarbotAuth.logout();
    });

    document.body.appendChild(badge);
  });

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
