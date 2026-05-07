/**
 * #9 — Health check detalhado: MongoDB, Redis, Cloudinary, GitHub e Groq/IA.
 */
import { Router } from 'express'
import mongoose from 'mongoose'
import { isRedisDisponivel } from '../utils/redis.js'
import { verificarCloudinary } from '../config/index.js'

const router = Router()

/** Verifica se o token GitHub está configurado e válido via /rate_limit */
async function verificarGitHub() {
  const token = process.env.GITHUB_TOKEN
  if (!token) return { ok: false, status: 'token não configurado' }
  const res = await Promise.race([
    fetch('https://api.github.com/rate_limit', {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
  ])
  if (!res.ok) return { ok: false, status: `erro ${res.status}` }
  const data = await res.json()
  const restante = data?.rate?.remaining ?? null
  return {
    ok: true,
    status: restante !== null ? `${restante} req restantes` : 'conectado',
  }
}

/** Verifica se a chave Groq está configurada e válida via /models */
async function verificarGroq() {
  const aiProvider = process.env.AI_PROVIDER || 'groq'
  // Se provedor não for groq, verifica Anthropic
  if (aiProvider !== 'groq') {
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) return { ok: false, status: `${aiProvider}: chave não configurada` }
    return { ok: true, status: `${aiProvider}: configurado` }
  }
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return { ok: false, status: 'GROQ_API_KEY não configurada' }
  const res = await Promise.race([
    fetch('https://api.groq.com/openai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
  ])
  if (!res.ok) return { ok: false, status: `chave inválida (${res.status})` }
  const data = await res.json()
  const modelo = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  const disponivel = data?.data?.some?.(m => m.id === modelo)
  return {
    ok: true,
    status: disponivel ? `modelo: ${modelo}` : 'conectado',
  }
}

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Verifica saúde do servidor e dependências
 *     tags: [Sistema]
 *     responses:
 *       200:
 *         description: Servidor saudável
 *       503:
 *         description: Uma ou mais dependências com falha
 */
router.get('/', async (_req, res) => {
  const inicio = Date.now()

  // MongoDB
  const mongoOk = mongoose.connection.readyState === 1
  const mongoStatus = mongoOk ? 'conectado' : 'desconectado'

  // Redis
  const redisOk = isRedisDisponivel()
  const redisStatus = redisOk ? 'conectado' : 'indisponível (cache em memória ativo)'

  // Cloudinary, GitHub e Groq em paralelo
  const [cloudinaryResult, githubResult, groqResult] = await Promise.allSettled([
    Promise.race([
      verificarCloudinary(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
    ]),
    verificarGitHub(),
    verificarGroq(),
  ])

  const cloudinaryStatus =
    cloudinaryResult.status === 'fulfilled'
      ? cloudinaryResult.value
      : { ok: false, erro: cloudinaryResult.reason?.message ?? 'erro' }

  const githubStatus =
    githubResult.status === 'fulfilled'
      ? githubResult.value
      : { ok: false, status: githubResult.reason?.message ?? 'erro' }

  const groqStatus =
    groqResult.status === 'fulfilled'
      ? groqResult.value
      : { ok: false, status: groqResult.reason?.message ?? 'erro' }

  const tudo_ok = mongoOk && cloudinaryStatus.ok
  const status  = tudo_ok ? 200 : 503

  res.status(status).json({
    ok:          tudo_ok,
    env:         process.env.NODE_ENV,
    latencia_ms: Date.now() - inicio,
    servicos: {
      mongodb:    { ok: mongoOk,             status: mongoStatus },
      redis:      { ok: redisOk,             status: redisStatus },
      cloudinary: { ok: cloudinaryStatus.ok, status: cloudinaryStatus.ok ? 'conectado' : cloudinaryStatus.erro },
      github:     { ok: githubStatus.ok,     status: githubStatus.status },
      groq:       { ok: groqStatus.ok,       status: groqStatus.status },
    },
  })
})

export default router
