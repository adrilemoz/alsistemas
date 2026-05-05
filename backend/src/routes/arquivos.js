/**
 * arquivos.js — Editor de arquivos de configuração do projeto.
 *
 * Expõe endpoints protegidos (autenticar + configuracoes.gerenciar) para
 * listar, ler e gravar arquivos da whitelist.
 *
 * SEGURANÇA:
 *   - Apenas arquivos explicitamente declarados em ARQUIVOS_PERMITIDOS
 *     podem ser lidos ou escritos. Tentativas com chaves não listadas
 *     recebem 404.
 *   - Nenhum caminho de fora da whitelist é aceito.
 *
 * PATHS:
 *   process.cwd() no Render = diretório backend/ (Root Directory).
 *   path.resolve(process.cwd(), '..') = raiz do repositório.
 *   Os campos `caminho` são relativos à raiz do repositório.
 */
import { Router }        from 'express'
import fs                from 'fs/promises'
import path              from 'path'
import { autenticar }         from '../middleware/auth.js'
import { verificarPermissao } from '../middleware/verificarPermissao.js'

const router = Router()
router.use(autenticar)
router.use(verificarPermissao('configuracoes.gerenciar'))

// ─── Raiz do repositório ──────────────────────────────────────
// process.cwd() = backend/ quando iniciado pelo Render (Root Directory = backend)
// Em dev local (npm start dentro de backend/) o resultado é o mesmo.
const REPO_ROOT = path.resolve(process.cwd(), '..')

// ─── Whitelist de arquivos permitidos ─────────────────────────
// caminho: relativo à raiz do repositório
export const ARQUIVOS = {
  'env-frontend': {
    grupo:     'Configuração',
    label:     'frontend/.env',
    descricao: 'Variáveis de ambiente do frontend',
    caminho:   'frontend/.env',
    linguagem: 'dotenv',
    aviso:     'Em produção, configure as variáveis no painel do Vercel. Este arquivo só é usado no ambiente local.',
  },
  'env-frontend-example': {
    grupo:     'Configuração',
    label:     'frontend/.env.example',
    descricao: 'Modelo de variáveis de ambiente',
    caminho:   'frontend/.env.example',
    linguagem: 'dotenv',
    aviso:     null,
  },
  'capacitor-config': {
    grupo:     'Configuração',
    label:     'frontend/capacitor.config.ts',
    descricao: 'Configuração do app Android (Capacitor)',
    caminho:   'frontend/capacitor.config.ts',
    linguagem: 'typescript',
    aviso:     'Altere server.url para trocar a URL carregada pelo APK. Gere um novo APK após salvar.',
  },
  'ci-workflow': {
    grupo:     'Configuração',
    label:     '.github/workflows/ci.yml',
    descricao: 'Workflow GitHub Actions — gera o APK',
    caminho:   '.github/workflows/ci.yml',
    linguagem: 'yaml',
    aviso:     'Configure o secret VITE_API_URL no GitHub (Settings → Secrets → Actions) antes de gerar o APK.',
  },
  'readme': {
    grupo:     'Documentação',
    label:     'README.md',
    descricao: 'Documentação principal do projeto',
    caminho:   'README.md',
    linguagem: 'markdown',
    aviso:     null,
  },
  'leia-me': {
    grupo:     'Documentação',
    label:     'LEIA-ME.md',
    descricao: 'Changelog de sprints',
    caminho:   'LEIA-ME.md',
    linguagem: 'markdown',
    aviso:     null,
  },
  'capacitor-md': {
    grupo:     'Documentação',
    label:     'CAPACITOR.md',
    descricao: 'Guia de geração do APK Android',
    caminho:   'CAPACITOR.md',
    linguagem: 'markdown',
    aviso:     null,
  },
  'integration-md': {
    grupo:     'Documentação',
    label:     'INTEGRATION.md',
    descricao: 'Guia de integração frontend ↔ backend',
    caminho:   'INTEGRATION.md',
    linguagem: 'markdown',
    aviso:     null,
  },
  'termux-md': {
    grupo:     'Documentação',
    label:     'TERMUX.md',
    descricao: 'Guia para rodar no Android via Termux',
    caminho:   'TERMUX.md',
    linguagem: 'markdown',
    aviso:     null,
  },
  'readme-mongo': {
    grupo:     'Documentação',
    label:     'README_MONGO.md',
    descricao: 'Guia de configuração do MongoDB',
    caminho:   'README_MONGO.md',
    linguagem: 'markdown',
    aviso:     null,
  },
}

// ─── helper: metadados de um arquivo no disco ─────────────────
async function statArquivo(caminho) {
  try {
    const s = await fs.stat(caminho)
    return { existe: true, tamanho: s.size, modificado: s.mtime }
  } catch {
    return { existe: false, tamanho: 0, modificado: null }
  }
}

// ─── GET /api/admin/arquivos ──────────────────────────────────
// Lista todos os arquivos da whitelist com status de existência.
router.get('/', async (_req, res) => {
  const lista = await Promise.all(
    Object.entries(ARQUIVOS).map(async ([key, info]) => {
      const abs  = path.join(REPO_ROOT, info.caminho)
      const stat = await statArquivo(abs)
      return { key, grupo: info.grupo, label: info.label, descricao: info.descricao,
               linguagem: info.linguagem, aviso: info.aviso, ...stat }
    })
  )
  res.json(lista)
})

// ─── GET /api/admin/arquivos/:key ─────────────────────────────
// Retorna o conteúdo de um arquivo. Se não existir, retorna conteudo:''.
router.get('/:key', async (req, res) => {
  const info = ARQUIVOS[req.params.key]
  if (!info) return res.status(404).json({ erro: 'Arquivo não encontrado na lista permitida.' })

  const abs  = path.join(REPO_ROOT, info.caminho)
  const stat = await statArquivo(abs)

  let conteudo = ''
  if (stat.existe) {
    conteudo = await fs.readFile(abs, 'utf-8')
  }

  res.json({ key: req.params.key, ...info, conteudo, ...stat })
})

// ─── PUT /api/admin/arquivos/:key ─────────────────────────────
// Grava o conteúdo enviado no arquivo. Cria o arquivo se não existir.
router.put('/:key', async (req, res) => {
  const info = ARQUIVOS[req.params.key]
  if (!info) return res.status(404).json({ erro: 'Arquivo não encontrado na lista permitida.' })

  const { conteudo } = req.body
  if (typeof conteudo !== 'string') {
    return res.status(400).json({ erro: 'Campo "conteudo" é obrigatório e deve ser string.' })
  }

  const abs = path.join(REPO_ROOT, info.caminho)

  // Garante que o diretório pai existe (ex.: .github/workflows/)
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, conteudo, 'utf-8')

  res.json({ ok: true, mensagem: `${info.label} salvo com sucesso.` })
})

export default router
