# ⚙️ AL Sistemas — Painel de Gerenciamento

Sistema completo de gerenciamento de conteúdo, projetos, infraestrutura e integrações.  
Stack: **React + Vite + Tailwind** (frontend) · **Node.js + Express + MongoDB + Cloudinary** (backend)

---

## 🌐 URLs de produção

| Serviço   | URL                                         |
|-----------|---------------------------------------------|
| Frontend  | https://alsistemas.vercel.app               |
| Backend   | https://alsistemas.onrender.com             |
| API       | https://alsistemas.onrender.com/api         |
| APK       | GitHub → Actions → Artifacts                |

---

## ✨ Funcionalidades

- **Painel admin** com multi-tema (light, dark, ocean, rose)
- **Gestão de notícias** com editor Markdown, categorias e badges coloridos
- **Módulo GitHub** — visualização de repositórios e commits em tempo real
- **Projetos locais** — sync e acompanhamento de projetos internos
- **IA Assistant** — integração com Groq (llama-3.3) para análise de conteúdo
- **RSS Importer** — importação automática de feeds com scheduler
- **Infraestrutura** — monitoramento de MongoDB, Cloudinary e Redis pelo painel
- **Backup & Restore** — exportação e restauração de dados via interface
- **Audit Log** — registro de todas as ações dos usuários
- **Newsletter** — gestão de assinantes
- **App Android** — build via Capacitor + GitHub Actions

---

## 📁 Estrutura do projeto

```
alsistemas/
├── backend/          → Servidor Node.js (Express + MongoDB + Cloudinary)
│   ├── .env          → Credenciais (não commitar)
│   ├── render.yaml   → Blueprint de deploy no Render (vars já preenchidas)
│   ├── seed.js       → Cria admin e dados iniciais
│   └── src/
│       ├── server.js
│       ├── config/   → MongoDB, Cloudinary, env (Zod)
│       ├── models/   → Mongoose schemas
│       ├── routes/   → auth, noticias, categorias, fontes, upload, extras…
│       ├── middleware/ → auth JWT, upload Cloudinary, audit log…
│       └── utils/    → cache Redis, logger pino
├── frontend/         → React + Vite + Tailwind
│   ├── .env          → VITE_API_URL (aponta para o Render)
│   ├── capacitor.config.ts → Config do app Android
│   └── src/
│       ├── services/ → cliente HTTP centralizado + módulos por domínio
│       ├── context/  → AuthContext · ThemeContext (multi-skin)
│       ├── themes/   → tokens.js + dark / light / ocean / rose
│       ├── styles/   → base.css · public.css · admin.css
│       ├── components/admin/ui/ → AdminIcon (50+ SVGs) · ForcaSenha
│       ├── pages/    → Home, Login, Eventos, HorárioÔnibus…
│       └── pages/admin/ → Dashboard, Noticias, Categorias, GitHub, Projetos…
└── render.yaml       → Deploy com 1 clique no Render
```

---

## 🚀 Rodando local (desenvolvimento)

### Pré-requisitos

- Node.js v18+
- Conta no [MongoDB Atlas](https://cloud.mongodb.com) (gratuita)
- Conta no [Cloudinary](https://cloudinary.com) (gratuita)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # preencha com suas credenciais
npm run seed           # cria admin + dados iniciais
npm run dev            # http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
npm install
# Para dev local: edite .env e troque VITE_API_URL por http://localhost:3001/api
npm run dev            # http://localhost:5173
```

### Credenciais padrão

- **Email:** admin@al-sistemas.com
- **Senha:** admin123

---

## ☁️ Deploy em produção

### Backend — Render

Use o `render.yaml` incluído na raiz do repositório:

1. No Render: **New → Blueprint** → conecte o repositório
2. Clique em **Apply** — todas as variáveis já estão preenchidas

Ou configure manualmente no painel **Environment**:

| Variável                | Valor                                      |
|-------------------------|--------------------------------------------|
| `NODE_ENV`              | `production`                               |
| `FRONTEND_URL`          | `https://alsistemas.vercel.app`            |
| `MONGO_URI`             | string de conexão do MongoDB Atlas         |
| `JWT_SECRET`            | chave secreta longa (mín. 64 caracteres)   |
| `CLOUDINARY_CLOUD_NAME` | cloud name do Cloudinary                   |
| `CLOUDINARY_API_KEY`    | API key do Cloudinary                      |
| `CLOUDINARY_API_SECRET` | API secret do Cloudinary                   |
| `GROQ_API_KEY`          | chave da API Groq                          |
| `GITHUB_TOKEN`          | Personal Access Token do GitHub            |

### Frontend — Vercel

| Variável       | Valor                                       |
|----------------|---------------------------------------------|
| `VITE_API_URL` | `https://alsistemas.onrender.com/api`       |

### APK Android

O APK debug é gerado automaticamente via GitHub Actions a cada push na `main`.  
Consulte o [CAPACITOR.md](./CAPACITOR.md) para build manual.

---

## ⚠️ Plano gratuito do Render

O serviço "adormece" após 15 minutos sem uso — a primeira requisição pode levar 30–60 s.  
Use o [UptimeRobot](https://uptimerobot.com) para pingar `/api/health` a cada 14 minutos e manter sempre ativo.
