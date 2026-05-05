/**
 * Infraestrutura — IguaNews
 *
 * Módulo para gerenciar MongoDB e Cloudinary diretamente pelo painel admin.
 *
 * Rotas:
 *   ── Conexões ──────────────────────────────────────────────────
 *   POST /testar-conexoes       → testa MongoDB + Cloudinary com as credenciais atuais
 *
 *   ── MongoDB ───────────────────────────────────────────────────
 *   GET  /mongodb/status        → info da conexão (DB, versão, uptime)
 *   GET  /mongodb/colecoes      → lista coleções com contagens e tamanho estimado
 *   GET  /mongodb/colecoes/:nome          → documentos paginados de uma coleção
 *   DELETE /mongodb/colecoes/:nome/doc/:id → apaga um documento pelo _id
 *
 *   ── Cloudinary ────────────────────────────────────────────────
 *   GET  /cloudinary/status     → uso de conta (storage, bandwidth, créditos)
 *   GET  /cloudinary/recursos   → lista recursos (imagens/vídeos) com paginação
 *   DELETE /cloudinary/recursos → apaga um recurso pelo public_id
 */
import { Router }   from 'express'
import mongoose      from 'mongoose'
import { v2 as cloudinary } from 'cloudinary'
import { autenticar }        from '../middleware/auth.js'
import { verificarPermissao } from '../middleware/verificarPermissao.js'

const router = Router()
router.use(autenticar)
router.use(verificarPermissao('configuracoes.gerenciar'))

// ─── helper: reconfigura Cloudinary com .env atual ────────────
function configurarCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME  || '',
    api_key:    process.env.CLOUDINARY_API_KEY      || '',
    api_secret: process.env.CLOUDINARY_API_SECRET   || '',
  })
}

// ─── helper: converte bytes para formato legível ───────────────
function fmtBytes(b) {
  if (!b || b === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(b) / Math.log(1024))
  return `${(b / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

// ═══════════════════════════════════════════════════════════════
//  POST /testar-conexoes
// ═══════════════════════════════════════════════════════════════
router.post('/testar-conexoes', async (_req, res, next) => {
  try {
    const resultados = { mongodb: {}, cloudinary: {} }

    // ── MongoDB ──
    const estadoMongo = mongoose.connection.readyState
    // 0=desconectado, 1=conectado, 2=conectando, 3=desconectando
    const estadoLabels = { 0: 'desconectado', 1: 'conectado', 2: 'conectando', 3: 'desconectando' }
    resultados.mongodb = {
      ok:    estadoMongo === 1,
      estado: estadoLabels[estadoMongo] || 'desconhecido',
      db:    mongoose.connection.name || '—',
      host:  mongoose.connection.host || '—',
    }

    // ── Cloudinary ──
    configurarCloudinary()
    const temCredenciais =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY    &&
      process.env.CLOUDINARY_API_SECRET

    if (!temCredenciais) {
      resultados.cloudinary = { ok: false, erro: 'Credenciais não configuradas' }
    } else {
      try {
        const ping = await cloudinary.api.ping()
        resultados.cloudinary = { ok: ping.status === 'ok', status: ping.status }
      } catch (cErr) {
        resultados.cloudinary = { ok: false, erro: cErr.message }
      }
    }

    res.json(resultados)
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════
//  MongoDB — status
// ═══════════════════════════════════════════════════════════════
router.get('/mongodb/status', async (_req, res, next) => {
  try {
    const conn  = mongoose.connection
    const admin = conn.db?.admin()
    let serverInfo = {}
    try {
      serverInfo = await admin?.serverInfo() || {}
    } catch { /* pode falhar em Atlas */ }

    let dbStats = {}
    try {
      dbStats = await conn.db?.stats() || {}
    } catch { /* pode falhar sem permissão */ }

    const estados = { 0: 'desconectado', 1: 'conectado', 2: 'conectando', 3: 'desconectando' }

    res.json({
      estado:      estados[conn.readyState] || 'desconhecido',
      conectado:   conn.readyState === 1,
      banco:       conn.name || '—',
      host:        conn.host || '—',
      porta:       conn.port || '—',
      versao:      serverInfo.version || '—',
      colecoes:    dbStats.collections ?? '—',
      objetos:     dbStats.objects ?? '—',
      tamanho_dados: fmtBytes(dbStats.dataSize),
      tamanho_armazenamento: fmtBytes(dbStats.storageSize),
      indice_tamanho: fmtBytes(dbStats.indexSize),
      mongo_uri_parcial: (process.env.MONGO_URI || '').replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'),
    })
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════
//  MongoDB — listar coleções
// ═══════════════════════════════════════════════════════════════
router.get('/mongodb/colecoes', async (_req, res, next) => {
  try {
    const db   = mongoose.connection.db
    const cols = await db.listCollections().toArray()

    const detalhes = await Promise.all(
      cols.map(async (col) => {
        const contagem = await db.collection(col.name).countDocuments().catch(() => -1)
        let tamanho = '—'
        try {
          const stats = await db.command({ collStats: col.name, scale: 1 })
          tamanho = fmtBytes(stats.size)
        } catch { /* sem permissão no Atlas — ignorar */ }
        return { nome: col.name, contagem, tamanho }
      })
    )

    // ordena por nome
    detalhes.sort((a, b) => a.nome.localeCompare(b.nome))
    res.json({ colecoes: detalhes })
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════
//  MongoDB — documentos de uma coleção (paginado)
// ═══════════════════════════════════════════════════════════════
router.get('/mongodb/colecoes/:nome', async (req, res, next) => {
  try {
    const { nome } = req.params
    const page  = Math.max(1, parseInt(req.query.page  || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || '20')))
    const q     = req.query.q?.trim() || ''

    const db  = mongoose.connection.db
    const col = db.collection(nome)

    // filtro simples por _id ou por texto se fornecido
    let filtro = {}
    if (q) {
      // tenta como ObjectId, senão faz regex nos campos string
      try {
        const { ObjectId } = await import('mongodb')
        if (ObjectId.isValid(q) && q.length === 24) {
          filtro = { _id: new ObjectId(q) }
        }
      } catch { /* não é ObjectId válido */ }
    }

    const total = await col.countDocuments(filtro)
    const docs  = await col
      .find(filtro)
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray()

    res.json({
      colecao:   nome,
      total,
      page,
      limit,
      paginas:   Math.ceil(total / limit),
      documentos: docs,
    })
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════
//  MongoDB — excluir um documento
// ═══════════════════════════════════════════════════════════════
router.delete('/mongodb/colecoes/:nome/doc/:id', async (req, res, next) => {
  try {
    const { nome, id } = req.params
    const db  = mongoose.connection.db
    const col = db.collection(nome)

    const { ObjectId } = await import('mongodb')
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ erro: 'ID inválido' })
    }

    const resultado = await col.deleteOne({ _id: new ObjectId(id) })
    if (resultado.deletedCount === 0) {
      return res.status(404).json({ erro: 'Documento não encontrado' })
    }

    res.json({ ok: true, mensagem: 'Documento excluído com sucesso' })
  } catch (err) { next(err) }
})

// ═══════════════════════════════════════════════════════════════
//  Cloudinary — status / uso da conta
// ═══════════════════════════════════════════════════════════════
router.get('/cloudinary/status', async (_req, res, next) => {
  try {
    configurarCloudinary()

    const temCredenciais =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY    &&
      process.env.CLOUDINARY_API_SECRET

    if (!temCredenciais) {
      return res.status(400).json({ erro: 'Cloudinary não configurado. Insira as credenciais na aba Configurações.' })
    }

    const uso = await cloudinary.api.usage()

    res.json({
      cloud_name:     process.env.CLOUDINARY_CLOUD_NAME,
      plano:          uso.plan            || '—',
      // Armazenamento
      storage_bytes:  uso.storage?.usage  ?? 0,
      storage_fmt:    fmtBytes(uso.storage?.usage ?? 0),
      storage_limite: fmtBytes(uso.storage?.limit ?? 0),
      storage_pct:    uso.storage?.usage_percent ?? 0,
      // Bandwidth
      bandwidth_bytes:  uso.bandwidth?.usage  ?? 0,
      bandwidth_fmt:    fmtBytes(uso.bandwidth?.usage ?? 0),
      bandwidth_limite: fmtBytes(uso.bandwidth?.limit ?? 0),
      bandwidth_pct:    uso.bandwidth?.usage_percent ?? 0,
      // Recursos
      total_imagens: uso.resources ?? 0,
      total_videos:  uso.video_count ?? 0,
      transformacoes: uso.transformations?.usage ?? 0,
      requests:       uso.requests?.usage ?? 0,
      // Créditos
      creditos_usados: uso.credits?.usage ?? 0,
      creditos_limite: uso.credits?.limit ?? 0,
    })
  } catch (err) {
    if (err.error?.http_code) {
      return res.status(err.error.http_code).json({
        erro: err.error.message || 'Erro na API do Cloudinary',
      })
    }
    next(err)
  }
})

// ═══════════════════════════════════════════════════════════════
//  Cloudinary — listar recursos (imagens/vídeos)
// ═══════════════════════════════════════════════════════════════
router.get('/cloudinary/recursos', async (req, res, next) => {
  try {
    configurarCloudinary()

    const tipo       = req.query.tipo       || 'image'  // image | video | raw
    const max        = Math.min(50, parseInt(req.query.max || '20'))
    const nextCursor = req.query.cursor     || undefined
    const prefixo    = req.query.prefixo    || ''

    const params = {
      resource_type: tipo,
      max_results:   max,
      next_cursor:   nextCursor,
    }
    if (prefixo) params.prefix = prefixo

    const resultado = await cloudinary.api.resources(params)

    const recursos = resultado.resources.map(r => ({
      public_id:   r.public_id,
      display_url: r.secure_url,
      tipo:        r.resource_type,
      formato:     r.format,
      largura:     r.width  || null,
      altura:      r.height || null,
      bytes:       r.bytes  || 0,
      bytes_fmt:   fmtBytes(r.bytes),
      criado_em:   r.created_at,
      pasta:       r.folder || '/',
    }))

    res.json({
      recursos,
      cursor_proximo: resultado.next_cursor || null,
      total_estimado: resultado.total_count || recursos.length,
    })
  } catch (err) {
    if (err.error?.http_code) {
      return res.status(err.error.http_code).json({ erro: err.error.message })
    }
    next(err)
  }
})

// ═══════════════════════════════════════════════════════════════
//  Cloudinary — excluir recurso
// ═══════════════════════════════════════════════════════════════
router.delete('/cloudinary/recursos', async (req, res, next) => {
  try {
    configurarCloudinary()

    const { public_id, tipo = 'image' } = req.body
    if (!public_id) return res.status(400).json({ erro: 'public_id é obrigatório' })

    const resultado = await cloudinary.uploader.destroy(public_id, {
      resource_type: tipo,
    })

    if (resultado.result !== 'ok' && resultado.result !== 'not found') {
      return res.status(400).json({ erro: `Cloudinary retornou: ${resultado.result}` })
    }

    res.json({ ok: true, resultado: resultado.result })
  } catch (err) {
    if (err.error?.http_code) {
      return res.status(err.error.http_code).json({ erro: err.error.message })
    }
    next(err)
  }
})
// ========== NOVAS ROTAS ==========

// ─── Estatísticas da coleção ─────────────────────────────────
router.get('/mongodb/colecoes/:nome/stats', async (req, res, next) => {
  try {
    const { nome } = req.params
    const db = mongoose.connection.db
    const stats = await db.command({ collStats: nome })
    res.json({
      tamanho: stats.size,
      armazenamento: stats.storageSize,
      indices: stats.nindexes,
      avgObjSize: stats.avgObjSize,
      count: stats.count,
    })
  } catch (err) { next(err) }
})

// ─── Listar índices de uma coleção ────────────────────────────
router.get('/mongodb/colecoes/:nome/indices', async (req, res, next) => {
  try {
    const { nome } = req.params
    const db = mongoose.connection.db
    const indices = await db.collection(nome).getIndexes()
    // Transforma para formato amigável
    const lista = Object.entries(indices).map(([name, spec]) => ({
      name,
      key: spec.key,
      unique: spec.unique || false,
      sparse: spec.sparse || false,
      background: spec.background || false,
    }))
    res.json({ indices: lista })
  } catch (err) { next(err) }
})

// ─── Criar índice composto (simples) ──────────────────────────
router.post('/mongodb/colecoes/:nome/indices', async (req, res, next) => {
  try {
    const { nome } = req.params
    const { campos, unique = false, background = true } = req.body
    if (!campos || typeof campos !== 'object') {
      return res.status(400).json({ erro: 'campos deve ser um objeto { campo: 1 ou -1 }' })
    }
    const db = mongoose.connection.db
    const nomeIndice = await db.collection(nome).createIndex(campos, { unique, background })
    res.json({ mensagem: `Índice ${nomeIndice} criado`, nome: nomeIndice })
  } catch (err) { next(err) }
})

// ─── Remover índice ───────────────────────────────────────────
router.delete('/mongodb/colecoes/:nome/indices/:nomeIndice', async (req, res, next) => {
  try {
    const { nome, nomeIndice } = req.params
    if (nomeIndice === '_id_') {
      return res.status(400).json({ erro: 'Não é possível remover o índice _id_' })
    }
    const db = mongoose.connection.db
    await db.collection(nome).dropIndex(nomeIndice)
    res.json({ mensagem: `Índice ${nomeIndice} removido` })
  } catch (err) { next(err) }
})

// ─── Métricas do sistema (CPU, memória, uptime) ───────────────
import os from 'os'

router.get('/sistema/metricas', async (req, res, next) => {
  try {
    const cpus = os.cpus()
    const loadAvg = os.loadavg()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const memUsage = process.memoryUsage()
    const uptime = process.uptime()

    res.json({
      cpu: {
        cores: cpus.length,
        loadAvg1min: loadAvg[0],
        loadAvg5min: loadAvg[1],
        loadAvg15min: loadAvg[2],
      },
      memoria: {
        total: totalMem,
        livre: freeMem,
        usoPercentual: ((totalMem - freeMem) / totalMem) * 100,
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
      },
      processo: {
        uptimeSegundos: uptime,
        uptimeFormatado: new Date(uptime * 1000).toISOString().substr(11, 8),
        versaoNode: process.version,
        pid: process.pid,
        plataforma: os.platform(),
        arquitetura: os.arch(),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (err) { next(err) }
})

// ─── Limpar todo o cache (Redis + memória) ────────────────────
import { cacheClearAll } from '../utils/cache.js'

router.post('/sistema/limpar-cache', async (req, res, next) => {
  try {
    const removidos = await cacheClearAll()
    res.json({ mensagem: `Cache limpo (${removidos} chaves removidas)` })
  } catch (err) { next(err) }
})

export default router
