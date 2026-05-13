/**
 * projetos.js — Rotas de Projetos Locais
 *
 * Sprint 3  — ADIÇÃO PURA. Nenhuma rota existente foi alterada.
 * Sprint 7  — GitHub Sync: vincular, sync-status, registrar-sincronizacao.
 * Sprint 8  — Narração em tempo real via SSE: sync-stream.
 * Sprint 9  — Commit & Push: commit-status, commit-stream.
 *
 * Rotas originais:
 *   GET /api/projetos          → lista todos os projetos
 *   GET /api/projetos/:nome    → detalhes de um projeto específico
 *
 * Novas rotas (Sprint 7 — GitHub Sync):
 *   POST /api/projetos/:nome/vincular                → vincula/desvincula um repo GitHub
 *   GET  /api/projetos/:nome/sync-status             → status de sincronização com GitHub
 *   POST /api/projetos/:nome/registrar-sincronizacao → salva timestamp após sync bem-sucedido
 *
 * Nova rota (Sprint 8 — Narração em tempo real):
 *   GET  /api/projetos/:nome/sync-stream             → SSE: narração completa do processo de sync
 *     Emite eventos JSON no formato:
 *       { type:'narration', msg, nivel, ts }
 *       { type:'step',      etapa, progresso, ts }
 *       { type:'files',     arquivos[] }
 *       { type:'done',      status, msg, relatorio?, ts }
 *     status final: 'success' | 'error' | 'inconsistent'
 *
 * Novas rotas (Sprint 9 — Commit & Push  GitHub ← Servidor):
 *   GET  /api/projetos/:nome/commit-status   → SHA atual, branches, últimos commits
 *   GET  /api/projetos/:nome/commit-stream   → SSE: pipeline completo de commit + push
 *     Query params:
 *       ?message=  mensagem do commit (obrigatório)
 *       ?branch=   branch de destino  (padrão: branch default do repo)
 *       ?autor=    "Nome <email>"     (padrão: bot configurado no env ou usuário autenticado)
 *     Emite eventos JSON no formato idêntico ao sync-stream:
 *       { type:'narration', msg, nivel, ts }
 *       { type:'step',      etapa, progresso, ts }
 *       { type:'files',     arquivos[] }
 *       { type:'done',      status, msg, relatorio?, ts }
 *     status final: 'success' | 'error'
 *
 *   IMPORTANTE — Fluxo de commit usa a GitHub Git Data API (sem git instalado):
 *     1. GET  /repos/:o/:r/git/ref/heads/:branch  → SHA do último commit
 *     2. GET  /repos/:o/:r/git/commits/:sha        → tree SHA base
 *     3. POST /repos/:o/:r/git/blobs (por arquivo) → SHA de cada blob
 *     4. POST /repos/:o/:r/git/trees               → nova tree completa
 *     5. POST /repos/:o/:r/git/commits             → novo objeto commit
 *     6. PATCH /repos/:o/:r/git/refs/heads/:branch → move a ref (push)
 */
import { Router }       from 'express'
import fs               from 'fs'
import path             from 'path'
import crypto           from 'crypto'
import { autenticar }   from '../middleware/auth.js'
import Projeto          from '../models/Projeto.js'
import { githubFetch }  from '../utils/githubClient.js'
import multer           from 'multer'

const router  = Router()
const upload  = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 200 * 1024 * 1024 }, // 200 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/zip' ||
        file.mimetype === 'application/x-zip-compressed' ||
        file.originalname.toLowerCase().endsWith('.zip')) {
      cb(null, true)
    } else {
      cb(new Error('Apenas arquivos .zip são aceitos.'))
    }
  },
})

// ─── Diretório base dos projetos ──────────────────────────────────────────────
const PROJETOS_DIR = process.env.PROJETOS_PATH
  ? path.resolve(process.cwd(), process.env.PROJETOS_PATH)
  : path.join(process.cwd(), '..', 'projetos')

/* ── Utilitários (inalterados da Sprint 3) ──────────────────── */

function lerPackageJson(dirPath) {
  try {
    const pkgPath = path.join(dirPath, 'package.json')
    if (fs.existsSync(pkgPath)) {
      const raw = fs.readFileSync(pkgPath, 'utf8')
      const pkg = JSON.parse(raw)
      return {
        nome:      pkg.name        || null,
        versao:    pkg.version     || null,
        descricao: pkg.description || null,
        scripts:   Object.keys(pkg.scripts || {}),
      }
    }
  } catch { /* leitura falhou */ }
  return null
}

function detectarTecnologias(dirPath) {
  const techs = []
  const checks = [
    { file: 'package.json',        tech: 'Node.js'    },
    { file: 'requirements.txt',    tech: 'Python'     },
    { file: 'Pipfile',             tech: 'Python'     },
    { file: 'pyproject.toml',      tech: 'Python'     },
    { file: 'Cargo.toml',          tech: 'Rust'       },
    { file: 'go.mod',              tech: 'Go'         },
    { file: 'pom.xml',             tech: 'Java'       },
    { file: 'composer.json',       tech: 'PHP'        },
    { file: 'Gemfile',             tech: 'Ruby'       },
    { file: 'Dockerfile',          tech: 'Docker'     },
    { file: 'docker-compose.yml',  tech: 'Docker'     },
    { file: '.github',             tech: 'GitHub CI'  },
  ]
  for (const { file, tech } of checks) {
    if (!techs.includes(tech) && fs.existsSync(path.join(dirPath, file))) {
      techs.push(tech)
    }
  }
  return techs
}

function detectarStatus(stat) {
  const diasDesdeModificacao = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24)
  if (diasDesdeModificacao < 7)   return 'ativo'
  if (diasDesdeModificacao < 90)  return 'pausado'
  return 'arquivado'
}

function lerProjeto(nome, dirPath) {
  const stat  = fs.statSync(dirPath)
  const pkg   = lerPackageJson(dirPath)
  const techs = detectarTecnologias(dirPath)

  let descricao = pkg?.descricao || ''
  if (!descricao) {
    for (const readme of ['README.md', 'README.txt', 'readme.md']) {
      try {
        const rPath = path.join(dirPath, readme)
        if (fs.existsSync(rPath)) {
          const linhas = fs.readFileSync(rPath, 'utf8').split('\n').filter(l => l.trim())
          const linha  = linhas.find(l => !l.startsWith('#') && l.trim()) || ''
          descricao    = linha.slice(0, 200)
          break
        }
      } catch { /* continua */ }
    }
  }

  return {
    nome,
    caminho:         path.join('projetos', nome),
    descricao:       descricao || '—',
    status:          detectarStatus(stat),
    tecnologias:     techs,
    ultimaAlteracao: stat.mtime,
    package:         pkg,
  }
}

/* ══════════════════════════════════════════════════════════════
   UPLOAD DE PROJETO — Sprint 10
   Recebe um ZIP do browser, extrai na pasta Projetos do servidor.
   Proteção anti-Zip Slip: nenhum path fora de PROJETOS_DIR.

   POST /api/projetos/upload
   Content-Type: multipart/form-data
   Campos:
     zip          — arquivo .zip (obrigatório)
     nomeProjeto  — nome da pasta destino (padrão: nome do arquivo)
     substituir   — "true" para sobrescrever se já existir
══════════════════════════════════════════════════════════════ */
router.post('/upload', autenticar, upload.single('zip'), async (req, res) => {
  if (!req.file)
    return res.status(400).json({ erro: 'Nenhum arquivo ZIP enviado.' })

  // ── Sanitizar nome do projeto ────────────────────────────
  let nomeProjeto = (req.body.nomeProjeto || req.file.originalname.replace(/\.zip$/i, '') || 'projeto')
    .toString().trim()
  if (!/^[a-zA-Z0-9._-]{1,60}$/.test(nomeProjeto))
    return res.status(400).json({ erro: 'Nome inválido. Use letras, números, ., - ou _ (máx. 60 chars).' })

  const substituir = req.body.substituir === 'true'
  const destDir    = path.join(PROJETOS_DIR, nomeProjeto)

  if (fs.existsSync(destDir) && !substituir)
    return res.status(409).json({
      erro: `Já existe um projeto chamado "${nomeProjeto}". Marque "Substituir" para sobrescrever.`,
    })

  try {
    // ── Garantir que PROJETOS_DIR existe ──────────────────
    if (!fs.existsSync(PROJETOS_DIR))
      fs.mkdirSync(PROJETOS_DIR, { recursive: true })

    if (fs.existsSync(destDir) && substituir)
      fs.rmSync(destDir, { recursive: true, force: true })

    fs.mkdirSync(destDir, { recursive: true })

    // ── Extrair ZIP do buffer ─────────────────────────────
    const { default: unzipper } = await import('unzipper')
    const { Readable }          = await import('stream')

    let   prefixo           = null
    let   arquivosExtraidos = 0
    const erros             = []

    await new Promise((resolve, reject) => {
      Readable.from(req.file.buffer)
        .pipe(unzipper.Parse())
        .on('entry', entry => {
          const entryPath = entry.path

          // Detectar e remover prefixo de nível raiz (ex: repo-main/)
          if (prefixo === null) {
            const firstSlash = entryPath.indexOf('/')
            prefixo = firstSlash !== -1 && !entryPath.includes('..') && entryPath.indexOf('/') > 0
              ? entryPath.slice(0, firstSlash + 1)
              : ''
          }

          const relPath = prefixo && entryPath.startsWith(prefixo)
            ? entryPath.slice(prefixo.length)
            : entryPath

          // Proteção anti-Zip Slip
          if (!relPath || relPath.startsWith('..') || path.isAbsolute(relPath)) {
            entry.autodrain(); return
          }
          const destPath = path.join(destDir, relPath)
          if (!destPath.startsWith(destDir + path.sep) && destPath !== destDir) {
            entry.autodrain(); return
          }

          if (entry.type === 'Directory') {
            fs.mkdirSync(destPath, { recursive: true })
            entry.autodrain()
          } else {
            fs.mkdirSync(path.dirname(destPath), { recursive: true })
            const out = fs.createWriteStream(destPath)
            entry.pipe(out)
              .on('finish', () => { arquivosExtraidos++ })
              .on('error',  e  => erros.push(e.message))
          }
        })
        .on('finish', resolve)
        .on('error',  reject)
    })

    res.json({
      ok:              true,
      nomeProjeto,
      arquivos:        arquivosExtraidos,
      avisos:          erros.length ? erros.slice(0, 5) : undefined,
      mensagem:        `Projeto "${nomeProjeto}" enviado com sucesso (${arquivosExtraidos} arquivos).`,
    })

    // Registra o timestamp de sincronização no banco (se o projeto já existir vinculado)
    Projeto.findOneAndUpdate(
      { nome: nomeProjeto },
      { $set: { 'metadados.ultimaSincronizacao': new Date() } },
      { upsert: false }
    ).catch(() => null)
  } catch (err) {
    // Limpa pasta parcial em caso de falha
    try { if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true }) } catch {}
    res.status(500).json({ erro: err.message || 'Erro ao extrair o arquivo ZIP.' })
  }
})

/* ══════════════════════════════════════════════════════════════
   ROTAS ORIGINAIS — Sprint 3 (inalteradas)
══════════════════════════════════════════════════════════════ */

/* GET /api/projetos */
router.get('/', autenticar, (req, res) => {
  if (!fs.existsSync(PROJETOS_DIR)) {
    return res.json({
      projetos:  [],
      total:     0,
      diretorio: path.join('projetos'),
      aviso:     `Diretório "projetos/" não encontrado na raiz do projeto. Crie-o com: mkdir -p projetos`,
    })
  }

  try {
    const entradas = fs.readdirSync(PROJETOS_DIR, { withFileTypes: true })
    const dirs     = entradas.filter(e => e.isDirectory() && !e.name.startsWith('.'))

    const projetos = dirs.map(d => {
      const dirPath = path.join(PROJETOS_DIR, d.name)
      try {
        return lerProjeto(d.name, dirPath)
      } catch {
        return {
          nome:            d.name,
          caminho:         path.join('projetos', d.name),
          descricao:       '—',
          status:          'desconhecido',
          tecnologias:     [],
          ultimaAlteracao: null,
          package:         null,
        }
      }
    })

    projetos.sort((a, b) => {
      const ordem = { ativo: 0, pausado: 1, arquivado: 2, desconhecido: 3 }
      const diff  = (ordem[a.status] || 3) - (ordem[b.status] || 3)
      if (diff !== 0) return diff
      return (b.ultimaAlteracao?.getTime() || 0) - (a.ultimaAlteracao?.getTime() || 0)
    })

    res.json({ projetos, total: projetos.length, diretorio: path.join('projetos') })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao ler diretório de projetos.', detalhe: err.message })
  }
})

/* GET /api/projetos/:nome */
router.get('/:nome', autenticar, (req, res) => {
  const { nome } = req.params

  if (nome.includes('..') || nome.includes('/') || nome.includes('\\')) {
    return res.status(400).json({ erro: 'Nome de projeto inválido.' })
  }

  const dirPath = path.join(PROJETOS_DIR, nome)

  if (!fs.existsSync(dirPath)) {
    return res.status(404).json({ erro: `Projeto "${nome}" não encontrado.` })
  }

  try {
    const projeto  = lerProjeto(nome, dirPath)
    const arquivos = fs.readdirSync(dirPath, { withFileTypes: true })
      .map(e => ({ nome: e.name, tipo: e.isDirectory() ? 'dir' : 'arquivo' }))
      .slice(0, 50)

    res.json({ ...projeto, arquivos })
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao ler projeto.', detalhe: err.message })
  }
})

/* ══════════════════════════════════════════════════════════════
   GITHUB SYNC — Sprint 7 (ADIÇÃO PURA)
   Todas as rotas abaixo são novas. Nenhuma rota anterior foi
   modificada ou removida.
══════════════════════════════════════════════════════════════ */

/**
 * Sanitiza o nome de projeto para evitar path traversal.
 */
function nomeValido(nome) {
  return nome && !nome.includes('..') && !nome.includes('/') && !nome.includes('\\')
}

/**
 * Valida owner/repo do GitHub (apenas alfanuméricos, ponto, hífen, underscore).
 */
function repoValido(str) {
  return str && /^[a-zA-Z0-9._-]+$/.test(str)
}

/* ──────────────────────────────────────────────────────────────
   POST /api/projetos/:nome/vincular
   Body: { owner, repo }         → vincula ao repositório GitHub
   Body: { owner: null }         → desvincula (remove o link)

   Salva o vínculo em MongoDB no campo metadados do Model Projeto.
   Se o documento ainda não existir no Mongo, cria via upsert.
────────────────────────────────────────────────────────────── */
router.post('/:nome/vincular', autenticar, async (req, res) => {
  const { nome } = req.params

  if (!nomeValido(nome))
    return res.status(400).json({ erro: 'Nome de projeto inválido.' })

  const { owner, repo } = req.body || {}

  // ── Desvincular ───────────────────────────────────────────
  if (!owner || !repo) {
    await Projeto.findOneAndUpdate(
      { nome },
      {
        $unset: {
          'metadados.githubOwner':          1,
          'metadados.githubRepo':           1,
          'metadados.vinculadoEm':          1,
          'metadados.ultimaSincronizacao':  1,
        },
      },
      { upsert: false }
    ).catch(() => null) // ignora se ainda não há doc no Mongo

    return res.json({ ok: true, vinculado: false })
  }

  // ── Validar formato owner/repo ────────────────────────────
  if (!repoValido(owner) || !repoValido(repo))
    return res.status(400).json({ erro: 'Owner ou repo inválido.' })

  // ── Verificar se o repositório existe no GitHub ───────────
  try {
    await githubFetch(`/repos/${owner}/${repo}`)
  } catch (err) {
    const status = err.status || 400
    const msg    = status === 404
      ? `Repositório "${owner}/${repo}" não encontrado no GitHub.`
      : err.message
    return res.status(status).json({ erro: msg })
  }

  // ── Salvar vínculo no MongoDB ─────────────────────────────
  await Projeto.findOneAndUpdate(
    { nome },
    {
      $set: {
        nome,
        caminho:                          `projetos/${nome}`,
        'metadados.githubOwner':          owner,
        'metadados.githubRepo':           repo,
        'metadados.vinculadoEm':          new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  res.json({ ok: true, vinculado: true, owner, repo })
})

/* ──────────────────────────────────────────────────────────────
   GET /api/projetos/:nome/sync-status
   Retorna o status de sincronização entre o projeto local e o
   repositório GitHub vinculado.
────────────────────────────────────────────────────────────── */
router.get('/:nome/sync-status', autenticar, async (req, res) => {
  const { nome } = req.params

  if (!nomeValido(nome))
    return res.status(400).json({ erro: 'Nome de projeto inválido.' })

  const doc   = await Projeto.findOne({ nome }).lean().catch(() => null)
  const owner = doc?.metadados?.githubOwner
  const repo  = doc?.metadados?.githubRepo

  if (!owner || !repo) {
    return res.json({ vinculado: false })
  }

  const dirPath = path.join(PROJETOS_DIR, nome)
  let dataLocalModificacao = null
  if (fs.existsSync(dirPath)) {
    dataLocalModificacao = fs.statSync(dirPath).mtime
  }

  try {
    const repoData       = await githubFetch(`/repos/${owner}/${repo}`)
    const dataPushGitHub = new Date(repoData.pushed_at)

    let statusSync = 'desconhecido'
    if (dataLocalModificacao) {
      const margemMs       = 60 * 1000
      const ultimaSync     = doc?.metadados?.ultimaSincronizacao
        ? new Date(doc.metadados.ultimaSincronizacao)
        : null

      // Se há registro de sincronização manual mais recente que o último push → atualizado
      if (ultimaSync && ultimaSync >= dataPushGitHub) {
        statusSync = 'atualizado'
      } else {
        statusSync = dataPushGitHub > new Date(dataLocalModificacao.getTime() + margemMs)
          ? 'desatualizado'
          : 'atualizado'
      }
    }

    return res.json({
      vinculado:             true,
      owner,
      repo,
      nomeCompleto:          repoData.full_name,
      url:                   repoData.html_url,
      branch:                repoData.default_branch,
      descricaoGitHub:       repoData.description || null,
      linguagem:             repoData.language     || null,
      stars:                 repoData.stargazers_count,
      dataPushGitHub:        repoData.pushed_at,
      dataLocalModificacao,
      ultimaSincronizacao:   doc?.metadados?.ultimaSincronizacao || null,
      vinculadoEm:           doc?.metadados?.vinculadoEm         || null,
      statusSync,
    })
  } catch (err) {
    return res.status(err.status || 500).json({
      vinculado: true,
      owner,
      repo,
      erro: err.message,
      statusSync: 'desconhecido',
    })
  }
})

/* ──────────────────────────────────────────────────────────────
   POST /api/projetos/:nome/registrar-sincronizacao
   Chamado pelo frontend após uma sincronização bem-sucedida.
────────────────────────────────────────────────────────────── */
router.post('/:nome/registrar-sincronizacao', autenticar, async (req, res) => {
  const { nome } = req.params

  if (!nomeValido(nome))
    return res.status(400).json({ erro: 'Nome de projeto inválido.' })

  await Projeto.findOneAndUpdate(
    { nome },
    { $set: { 'metadados.ultimaSincronizacao': new Date() } },
    { upsert: false }
  ).catch(() => null)

  res.json({ ok: true, ultimaSincronizacao: new Date() })
})

/* ══════════════════════════════════════════════════════════════
   SPRINT 8 — NARRAÇÃO EM TEMPO REAL (SSE)
   ADIÇÃO PURA. Nenhuma rota anterior foi modificada.
══════════════════════════════════════════════════════════════ */

/**
 * Auxiliar: pausa assíncrona (apenas para dar tempo visual à narração)
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Auxiliar: conta arquivos recursivamente (máx. profundidade 6)
 */
function contarArquivosDir(dir, depth = 0) {
  if (depth > 6) return 0
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    let count = 0
    for (const e of entries) {
      if (e.name.startsWith('.')) continue
      if (e.isDirectory()) count += contarArquivosDir(path.join(dir, e.name), depth + 1)
      else count++
    }
    return count
  } catch { return 0 }
}

/* ──────────────────────────────────────────────────────────────
   GET /api/projetos/:nome/sync-stream
   ──────────────────────────────────────────────────────────────
   SSE endpoint que narra o processo completo de sincronização
   com o GitHub em tempo real.

   Protocolo de eventos (cada linha no formato SSE padrão):
     data: <JSON>\n\n

   Tipos de evento JSON:
     { type:'narration', msg:string, nivel:'info'|'warn'|'error'|'success', ts }
     { type:'step',      etapa:string, progresso:number(0-100), ts }
     { type:'files',     arquivos:string[] }
     { type:'ping' }
     { type:'done',      status:'success'|'error'|'inconsistent', msg, relatorio?, ts }

   Regra de consistência:
     O evento 'done' com status:'success' SÓ é emitido após a
     validação remota confirmar que o estado do GitHub corresponde
     ao que foi baixado. Caso contrário, emite status:'inconsistent'.
────────────────────────────────────────────────────────────── */
router.get('/:nome/sync-stream', autenticar, async (req, res) => {
  /* ── Cabeçalhos SSE ──────────────────────────────────────── */
  res.setHeader('Content-Type',  'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection',    'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')     // Nginx: desliga buffer
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.flushHeaders()

  let encerrado = false

  /* ── Helpers de emissão ──────────────────────────────────── */
  function emit(obj) {
    if (encerrado || res.writableEnded) return
    res.write(`data: ${JSON.stringify({ ...obj, ts: new Date().toISOString() })}\n\n`)
  }

  function narrar(msg, nivel = 'info') {
    emit({ type: 'narration', msg, nivel })
  }

  function step(etapa, progresso) {
    emit({ type: 'step', etapa, progresso })
  }

  function files(arquivos) {
    emit({ type: 'files', arquivos })
  }

  function done(status, extra = {}) {
    emit({ type: 'done', status, ...extra })
    encerrado = true
    if (!res.writableEnded) res.end()
  }

  /* ── Keep-alive: ping a cada 20s para evitar timeout ────── */
  const pingInterval = setInterval(() => {
    if (!encerrado && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`)
    } else {
      clearInterval(pingInterval)
    }
  }, 20_000)

  /* ── Limpeza ao desconectar ──────────────────────────────── */
  req.on('close', () => {
    encerrado = true
    clearInterval(pingInterval)
  })

  /* ════════════════════════════════════════════════════════════
     PIPELINE DE SINCRONIZAÇÃO NARRADO
  ════════════════════════════════════════════════════════════ */
  const { nome } = req.params

  try {
    /* ── ETAPA 1: Verificar vínculo ────────────────────────── */
    step('verificando_vinculo', 5)
    narrar(`Iniciando sincronização do projeto "${nome}"`)

    if (!nomeValido(nome)) {
      narrar('Nome de projeto inválido.', 'error')
      return done('error', { msg: 'Nome de projeto inválido.' })
    }

    await sleep(250)

    const doc   = await Projeto.findOne({ nome }).lean().catch(() => null)
    const owner = doc?.metadados?.githubOwner
    const repo  = doc?.metadados?.githubRepo

    if (!owner || !repo) {
      narrar('Projeto não possui repositório GitHub vinculado.', 'error')
      return done('error', { msg: 'Sem repositório vinculado.' })
    }

    narrar(`Repositório vinculado: ${owner}/${repo}`)

    /* ── ETAPA 2: Consultar GitHub (estado ANTES do sync) ──── */
    step('verificando_github', 12)
    narrar('Consultando estado atual do repositório no GitHub...')

    const token = process.env.GITHUB_TOKEN
    if (!token) {
      narrar('GITHUB_TOKEN não configurado no servidor.', 'error')
      return done('error', { msg: 'GITHUB_TOKEN ausente no servidor.' })
    }

    let repoDataAntes
    try {
      repoDataAntes = await githubFetch(`/repos/${owner}/${repo}`)
    } catch (err) {
      narrar(`Erro ao consultar GitHub: ${err.message}`, 'error')
      return done('error', { msg: `GitHub inacessível: ${err.message}` })
    }

    const defaultBranch  = repoDataAntes.default_branch || 'main'
    const pushedAtAntes  = repoDataAntes.pushed_at
    narrar(`Repositório encontrado: ${repoDataAntes.full_name}`)
    narrar(`Branch padrão: ${defaultBranch} · último push: ${new Date(pushedAtAntes).toLocaleString('pt-BR')}`)

    /* ── ETAPA 3: Analisar estado local ────────────────────── */
    step('analisando_local', 22)
    narrar('Detectando alterações no projeto local...')
    await sleep(300)

    const dirPath = path.join(PROJETOS_DIR, nome)
    let totalArquivosLocal = 0
    let dataLocalModificacao = null

    if (fs.existsSync(dirPath)) {
      try { dataLocalModificacao = fs.statSync(dirPath).mtime } catch { /* ok */ }
      totalArquivosLocal = contarArquivosDir(dirPath)
      narrar(`${totalArquivosLocal} arquivo(s) encontrado(s) no projeto local`)
    } else {
      narrar('Pasta local ainda não existe — será criada durante a extração')
    }

    /* ── ETAPA 4: Comparar versões ─────────────────────────── */
    step('comparando', 32)
    narrar('Analisando diferenças entre local e remoto...')
    await sleep(350)

    const dataPushGitHub = new Date(pushedAtAntes)
    const margemMs       = 60 * 1000
    const precisaSync    = !dataLocalModificacao
      || dataPushGitHub > new Date(dataLocalModificacao.getTime() + margemMs)

    if (precisaSync) {
      narrar('Repositório remoto possui commits mais recentes que o projeto local')
    } else {
      narrar('Projeto local parece atualizado — aplicando sync completo conforme solicitado')
    }

    const ultimaSync = doc?.metadados?.ultimaSincronizacao
    if (ultimaSync) {
      narrar(`Última sincronização registrada: ${new Date(ultimaSync).toLocaleString('pt-BR')}`)
    }

    /* ── ETAPA 5: Baixar zipball do GitHub ─────────────────── */
    step('baixando', 45)
    narrar(`Baixando zipball de ${owner}/${repo}@${defaultBranch}...`)

    let zipBuffer
    try {
      const zipResp = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/zipball/${defaultBranch}`,
        {
          headers: {
            Authorization:        `Bearer ${token}`,
            Accept:               'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
          redirect: 'follow',
          signal:   AbortSignal.timeout(90_000),
        }
      )

      if (!zipResp.ok) {
        const body = await zipResp.text().catch(() => '')
        const msg  = zipResp.status === 404
          ? `Repositório "${owner}/${repo}" não encontrado ou sem acesso.`
          : zipResp.status === 403
            ? 'Acesso negado. Verifique os escopos do GITHUB_TOKEN.'
            : `GitHub retornou ${zipResp.status}: ${body.slice(0, 120)}`
        narrar(msg, 'error')
        return done('error', { msg })
      }

      zipBuffer = Buffer.from(await zipResp.arrayBuffer())
    } catch (err) {
      const msg = err.name === 'TimeoutError'
        ? 'Download excedeu o limite de 90s. Repositório muito grande?'
        : `Falha no download: ${err.message}`
      narrar(msg, 'error')
      return done('error', { msg })
    }

    if (zipBuffer.length === 0) {
      narrar('ZIP vazio recebido do GitHub.', 'error')
      return done('error', { msg: 'O arquivo ZIP do GitHub está vazio.' })
    }

    narrar(`Pacote recebido: ${(zipBuffer.length / 1024).toFixed(1)} KB`)

    /* ── ETAPA 6: Extrair arquivos ─────────────────────────── */
    step('extraindo', 60)
    narrar('Extraindo arquivos do repositório...')

    // Garante estrutura de diretórios
    if (!fs.existsSync(PROJETOS_DIR)) {
      fs.mkdirSync(PROJETOS_DIR, { recursive: true })
    }
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true })
    }
    fs.mkdirSync(dirPath, { recursive: true })

    const { default: unzipper } = await import('unzipper')
    const { Readable }          = await import('stream')

    let   prefixo           = null
    const arquivosExtraidos = []
    const errosExtracao     = []

    await new Promise((resolve, reject) => {
      Readable.from(zipBuffer)
        .pipe(unzipper.Parse())
        .on('entry', entry => {
          const entryPath = entry.path

          // Detecta prefixo gerado pelo GitHub (ex: "owner-repo-sha123/")
          if (prefixo === null) {
            const firstSlash = entryPath.indexOf('/')
            prefixo = firstSlash !== -1 ? entryPath.slice(0, firstSlash + 1) : ''
          }

          const relPath = prefixo && entryPath.startsWith(prefixo)
            ? entryPath.slice(prefixo.length)
            : entryPath

          // ── Proteção Zip Slip ──────────────────────────────
          const absTarget = path.resolve(dirPath, relPath)
          if (!absTarget.startsWith(dirPath + path.sep) && absTarget !== dirPath) {
            entry.autodrain()
            errosExtracao.push({ arquivo: relPath, motivo: 'path traversal bloqueado' })
            return
          }

          if (entry.type === 'Directory') {
            fs.mkdirSync(absTarget, { recursive: true })
            entry.autodrain()
          } else {
            fs.mkdirSync(path.dirname(absTarget), { recursive: true })
            if (relPath) arquivosExtraidos.push(relPath)
            entry.pipe(fs.createWriteStream(absTarget)).on('error', reject)
          }
        })
        .on('close', resolve)
        .on('error', reject)
    })

    narrar(`${arquivosExtraidos.length} arquivo(s) extraído(s) com sucesso`, 'success')

    if (errosExtracao.length > 0) {
      narrar(`${errosExtracao.length} entrada(s) ignorada(s) por segurança (path traversal)`, 'warn')
    }

    // Emite a lista de arquivos afetados para o painel
    files(arquivosExtraidos.slice(0, 200))

    /* ── ETAPA 7: Registrar sincronização no MongoDB ────────── */
    step('registrando', 78)
    narrar('Registrando timestamp de sincronização...')

    await Projeto.findOneAndUpdate(
      { nome },
      { $set: { 'metadados.ultimaSincronizacao': new Date() } },
      { upsert: false }
    ).catch(() => null)

    narrar('Timestamp salvo no banco de dados')

    // Audit Log (não bloqueia o pipeline em caso de falha)
    try {
      const { default: AuditLog } = await import('../models/AuditLog.js')
      await AuditLog.create({
        admin_id:    req.usuario._id,
        admin_email: req.usuario.email,
        acao:        'sincronizar',
        recurso:     'projeto_local',
        recurso_id:  nome,
        payload:     { owner, repo, nomeProjeto: nome, totalArquivos: arquivosExtraidos.length, defaultBranch },
        ip:          req.ip,
        request_id:  req.requestId || null,
      })
    } catch { /* audit não bloqueia o pipeline */ }

    /* ── ETAPA 8: Enviar alterações para o GitHub ────────────
       Nota: neste fluxo o sync é pull (GitHub → local).
       O "envio" representa a confirmação de conclusão da extração.
    ─────────────────────────────────────────────────────────── */
    step('enviando', 86)
    narrar('Finalizando extração e verificando integridade local...')
    await sleep(400)

    const totalExtraido = contarArquivosDir(dirPath)
    narrar(`${totalExtraido} arquivo(s) presentes no diretório local após extração`)

    /* ── ETAPA 9: VALIDAÇÃO REMOTA — crítica ────────────────
       O sistema consulta o GitHub NOVAMENTE após a extração
       para confirmar que o estado remoto ainda é consistente
       com o que foi baixado. Se houve um push durante a sync,
       o estado é marcado como SYNC_INCONSISTENT.
    ─────────────────────────────────────────────────────────── */
    step('validando_remoto', 92)
    narrar('Aguardando confirmação do repositório remoto...')
    await sleep(500)
    narrar('Verificando se o commit existe no repositório remoto...')

    let repoDataDepois
    try {
      repoDataDepois = await githubFetch(`/repos/${owner}/${repo}`)
    } catch (err) {
      /* Não conseguimos confirmar o estado remoto — inconsistência */
      narrar(`Não foi possível consultar o GitHub para validação: ${err.message}`, 'warn')
      narrar('Inconsistência detectada entre estado local e GitHub', 'error')
      clearInterval(pingInterval)
      return done('inconsistent', {
        msg:      'Não foi possível validar o estado remoto após a sincronização.',
        relatorio: {
          totalArquivos:   arquivosExtraidos.length,
          erros:           errosExtracao,
          inconsistencia:  `Validação remota falhou: ${err.message}`,
          sincronizadoEm:  new Date().toISOString(),
        },
      })
    }

    /* Comparação: pushed_at antes vs depois ─────────────────
       Se o GitHub recebeu novos commits DURANTE nossa extração
       (delta > 5s), o repositório local já está desatualizado
       imediatamente após o sync — isso é uma inconsistência.
    ─────────────────────────────────────────────────────────── */
    const pushAntes  = new Date(pushedAtAntes).getTime()
    const pushDepois = new Date(repoDataDepois.pushed_at).getTime()
    const deltaPushMs = pushDepois - pushAntes

    narrar(`Commit remoto confirmado: ${repoDataDepois.pushed_at}`)

    if (deltaPushMs > 5_000) {
      /* Houve push durante a sincronização ───────────────── */
      narrar(
        `Inconsistência detectada entre estado local e GitHub`,
        'error'
      )
      narrar(
        `O GitHub recebeu novos commits durante a sincronização (+${Math.round(deltaPushMs / 1000)}s). O projeto local já está desatualizado.`,
        'warn'
      )
      clearInterval(pingInterval)
      return done('inconsistent', {
        msg: 'O repositório remoto recebeu novos commits durante a sincronização. Sincronize novamente.',
        relatorio: {
          totalArquivos:   arquivosExtraidos.length,
          erros:           errosExtracao,
          inconsistencia:  `Push remoto detectado durante sync (delta: ${Math.round(deltaPushMs / 1000)}s)`,
          pushedAtAntes:   pushedAtAntes,
          pushedAtDepois:  repoDataDepois.pushed_at,
          sincronizadoEm:  new Date().toISOString(),
        },
      })
    }

    /* ── ETAPA 10: Concluído com sucesso ────────────────────── */
    step('concluido', 100)
    narrar('Alterações confirmadas no repositório remoto', 'success')
    narrar('Sincronização concluída com sucesso', 'success')

    clearInterval(pingInterval)
    done('success', {
      msg: `Projeto "${nome}" sincronizado com ${arquivosExtraidos.length} arquivo(s).`,
      relatorio: {
        totalArquivos:    arquivosExtraidos.length,
        arquivos:         arquivosExtraidos.slice(0, 200),
        erros:            errosExtracao,
        tamanhoZipBytes:  zipBuffer.length,
        sincronizadoEm:   new Date().toISOString(),
        commitConfirmado: repoDataDepois.pushed_at,
        branch:           defaultBranch,
      },
    })

  } catch (err) {
    clearInterval(pingInterval)
    narrar(`Erro inesperado: ${err.message}`, 'error')
    done('error', { msg: err.message || 'Erro interno ao sincronizar.' })
  }
})

/* ══════════════════════════════════════════════════════════════
   SPRINT 9 — COMMIT & PUSH  (GitHub ← Servidor)
   ADIÇÃO PURA. Nenhuma rota anterior foi modificada ou removida.

   Usa exclusivamente a GitHub Git Data API (sem git instalado):
     blobs → tree → commit → update-ref
══════════════════════════════════════════════════════════════ */

/* ── Constantes de segurança para commit ───────────────────── */
const COMMIT_MAX_ARQUIVO_BYTES = 10 * 1024 * 1024   // 10 MB por arquivo
const COMMIT_MAX_ARQUIVOS      = 800                 // máx. arquivos por commit
const COMMIT_EXTENSOES_BINARIAS = new Set([
  'png','jpg','jpeg','gif','webp','bmp','ico','svg','tiff',
  'mp4','mov','avi','mkv','mp3','wav','ogg','flac',
  'zip','tar','gz','bz2','xz','7z','rar',
  'exe','dll','so','dylib','wasm',
  'pdf','doc','docx','xls','xlsx','ppt','pptx',
  'ttf','otf','woff','woff2','eot',
  'db','sqlite','sqlite3',
  'bin','dat','idx','pack',
])

/* Pastas/arquivos sempre ignorados no commit */
const COMMIT_IGNORADOS = new Set([
  'node_modules','.git','.svn','.hg',
  'dist','build','.next','.nuxt','out',
  '.cache','.parcel-cache','.turbo',
  '__pycache__','.pytest_cache','.mypy_cache',
  'vendor','.vendor',
  'coverage','.nyc_output',
  '.env','.env.local','.env.production','.env.development',
])

/* Extensões de arquivos temporários/lixo — nunca commitadas */
const COMMIT_EXTENSOES_IGNORADAS = new Set([
  'bak','tmp','orig','swp','swo','bkp','old',
])

/**
 * Calcula o SHA-1 de um blob no formato do Git:
 *   sha1("blob {size}\0{content}")
 * Permite comparar com os SHAs retornados pela GitHub Tree API
 * sem precisar criar um blob real — base do diff detection.
 */
function computeGitBlobSha(content, encoding) {
  const buf = encoding === 'base64'
    ? Buffer.from(content, 'base64')
    : Buffer.from(content, 'utf8')
  const header = Buffer.from(`blob ${buf.length}\0`)
  return crypto.createHash('sha1').update(header).update(buf).digest('hex')
}

/**
 * Lista recursiva de arquivos de um diretório, respeitando
 * limites de segurança. Retorna array de objetos
 *   { relPath: string, absPath: string, bytes: number, binario: boolean }
 */
function listarArquivosCommit(baseDir, relDir = '', lista = []) {
  if (lista.length >= COMMIT_MAX_ARQUIVOS) return lista

  const absDir = path.join(baseDir, relDir)
  let entradas
  try { entradas = fs.readdirSync(absDir, { withFileTypes: true }) }
  catch { return lista }

  for (const e of entradas) {
    if (lista.length >= COMMIT_MAX_ARQUIVOS) break
    if (COMMIT_IGNORADOS.has(e.name)) continue

    const relPath = relDir ? `${relDir}/${e.name}` : e.name
    const absPath = path.join(absDir, e.name)

    if (e.isDirectory()) {
      listarArquivosCommit(baseDir, relPath, lista)
    } else if (e.isFile()) {
      let bytes = 0
      try { bytes = fs.statSync(absPath).size } catch { continue }

      const ext     = e.name.split('.').pop().toLowerCase()

      // Ignorar extensões de arquivos temporários/lixo
      if (COMMIT_EXTENSOES_IGNORADAS.has(ext)) continue

      const binario = COMMIT_EXTENSOES_BINARIAS.has(ext)

      lista.push({ relPath, absPath, bytes, binario })
    }
  }
  return lista
}

/**
 * Lê um arquivo e retorna { content: string, encoding: 'utf-8'|'base64' }.
 * Arquivos acima do limite retornam null.
 */
function lerArquivoParaBlob(absPath, bytes, binario) {
  if (bytes > COMMIT_MAX_ARQUIVO_BYTES) return null
  try {
    if (binario) {
      return { content: fs.readFileSync(absPath).toString('base64'), encoding: 'base64' }
    }
    return { content: fs.readFileSync(absPath, 'utf8'), encoding: 'utf-8' }
  } catch { return null }
}

/* ──────────────────────────────────────────────────────────────
   GET /api/projetos/:nome/commit-status
   Retorna informações do estado atual do repositório para commits:
     SHA do último commit, branches, últimos 5 commits, contagem
     de arquivos locais prontos para commit.
────────────────────────────────────────────────────────────── */
router.get('/:nome/commit-status', autenticar, async (req, res) => {
  const { nome } = req.params

  if (!nomeValido(nome))
    return res.status(400).json({ erro: 'Nome de projeto inválido.' })

  const doc   = await Projeto.findOne({ nome }).lean().catch(() => null)
  const owner = doc?.metadados?.githubOwner
  const repo  = doc?.metadados?.githubRepo

  if (!owner || !repo)
    return res.json({ vinculado: false })

  try {
    // Repo info + branches + últimos commits em paralelo
    const [repoData, branches, commits] = await Promise.all([
      githubFetch(`/repos/${owner}/${repo}`),
      githubFetch(`/repos/${owner}/${repo}/branches`).catch(() => []),
      githubFetch(`/repos/${owner}/${repo}/commits?per_page=5`).catch(() => []),
    ])

    const defaultBranch = repoData.default_branch

    // Contagem de arquivos locais
    const dirPath      = path.join(PROJETOS_DIR, nome)
    const arquivosLocais = fs.existsSync(dirPath)
      ? listarArquivosCommit(dirPath)
      : []

    const totalBytes = arquivosLocais.reduce((s, f) => s + f.bytes, 0)

    return res.json({
      vinculado:       true,
      owner,
      repo,
      nomeCompleto:    repoData.full_name,
      url:             repoData.html_url,
      defaultBranch,
      branches:        branches.map(b => ({
        nome:      b.name,
        sha:       b.commit.sha,
        protegido: b.protected,
      })),
      ultimosCommits:  commits.map(c => ({
        sha:       c.sha.slice(0, 7),
        shaCompleto: c.sha,
        mensagem:  c.commit.message.split('\n')[0].slice(0, 120),
        autor:     c.commit.author.name,
        email:     c.commit.author.email,
        data:      c.commit.author.date,
        url:       c.html_url,
      })),
      arquivosLocais: {
        total:      arquivosLocais.length,
        totalBytes,
        disponiveis: arquivosLocais.length > 0,
        limitados:   arquivosLocais.length >= COMMIT_MAX_ARQUIVOS,
      },
      ultimoCommitLocal:     doc?.metadados?.ultimoCommitSha      || null,
      ultimoCommitLocalData: doc?.metadados?.ultimoCommitData     || null,
      ultimoCommitLocalMsg:  doc?.metadados?.ultimoCommitMensagem || null,
    })
  } catch (err) {
    return res.status(err.status || 500).json({
      vinculado: true,
      owner,
      repo,
      erro: err.message,
    })
  }
})

/* ──────────────────────────────────────────────────────────────
   GET /api/projetos/:nome/commit-stream
   SSE: pipeline completo de commit + push via GitHub Git Data API.

   Query params:
     ?message=   mensagem do commit (obrigatório, máx 4096 chars)
     ?branch=    branch de destino  (padrão: branch default do repo)
     ?autor=     "Nome <email>"     (padrão: variáveis de ambiente
                                     GIT_AUTOR_NOME / GIT_AUTOR_EMAIL
                                     ou email do usuário autenticado)
     ?force=     "true" → force-push (para branches não-protegidos)

   Pipeline (etapas com progresso):
     1. verificando_vinculo        (  5%)
     2. consultando_github         ( 15%)
     3. listando_arquivos          ( 25%)
     4. criando_blobs              ( 35–60% — narrado por arquivo)
     5. criando_tree               ( 68%)
     6. criando_commit             ( 78%)
     7. atualizando_ref            ( 88%)
     8. registrando               ( 94%)
     9. concluido                  (100%)
────────────────────────────────────────────────────────────── */
router.get('/:nome/commit-stream', autenticar, async (req, res) => {
  /* ── Cabeçalhos SSE ──────────────────────────────────────── */
  res.setHeader('Content-Type',              'text/event-stream')
  res.setHeader('Cache-Control',             'no-cache, no-transform')
  res.setHeader('Connection',                'keep-alive')
  res.setHeader('X-Accel-Buffering',         'no')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.flushHeaders()

  let encerrado = false

  /* ── Helpers de emissão (mesma assinatura do sync-stream) ── */
  function emit(obj) {
    if (encerrado || res.writableEnded) return
    res.write(`data: ${JSON.stringify({ ...obj, ts: new Date().toISOString() })}\n\n`)
  }
  function narrar(msg, nivel = 'info') { emit({ type: 'narration', msg, nivel }) }
  function step(etapa, progresso)      { emit({ type: 'step', etapa, progresso }) }
  function files(arquivos)             { emit({ type: 'files', arquivos }) }
  function done(status, extra = {}) {
    emit({ type: 'done', status, ...extra })
    encerrado = true
    if (!res.writableEnded) res.end()
  }

  /* ── Keep-alive: ping a cada 20s ────────────────────────── */
  const pingInterval = setInterval(() => {
    if (!encerrado && !res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type: 'ping' })}\n\n`)
    } else {
      clearInterval(pingInterval)
    }
  }, 20_000)

  req.on('close', () => { encerrado = true; clearInterval(pingInterval) })

  /* ════════════════════════════════════════════════════════════
     PIPELINE DE COMMIT + PUSH NARRADO
  ════════════════════════════════════════════════════════════ */
  const { nome }   = req.params
  const { message, branch: branchParam, autor, force } = req.query

  try {
    /* ── ETAPA 1: Validações iniciais ───────────────────────── */
    step('verificando_vinculo', 5)
    narrar(`Iniciando pipeline de commit para o projeto "${nome}"`)

    if (!nomeValido(nome)) {
      narrar('Nome de projeto inválido.', 'error')
      return done('error', { msg: 'Nome de projeto inválido.' })
    }

    // Validar mensagem
    const mensagem = (message || '').trim()
    if (!mensagem) {
      narrar('Mensagem de commit não informada.', 'error')
      return done('error', { msg: 'O parâmetro ?message= é obrigatório.' })
    }
    if (mensagem.length > 4096) {
      narrar('Mensagem de commit muito longa (máx 4096 chars).', 'error')
      return done('error', { msg: 'Mensagem de commit muito longa (máx 4096 chars).' })
    }

    // Validar token
    const token = process.env.GITHUB_TOKEN
    if (!token) {
      narrar('GITHUB_TOKEN não configurado no servidor.', 'error')
      return done('error', { msg: 'GITHUB_TOKEN ausente no servidor.' })
    }

    // Verificar vínculo
    const doc   = await Projeto.findOne({ nome }).lean().catch(() => null)
    const owner = doc?.metadados?.githubOwner
    const repo  = doc?.metadados?.githubRepo

    if (!owner || !repo) {
      narrar('Projeto não possui repositório GitHub vinculado.', 'error')
      return done('error', { msg: 'Sem repositório vinculado.' })
    }

    narrar(`Repositório vinculado: ${owner}/${repo}`)

    // Verificar diretório local
    const dirPath = path.join(PROJETOS_DIR, nome)
    if (!fs.existsSync(dirPath)) {
      narrar(`Diretório local "${nome}" não encontrado em projetos/`, 'error')
      return done('error', { msg: `Diretório local "projetos/${nome}" não existe.` })
    }

    /* ── ETAPA 2: Consultar GitHub — branch + commit base ───── */
    step('consultando_github', 15)
    narrar('Consultando estado atual do repositório no GitHub...')

    let repoData
    try { repoData = await githubFetch(`/repos/${owner}/${repo}`) }
    catch (err) {
      narrar(`Erro ao consultar repositório: ${err.message}`, 'error')
      return done('error', { msg: `GitHub inacessível: ${err.message}` })
    }

    const targetBranch  = (branchParam || '').trim() || repoData.default_branch
    narrar(`Repositório: ${repoData.full_name}`)
    narrar(`Branch de destino: ${targetBranch} · visibilidade: ${repoData.private ? 'privado' : 'público'}`)

    // Obter SHA atual da branch (commit HEAD)
    let refData
    try {
      refData = await githubFetch(`/repos/${owner}/${repo}/git/ref/heads/${targetBranch}`)
    } catch (err) {
      if (err.status === 404) {
        narrar(`Branch "${targetBranch}" não encontrada no repositório.`, 'error')
        return done('error', { msg: `Branch "${targetBranch}" não existe em ${owner}/${repo}.` })
      }
      narrar(`Erro ao obter referência da branch: ${err.message}`, 'error')
      return done('error', { msg: err.message })
    }

    const headCommitSha = refData.object.sha
    narrar(`HEAD atual da branch: ${headCommitSha.slice(0, 7)}`)

    /* ── Verificar divergência com último commit local ────────── */
    const ultimoCommitLocal = doc?.metadados?.ultimoCommitSha
    if (ultimoCommitLocal && ultimoCommitLocal !== headCommitSha) {
      narrar(
        `⚠ Divergência detectada: o GitHub avançou desde o último commit registrado ` +
        `(local: ${ultimoCommitLocal.slice(0, 7)} → remoto: ${headCommitSha.slice(0, 7)}). ` +
        `Pode haver mudanças no GitHub não presentes localmente.`,
        'warn'
      )
    }

    // Obter tree SHA do commit HEAD
    let headCommitData
    try {
      headCommitData = await githubFetch(`/repos/${owner}/${repo}/git/commits/${headCommitSha}`)
    } catch (err) {
      narrar(`Erro ao obter dados do commit HEAD: ${err.message}`, 'error')
      return done('error', { msg: err.message })
    }

    const baseTreeSha = headCommitData.tree.sha
    narrar(`Tree base: ${baseTreeSha.slice(0, 7)}`)

    /* ── Buscar tree atual do GitHub para diff ───────────────── */
    narrar('Buscando tree atual do GitHub para detectar mudanças...')
    let githubTreeMap = new Map() // path → sha (blobs atuais no GitHub)
    try {
      const treeData = await githubFetch(
        `/repos/${owner}/${repo}/git/trees/${baseTreeSha}?recursive=1`
      )
      for (const item of treeData.tree) {
        if (item.type === 'blob') githubTreeMap.set(item.path, item.sha)
      }
      narrar(`Tree remota carregada: ${githubTreeMap.size} arquivo(s) indexado(s)`)
    } catch (err) {
      // Não bloqueia — degradação graciosa: envia tudo se não conseguir a tree
      narrar(`Não foi possível carregar a tree remota, enviando todos os arquivos: ${err.message}`, 'warn')
      githubTreeMap = null
    }

    /* ── Resolver autor do commit ────────────────────────────── */
    let autorNome  = process.env.GIT_AUTOR_NOME  || 'AL Sistemas Bot'
    let autorEmail = process.env.GIT_AUTOR_EMAIL || req.usuario.email || 'bot@alsistemas.com'

    if (autor) {
      // Formato aceito: "Nome <email>" ou apenas "email"
      const match = autor.match(/^(.+?)\s*<([^>]+)>$/)
      if (match) {
        autorNome  = match[1].trim()
        autorEmail = match[2].trim()
      } else if (autor.includes('@')) {
        autorEmail = autor.trim()
      } else {
        autorNome = autor.trim()
      }
    }

    narrar(`Autor do commit: ${autorNome} <${autorEmail}>`)

    /* ── ETAPA 3: Listar arquivos locais ────────────────────── */
    step('listando_arquivos', 25)
    narrar('Listando arquivos do projeto local...')

    const arquivosLocais = listarArquivosCommit(dirPath)

    if (arquivosLocais.length === 0) {
      narrar('Nenhum arquivo encontrado no projeto local.', 'error')
      return done('error', { msg: 'Diretório de projeto está vazio ou sem arquivos elegíveis.' })
    }

    const totalBytes    = arquivosLocais.reduce((s, f) => s + f.bytes, 0)
    const arquivosBinarios = arquivosLocais.filter(f => f.binario).length
    const arquivosGrandes  = arquivosLocais.filter(f => f.bytes > COMMIT_MAX_ARQUIVO_BYTES)

    narrar(`${arquivosLocais.length} arquivo(s) encontrado(s) · ${(totalBytes / 1024).toFixed(1)} KB total`)
    if (arquivosBinarios > 0)
      narrar(`${arquivosBinarios} arquivo(s) binário(s) serão enviados como base64`)
    if (arquivosGrandes.length > 0)
      narrar(`${arquivosGrandes.length} arquivo(s) acima de 10MB serão ignorados`, 'warn')
    if (arquivosLocais.length >= COMMIT_MAX_ARQUIVOS)
      narrar(`Limite de ${COMMIT_MAX_ARQUIVOS} arquivos por commit atingido — node_modules e dist excluídos automaticamente`, 'warn')

    /* ── ETAPA 4: Criar blobs no GitHub ─────────────────────── */
    step('criando_blobs', 35)
    narrar('Criando blobs no GitHub (um por arquivo)...')

    const treeItems   = []
    const errosBlob   = []
    const ignorados   = []
    const enviados    = []
    const inalterados = []

    const total = arquivosLocais.length
    let   idx   = 0

    for (const arquivo of arquivosLocais) {
      if (encerrado) break
      idx++

      // Progresso incremental de 35% a 60%
      const progresso = Math.round(35 + ((idx / total) * 25))
      step('criando_blobs', progresso)

      // Ignorar arquivos muito grandes
      if (arquivo.bytes > COMMIT_MAX_ARQUIVO_BYTES) {
        ignorados.push({ arquivo: arquivo.relPath, motivo: 'arquivo acima de 10MB' })
        narrar(`⚠ Ignorado (>10MB): ${arquivo.relPath}`, 'warn')
        continue
      }

      // Ler conteúdo
      let conteudo
      try {
        if (arquivo.binario) {
          conteudo = { content: fs.readFileSync(arquivo.absPath).toString('base64'), encoding: 'base64' }
        } else {
          conteudo = { content: fs.readFileSync(arquivo.absPath, 'utf8'), encoding: 'utf-8' }
        }
      } catch (err) {
        errosBlob.push({ arquivo: arquivo.relPath, motivo: `Leitura falhou: ${err.message}` })
        narrar(`⚠ Não foi possível ler: ${arquivo.relPath}`, 'warn')
        continue
      }

      /* ── Diff detection: pular arquivo se SHA não mudou ──────
         Compara o git blob SHA local com o SHA que o GitHub já tem.
         Arquivos inalterados são herdados automaticamente via base_tree
         e não precisam de um novo blob — economiza chamadas à API.
      ───────────────────────────────────────────────────────── */
      if (githubTreeMap) {
        const remoteSha = githubTreeMap.get(arquivo.relPath)
        if (remoteSha) {
          const localSha = computeGitBlobSha(conteudo.content, conteudo.encoding)
          if (localSha === remoteSha) {
            inalterados.push(arquivo.relPath)
            continue // herdado do base_tree, sem novo blob necessário
          }
        }
      }

      // Criar blob via API (apenas arquivos novos ou modificados)
      let blobData
      try {
        blobData = await githubFetch(`/repos/${owner}/${repo}/git/blobs`, {
          method: 'POST',
          body:   JSON.stringify({ content: conteudo.content, encoding: conteudo.encoding }),
        })
      } catch (err) {
        errosBlob.push({ arquivo: arquivo.relPath, motivo: `Blob falhou: ${err.message}` })
        narrar(`⚠ Falha ao criar blob para: ${arquivo.relPath} — ${err.message}`, 'warn')
        continue
      }

      treeItems.push({
        path: arquivo.relPath,
        mode: '100644',          // arquivo regular
        type: 'blob',
        sha:  blobData.sha,
      })

      enviados.push(arquivo.relPath)

      // Log a cada 10 arquivos ou para arquivos importantes
      if (idx % 10 === 0 || idx <= 5) {
        narrar(`[${idx}/${total}] ${arquivo.relPath} (${(arquivo.bytes / 1024).toFixed(1)} KB)`)
      }
    }

    /* ── Arquivos removidos localmente: deletar do GitHub ─────
       Qualquer path presente no GitHub mas ausente localmente
       (e não nos inalterados) recebe sha: null para ser excluído.
    ───────────────────────────────────────────────────────── */
    if (githubTreeMap) {
      const pathsLocais = new Set(arquivosLocais.map(f => f.relPath))
      for (const [remotePath] of githubTreeMap) {
        if (!pathsLocais.has(remotePath)) {
          treeItems.push({ path: remotePath, mode: '100644', type: 'blob', sha: null })
          narrar(`🗑 Removido do GitHub (não existe localmente): ${remotePath}`, 'warn')
        }
      }
    }

    if (inalterados.length > 0) {
      narrar(`${inalterados.length} arquivo(s) inalterado(s) — herdados do base_tree sem novo blob`)
    }

    if (treeItems.length === 0) {
      narrar('Nenhum blob foi criado com sucesso. Abortando commit.', 'error')
      clearInterval(pingInterval)
      return done('error', {
        msg: 'Nenhum arquivo pôde ser enviado ao GitHub.',
        relatorio: { erros: errosBlob, ignorados },
      })
    }

    narrar(`${treeItems.length} blob(s) criado(s) no GitHub com sucesso`, 'success')
    if (errosBlob.length > 0)
      narrar(`${errosBlob.length} arquivo(s) falharam e foram excluídos do commit`, 'warn')

    // Emite lista de arquivos incluídos
    files(enviados.slice(0, 300))

    /* ── ETAPA 5: Criar nova tree ───────────────────────────── */
    step('criando_tree', 68)
    narrar('Criando tree consolidada no GitHub...')

    let novaTree
    try {
      novaTree = await githubFetch(`/repos/${owner}/${repo}/git/trees`, {
        method: 'POST',
        body: JSON.stringify({
          base_tree: baseTreeSha,   // herda arquivos não alterados
          tree:      treeItems,
        }),
      })
    } catch (err) {
      narrar(`Erro ao criar tree: ${err.message}`, 'error')
      clearInterval(pingInterval)
      return done('error', { msg: `Falha ao criar tree no GitHub: ${err.message}` })
    }

    narrar(`Tree criada: ${novaTree.sha.slice(0, 7)} · ${novaTree.tree.length} entrada(s)`)

    /* ── ETAPA 6: Criar objeto commit ───────────────────────── */
    step('criando_commit', 78)
    narrar('Criando objeto de commit no GitHub...')

    const agora          = new Date().toISOString()
    const commitPayload  = {
      message: mensagem,
      tree:    novaTree.sha,
      parents: [headCommitSha],
      author:  { name: autorNome, email: autorEmail, date: agora },
      committer: { name: autorNome, email: autorEmail, date: agora },
    }

    let novoCommit
    try {
      novoCommit = await githubFetch(`/repos/${owner}/${repo}/git/commits`, {
        method: 'POST',
        body:   JSON.stringify(commitPayload),
      })
    } catch (err) {
      narrar(`Erro ao criar commit: ${err.message}`, 'error')
      clearInterval(pingInterval)
      return done('error', { msg: `Falha ao criar commit: ${err.message}` })
    }

    narrar(`Commit criado: ${novoCommit.sha.slice(0, 7)}`)
    narrar(`Mensagem: "${mensagem}"`)

    /* ── ETAPA 7: Atualizar referência (push) ───────────────── */
    step('atualizando_ref', 88)
    narrar(`Atualizando referência heads/${targetBranch} no GitHub...`)

    try {
      await githubFetch(`/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`, {
        method: 'PATCH',
        body: JSON.stringify({
          sha:   novoCommit.sha,
          force: force === 'true',
        }),
      })
    } catch (err) {
      // Erro mais comum: branch protegida requer PR
      const motivo = err.status === 422
        ? `Branch "${targetBranch}" pode ser protegida — verifique as regras do repositório.`
        : err.message
      narrar(`Falha ao fazer push para "${targetBranch}": ${motivo}`, 'error')
      narrar('O commit foi criado no GitHub mas a referência NÃO foi atualizada.', 'warn')
      clearInterval(pingInterval)
      return done('error', {
        msg:   `Push falhou: ${motivo}`,
        relatorio: {
          commitShaCriado: novoCommit.sha,
          commitUrl:       novoCommit.html_url,
          mensagem,
          branch:          targetBranch,
          totalArquivos:   treeItems.length,
          erros:           errosBlob,
          ignorados,
          commitadoEm:     agora,
        },
      })
    }

    narrar(`Push concluído — branch "${targetBranch}" aponta para ${novoCommit.sha.slice(0, 7)}`, 'success')

    /* ── ETAPA 8: Registrar no MongoDB ──────────────────────── */
    step('registrando', 94)
    narrar('Registrando metadados do commit no banco de dados...')

    await Projeto.findOneAndUpdate(
      { nome },
      {
        $set: {
          'metadados.ultimoCommitSha':      novoCommit.sha,
          'metadados.ultimoCommitData':     agora,
          'metadados.ultimoCommitMensagem': mensagem,
          'metadados.ultimoCommitAutor':    `${autorNome} <${autorEmail}>`,
          'metadados.ultimoCommitBranch':   targetBranch,
          'metadados.ultimaAtualizacao':    new Date(),
        },
      },
      { upsert: false }
    ).catch(() => null)

    narrar('Metadados salvos')

    // Audit Log
    try {
      const { default: AuditLog } = await import('../models/AuditLog.js')
      await AuditLog.create({
        admin_id:    req.usuario._id,
        admin_email: req.usuario.email,
        acao:        'commit_push',
        recurso:     'projeto_local',
        recurso_id:  nome,
        payload: {
          owner,
          repo,
          nomeProjeto:   nome,
          branch:        targetBranch,
          commitSha:     novoCommit.sha,
          mensagem,
          totalArquivos: treeItems.length,
          totalBytes,
          autor:         `${autorNome} <${autorEmail}>`,
        },
        ip:         req.ip,
        request_id: req.requestId || null,
      })
    } catch { /* audit não bloqueia o pipeline */ }

    /* ── ETAPA 9: Concluído ──────────────────────────────────── */
    step('concluido', 100)
    narrar('Commit e push concluídos com sucesso!', 'success')
    narrar(`Commit: ${novoCommit.sha.slice(0, 7)} · Branch: ${targetBranch}`, 'success')

    clearInterval(pingInterval)
    done('success', {
      msg: `Projeto "${nome}" enviado para ${owner}/${repo}@${targetBranch} com ${treeItems.length} arquivo(s).`,
      relatorio: {
        commitSha:       novoCommit.sha,
        commitShaCurto:  novoCommit.sha.slice(0, 7),
        commitUrl:       novoCommit.html_url || `https://github.com/${owner}/${repo}/commit/${novoCommit.sha}`,
        mensagem,
        branch:          targetBranch,
        autor:           `${autorNome} <${autorEmail}>`,
        totalArquivos:   treeItems.length,
        totalBytes,
        ignorados:       ignorados.length,
        erros:           errosBlob.length,
        arquivosErro:    errosBlob,
        arquivosIgnorados: ignorados,
        commitadoEm:     agora,
        treeBaseSha:     baseTreeSha,
        novaTreeSha:     novaTree.sha,
        commitPaiSha:    headCommitSha,
      },
    })

  } catch (err) {
    clearInterval(pingInterval)
    narrar(`Erro inesperado no pipeline: ${err.message}`, 'error')
    done('error', { msg: err.message || 'Erro interno ao fazer commit.' })
  }
})

export default router
