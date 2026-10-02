/* ============================================
   Starbot Docs — JavaScript principal
   ============================================ */

// ── Busca client-side ──
// Índice simples em memória, populado no carregamento de cada página.
// Não usa backend — filtra por título, path e snippet pré-indexados.
const SEARCH_INDEX = [
  // PT-BR
  { lang: 'pt', title: 'Início', path: '/pt/index.html', snippet: 'Bem-vindo à documentação do Starbot', keywords: 'inicio home bem vindo starbot' },
  { lang: 'pt', title: 'Primeiros Passos', path: '/pt/primeiros-passos.html', snippet: 'Como adicionar o bot ao seu servidor', keywords: 'primeiros passos adicionar bot servidor convite' },
  { lang: 'pt', title: 'Comandos', path: '/pt/comandos.html', snippet: 'Lista de todos os comandos disponíveis', keywords: 'comandos lista slash' },
  { lang: 'pt', title: 'Economia', path: '/pt/economia.html', snippet: 'Sistema de starcoins, banco, trabalho', keywords: 'economia starcoins coins banco trabalhar pagar' },
  { lang: 'pt', title: 'Moderação', path: '/pt/moderacao.html', snippet: 'Banir, expulsar, avisar, limpar', keywords: 'moderacao banir expulsar avisar limpar cargo' },
  { lang: 'pt', title: 'Música', path: '/pt/musica.html', snippet: 'Como tocar música no canal de voz', keywords: 'musica tocar fila filtros painel' },
  { lang: 'pt', title: 'Tickets', path: '/pt/tickets.html', snippet: 'Sistema de suporte por tickets', keywords: 'tickets suporte atendimento' },
  { lang: 'pt', title: 'Minecraft', path: '/pt/minecraft.html', snippet: 'Status de servidores Minecraft', keywords: 'minecraft mcstatus servidor ip' },
  { lang: 'pt', title: 'Informações', path: '/pt/informacoes.html', snippet: 'Comandos de info: perfil, avatar, servidor', keywords: 'informacoes perfil avatar servidor userinfo' },
  { lang: 'pt', title: 'Diversão', path: '/pt/diversao.html', snippet: 'Casamento, dados, jogos', keywords: 'diversao casar dado ppt shippar' },
  { lang: 'pt', title: 'FAQ', path: '/pt/faq.html', snippet: 'Perguntas frequentes', keywords: 'faq duvidas perguntas' },
  { lang: 'pt', title: 'Admin — Setup Avançado', path: '/admin/setup-avancado.html', snippet: 'Auto-mod, filtros de log, warns automático', keywords: 'admin setup automod badwords logs warns' },
  { lang: 'pt', title: 'Admin — Recursos', path: '/admin/recursos.html', snippet: 'Embed builder, tickets avançado, boas-vindas', keywords: 'admin embed builder tickets boas vindas' },
  { lang: 'pt', title: 'Admin — API', path: '/admin/api.html', snippet: 'API REST do bot', keywords: 'admin api rest endpoints' },
  // EN-US
  { lang: 'en', title: 'Home', path: '/en/index.html', snippet: 'Welcome to Starbot documentation', keywords: 'home welcome starbot' },
  { lang: 'en', title: 'Getting Started', path: '/en/getting-started.html', snippet: 'How to add the bot to your server', keywords: 'getting started add bot server invite' },
  { lang: 'en', title: 'Commands', path: '/en/commands.html', snippet: 'List of all available commands', keywords: 'commands list slash' },
  { lang: 'en', title: 'Economy', path: '/en/economy.html', snippet: 'Starcoins, bank, work system', keywords: 'economy starcoins coins bank work pay' },
  { lang: 'en', title: 'Moderation', path: '/en/moderation.html', snippet: 'Ban, kick, warn, clear', keywords: 'moderation ban kick warn clear role' },
  { lang: 'en', title: 'Music', path: '/en/music.html', snippet: 'How to play music in voice channel', keywords: 'music play queue filters panel' },
  { lang: 'en', title: 'Tickets', path: '/en/tickets.html', snippet: 'Support ticket system', keywords: 'tickets support' },
  { lang: 'en', title: 'Minecraft', path: '/en/minecraft.html', snippet: 'Minecraft server status', keywords: 'minecraft mcstatus server ip' },
  { lang: 'en', title: 'Information', path: '/en/information.html', snippet: 'Info commands: profile, avatar, server', keywords: 'information profile avatar server userinfo' },
  { lang: 'en', title: 'Fun', path: '/en/fun.html', snippet: 'Marriage, dice, games', keywords: 'fun marry dice rps ship' },
  { lang: 'en', title: 'FAQ', path: '/en/faq.html', snippet: 'Frequently asked questions', keywords: 'faq questions' },
  { lang: 'en', title: 'Admin — Advanced Setup', path: '/admin/setup-avancado.html', snippet: 'Auto-mod, log filters, auto warns', keywords: 'admin setup automod badwords logs warns' },
  { lang: 'en', title: 'Admin — Features', path: '/admin/recursos.html', snippet: 'Embed builder, advanced tickets, welcome', keywords: 'admin embed builder tickets welcome' },
  { lang: 'en', title: 'Admin — API', path: '/admin/api.html', snippet: 'Bot REST API', keywords: 'admin api rest endpoints' },
];

// ── Inicialização ──
document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initSearch();
  initSidebar();
  initCopyButtons();
  highlightActiveLink();
});

// ── Toggle de tema (claro/escuro) ──
function initThemeToggle() {
  const saved = localStorage.getItem('starbot-docs-theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);

  const btn = document.getElementById('theme-toggle');
  if (btn) {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('starbot-docs-theme', next);
      btn.textContent = next === 'light' ? '🌙' : '☀️';
    });
    // Sincroniza ícone
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    btn.textContent = current === 'light' ? '🌙' : '☀️';
  }
}

// ── Busca client-side ──
function initSearch() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  if (!input || !results) return;

  // Detecta idioma atual pela URL
  const lang = window.location.pathname.includes('/en/') ? 'en' : 'pt';

  let debounceTimer;
  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doSearch(e.target.value, lang, results), 200);
  });

  // Fecha resultados ao clicar fora
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !results.contains(e.target)) {
      results.classList.remove('show');
    }
  });

  // Navegação por teclado nos resultados
  input.addEventListener('keydown', (e) => {
    const items = results.querySelectorAll('.search-result-item');
    if (!items.length) return;
    const active = results.querySelector('.search-result-item.active');
    let idx = active ? Array.from(items).indexOf(active) : -1;
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = Math.min(idx + 1, items.length - 1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); idx = Math.max(idx - 1, 0); }
    if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); window.location.href = items[idx].dataset.path; }
    items.forEach(i => i.classList.remove('active'));
    if (idx >= 0) items[idx].classList.add('active');
  });
}

function doSearch(query, lang, resultsEl) {
  query = query.trim().toLowerCase();
  if (!query || query.length < 2) {
    resultsEl.classList.remove('show');
    return;
  }

  // Filtra por idioma + keywords/título/snippet
  const filtered = SEARCH_INDEX.filter(item => {
    if (item.lang !== lang) return false;
    const haystack = (item.title + ' ' + item.snippet + ' ' + item.keywords).toLowerCase();
    return haystack.includes(query);
  }).slice(0, 8);

  if (!filtered.length) {
    resultsEl.innerHTML = '<div class="search-result-item"><div class="title">Nenhum resultado</div></div>';
    resultsEl.classList.add('show');
    return;
  }

  resultsEl.innerHTML = filtered.map(item => `
    <a href="${item.path}" class="search-result-item" data-path="${item.path}">
      <div class="title">${highlight(item.title, query)}</div>
      <div class="path">${item.path}</div>
      <div class="snippet">${highlight(item.snippet, query)}</div>
    </a>
  `).join('');
  resultsEl.classList.add('show');
}

function highlight(text, query) {
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark style="background: var(--accent-bg); color: var(--accent); padding: 0 2px; border-radius: 2px;">$1</mark>');
}

// ── Sidebar mobile ──
function initSidebar() {
  const toggle = document.getElementById('menu-toggle');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('overlay');

  if (toggle && sidebar) {
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay?.classList.toggle('show');
    });
  }
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar?.classList.remove('open');
      overlay.classList.remove('show');
    });
  }
}

// ── Botões de copiar nos blocos de código ──
function initCopyButtons() {
  document.querySelectorAll('.code-block').forEach(block => {
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'Copiar';
    btn.addEventListener('click', () => {
      const code = block.querySelector('code')?.textContent || block.textContent;
      navigator.clipboard.writeText(code).then(() => {
        btn.textContent = '✓ Copiado!';
        setTimeout(() => (btn.textContent = 'Copiar'), 2000);
      });
    });
    block.appendChild(btn);
  });
}

// ── Highlight do link ativo na sidebar ──
function highlightActiveLink() {
  const path = window.location.pathname;
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('href') === path || path.endsWith(link.getAttribute('href'))) {
      link.classList.add('active');
    }
  });
}
