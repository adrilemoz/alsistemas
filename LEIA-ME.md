# Sprint 1 — Substituição direta (completa)

## Como aplicar

Copie cada arquivo para o caminho correspondente no seu projeto:

| Arquivo neste zip | Destino no projeto |
|---|---|
| `frontend/src/App.jsx` | `alsistemas/frontend/src/App.jsx` |
| `frontend/src/components/PrivateRoute.jsx` | `alsistemas/frontend/src/components/PrivateRoute.jsx` |
| `frontend/src/pages/Login.jsx` | `alsistemas/frontend/src/pages/Login.jsx` |
| `frontend/src/pages/admin/AdminLayout.jsx` | `alsistemas/frontend/src/pages/admin/AdminLayout.jsx` |
| `.env.additions` | cole o conteúdo no seu `frontend/.env` |

## Backend
Nenhum arquivo de backend foi alterado.

## O que muda visivelmente
- Acessar `/` redireciona para `/login`
- Topbar e drawer mostram o nome definido em `VITE_APP_NAME`
- Botões "Ver site" e "Nova notícia" sumem da topbar (sem portal público)
- NAV: Dashboard / Erros & Logs / Usuários / Sistema / Módulo: Portal
- Todas as páginas de admin continuam funcionando normalmente

## Próxima sprint
Sprint 2 — reescrita do AdminDashboard com foco em saúde do sistema.
Ver `SAAS_TRANSFORMATION_PLAN.md` para o detalhamento.
