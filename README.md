# Starbot Docs

Documentação oficial do bot **Starbot** — bot de Discord multifuncional com economia, moderação, música, tickets, Minecraft e muito mais.

🌐 **Site ao vivo:** [doc-starbot.fefeh.fun](https://doc-starbot.fefeh.fun)

## 📁 Estrutura

```
starbot-src/
├── worker.js              # Cloudflare Worker único (rotas OAuth2 + serve estáticos)
├── jwt.js                 # Helper JWT HMAC-SHA256
├── wrangler.toml          # Config do Worker (assets + vars públicas)
├── .github/workflows/
│   └── deploy.yml         # Deploy via Wrangler
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── layout.js      # Header + sidebar + footer
│       ├── main.js        # Busca + tema + mobile menu
│       └── admin-badge.js # Badge "logado como X"
├── pt/                    # 11 páginas em português
├── en/                    # 11 páginas em inglês
└── admin/                 # Área admin (protegida por OAuth2)
    ├── login.html
    ├── auth.js
    ├── setup-avancado.html
    ├── recursos.html
    └── api.html
```

## 🚀 Deploy (Cloudflare Worker)

Este site roda como **Cloudflare Worker** (não Pages). O `worker.js` faz tudo:
- Serve arquivos estáticos (HTML/CSS/JS/imagens) via binding `ASSETS`
- Processa rotas OAuth2 do Discord (`/admin/oauth-login`, `/admin/oauth-callback`, `/admin/oauth-logout`)
- Protege rotas `/admin/*` (exige login)
- Aplica headers de segurança (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)

### Configuração inicial

#### 1. Instalar Wrangler CLI

```bash
npm install -g wrangler
wrangler login
```

#### 2. Deploy do Worker

```bash
cd starbot-src
wrangler deploy
```

#### 3. Configurar domínio customizado

No dashboard da Cloudflare → Workers & Pages → `starbot-src` → Settings → Domains:
- Adicione: `doc-starbot.fefeh.fun`

Ou via `wrangler.toml`:
```toml
routes = [
  { pattern = "doc-starbot.fefeh.fun/*", custom_domain = true }
]
```

### Variáveis de ambiente (Settings → Variables and Secrets)

| Nome | Tipo | Valor |
|---|---|---|
| `DISCORD_CLIENT_ID` | Var (pública) | `963572780924809256` (já no wrangler.toml) |
| `DISCORD_REDIRECT_URI` | Var (pública) | `https://doc-starbot.fefeh.fun/admin/oauth-callback` (já no wrangler.toml) |
| `DISCORD_CLIENT_SECRET` | **Secret** | (do Discord Developer Portal → OAuth2 → Reset Secret) |
| `JWT_SECRET` | **Secret** | (rode: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

Adicione os secrets via CLI:
```bash
wrangler secret put DISCORD_CLIENT_SECRET
wrangler secret put JWT_SECRET
```

Ou via dashboard: Workers & Pages → `starbot-src` → Settings → Variables and Secrets → Add.

### Discord Developer Portal

Em OAuth2 → Redirects, adicione:
```
https://doc-starbot.fefeh.fun/admin/oauth-callback
```

## 🔐 Como funciona a autenticação

```
[Browser] → /admin/login.html → clica "Entrar com Discord"
   ↓
[Worker] /admin/oauth-login → gera state CSRF, seta cookie httpOnly, redireciona pro Discord
   ↓
[Discord] usuário autoriza → redireciona pra /admin/oauth-callback?code=xxx&state=yyy
   ↓
[Worker] /admin/oauth-callback
   1. Valida state CSRF contra cookie
   2. Troca code por access_token (com DISCORD_CLIENT_SECRET)
   3. Busca /users/@me e /users/@me/guilds
   4. Filtra só guilds onde user é admin (ADMINISTRATOR ou MANAGE_GUILD)
   5. Se 0 guilds admin → redirect pro login com erro "sem_admin"
   6. Cria JWT assinado HMAC-SHA256 com payload {uid, username, avatar, guilds, exp: 7 dias}
   7. Seta cookie httpOnly starbot_admin_session
   ↓
[Browser] → /admin/setup-avancado.html (autenticado, badge "logado como X" aparece)
```

### Segurança implementada

- ✅ `access_token` do Discord **nunca** vai pro frontend (só JWT interno)
- ✅ JWT assinado com HMAC-SHA256 (timing-safe verification)
- ✅ Cookies httpOnly (JS não lê) + Secure (só HTTPS) + SameSite=Lax
- ✅ State CSRF com 32 bytes aleatórios, validado contra cookie
- ✅ Headers de segurança em todas as respostas
- ✅ Middleware bloqueia não-admins (precisa ser admin de pelo menos 1 servidor)
- ✅ Sessão expira em 7 dias

## 🌍 Idiomas

A documentação está em **português (pt-BR)** e **inglês (en-US)**. Para adicionar um novo idioma:

1. Crie a pasta `/es/` (para espanhol)
2. Copie os arquivos de `/pt/` e traduza
3. Atualize o `assets/js/layout.js` para incluir o novo idioma

## 📝 Licença

MIT — use livremente, mas mantenha o crédito ao Starbot.
