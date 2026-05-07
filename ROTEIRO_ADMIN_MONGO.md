# ROTEIRO — Tela de Gerenciamento MongoDB
# Documento de contexto para Claude executar sem re-examinar o projeto

---

## INSTRUÇÕES PARA O CLAUDE QUE LER ESTE ARQUIVO

Você recebeu este arquivo junto com o zip do projeto `alsistemas`.
Ele contém TODO o contexto necessário. Não explore o projeto além do solicitado.
Este roteiro é autocontido: stack, padrões visuais, arquivos a criar e onde registrá-los.
Entregue tudo em um único zip ao final. Liste os arquivos criados/modificados.

---

## CONTEXTO DO PROJETO

**Nome:** AL Sistemas — SaaS Admin Panel
**Frontend:** React + Vite + Tailwind, sem bibliotecas de componentes externas
**Backend:** Node.js + Express + Mongoose (ESM, import/export)
**Autenticação:** JWT via middleware/auth.js + middleware/verificarPermissao.js
**Estilo admin:** inline styles com tokens de src/themes/tokens.js (import { T as C } from '../../themes/tokens')
**Padrão visual:** igual ao AdminInfraestrutura.jsx — tabs superiores, cards com background:C.surface, border:1px solid C.border, borderRadius:12px
**Ícones:** componente AdminIcon de components/admin/ui/AdminIcon.jsx (não usar emojis como ícones funcionais)
**Roteamento:** React Router v6, rotas lazy em App.jsx, layout em AdminLayout.jsx

---

## REGRAS ABSOLUTAS

- NUNCA expor operações destrutivas em massa: sem dropCollection, sem dropDatabase, sem deleteMany sem filtro
- NUNCA exibir nem logar senhas, tokens ou campos senha/password nos documentos — mascarar sempre
- NUNCA permitir execução de JavaScript arbitrário no servidor (sem eval, sem $where)
- NUNCA usar bibliotecas externas novas — apenas o que já existe no package.json
- SEMPRE proteger todas as rotas com verificarToken + verificarPermissao('admin')
- SEMPRE seguir o padrão ESM do backend (import/export, sem require)
- SEMPRE manter este arquivo (ROTEIRO_ADMIN_MONGO.md) intacto no zip de saída

---

## O QUE SERÁ CRIADO

### Arquivos novos
```
backend/src/routes/mongoAdmin.js
frontend/src/pages/admin/AdminMongo.jsx
```

### Arquivos modificados
```
backend/src/server.js
frontend/src/App.jsx
frontend/src/pages/admin/AdminLayout.jsx
```

---

## BACKEND — backend/src/routes/mongoAdmin.js

### Endpoints a implementar

```
GET  /admin/mongo/colecoes
     Lista todas as colecoes com nome, contagem de docs, tamanho em bytes.
     Excluir da lista: 'sessions', 'system.*'

GET  /admin/mongo/colecoes/:nome/documentos
     Params: page (default 1), limit (default 20, max 50), filtro (JSON string opcional)
     Retorna: { docs, total, page, pages }
     Mascarar campo 'senha' e 'password' em todos os docs retornados

DELETE /admin/mongo/colecoes/:nome/documentos/:id
     Deleta um unico documento por _id
     Registrar no AuditLog: acao='mongo_delete', recurso=nome/id

PUT  /admin/mongo/colecoes/:nome/documentos/:id
     Body: { campos: { chave: valor } }
     Aplica $set com apenas os campos enviados (nunca substituicao total)
     Rejeitar tentativa de alterar campo '_id'
     Registrar no AuditLog: acao='mongo_update', recurso=nome/id

POST /admin/mongo/colecoes/:nome/aggregate
     Body: { pipeline: [ ... ] }
     Limite: maximo 5 estagios, sem $out, sem $merge
     Retorna: { resultado, total }
     Timeout de 5 segundos na query
```

### Padrao de autenticacao (copiar de outra rota existente)
```js
import { verificarToken }     from '../middleware/auth.js'
import { verificarPermissao } from '../middleware/verificarPermissao.js'
import { registrarAuditLog }  from '../middleware/auditLog.js'

router.use(verificarToken)
router.use(verificarPermissao('admin'))
```

### Como acessar colecoes sem model fixo
```js
import mongoose from 'mongoose'
const db = mongoose.connection.db

// Listar colecoes:
const colecoes = await db.listCollections().toArray()

// Buscar documentos:
const col = db.collection(nome)
const docs = await col.find(filtro).skip(skip).limit(limit).toArray()
const total = await col.countDocuments(filtro)

// Deletar:
await col.deleteOne({ _id: new mongoose.Types.ObjectId(id) })

// Atualizar:
await col.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: campos })
```

---

## FRONTEND — frontend/src/pages/admin/AdminMongo.jsx

### Estrutura de tabs
```
[Colecoes]  [Documentos]  [Aggregate]
```

### Tab Colecoes
- Grid de cards (3 colunas desktop, 1 mobile)
- Cada card: nome da colecao, contagem de docs, tamanho formatado (KB/MB)
- Clique no card seleciona a colecao e muda para tab Documentos
- Botao atualizar no cabecalho

### Tab Documentos
- Dropdown para selecionar a colecao
- Campo de filtro JSON opcional com validacao antes de enviar
- Tabela: _id, primeiras 3-4 chaves do documento, coluna Acoes
- Acoes por linha: botao Editar (abre modal) e botao Excluir (abre ConfirmModal)
- Paginacao: Anterior | Pagina X de Y | Proxima
- Campo senha exibido como pontos (ja mascarado no backend)

### Modal de Edicao
- Campos do documento como inputs editaveis (exceto _id, __v, criado_em)
- Campos objeto/array: textarea com JSON formatado
- Botao Salvar alteracoes chama PUT
- Usar ConfirmModal existente em components/ConfirmModal.jsx para confirmar exclusao

### Tab Aggregate
- Dropdown de colecao
- Textarea para o pipeline JSON
- Placeholder de exemplo:
  [{ "$match": { "ativo": true } }, { "$group": { "_id": "$status", "total": { "$sum": 1 } } }]
- Botao Executar chama POST
- Resultado em pre com scroll
- Aviso fixo: Operacoes $out e $merge nao sao permitidas

### Tokens de cor a usar
```js
import { T as C } from '../../themes/tokens'
// C.surface, C.surf2, C.border, C.text, C.muted, C.amber
// Vermelho de perigo: '#ef4444'
// Azul de acao:      '#3b82f6'
// Verde de ok:       '#22c55e'
```

### Servico de dominio (criar em services/domains/mongo.js)
Verificar o padrao exato consultando services/domains/usuarios.js antes de escrever.
Criar funcoes: colecoes(), documentos(nome, params), deletar(nome, id), atualizar(nome, id, body), aggregate(nome, pipeline)
Registrar o novo servico em services/api.js junto aos demais.

---

## REGISTROS NECESSARIOS

### backend/src/server.js
```js
import mongoAdminRouter from './routes/mongoAdmin.js'
app.use('/admin/mongo', mongoAdminRouter)
```
Inserir junto ao bloco de rotas admin existentes.

### frontend/src/App.jsx
```js
const AdminMongo = lazy(() => import('./pages/admin/AdminMongo'))
<Route path="mongo" element={<S><AdminMongo /></S>} />
```

### frontend/src/pages/admin/AdminLayout.jsx
Adicionar link na secao de navegacao do SaaS core, junto a Infraestrutura ou Backup.
Icone sugerido: name="db" (ja usado em Backup/AuditLog).
Label: "MongoDB"
Rota: /admin/mongo

---

## CRITERIO DE PRONTO

- [ ] GET /admin/mongo/colecoes retorna lista com contagem e tamanho
- [ ] GET documentos pagina corretamente, campos senha mascarados
- [ ] DELETE e PUT funcionam e registram no AuditLog
- [ ] POST aggregate rejeita $out e $merge com erro 400
- [ ] Tab Colecoes exibe cards clicaveis que abrem Documentos
- [ ] Tab Documentos filtra por JSON e pagina
- [ ] Modal edita apenas com $set (sem substituicao total)
- [ ] ConfirmModal aparece antes de qualquer exclusao
- [ ] Rota /admin/mongo aparece no menu lateral
- [ ] Nenhum campo senha exibido em texto claro
