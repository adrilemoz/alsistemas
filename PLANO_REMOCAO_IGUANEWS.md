# AL Sistemas — Plano de Remoção do Portal IguaNews

Este documento mapeia todos os arquivos remanescentes do antigo portal IguaNews
e propõe um roteiro seguro de remoção em 3 fases, preservando estabilidade da aplicação.

> ⚠️ **Premissa:** Os arquivos existentes **não serão alterados** até a fase correspondente.
> Cada fase termina com um commit isolado e pode ser revertida individualmente.

---

## 🗺 Mapeamento completo dos arquivos remanescentes

### Frontend — Páginas públicas (nunca mais acessadas)

| Arquivo | Motivo da remoção |
|---|---|
| `src/pages/Home.jsx` | Portal público removido; raiz `/` já redireciona para `/login` |
| `src/pages/NoticiaDetalhe.jsx` | Detalhe de notícia pública — sem rota ativa |
| `src/pages/HorarioOnibus.jsx` | Página pública de horários — sem rota ativa |
| `src/pages/Eventos.jsx` | Listagem pública de eventos — sem rota ativa |

### Frontend — Componentes públicos

| Arquivo | Motivo da remoção |
|---|---|
| `src/components/Navbar.jsx` | Navbar do portal público — não renderizado no SaaS |
| `src/components/Footer.jsx` | Footer do portal público — não renderizado |
| `src/components/NoticiaCard.jsx` | Card de notícia para listagem pública |
| `src/components/NewsletterForm.jsx` | Formulário público de newsletter |
| `src/components/GlobalMeta.jsx` | Tags SEO para portal público — removido do `App.jsx` |

### Frontend — Hooks

| Arquivo | Motivo da remoção |
|---|---|
| `src/hooks/useNoticias.js` | Consome `/api/noticias` para portal público |
| `src/hooks/useEventos.js` | Consome `/api/eventos` para portal público |
| `src/hooks/useRss.js` | Consome RSS para portal público |

### Frontend — Serviços de domínio

| Arquivo | Motivo da remoção |
|---|---|
| `src/services/domains/noticias.js` | API calls de notícias públicas |
| `src/services/domains/noticiasExternas.js` | Notícias externas / extras |
| `src/services/domains/categorias.js` | Categorias do portal |
| `src/services/domains/eventos.js` | Eventos públicos |
| `src/services/domains/fontes.js` | Fontes RSS |
| `src/services/domains/newsletter.js` | Assinaturas de newsletter |
| `src/services/domains/onibus.js` | Horários de ônibus |
| `src/services/domains/rss.js` | Importação RSS |
| `src/services/domains/modulos.js` | Módulos de home do portal |

### Frontend — Estilos

| Arquivo | Motivo da remoção |
|---|---|
| `src/styles/public.css` | Estilos exclusivos do portal público |

### Frontend — Páginas admin do Portal (bloco maior)

| Arquivo | Motivo da remoção |
|---|---|
| `src/pages/admin/AdminNoticias.jsx` | CRUD de notícias — portal legado |
| `src/pages/admin/AdminNoticiaForm.jsx` | Formulário de notícia — portal legado |
| `src/pages/admin/AdminCategorias.jsx` | Gestão de categorias |
| `src/pages/admin/AdminModulos.jsx` | Módulos configuráveis da home |
| `src/pages/admin/AdminOnibus.jsx` | Gestão de horários de ônibus |
| `src/pages/admin/AdminEventos.jsx` | Gestão de eventos |
| `src/pages/admin/AdminNewsletter.jsx` | Gestão de assinantes |
| `src/pages/admin/AdminSEO.jsx` | Configurações SEO do portal |
| `src/pages/admin/AdminRssImport.jsx` | Importação de RSS |
| `src/pages/admin/AdminFontes.jsx` | Fontes RSS |

### Backend — Rotas

| Arquivo | Motivo da remoção |
|---|---|
| `src/routes/noticias.js` | CRUD de notícias |
| `src/routes/rss.js` | Endpoints RSS público |
| `src/routes/rssAdmin.js` | Administração de RSS |
| `src/routes/newsletter.js` | Assinaturas e envios |
| `src/routes/categorias.js` | CRUD de categorias |
| `src/routes/fontes.js` | CRUD de fontes RSS |
| `src/routes/sitemap.js` | Sitemap XML do portal |

### Backend — Serviços

| Arquivo | Motivo da remoção |
|---|---|
| `src/services/rssImporter.js` | Importador de feeds RSS |
| `src/services/rssSanitizer.js` | Sanitizador de HTML de RSS |
| `src/services/noticiaService.js` | Lógica de negócio de notícias |

### Backend — Models

| Arquivo | Motivo da remoção |
|---|---|
| `src/models/Noticia.js` | Schema de notícias |
| `src/models/Assinante.js` | Schema de assinantes de newsletter |
| `src/models/Categoria.js` | Schema de categorias |
| `src/models/Fonte.js` | Schema de fontes RSS |
| `src/models/RssFonte.js` | Schema estendido de fonte RSS |
| `src/models/Evento.js` | Schema de eventos |
| `src/models/ModuloHome.js` | Schema de módulos da home |
| `src/models/ConfiguracaoHome.js` | Schema de configuração da home |
| `src/models/Onibus.js` | Schema de horários de ônibus |

### Backend — Jobs / Controllers

| Arquivo | Motivo da remoção |
|---|---|
| `src/jobs/rssJob.js` | Job agendado de importação RSS |
| `src/controllers/noticiasController.js` | Controller de notícias |

### Backend — Migrations

| Arquivo | Motivo da remoção |
|---|---|
| `migrations/20240101000001-noticia-views-galeria.cjs` | Migration de campos do portal |
| `migrations/20240101000000-indices-compostos.cjs` | Índices de notícias (avaliar se ainda são usados) |

---

## 📦 Contagem de arquivos

| Camada | Arquivos a remover |
|---|---|
| Frontend — páginas públicas | 4 |
| Frontend — componentes públicos | 5 |
| Frontend — hooks | 3 |
| Frontend — serviços | 9 |
| Frontend — estilos | 1 |
| Frontend — páginas admin portal | 10 |
| Backend — rotas | 7 |
| Backend — serviços | 3 |
| Backend — models | 9 |
| Backend — jobs/controllers | 2 |
| Backend — migrations | 1–2 |
| **Total estimado** | **~54 arquivos** |

---

## 🔄 Roteiro de Remoção em 3 Fases

### FASE 1 — Isolamento das rotas e imports (sem deletar nada)

**Objetivo:** Garantir que nenhum arquivo do portal é necessário para o SaaS funcionar.

**Ações:**
1. Remover do `App.jsx`:
   - Todos os `lazy(() => import(...AdminNoticias...))` e similares
   - Todas as rotas `/admin/noticias`, `/admin/categorias`, `/admin/onibus`, etc.
   - Remover imports de páginas públicas (`Home`, `Eventos`, `HorarioOnibus`, `NoticiaDetalhe`)

2. Remover do `AdminLayout.jsx`:
   - Links de navegação para módulos do portal (notícias, categorias, RSS, etc.)
   - Verificar a seção "Módulo: Portal (legado)" no Dashboard e remover os `ModuleBtn` correspondentes

3. Remover do `backend/src/server.js`:
   - Registro das rotas: `noticiasRouter`, `rssRouter`, `rssAdminRouter`, `newsletterRouter`, `categoriasRouter`, `fontesRouter`, `sitemapRouter`
   - Cancelar o `rssJob` no startup

4. Verificar `backend/src/services/api.js` no frontend — remover exports dos serviços de portal.

**Commit:** `chore: isola módulos portal IguaNews do SaaS`
**Risco:** Baixo (apenas remove conexões, não arquivos)

---

### FASE 2 — Remoção dos arquivos do portal (frontend)

**Objetivo:** Deletar todos os arquivos frontend do portal.

**Ordem de deleção segura:**

```bash
# Páginas públicas (nunca mais acessadas após Fase 1)
rm frontend/src/pages/Home.jsx
rm frontend/src/pages/NoticiaDetalhe.jsx
rm frontend/src/pages/HorarioOnibus.jsx
rm frontend/src/pages/Eventos.jsx

# Componentes públicos
rm frontend/src/components/Navbar.jsx
rm frontend/src/components/Footer.jsx
rm frontend/src/components/NoticiaCard.jsx
rm frontend/src/components/NewsletterForm.jsx
rm frontend/src/components/GlobalMeta.jsx

# Hooks do portal
rm frontend/src/hooks/useNoticias.js
rm frontend/src/hooks/useEventos.js
rm frontend/src/hooks/useRss.js

# Serviços de domínio
rm frontend/src/services/domains/noticias.js
rm frontend/src/services/domains/noticiasExternas.js
rm frontend/src/services/domains/categorias.js
rm frontend/src/services/domains/eventos.js
rm frontend/src/services/domains/fontes.js
rm frontend/src/services/domains/newsletter.js
rm frontend/src/services/domains/onibus.js
rm frontend/src/services/domains/rss.js
rm frontend/src/services/domains/modulos.js

# Estilos
rm frontend/src/styles/public.css

# Admin pages do portal
rm frontend/src/pages/admin/AdminNoticias.jsx
rm frontend/src/pages/admin/AdminNoticiaForm.jsx
rm frontend/src/pages/admin/AdminCategorias.jsx
rm frontend/src/pages/admin/AdminModulos.jsx
rm frontend/src/pages/admin/AdminOnibus.jsx
rm frontend/src/pages/admin/AdminEventos.jsx
rm frontend/src/pages/admin/AdminNewsletter.jsx
rm frontend/src/pages/admin/AdminSEO.jsx
rm frontend/src/pages/admin/AdminRssImport.jsx
rm frontend/src/pages/admin/AdminFontes.jsx
```

**Commit:** `feat: remove frontend portal IguaNews (32 arquivos)`
**Risco:** Baixo se Fase 1 foi validada

---

### FASE 3 — Remoção dos arquivos do portal (backend) + MongoDB cleanup

**Objetivo:** Deletar rotas, services, models e jobs do backend. Opcional: dropar coleções do MongoDB.

**Ordem de deleção segura:**

```bash
# Jobs (parar antes de remover)
rm backend/src/jobs/rssJob.js

# Controllers
rm backend/src/controllers/noticiasController.js

# Serviços
rm backend/src/services/rssImporter.js
rm backend/src/services/rssSanitizer.js
rm backend/src/services/noticiaService.js

# Rotas
rm backend/src/routes/noticias.js
rm backend/src/routes/rss.js
rm backend/src/routes/rssAdmin.js
rm backend/src/routes/newsletter.js
rm backend/src/routes/categorias.js
rm backend/src/routes/fontes.js
rm backend/src/routes/sitemap.js

# Models (apenas após confirmar que nenhuma rota ativa os importa)
rm backend/src/models/Noticia.js
rm backend/src/models/Assinante.js
rm backend/src/models/Categoria.js
rm backend/src/models/Fonte.js
rm backend/src/models/RssFonte.js
rm backend/src/models/Evento.js
rm backend/src/models/ModuloHome.js
rm backend/src/models/ConfiguracaoHome.js
rm backend/src/models/Onibus.js

# Migrations (manter como histórico, ou remover se não há risco de rerun)
rm backend/migrations/20240101000001-noticia-views-galeria.cjs
```

**MongoDB — coleções a dropar (opcional, após backup):**
```js
// Executar no MongoDB Atlas ou via mongosh
db.noticias.drop()
db.assinantes.drop()
db.categorias.drop()
db.fontes.drop()
db.rssfontes.drop()
db.eventos.drop()
db.modulohomes.drop()
db.configuracaohomes.drop()
db.onibus.drop()
```

> ⚠️ **Fazer backup completo do banco antes de dropar coleções.**
> Usar `mongoexport` ou o botão "Export Collection" do Atlas.

**Commit:** `feat: remove backend portal IguaNews (21 arquivos)`

---

## ✅ Validação pós-remoção

Após cada fase, verificar:

```bash
# Não deve haver imports órfãos no frontend:
grep -r "AdminNoticias\|NoticiaCard\|useNoticias\|useRss\|useEventos" frontend/src --include="*.jsx" --include="*.js"

# Não deve haver rotas orphans registradas no servidor:
grep -r "noticiasRouter\|rssRouter\|newsletterRouter\|categoriasRouter" backend/src

# Build do frontend deve passar sem erros:
cd frontend && npm run build

# Testes do backend devem passar:
cd backend && npm test
```

---

## 📊 Impacto esperado

| Métrica | Antes | Depois |
|---|---|---|
| Arquivos totais (frontend) | ~90 | ~56 |
| Arquivos totais (backend src) | ~60 | ~38 |
| Bundle size (estimado) | ~2.8MB | ~1.4MB |
| Collections MongoDB | ~20 | ~11 |
| Tempo de build | ~18s | ~10s |

---

## 🔖 Notas adicionais

- `src/models/Extras.js` e `src/routes/extras.js` — avaliar se `Extras` inclui apenas `noticiaExternas` ou serve outras coisas no SaaS.
- `src/components/MarkdownEditor.jsx` — usado no `AdminNoticiaForm`, verificar se é referenciado em algum outro lugar antes de remover.
- `src/components/ImageUpload.jsx` — verificar se é usado apenas no formulário de notícia ou também em `AdminProjetos`/`AdminGitHub`.
- `src/components/admin/infra/` — **manter**, não pertence ao portal.
- `src/components/admin/setup/` — **manter**, não pertence ao portal.
- `src/middleware/validacoes.js` — **manter**, usado em várias rotas do SaaS; apenas remover as validações específicas de notícia se existirem.
