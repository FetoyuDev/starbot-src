# Starbot Docs

Documentação oficial do bot **Starbot** — bot de Discord multifuncional com economia, moderação, música, tickets, Minecraft e muito mais.

🌐 **Site ao vivo:** [doc-starbot.fefeh.fun](https://doc-starbot.fefeh.fun)

## 📁 Estrutura

```
starbot-docs/
├── index.html              # Redirecionamento para /pt/
├── CNAME                   # Domínio customizado (doc-starbot.fefeh.fun)
├── .github/workflows/
│   └── deploy.yml          # GitHub Actions que faz deploy automático
├── assets/
│   ├── css/style.css       # Estilo principal (docs tradicional, claro/escuro)
│   └── js/
│       ├── layout.js       # Injeta header + sidebar + footer em cada página
│       └── main.js         # Busca client-side, toggle de tema, mobile menu
├── pt/                     # Documentação em português
│   ├── index.html          # Home
│   ├── getting-started.html
│   ├── comandos.html
│   ├── economia.html
│   ├── moderacao.html
│   ├── musica.html
│   ├── tickets.html
│   ├── minecraft.html
│   ├── informacoes.html
│   ├── diversao.html
│   └── faq.html
├── en/                     # Documentation in English
│   ├── index.html
│   ├── getting-started.html
│   ├── commands.html
│   ├── economy.html
│   ├── moderation.html
│   ├── music.html
│   ├── tickets.html
│   ├── minecraft.html
│   ├── information.html
│   ├── fun.html
│   └── faq.html
└── admin/                  # Área administrativa (protegida)
    ├── login.html          # Tela de login OAuth2 Discord
    ├── auth.js             # Helper de autenticação (referência)
    ├── setup-avancado.html # Auto-mod, filtros de log, warns automático
    ├── recursos.html       # Embed builder, tickets avançado, boas-vindas
    └── api.html            # Documentação da API REST
```

## 🚀 Deploy

O site é deployado automaticamente no GitHub Pages quando você faz push na branch `main`. Configure:

1. **Crie um repositório no GitHub** (ex: `starbot-docs`)
2. Faça push deste código:
   ```bash
   git init
   git add .
   git commit -m "Initial docs site"
   git branch -M main
   git remote add origin https://github.com/SEU_USER/starbot-docs.git
   git push -u origin main
   ```
3. **Ative o GitHub Pages:** vá em Settings → Pages → Source: **GitHub Actions**
4. **Configure o domínio customizado:**
   - Vá em Settings → Pages → Custom domain
   - Digite: `doc-starbot.fefeh.fun`
   - Marque "Enforce HTTPS"
5. **Configure o DNS do seu domínio** (`fefeh.fun`):
   - Adicione um registro CNAME: `doc-starbot` → `starbot-docs.pages.dev` ou `SEU_USER.github.io`
   - Aguarde propagação (até 24h, geralmente 15min)

## 🔐 Área Admin (OAuth2 Discord)

A área `/admin` exige login via Discord OAuth2. Como o site é estático (GitHub Pages), o OAuth2 precisa de um backend leve. Opções:

### Opção 1: Cloudflare Pages Functions (recomendado, grátis)
- Faça fork do repositório para o Cloudflare Pages
- Crie a função em `functions/admin/oauth-callback.js` que processa o código OAuth2
- Configure as variáveis de ambiente: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`

### Opção 2: Vercel Serverless Functions
- Importe o repo no Vercel
- Crie `api/oauth-callback.js`
- Configure as variáveis de ambiente no painel da Vercel

### Opção 3: Manter admin como "público" (sem OAuth2 real)
- Útil se você só quer esconder dos usuários comuns, sem segurança real
- Use um password simples em JavaScript (fraco, mas funcional)

A documentação atual usa a Opção 3 por padrão (página de login com botão Discord, mas sem backend real). Você precisará implementar o backend OAuth2 em uma das opções acima.

## 🌍 Idiomas

A documentação está em **português (pt-BR)** e **inglês (en-US)**. Para adicionar um novo idioma:

1. Crie a pasta `/es/` (para espanhol)
2. Copie os arquivos de `/pt/` e traduza
3. Atualize o `assets/js/layout.js` para incluir o novo idioma
4. Adicione as traduções do chrome no objeto `T`

## 🎨 Personalização

Edite `assets/css/style.css` para mudar cores, fontes e layout. As variáveis CSS no topo do arquivo controlam toda a identidade visual:

```css
:root {
  --accent: #3954cf;      /* Cor principal */
  --bg: #ffffff;           /* Fundo (claro) */
  --text: #1a1d24;         /* Texto */
  /* ... etc */
}
```

## 📝 Licença

MIT — use livremente, mas mantenha o crédito ao Starbot.
