/**
 * projetos.js — Rotas de Projetos Locais
 *
 * Sprint 3 — ADIÇÃO PURA. Nenhuma rota existente foi alterada.
 * Sprint 7 — GitHub Sync: vincular, sync-status, registrar-sincronizacao.
 *
 * Rotas originais:
 *   GET /api/projetos          → lista todos os projetos
 *   GET /api/projetos/:nome    → detalhes de um projeto específico
 *
 * Novas rotas (Sprint 7 — GitHub Sync):
 *   POST /api/projetos/:nome/vincular                → vincula/desvincula um repo GitHub
 *   GET  /api/projetos/:nome/sync-status             → status de sincronização com GitHub
 *   POST /api/projetos/:nome/registrar-sincronizacao → salva timestamp após sync bem-sucedido
 */
import { Router }        from 'express'
import fs                from 'fs'
import path              from 'path'
import { autenticar }    from '../middleware/auth.js'
import Projeto           from '../models/Projeto.js'
import { githubFetch }   from '../utils/githubClient.js'

const router = Router()

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
  // Usamos upsert: o projeto pode não ter sido salvo no Mongo ainda
  // (a listagem é feita direto no filesystem).
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

   statusSync:
     'atualizado'   → local está tão novo quanto o GitHub
     'desatualizado'→ GitHub tem commits mais recentes (pushed_at > mtime local)
     'desconhecido' → não foi possível comparar datas
     não vinculado  → { vinculado: false }
────────────────────────────────────────────────────────────── */
router.get('/:nome/sync-status', autenticar, async (req, res) => {
  const { nome } = req.params

  if (!nomeValido(nome))
    return res.status(400).json({ erro: 'Nome de projeto inválido.' })

  // ── Busca metadados do MongoDB ────────────────────────────
  const doc   = await Projeto.findOne({ nome }).lean().catch(() => null)
  const owner = doc?.metadados?.githubOwner
  const repo  = doc?.metadados?.githubRepo

  if (!owner || !repo) {
    return res.json({ vinculado: false })
  }

  // ── Data de modificação local (mtime da pasta) ────────────
  const dirPath = path.join(PROJETOS_DIR, nome)
  let dataLocalModificacao = null
  if (fs.existsSync(dirPath)) {
    dataLocalModificacao = fs.statSync(dirPath).mtime
  }

  // ── Dados do repositório no GitHub ───────────────────────
  try {
    const repoData       = await githubFetch(`/repos/${owner}/${repo}`)
    const dataPushGitHub = new Date(repoData.pushed_at)

    // Compara: se GitHub tem push mais recente que o mtime local (+ 60s de margem)
    let statusSync = 'desconhecido'
    if (dataLocalModificacao) {
      const margemMs = 60 * 1000 // 60 segundos de tolerância
      statusSync = dataPushGitHub > new Date(dataLocalModificacao.getTime() + margemMs)
        ? 'desatualizado'
        : 'atualizado'
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
    // GitHub inacessível ou repo deletado — retorna vínculo existente mas sem status
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
   Chamado pelo frontend após uma sincronização (pull) bem-sucedida.
   Salva o timestamp no metadados do MongoDB para exibição posterior.
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

export default router
