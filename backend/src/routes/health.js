/**
 * #9 — Health check detalhado: MongoDB, Redis e Cloudinary.
 */
import { Router } from 'express'
import mongoose from 'mongoose'
import { isRedisDisponivel } from '../utils/redis.js'
import { verificarCloudinary } from '../config/index.js'

const router = Router()

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

  // Cloudinary (verificação real via ping — não bloqueia em falha)
  let cloudinaryStatus = { ok: false, erro: 'não verificado' }
  try {
    cloudinaryStatus = await Promise.race([
      verificarCloudinary(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
    ])
  } catch (err) {
    cloudinaryStatus = { ok: false, erro: err.message }
  }

  const tudo_ok = mongoOk && cloudinaryStatus.ok
  const status  = tudo_ok ? 200 : 503

  res.status(status).json({
    ok:         tudo_ok,
    env:        process.env.NODE_ENV,
    latencia_ms: Date.now() - inicio,
    servicos: {
      mongodb:    { ok: mongoOk,               status: mongoStatus },
      redis:      { ok: redisOk,               status: redisStatus },
      cloudinary: { ok: cloudinaryStatus.ok,   status: cloudinaryStatus.ok ? 'conectado' : cloudinaryStatus.erro },
    },
  })
})

export default router
