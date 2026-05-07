# AL Sistemas — Rodando no Termux (localhost)

## O que foi corrigido

| Arquivo | Alteração |
|---|---|
| `backend/.env` | `NODE_ENV=development`, `FRONTEND_URL=http://localhost:5173`, removido conteúdo duplicado do `.env.example` |
| `frontend/.env` | `VITE_API_URL=http://localhost:3001/api` |
| `frontend/src/services/domains/http.js` | Fallback hardcoded trocado de Render → `http://localhost:3001/api` |
| `frontend/vite.config.js` | Adicionado proxy `/api → localhost:3001` (resolve CORS em dev) |
| `frontend/capacitor.config.ts` | URL do Vercel comentada; `cleartext: true` e `androidScheme: 'http'` |

---

## Como rodar no Termux

### Pré-requisito: Node.js instalado
```bash
pkg install nodejs
```

### 1. Backend
```bash
cd alsistemas/backend
npm install
npm run dev
# → http://localhost:3001
```

### 2. Frontend (outro terminal Termux)
```bash
cd alsistemas/frontend
npm install
npm run dev
# → http://localhost:5173
```

### Credenciais padrão
- **Email:** admin@al-sistemas.com  
- **Senha:** admin123

---

## Redis (opcional)
O backend sobe normalmente sem Redis — usa cache em memória como fallback automático.  
Se quiser instalar: `pkg install redis` e depois `redis-server &`

## MongoDB
Já configurado para conectar no Atlas (nuvem). Sem instalação local necessária.
