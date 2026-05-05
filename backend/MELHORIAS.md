# IguaNews Backend — Melhorias v2.0

Documentação das 19 melhorias implementadas.

---

## #1 — Cache com Redis (`src/utils/redis.js`, `src/utils/cache.js`)

- Cliente **ioredis** com reconexão automática e fallback transparente para cache em memória
- Interface idêntica: `cacheGet / cacheSet / cacheDel` — nenhuma rota precisou ser alterada
- `viewJaContabilizada(noticiaId, ip)` para deduplicação de views
- Cache aplicado em: configurações (`TTL 60s`), módulos (`TTL 60s`), sitemap (`TTL 600s`), RSS (`TTL 300s`)

## #2 — Paginação por cursor em listagens públicas (`src/routes/extras.js`)

- `GET /api/eventos?cursor=<ISO>&limit=20` — pagina por campo `data`
- `GET /api/onibus?cursor=<ISO>&limit=50` — pagina por `criado_em`
- `GET /api/noticias-externas?cursor=<ISO>&limit=20` — pagina por `criado_em`
- Retornam `{ docs, nextCursor }` quando cursor está presente; modo lista simples sem cursor

## #3 — Índices compostos no MongoDB

Criados via migration e declarados nos schemas:

| Coleção | Índice | Uso |
|---|---|---|
| `noticias` | `{ categoria_id: 1, criado_em: -1 }` | Listagem por categoria |
| `noticias` | `{ destaque: 1, criado_em: -1 }` | Seção de destaques |
| `modulohomes` | `{ ativo: 1, ordem: 1 }` | Módulos ativos ordenados |
| `noticiaexternas` | `{ ativo: 1, ordem: 1 }` | Notícias externas ativas |
| `topicos` | `{ ativo: 1, ordem: 1 }` | Tópicos ativos |
| `onibus` | `{ ativo: 1, ordem: 1 }` | Linhas ativas |
| `eventos` | `{ ativo: 1, data: 1 }` | Eventos futuros ativos |

## #4 — Compressão Brotli

O middleware `compression()` negocia **br** (Brotli) automaticamente quando:
- O cliente envia `Accept-Encoding: br`
- A versão do Node.js é ≥ 18 (suporte nativo ao zlib.brotliCompress)

Nenhuma alteração necessária — já estava correto.

## #5 — Contagem de visualizações (`src/routes/noticias.js`, `src/models/Noticia.js`)

- Campo `views: Number` adicionado ao schema
- `GET /api/noticias/:id` incrementa via `$inc` no retorno
- Deduplicação por IP: Redis armazena `view:<id>:<ip>` com TTL de 24h
- Sem Redis: incrementa sempre (aceita todas as views)

## #6 — Busca avançada com filtros combinados

- **Múltiplas categorias**: `?categoria=esportes,politica` (slugs separados por vírgula)
- **Intervalo de datas**: `?dataInicio=2024-01-01&dataFim=2024-12-31`
- **Ordenação**: `?ordem=recente|antigo|relevancia`
- `relevancia` usa `{ score: { $meta: 'textScore' } }` — só disponível com `?q=`

## #7 — Logging estruturado com pino (`src/utils/logger.js`)

- `pino` como logger base; `pino-http` para middleware de request logging
- Cada log inclui: `requestId`, `method`, `url`, `statusCode`, `responseTime`
- Nível controlado por `LOG_LEVEL` (padrão: `info`)
- Em produção: JSON puro (ideal para Datadog, Loki, CloudWatch)

## #8 — Métricas de desempenho (`src/middleware/metricas.js`, `src/routes/metrics.js`)

- **`GET /metrics`** — formato Prometheus (scraping com `curl /metrics | grep iguanews`)
- Métricas expostas:
  - `iguanews_http_duration_seconds` — histograma por rota/método/status
  - `iguanews_http_requests_total` — contador por rota/método/status
  - Métricas de processo: `process_cpu_seconds_total`, `process_resident_memory_bytes`, etc.
- Proteção por `X-Metrics-Token` em produção (variável `METRICS_TOKEN`)

## #9 — Health check detalhado (`src/routes/health.js`)

`GET /api/health` retorna:
```json
{
  "ok": true,
  "env": "production",
  "latencia_ms": 42,
  "servicos": {
    "mongodb":    { "ok": true,  "status": "conectado" },
    "redis":      { "ok": true,  "status": "conectado" },
    "cloudinary": { "ok": true,  "status": "conectado" }
  }
}
```
Status 503 quando qualquer serviço crítico (Mongo ou Cloudinary) falhar.

## #10 — Rastreamento distribuído (`src/middleware/requestId.js`)

- Middleware `requestIdMiddleware` gera UUID v4 por requisição
- Lê `X-Request-Id` do cliente (propaga se presente) ou gera novo
- Propagado em: header de resposta, logs pino-http, audit log

## #11 — Migrações com migrate-mongo (`migrations/`)

```bash
npm run migrate           # aplica pendentes
npm run migrate:down      # reverte o último
npm run migrate:status    # lista estado de cada migration
```

Migrations criadas:
1. `20240101000000-indices-compostos.cjs` — cria todos os índices compostos
2. `20240101000001-noticia-views-galeria.cjs` — adiciona campos `views` e `galeria` a documentos existentes

## #12 — Testes de integração (`src/__tests__/`)

Cobertura expandida com 5 arquivos de teste:
- `auth.test.js` — login, logout, token inválido, ausência de body
- `noticias.test.js` — listagem, cursor, múltiplas categorias, views, galeria, CRUD, erros
- `extras.test.js` — eventos, ônibus, notícias externas, cursor pagination
- `health.test.js` — health check, métricas, sitemap, RSS
- `auditLog.test.js` — gravação automática de criar/editar/excluir, listagem com filtros
- `cache.test.js` — fallback em memória, TTL, deduplicação

## #13 — Documentação OpenAPI / Swagger (`src/config/swagger.js`)

- **`GET /api/docs`** — Swagger UI interativo
- **`GET /api/docs.json`** — spec OpenAPI em JSON (para geração de clientes)
- Anotações JSDoc `@swagger` nas rotas principais
- Schemas de segurança: `cookieAuth` (HttpOnly)

## #14 — Validação de variáveis de ambiente (`src/config/env.js`)

- Validação **Zod** executada antes da inicialização do servidor
- Falha com mensagem descritiva se variável obrigatória estiver ausente:
  ```
  ❌ Variáveis de ambiente inválidas:
     • MONGO_URI: MONGO_URI é obrigatório
     • JWT_SECRET: JWT_SECRET deve ter ao menos 16 caracteres
  ```

> ⚠️ **Correção importante (ES Modules):** Em projetos com `"type": "module"`, os `import`
> são hoistados pelo runtime — ou seja, `import './config/env.js'` em `server.js` é
> executado *antes* de `import 'dotenv/config'`, mesmo que apareça depois no arquivo.
> Por isso o `dotenv/config` **deve ser importado dentro do próprio `env.js`**, não no
> `server.js`. Caso contrário o Zod valida `process.env` antes de o `.env` ser carregado,
> gerando o erro "Variáveis de ambiente inválidas" mesmo com o arquivo `.env` correto.

## #15 — Dockerização (`Dockerfile`, `docker-compose.yml`)

```bash
# Desenvolvimento local completo (Backend + MongoDB + Redis)
docker compose up --build

# Produção (multi-stage, imagem ~120MB)
docker build -t iguanews-backend .
docker run -p 3001:3001 --env-file .env iguanews-backend
```

- Multi-stage build (Node 20 Alpine)
- Usuário não-root por segurança
- HEALTHCHECK via `/api/health`
- Graceful shutdown em SIGTERM (fecha conexões antes de sair)

## #16 — Sitemap.xml dinâmico (`src/routes/sitemap.js`)

- **`GET /sitemap.xml`** — até 1000 notícias mais recentes
- `<lastmod>` usando `atualizado_em` ou `criado_em`
- Resposta cacheada por 10 minutos

## #17 — RSS Feed (`src/routes/rss.js`)

- **`GET /rss`** — últimas 50 notícias em RSS 2.0
- Inclui: `<title>`, `<description>`, `<pubDate>`, `<guid>`, `<category>`, `<enclosure>` (imagem)
- Resposta cacheada por 5 minutos

## #18 — Galeria de imagens (`src/models/Noticia.js`, `src/routes/noticias.js`)

Campo `galeria: [{ url, public_id, legenda, ordem }]` adicionado ao modelo.

Novas rotas:
- `POST /api/noticias/:id/galeria` — adiciona imagens ao array
- `DELETE /api/noticias/:id/galeria/:publicId` — remove imagem e destrói no Cloudinary
- `POST /api/noticias` aceita `galeria` no body
- `DELETE /api/noticias/:id` remove todas as imagens da galeria do Cloudinary

## #19 — Audit Log (`src/models/AuditLog.js`, `src/middleware/auditLog.js`)

Middleware `auditLog(recurso)` inserido nas rotas admin após `autenticar`:
- Registra: `admin_id`, `admin_email`, `acao` (criar/editar/excluir), `recurso`, `recurso_id`, `payload` (sem campos sensíveis), `ip`, `request_id`
- **`GET /api/audit-logs`** — listagem paginada com filtro por `recurso` e `admin_id`

---

## Instalação

```bash
npm install
cp .env.example .env
# Editar .env com suas credenciais
npm run migrate
npm run dev
```

## Stack de Dependências Adicionadas

| Pacote | Versão | Finalidade |
|---|---|---|
| `ioredis` | ^5.3 | Cliente Redis (#1) |
| `pino` + `pino-http` | ^9 / ^10 | Logging estruturado (#7) |
| `prom-client` | ^15 | Métricas Prometheus (#8) |
| `swagger-jsdoc` + `swagger-ui-express` | ^6 / ^5 | Docs OpenAPI (#13) |
| `zod` | ^3.22 | Validação de env (#14) |
| `migrate-mongo` | ^11 | Migrações (#11) |
| `uuid` | ^10 | Request ID (#10) |

---

## #20 — Correção crítica no módulo de Backup + Importação de backups

### Bug corrigido: "Erro ao carregar backups: ID inválido"

**Causa raiz:** Em `src/routes/backup.js`, a rota `GET /~stats` estava declarada **depois** das rotas `GET /:id`, `GET /:id/download` etc. O Express faz matching de rotas na ordem de declaração, portanto `GET /~stats` era capturada por `GET /:id` com `id = "~stats"`, que então falhava na validação de formato (`!/^backup_\d+$/.test("~stats")`) e retornava `{ erro: "ID inválido" }`. O frontend exibia esse erro como `"Erro ao carregar backups: ID inválido"`.

**Correção:** A rota `/~stats` foi movida para **antes** de qualquer rota com parâmetro `/:id`.

**Arquivos alterados:**
- `backend/src/routes/backup.js` — reordenação das rotas + comentário de alerta

---

### Nova funcionalidade: Importação de backup via arquivo

Permite enviar um arquivo `.json` (exportado previamente via "Download") de volta ao servidor para registrá-lo como backup restaurável.

**Rota adicionada:**

| Método | Caminho | Auth | Descrição |
|---|---|---|---|
| `POST` | `/api/admin/backup/import` | ✅ Sim | Importa um arquivo `.json` como novo backup |

**Parâmetros (multipart/form-data):**
- `arquivo` *(obrigatório)* — arquivo `.json` com as coleções
- `descricao` *(opcional)* — descrição do backup importado

**Validações realizadas:**
- Arquivo presente (`400` se ausente)
- JSON válido e parseável (`400` se malformado)
- Objeto JSON com coleções como chaves (`400` se formato inválido)
- Cada coleção deve ser um array de documentos

**Manifest gerado automaticamente:**
- Campo `importado: true` para identificar backups importados
- Campo `arquivo_original` com o nome do arquivo enviado
- Stats calculados a partir dos dados do arquivo (sem consultar o banco)

**Frontend:**
- `frontend/src/services/api.js` — método `backupService.importar(arquivo, descricao)` adicionado; variável duplicada `BASE_API` removida (unificada com `BASE_URL` já existente)
- `frontend/src/pages/admin/AdminBackup.jsx` — seção "Importar backup" com área de seleção de arquivo (drag-friendly click zone), campo de descrição, botão de importar e badge "IMPORTADO" na listagem

**Dependência:** `multer` (já presente no projeto).

---

## Sprint 1 — Frontend: Qualidade de código & Bugs críticos

> Refatoração cross-cutting no painel admin. Nenhuma funcionalidade de negócio alterada.

### Bugs corrigidos

**B1 — Rota `/admin/categorias` exibia a tela errada**  
`App.jsx` importava `AdminNoticias` para a rota `categorias`; `AdminCategorias` não era importado.
Corrigido com import lazy correto e substituição no JSX da rota.

**B2 — Enum de `status` em `Noticia.js` sem `'revisao'`** *(backend)*  
O modelo Mongoose não incluía `'revisao'` no array `enum`, apesar de todas as rotas
(`noticias.js`) e o frontend usarem esse valor. Isso causava falha silenciosa de validação ao
tentar mover uma notícia para revisão.  
Corrigido: `enum: ['rascunho', 'revisao', 'publicado', 'arquivado']`

**B3 — `<AdminSEO>` sem `<AdminSuspense>` causava crash no lazy load**  
Todas as outras rotas admin usavam `<AdminSuspense>`; `AdminSEO` era a única exceção.
Corrigido com o wrapper apropriado em `App.jsx`.

### Novos arquivos (frontend)

| Arquivo | Descrição |
|---------|-----------|
| `src/themes/tokens.js` | Tokens de cor centralizados — CSS vars + fallbacks. Substitui os 5 objetos `const C` duplicados nos componentes admin |
| `src/components/admin/ui/AdminIcon.jsx` | Biblioteca de 50+ ícones SVG nomeados. Substitui os 5 objetos `const Ico` duplicados |
| `src/components/admin/ui/ForcaSenha.jsx` | Indicador de força de senha (5 níveis). Unifica as duas implementações divergentes de `AdminSetup` e `AdminUsuarios` |
| `src/utils/permissions.js` | `GRUPOS_PERMISSOES` em fonte única |
| `src/styles/base.css` | Extraído de `index.css` — Tailwind + reset |
| `src/styles/public.css` | Extraído de `index.css` — componentes do site público |
| `src/styles/admin.css` | Extraído de `index.css` — design system do painel |
