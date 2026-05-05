# IguaNews — Guia de Migração Supabase → MongoDB + Cloudinary

## Estrutura do projeto

```
iguanews/
├── backend/          ← Servidor Node.js (Express + MongoDB + Cloudinary)
│   ├── .env          ← Credenciais (já preenchidas)
│   ├── seed.js       ← Cria admin e dados iniciais
│   └── src/
│       ├── server.js
│       ├── config/   ← MongoDB + Cloudinary
│       ├── models/   ← Mongoose schemas
│       ├── routes/   ← auth, noticias, categorias, fontes, upload, extras
│       └── middleware/ ← auth JWT + upload Cloudinary
└── frontend/         ← React + Vite (atualizado)
    ├── .env          ← VITE_API_URL
    └── src/
        └── services/
            └── api.js  ← substitui o antigo supabase.js
```

---

## Passo a passo para rodar

### 1. Configurar o MongoDB Atlas

Acesse https://cloud.mongodb.com e:
1. Vá em **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (0.0.0.0/0)
   > Isso é necessário para o backend conseguir conectar!
2. O banco `iguanews` será criado automaticamente na primeira conexão.

### 2. Instalar e iniciar o Backend

```bash
cd backend
npm install
npm run seed     # ← Cria admin + categorias + dados padrão no MongoDB
npm run dev      # ← Inicia o servidor em http://localhost:3001
```

> ⚠️ **Não rode `npm run seed` mais de uma vez** — ele limpa o banco antes de recriar tudo.

Credenciais do admin criadas pelo seed:
- **Email:** admin@iguanews.com
- **Senha:** admin123

> ⚠️ Troque a senha após o primeiro login!

### 3. Instalar e iniciar o Frontend

```bash
cd frontend
npm install
npm run dev      # ← Inicia em http://localhost:5173
```

### 4. Testar

- Acesse http://localhost:5173
- Clique em "Entrar" (ou /login)
- Use: admin@iguanews.com / admin123

---

## 🐛 Problema: "Variáveis de ambiente inválidas" mesmo com .env preenchido

**Causa:** Em projetos ES Modules (`"type": "module"`), todos os `import` são hoistados
pelo Node.js. Isso significa que `import './config/env.js'` em `server.js` **sempre
executa antes** de `import 'dotenv/config'`, independente da ordem no arquivo.
Resultado: o Zod valida `process.env` quando o `.env` ainda não foi carregado.

**Solução aplicada:** o `import 'dotenv/config'` foi movido para dentro do próprio
`src/config/env.js`, garantindo que o `.env` seja carregado *antes* da validação Zod.

Se você vir esse erro mesmo assim, verifique:
1. O arquivo `.env` está em `backend/` (não na raiz do projeto)
2. Você está rodando `npm run dev` de dentro da pasta `backend/`
3. Nenhuma variável está com espaço antes/depois do `=`

---

## Variáveis de ambiente

### backend/.env (já preenchido)
| Variável | Descrição |
|---|---|
| `MONGO_URI` | String de conexão do MongoDB Atlas |
| `CLOUDINARY_CLOUD_NAME` | dp1drcg8a |
| `CLOUDINARY_API_KEY` | Sua API Key |
| `CLOUDINARY_API_SECRET` | Seu API Secret |
| `JWT_SECRET` | Segredo para assinar tokens JWT de autenticação (mín. 16 chars). Em produção use uma string longa e aleatória — ex: `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Validade do token (padrão: `7d`) |
| `ADMIN_EMAIL` | Email do admin criado pelo seed |
| `ADMIN_SENHA` | Senha do admin criado pelo seed |

### frontend/.env (já preenchido)
| Variável | Descrição |
|---|---|
| `VITE_API_URL` | URL do backend (padrão: http://localhost:3001/api) |

---

## Em produção (deploy)

### Backend (ex: Railway, Render, VPS)
1. Suba a pasta `backend/`
2. Configure as variáveis de ambiente no painel do host
3. Adicione `FRONTEND_URL=https://seu-site.com` para o CORS
4. Execute `npm run seed` uma vez para criar o admin
5. Execute `npm start`

### Frontend (ex: Vercel, Netlify)
1. Suba a pasta `frontend/`
2. Configure `VITE_API_URL=https://seu-backend.com/api`
3. Build: `npm run build`

---

## Rotas da API

### Públicas
| Método | Rota | Descrição |
|---|---|---|
| GET | /api/noticias | Lista notícias (aceita ?categoria=slug) |
| GET | /api/noticias/:id | Busca notícia por ID |
| GET | /api/categorias | Lista categorias |
| GET | /api/fontes | Lista fontes |
| GET | /api/configuracoes | Configurações da home |
| GET | /api/modulos | Módulos da home |
| GET | /api/topicos | Tópicos ativos |
| GET | /api/noticias-externas | Notícias externas ativas |

### Autenticadas (requer Bearer token)
| Método | Rota | Descrição |
|---|---|---|
| POST | /api/auth/login | Login → retorna JWT |
| GET | /api/auth/me | Dados do usuário logado |
| POST | /api/noticias | Criar notícia |
| PUT | /api/noticias/:id | Editar notícia |
| DELETE | /api/noticias/:id | Excluir notícia |
| POST | /api/upload | Upload de imagem → Cloudinary |
| DELETE | /api/upload | Remover imagem do Cloudinary |
| ... | (categorias, fontes, módulos, tópicos, etc.) | CRUD completo |

---

## O que foi migrado

| Antes (Supabase) | Depois (MongoDB + Cloudinary) |
|---|---|
| `supabase.auth` | JWT próprio (bcryptjs + jsonwebtoken) |
| `supabase.from('noticias')` | Mongoose + Express REST API |
| `supabase.storage` | Cloudinary via Multer |
| Variáveis `VITE_SUPABASE_*` | `VITE_API_URL` |
| `src/services/supabase.js` | `src/services/api.js` |

> MongoDB **não precisa de SQL** — as coleções são criadas automaticamente pelo Mongoose na primeira inserção. O `npm run seed` já popula tudo.
