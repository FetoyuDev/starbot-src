// ============================================
// Starbot Docs — Layout reutilizável
// Injeta header + sidebar + footer em cada página.
// Cada página só precisa <div id="app"></div> + <script> com o conteúdo.
// ============================================

// Detecta idioma pela URL (pt ou en)
const CURRENT_LANG = window.location.pathname.includes('/en/') ? 'en' : 'pt';
const IS_ADMIN_PAGE = window.location.pathname.includes('/admin/');

// Traduções para textos do chrome (header/sidebar)
const T = {
  pt: {
    brand: 'Starbot Docs',
    searchPlaceholder: 'Buscar na documentação...',
    home: 'Início',
    gettingStarted: 'Primeiros Passos',
    commands: 'Comandos',
    economy: 'Economia',
    moderation: 'Moderação',
    music: 'Música',
    tickets: 'Tickets',
    minecraft: 'Minecraft',
    information: 'Informações',
    fun: 'Diversão',
    faq: 'FAQ',
    guides: 'Guias',
    reference: 'Referência',
    adminSection: 'Administração',
    adminSetup: 'Setup Avançado',
    adminFeatures: 'Recursos Admin',
    adminApi: 'API REST',
    adminLogin: 'Login Admin',
    footer: 'Feito com ⭐ pela comunidade Starbot',
    editGithub: 'Editar no GitHub',
    langLabel: '🇧🇷 PT',
  },
  en: {
    brand: 'Starbot Docs',
    searchPlaceholder: 'Search documentation...',
    home: 'Home',
    gettingStarted: 'Getting Started',
    commands: 'Commands',
    economy: 'Economy',
    moderation: 'Moderation',
    music: 'Music',
    tickets: 'Tickets',
    minecraft: 'Minecraft',
    information: 'Information',
    fun: 'Fun',
    faq: 'FAQ',
    guides: 'Guides',
    reference: 'Reference',
    adminSection: 'Administration',
    adminSetup: 'Advanced Setup',
    adminFeatures: 'Admin Features',
    adminApi: 'REST API',
    adminLogin: 'Admin Login',
    footer: 'Made with ⭐ by Starbot community',
    editGithub: 'Edit on GitHub',
    langLabel: '🇺🇸 EN',
  },
};

const t = T[CURRENT_LANG];

// Prefixo de path conforme idioma
const base = CURRENT_LANG === 'en' ? '/en' : '/pt';

// Constrói o HTML do chrome (header + sidebar + overlay)
function buildChrome(contentHtml) {
  const header = `
    <header class="header">
      <button class="menu-toggle" id="menu-toggle">☰</button>
      <a href="${base}/index.html" class="header-brand">
        <span class="logo">⭐</span>
        <span>${t.brand}</span>
      </a>
      <div class="header-search">
        <span class="icon">🔍</span>
        <input type="text" id="search-input" placeholder="${t.searchPlaceholder}">
        <div class="search-results" id="search-results"></div>
      </div>
      <div class="header-actions">
        <a href="${CURRENT_LANG === 'pt' ? '/en/index.html' : '/pt/index.html'}" class="header-btn" title="Switch language">
          <span class="header-lang-flag">${CURRENT_LANG === 'pt' ? '🇺🇸' : '🇧🇷'}</span>
          <span>${CURRENT_LANG === 'pt' ? 'EN' : 'PT'}</span>
        </a>
        <button class="header-btn" id="theme-toggle" title="Toggle theme">🌙</button>
        <a href="/admin/login.html" class="header-btn" title="${t.adminSection}">
          <span>🔐</span><span>Admin</span>
        </a>
      </div>
    </header>
  `;

  const sidebar = `
    <aside class="sidebar">
      <div class="sidebar-section">
        <div class="sidebar-section-title">${t.guides}</div>
        <a href="${base}/index.html" class="sidebar-link"><span class="emoji">🏠</span>${t.home}</a>
        <a href="${base}/getting-started.html" class="sidebar-link"><span class="emoji">🚀</span>${t.gettingStarted}</a>
        <a href="${base}/faq.html" class="sidebar-link"><span class="emoji">❓</span>${t.faq}</a>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">${t.reference}</div>
        <a href="${base}/commands.html" class="sidebar-link"><span class="emoji">📋</span>${t.commands}</a>
        <a href="${base}/economy.html" class="sidebar-link"><span class="emoji">💰</span>${t.economy}</a>
        <a href="${base}/moderation.html" class="sidebar-link"><span class="emoji">🔨</span>${t.moderation}</a>
        <a href="${base}/music.html" class="sidebar-link"><span class="emoji">🎵</span>${t.music}</a>
        <a href="${base}/tickets.html" class="sidebar-link"><span class="emoji">🎫</span>${t.tickets}</a>
        <a href="${base}/minecraft.html" class="sidebar-link"><span class="emoji">⛏️</span>${t.minecraft}</a>
        <a href="${base}/information.html" class="sidebar-link"><span class="emoji">📊</span>${t.information}</a>
        <a href="${base}/fun.html" class="sidebar-link"><span class="emoji">🎮</span>${t.fun}</a>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">${t.adminSection}</div>
        <a href="/admin/login.html" class="sidebar-link"><span class="emoji">🔐</span>${t.adminLogin}</a>
        <a href="/admin/setup-avancado.html" class="sidebar-link"><span class="emoji">⚙️</span>${t.adminSetup}</a>
        <a href="/admin/recursos.html" class="sidebar-link"><span class="emoji">🛠️</span>${t.adminFeatures}</a>
        <a href="/admin/api.html" class="sidebar-link"><span class="emoji">🔌</span>${t.adminApi}</a>
      </div>
    </aside>
  `;

  const overlay = '<div class="overlay" id="overlay"></div>';

  const footer = `
    <footer class="footer">
      <div>${t.footer}</div>
      <div class="footer-links">
        <a href="https://github.com/Renato-dev1/starbot-docs" target="_blank">${t.editGithub}</a>
        <a href="${base}/faq.html">${t.faq}</a>
      </div>
    </footer>
  `;

  return `
    ${header}
    ${overlay}
    ${sidebar}
    <main class="content fade-in">
      ${contentHtml}
      ${footer}
    </main>
  `;
}

// Auto-inicializa: se a página tiver um <template id="page-content">, injeta o chrome em volta
document.addEventListener('DOMContentLoaded', () => {
  const template = document.getElementById('page-content');
  const app = document.getElementById('app');
  if (template && app) {
    app.innerHTML = buildChrome(template.innerHTML);
    // Re-executa scripts que estavam dentro do template
    app.querySelectorAll('script').forEach(oldScript => {
      const newScript = document.createElement('script');
      if (oldScript.src) newScript.src = oldScript.src;
      else newScript.textContent = oldScript.textContent;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });
  }
});
