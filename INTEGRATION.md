# Guia de Integração — Sistema RSS Refatorado

## 1. Dependências

Adicione ao seu `package.json`:

```json
{
  "dependencies": {
    "rss-parser":     "^3.13.0",
    "sanitize-html":  "^2.13.0",
    "slugify":        "^1.6.6",
    "node-cron":      "^3.0.3"
  }
}
```

```bash
npm install rss-parser sanitize-html slugify node-cron
```

---

## 2. Estrutura de arquivos

```
src/
├── models/
│   ├── Noticia.js           ← schema completo (substituir o atual)
│   └── RssFonte.js          ← mantém o existente (já corrigido)
├── services/
│   ├── rssSanitizer.js      ← sanitização HTML (novo)
│   └── rssImporter.js       ← importador central (substitui rssImport.js)
├── jobs/
│   └── rssJob.js            ← agendador cron (substitui rssScheduler.js)
└── routes/
    └── rssAdmin.js          ← rotas admin (substitui rssImport.js routes)
```

---

## 3. Alterações no server.js

### 3a. Registrar plugin Mongoose ANTES de qualquer import de model

O bug anterior ocorria porque `rssScheduler.js` era importado antes do
`mongoose.plugin()`. Com ESM, todos os `import` são resolvidos antes do
corpo do módulo executar.

**Solução:** mova o plugin para um arquivo separado importado primeiro:

```js
// src/plugins/mongoosePlugin.js
import mongoose from 'mongoose'

mongoose.plugin(schema => {
  schema.set('toJSON', {
    virtuals:   true,
    versionKey: false,
    transform: (_doc, ret) => {
      ret.id = ret._id?.toString()
      delete ret._id
      return ret
    },
  })
})
```

```js
// server.js — PRIMEIRO import do projeto
import './plugins/mongoosePlugin.js'  // deve vir antes de tudo
import mongoose from 'mongoose'
// ... restante dos imports
```

### 3b. Substituir o scheduler

```js
// Remover:
import { iniciarSchedulerRss, pararSchedulerRss } from './utils/rssScheduler.js'

// Adicionar:
import { iniciarRssJob, pararRssJob } from './jobs/rssJob.js'

// No iniciarServidor():
iniciarRssJob('0 * * * *')  // a cada hora

// No graceful shutdown:
pararRssJob()
```

### 3c. Substituir a rota

```js
// Remover:
import rssImportRoutes from './routes/rssImport.js'

// Adicionar:
import rssAdminRoutes from './routes/rssAdmin.js'

// No app.use():
app.use('/api/admin/rss', rssAdminRoutes)
```

---

## 4. Migração do model Noticia

Os novos campos adicionados ao schema:

| Campo           | Tipo      | Descrição                                      |
|-----------------|-----------|------------------------------------------------|
| `guid`          | String    | Hash MD5 do link/guid do feed (unique sparse)  |
| `slug`          | String    | Slug SEO (unique)                              |
| `importado`     | Boolean   | true = importado via RSS                       |
| `rss_fonte_id`  | ObjectId  | Ref ao RssFonte que gerou a notícia            |
| `url_original`  | String    | Link original na fonte                         |
| `publicado_em`  | Date      | Data da publicação original no feed            |
| `autor`         | String    | Autor do artigo (dc:creator)                   |

Se já tiver dados no banco, a migração é safe: todos os novos campos
têm `default: null` ou `default: false`, então documentos antigos
não quebram.

---

## 5. Índice único no guid (criar no MongoDB)

O Mongoose cria automaticamente o índice ao iniciar o servidor
(quando `autoIndex: true`, padrão em desenvolvimento).

Em produção, crie manualmente:

```js
// Executar uma vez no shell do mongo ou via script de migração:
db.noticias.createIndex(
  { guid: 1 },
  { unique: true, sparse: true, name: 'guid_unique_sparse' }
)

db.noticias.createIndex(
  { slug: 1 },
  { unique: true, name: 'slug_unique' }
)
```

---

## 6. Deduplicação — Resumo das opções

### Opção A: Check-before-insert (implementação atual antiga)
```js
const existe = await Noticia.findOne({ titulo: item.titulo })
if (existe) { duplicadas++; continue }
await Noticia.create({ ... })
```
**Problemas:** N queries no banco, race condition, lento para muitos itens,
usa título como chave (títulos iguais em fontes diferentes são legítimos).

### Opção B: Unique index + insertMany ordered:false ✅ (implementação nova)
```js
await Noticia.insertMany(docs, { ordered: false })
// O MongoDB rejeita silenciosamente docs com guid duplicado
```
**Vantagens:** Uma única operação bulk, sem race condition, O(1) por item
(o banco usa o índice B-tree), escala para centenas de itens por ciclo.

---

## 7. Estratégia para feeds sem conteúdo completo

Alguns feeds (Folha, G1) entregam apenas o resumo no `<description>`.

**Fallback automático** (já implementado no rssImporter.js):
```
contentEncoded → content → summary → description → excerpt
```

**Alternativa com scraping** (não incluída, implementar se necessário):
```js
import * as cheerio from 'cheerio'

async function scrapeFullContent(url) {
  const res  = await fetch(url, { headers: { 'User-Agent': '...' } })
  const html = await res.text()
  const $    = cheerio.load(html)

  // Seletores comuns de artigo — ajuste por fonte:
  const conteudo =
    $('article .content').html() ||
    $('[itemprop="articleBody"]').html() ||
    $('main article').html() ||
    null

  return conteudo ? sanitizeContent(conteudo) : null
}
```
**Cuidado:** scraping viola os termos de uso de alguns sites e é frágil
(muda com redesign). Use apenas em fontes próprias ou parceiras.

---

## 8. Exemplos de uso direto

```js
// Importar uma fonte específica manualmente:
import { importarFonte } from './services/rssImporter.js'
import RssFonte from './models/RssFonte.js'

const fonte = await RssFonte.findById('...')
const resultado = await importarFonte(fonte, { categoria_id: '...' })
console.log(resultado)
// → { importadas: 8, ignoradas: 2, erros: [], total: 10 }


// Importar todas as fontes ativas:
import { importarTodasFontes } from './services/rssImporter.js'

const resultados = await importarTodasFontes(3) // 3 fontes em paralelo


// Testar um feed antes de cadastrar:
import { parseFeed } from './services/rssImporter.js'

const items = await parseFeed('https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.rss')
console.log(`Feed tem ${items.length} itens`)


// Sanitizar HTML avulso:
import { sanitizeContent, makeExcerpt } from './services/rssSanitizer.js'

const safe    = sanitizeContent('<script>alert(1)</script><p>Conteúdo</p>')
const excerpt = makeExcerpt(safe, 150)
```
