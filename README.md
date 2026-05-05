# 📰 IguaNews — Portal de Notícias

Portal de notícias para cidades do interior do Brasil.  
Stack: **React + Vite + Tailwind** (frontend) · **Node.js + Express + MongoDB + Cloudinary** (backend)

---

## 🌐 URLs de produção

| Serviço   | URL                                          |
|-----------|----------------------------------------------|
| Frontend  | https://iguanews.vercel.app                  |
| Backend   | https://iguanews-backend.onrender.com        |
| API       | https://iguanews-backend.onrender.com/api    |
| APK       | GitHub → Actions → Artifacts                 |

---

## Estrutura do projeto

```
iguanews/
├── backend/          → Servidor Node.js (Express + MongoDB + Cloudinary)
│   ├── .env          → Credenciais (não commitar)
│   ├── seed.js       → Cria admin e dados iniciais
│   └── src/
│       ├── server.js
│       ├── config/   → MongoDB, Cloudinary, env (Zod)
│       ├── models/   → Mongoose schemas
│       ├── routes/   → auth, noticias, categorias, fontes, upload, extras...
│       ├── middleware/ → auth JWT, upload Cloudinary, audit log...
│       └── utils/    → cache Redis, logger pino
├── frontend/         → React + Vite + Tailwind
│   ├── .env          → VITE_API_URL (aponta para o Render)
│   ├── capacitor.config.ts → Config do app Android
│   └── src/
│       ├── services/api.js        → cliente HTTP para o backend
│       ├── context/AuthContext.jsx
│       ├── context/ThemeContext.jsx → provedor de tema multi-skin
│       ├── themes/                → tokens.js + dark/light/ocean/rose
│       ├── styles/                → base.css · public.css · admin.css
│       ├── utils/
│       │   ├── formatters.js
│       │   ├── markdown.js
│       │   └── permissions.js     → GRUPOS_PERMISSOES (fonte única)
│       ├── components/
│       │   ├── admin/ui/
│       │   │   ├── AdminIcon.jsx  → biblioteca SVG centralizada (50+ ícones)
│       │   │   └── ForcaSenha.jsx → indicador de força de senha (5 níveis)
│       │   └── (ConfirmModal, Navbar, NoticiaCard…)
│       ├── pages/    → Home, NoticiaDetalhe, Login, Eventos, Ônibus
│       └── pages/admin/ → Dashboard, NoticiaForm, Categorias, Módulos…
├── TERMUX.md         → Guia específico para rodar no Android/Termux
├── CAPACITOR.md      → Build do app Android via Capacitor
├── README_MONGO.md   → Guia detalhado de setup e migração
└── README.md         → Este arquivo
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
cp .env.example .env   # preencha com suas credenciais locais
npm run seed           # popula banco com admin + categorias padrão
npm run dev            # servidor em http://localhost:3001
```

### 2. Frontend

```bash
cd frontend
# Para dev local, edite .env e troque VITE_API_URL por http://localhost:3001/api
npm install
npm run dev    # app em http://localhost:5173
```

### Credenciais padrão do admin

- **Email:** admin@iguanews.com
- **Senha:** admin123

---

## ☁️ Deploy em produção

### Backend — Render

Variáveis de ambiente configuradas no Render:

| Variável               | Valor                                       |
|------------------------|---------------------------------------------|
| `NODE_ENV`             | `production`                                |
| `MONGO_URI`            | string de conexão do MongoDB Atlas          |
| `JWT_SECRET`           | chave secreta longa (mín. 16 caracteres)    |
| `JWT_EXPIRES_IN`       | `7d`                                        |
| `CLOUDINARY_CLOUD_NAME`| cloud name do Cloudinary                    |
| `CLOUDINARY_API_KEY`   | API key do Cloudinary                       |
| `CLOUDINARY_API_SECRET`| API secret do Cloudinary                   |
| `REDIS_URL`            | URL interna do Key Value do Render          |
| `FRONTEND_URL`         | `https://iguanews.vercel.app`               |

### Frontend — Vercel

Variável de ambiente configurada no Vercel:

| Variável       | Valor                                        |
|----------------|----------------------------------------------|
| `VITE_API_URL` | `https://iguanews-backend.onrender.com/api`  |

### APK Android

Consulte o [CAPACITOR.md](./CAPACITOR.md) para instruções completas.  
O APK debug é gerado automaticamente pelo GitHub Actions a cada push na `main`.

---

## ⚠️ Plano gratuito do Render

No plano gratuito o serviço "adormece" após 15 minutos sem uso.
A primeira requisição após o sono pode demorar 30–60 segundos.
Para manter sempre ativo, use o [UptimeRobot](https://uptimerobot.com)
configurado para pingar `https://iguanews-backend.onrender.com/api/health` a cada 14 minutos.
