#!/usr/bin/env node
/**
 * scripts/release.js — Gerador automático de versão do alsistemas
 *
 * USO:
 *   node scripts/release.js          → detecta bump automaticamente
 *   node scripts/release.js patch    → força patch (0.0.X)
 *   node scripts/release.js minor    → força minor (0.X.0)
 *   node scripts/release.js major    → força major (X.0.0)
 *   node scripts/release.js --dry    → simula sem alterar nada
 *
 * CONVENÇÃO DE COMMITS (Conventional Commits):
 *   fix:      → patch   (0.0.1 → 0.0.2)
 *   feat:     → minor   (0.0.2 → 0.1.0)
 *   BREAKING  → major   (0.1.0 → 1.0.0)
 *   chore/docs/style/refactor/test → sem bump (só registra)
 *
 * O QUE FAZ:
 *   1. Lê commits desde a última tag git
 *   2. Determina o tipo de bump (patch/minor/major)
 *   3. Atualiza version em backend/package.json e frontend/package.json
 *   4. Acrescenta entrada no CHANGELOG.md
 *   5. Cria commit "chore(release): vX.Y.Z"
 *   6. Cria tag git vX.Y.Z
 */

import { execSync }  from 'child_process'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT      = resolve(__dirname, '..')
const DRY       = process.argv.includes('--dry')
const FORCED    = ['patch', 'minor', 'major'].find(t => process.argv.includes(t)) || null

// ── Cores para o terminal ──────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  red:    '\x1b[31m',
  gray:   '\x1b[90m',
  cyan:   '\x1b[36m',
}
const log  = (msg)  => console.log(msg)
const ok   = (msg)  => console.log(`${C.green}✔${C.reset}  ${msg}`)
const info = (msg)  => console.log(`${C.blue}ℹ${C.reset}  ${msg}`)
const warn = (msg)  => console.log(`${C.yellow}⚠${C.reset}  ${msg}`)
const err  = (msg)  => console.error(`${C.red}✘${C.reset}  ${msg}`)
const dim  = (msg)  => `${C.gray}${msg}${C.reset}`
const bold = (msg)  => `${C.bold}${msg}${C.reset}`

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf-8', ...opts }).trim()
}

function runSafe(cmd) {
  try { return run(cmd) } catch { return '' }
}

// ── Lê package.json ───────────────────────────────────────────
function lerPkg(caminho) {
  const abs = resolve(ROOT, caminho)
  return JSON.parse(readFileSync(abs, 'utf-8'))
}

function gravarPkg(caminho, obj) {
  const abs = resolve(ROOT, caminho)
  writeFileSync(abs, JSON.stringify(obj, null, 2) + '\n', 'utf-8')
}

// ── Versão atual (referência = backend) ───────────────────────
function versaoAtual() {
  try { return lerPkg('backend/package.json').version || '0.0.0' }
  catch { return '0.0.0' }
}

// ── Bump semântico ────────────────────────────────────────────
function bump(versao, tipo) {
  const [maj, min, pat] = versao.split('.').map(Number)
  if (tipo === 'major') return `${maj + 1}.0.0`
  if (tipo === 'minor') return `${maj}.${min + 1}.0`
  return `${maj}.${min}.${pat + 1}`
}

// ── Última tag git ────────────────────────────────────────────
function ultimaTag() {
  const tag = runSafe('git describe --tags --abbrev=0 2>/dev/null')
  return tag || null
}

// ── Commits desde a última tag ────────────────────────────────
function commitsSinceTag(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD'
  const raw   = runSafe(`git log ${range} --pretty=format:"%H|||%s|||%b---END---"`)
  if (!raw) return []

  return raw.split('---END---')
    .map(bloco => bloco.trim())
    .filter(Boolean)
    .map(bloco => {
      const [hash, assunto, ...corpoArr] = bloco.split('|||')
      return { hash: hash?.trim(), assunto: assunto?.trim(), corpo: corpoArr.join('').trim() }
    })
    .filter(c => c.hash && c.assunto)
}

// ── Parser de Conventional Commits ───────────────────────────
const TIPOS_LABEL = {
  feat:     '✨ Novidades',
  fix:      '🐛 Correções',
  perf:     '⚡ Performance',
  refactor: '♻️  Refatoração',
  docs:     '📝 Documentação',
  style:    '💅 Estilo',
  test:     '🧪 Testes',
  chore:    '🔧 Manutenção',
  ci:       '👷 CI/CD',
  build:    '📦 Build',
}

function parsearCommit(commit) {
  // Formato: tipo(escopo): descrição
  const match = commit.assunto.match(/^(\w+)(\(([^)]+)\))?(!)?:\s*(.+)$/)
  if (!match) return { tipo: 'outros', escopo: null, breaking: false, desc: commit.assunto }

  const [, tipo, , escopo, bang, desc] = match
  const breaking = bang === '!' ||
    commit.corpo.includes('BREAKING CHANGE') ||
    commit.assunto.includes('BREAKING CHANGE')

  return { tipo, escopo: escopo || null, breaking, desc }
}

// ── Determina tipo de bump ────────────────────────────────────
function determinarBump(commits) {
  let tipo = 'patch'
  for (const c of commits) {
    const p = parsearCommit(c)
    if (p.breaking)               { tipo = 'major'; break }
    if (p.tipo === 'feat')          tipo = tipo === 'major' ? 'major' : 'minor'
  }
  return tipo
}

// ── Gera entrada de CHANGELOG ─────────────────────────────────
function gerarChangelog(versao, commits, data) {
  const agrupados = {}
  const outros    = []

  for (const c of commits) {
    const p = parsearCommit(c)
    const key = p.tipo in TIPOS_LABEL ? p.tipo : 'outros'
    if (key === 'outros') {
      outros.push(c.assunto)
      continue
    }
    if (!agrupados[key]) agrupados[key] = []
    const escopo = p.escopo ? `**${p.escopo}:** ` : ''
    const breaking = p.breaking ? ' ⚠️ BREAKING' : ''
    agrupados[key].push(`- ${escopo}${p.desc}${breaking}`)
  }

  const linhas = [
    `## [${versao}] — ${data}`,
    '',
  ]

  for (const [tipo, label] of Object.entries(TIPOS_LABEL)) {
    if (agrupados[tipo]?.length) {
      linhas.push(`### ${label}`)
      linhas.push(...agrupados[tipo])
      linhas.push('')
    }
  }

  if (outros.length) {
    linhas.push('### 🔀 Outros')
    linhas.push(...outros.map(o => `- ${o}`))
    linhas.push('')
  }

  return linhas.join('\n')
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  log('')
  log(`${C.cyan}${C.bold}╔══════════════════════════════════════╗`)
  log(`║     alsistemas — Release Script      ║`)
  log(`╚══════════════════════════════════════╝${C.reset}`)
  log('')

  if (DRY) warn('Modo --dry: nenhum arquivo será alterado.\n')

  // 1. Verifica git
  try { run('git rev-parse --is-inside-work-tree') }
  catch { err('Não é um repositório git.'); process.exit(1) }

  // 2. Verifica uncommitted changes
  const status = runSafe('git status --porcelain')
  if (status && !DRY) {
    err('Há alterações não commitadas. Faça commit antes de gerar a versão.')
    log(dim(status))
    process.exit(1)
  }

  // 3. Versão atual + commits
  const atual   = versaoAtual()
  const tag     = ultimaTag()
  const commits = commitsSinceTag(tag)

  info(`Versão atual:   ${bold(atual)}`)
  info(`Última tag:     ${bold(tag || '(nenhuma — primeiro release)')}`)
  info(`Commits novos:  ${bold(commits.length)}`)
  log('')

  if (!commits.length && !FORCED) {
    warn('Nenhum commit novo desde a última tag. Use "node scripts/release.js patch" para forçar.')
    process.exit(0)
  }

  // 4. Determina bump
  const tipoBump   = FORCED || determinarBump(commits)
  const novaVersao = bump(atual, tipoBump)
  const data       = new Date().toISOString().slice(0, 10)

  log(`  Tipo de bump:  ${C.yellow}${tipoBump}${C.reset}`)
  log(`  Nova versão:   ${C.green}${C.bold}v${novaVersao}${C.reset}`)
  log('')

  // 5. Preview dos commits
  if (commits.length) {
    log(`${C.gray}Commits incluídos:${C.reset}`)
    commits.slice(0, 10).forEach(c => {
      const p = parsearCommit(c)
      const brk = p.breaking ? ` ${C.red}BREAKING${C.reset}` : ''
      log(`  ${dim(c.hash?.slice(0, 7))}  ${p.tipo}${p.escopo ? `(${p.escopo})` : ''}: ${p.desc}${brk}`)
    })
    if (commits.length > 10) log(dim(`  … e mais ${commits.length - 10} commits`))
    log('')
  }

  if (DRY) {
    ok(`[DRY] Geraria versão ${C.green}v${novaVersao}${C.reset} com bump ${tipoBump}`)
    return
  }

  // 6. Atualiza package.json (backend + frontend)
  const pkgPaths = ['backend/package.json', 'frontend/package.json']
  for (const p of pkgPaths) {
    try {
      const pkg = lerPkg(p)
      pkg.version = novaVersao
      gravarPkg(p, pkg)
      ok(`Atualizado ${p}  →  v${novaVersao}`)
    } catch {
      warn(`Não foi possível atualizar ${p} (pode não existir)`)
    }
  }

  // 7. Atualiza CHANGELOG.md
  const changelogPath = resolve(ROOT, 'CHANGELOG.md')
  const entrada = gerarChangelog(novaVersao, commits, data)
  let changelogAtual = ''
  if (existsSync(changelogPath)) {
    changelogAtual = readFileSync(changelogPath, 'utf-8')
    // Remove cabeçalho se já existir para não duplicar
    changelogAtual = changelogAtual.replace(/^# Changelog\n+/, '')
  }
  const novoChangelog = `# Changelog\n\n${entrada}\n${changelogAtual}`
  writeFileSync(changelogPath, novoChangelog, 'utf-8')
  ok(`CHANGELOG.md atualizado`)

  // 8. Commit de release
  run(`git add backend/package.json frontend/package.json CHANGELOG.md`)
  run(`git commit -m "chore(release): v${novaVersao}"`)
  ok(`Commit criado: chore(release): v${novaVersao}`)

  // 9. Tag git
  run(`git tag -a "v${novaVersao}" -m "Release v${novaVersao}"`)
  ok(`Tag criada: v${novaVersao}`)

  log('')
  log(`${C.green}${C.bold}🚀 Release v${novaVersao} gerado com sucesso!${C.reset}`)
  log('')
  log(`  Para publicar no GitHub:`)
  log(`  ${dim('git push && git push --tags')}`)
  log('')
}

main().catch(e => {
  err(e.message)
  process.exit(1)
})
