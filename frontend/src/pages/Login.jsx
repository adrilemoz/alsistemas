/**
 * Login.jsx — SaaS Admin
 *
 * Inclui painel de diagnóstico de conexão que roda automaticamente ao carregar,
 * exibindo o estado da API, MongoDB e autenticação em tempo real.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import {
  LayoutDashboard, Eye, EyeOff, LogIn,
  ChevronDown, ChevronUp, Clipboard, ClipboardCheck,
  RefreshCw, Wifi, WifiOff,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const APP_NAME    = import.meta.env.VITE_APP_NAME    || 'SaaS Admin'
const APP_TAGLINE = import.meta.env.VITE_APP_TAGLINE || 'Painel de Gerenciamento'

// ── Endereços de produção ──────────────────────────────────────
const API_BASE    = import.meta.env.VITE_API_URL || 'https://alsistemas.onrender.com/api'
const SERVER_ROOT = API_BASE.replace(/\/api\/?$/, '')

// ── Helpers ────────────────────────────────────────────────────
function ts() {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false })
}

// ─────────────────────────────────────────────────────────────
export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]          = useState('')
  const [senha, setSenha]          = useState('')
  const [mostrarSenha, setMostrar] = useState(false)
  const [loading, setLoading]      = useState(false)

  // ── Diagnóstico ───────────────────────────────────────────────
  const [logEntries, setLogEntries]   = useState([])
  const [diagRunning, setDiagRunning] = useState(false)
  const [diagDone, setDiagDone]       = useState(false)
  const [diagOpen, setDiagOpen]       = useState(true)
  const [copied, setCopied]           = useState(false)
  const [apiOnline, setApiOnline]     = useState(null) // null | true | false
  const logEndRef = useRef(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logEntries])

  const runDiagnostic = useCallback(async () => {
    setLogEntries([])
    setDiagRunning(true)
    setDiagDone(false)
    setApiOnline(null)

    const add = (icon, text) =>
      setLogEntries(prev => [...prev, { ts: ts(), icon, text }])

    add('→', 'Iniciando diagnóstico de conexão…')
    add('→', `API base: ${API_BASE}`)
    add('→', `Origem: ${window.location.origin}`)

    // 1. Raiz do servidor
    add('→', `Testando servidor → GET ${SERVER_ROOT}/`)
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(`${SERVER_ROOT}/`, { signal: ctrl.signal, credentials: 'include' })
      clearTimeout(timer)
      let versao = ''
      try {
        const j = await res.clone().json()
        versao = j.versao || j.version || j.v || ''
      } catch { /* sem JSON */ }
      if (res.ok) {
        setApiOnline(true)
        add('✓', `Servidor respondeu (${res.status})${versao ? ` — versão: ${versao}` : ''}`)
      } else {
        add('⚠', `Servidor retornou ${res.status} na raiz`)
      }
    } catch (err) {
      setApiOnline(false)
      if (err.name === 'AbortError') {
        add('✕', 'Servidor não respondeu em 8 s — timeout (Render pode estar hibernando)')
      } else if (/failed to fetch|networkerror/i.test(err.message)) {
        add('✕', `Falha de rede ao conectar em ${SERVER_ROOT} — verifique CORS ou se o backend está no ar`)
      } else {
        add('✕', `Erro ao contatar servidor: ${err.message}`)
      }
    }

    // 2. /api root
    add('→', `Testando endpoint → GET ${API_BASE}`)
    try {
      const ctrl = new AbortController()
      setTimeout(() => ctrl.abort(), 6000)
      const res = await fetch(API_BASE, { signal: ctrl.signal, credentials: 'include' })
      if (res.status === 404) add('⚠', `/api retornou 404 — rota raiz da API não existe (normal).`)
      else if (res.ok)        add('✓', `/api respondeu ${res.status}`)
      else                    add('⚠', `/api retornou ${res.status}`)
    } catch (err) {
      if (err.name !== 'AbortError') add('⚠', `Não foi possível testar /api: ${err.message}`)
    }

    // 3. MongoDB via /api/health
    add('→', `Testando MongoDB → GET ${API_BASE}/health`)
    try {
      const ctrl = new AbortController()
      setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(`${API_BASE}/health`, { signal: ctrl.signal, credentials: 'include' })
      let j = {}
      try { j = await res.json() } catch { /* sem JSON */ }
      if (res.ok && j?.servicos?.mongodb?.ok) {
        const extras = []
        if (j.servicos?.redis?.ok)      extras.push('Redis ✓')
        if (j.servicos?.cloudinary?.ok) extras.push('Cloudinary ✓')
        add('✓', `MongoDB conectado${extras.length ? ` — ${extras.join(', ')}` : ''}`)
      } else if (res.ok && j?.servicos?.mongodb) {
        add('⚠', `MongoDB: ${j.servicos.mongodb.status}`)
      } else if (res.status === 503) {
        add('✕', `Health retornou 503 — MongoDB: ${j?.servicos?.mongodb?.status || 'desconectado'}`)
      } else {
        add('⚠', `Health retornou ${res.status}`)
      }
    } catch (err) {
      if (err.name === 'AbortError') add('⚠', 'Health check não respondeu em 8 s')
      else                           add('⚠', `Erro no health check: ${err.message}`)
    }

    // 4. Autenticação (credenciais vazias — apenas testa o endpoint)
    add('→', `Testando autenticação → POST ${API_BASE}/auth/login (credenciais vazias)`)
    try {
      const ctrl = new AbortController()
      setTimeout(() => ctrl.abort(), 8000)
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        signal: ctrl.signal,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '', senha: '' }),
      })
      let j = {}
      try { j = await res.json() } catch { /* sem JSON */ }
      const errMsg = j?.erro || j?.message || ''

      if (res.status === 400 || res.status === 422) {
        add('✓', `Auth respondeu ${res.status} — validação OK (endpoint acessível)`)
      } else if (res.status === 401) {
        add('✓', `Auth respondeu 401 — endpoint acessível`)
      } else if (res.status === 404) {
        add('✕', `Auth retornou 404 — rota /api/auth/login não encontrada`)
      } else if (res.status === 500) {
        if (/cors/i.test(errMsg)) {
          add('✕', `Auth retornou 500: CORS bloqueado: ${window.location.origin}`)
          add('⚠', `Adicione ${window.location.origin} em FRONTEND_URL no Render`)
        } else {
          add('✕', `Auth retornou 500${errMsg ? `: ${errMsg}` : ''}`)
          add('⚠', `Provável causa: utilizador não existe na base. Aceda a /admin/setup para criar.`)
        }
      } else {
        add('⚠', `Auth retornou ${res.status}${errMsg ? `: ${errMsg}` : ''}`)
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        add('⚠', 'Auth endpoint não respondeu em 8 s')
      } else if (/failed to fetch/i.test(err.message)) {
        add('✕', `CORS bloqueou requisição para /api/auth/login`)
        add('⚠', `Adicione ${window.location.origin} em FRONTEND_URL no backend (Render)`)
      } else {
        add('✕', `Erro ao testar auth: ${err.message}`)
      }
    }

    add('→', '─── Diagnóstico concluído. Usa 📋 Copiar para partilhar o log. ───')
    setDiagRunning(false)
    setDiagDone(true)
  }, [])

  useEffect(() => { runDiagnostic() }, []) // eslint-disable-line

  function handleCopy() {
    const text = logEntries.map(e => `[${e.ts}] ${e.icon} ${e.text}`).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function entryColor(icon) {
    if (icon === '✓') return 'text-green-400'
    if (icon === '✕') return 'text-red-400'
    if (icon === '⚠') return 'text-yellow-400'
    return 'text-blue-400'
  }

  if (user) return <Navigate to="/admin" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !senha) { toast.error('Preencha email e senha'); return }
    try {
      setLoading(true)
      await login(email, senha)
      toast.success('Bem-vindo!')
      navigate('/admin')
    } catch (err) {
      toast.error(err.message || 'Falha ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50
                    flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">

        {/* Branding */}
        <div className="text-center mb-2">
          <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center
                          mx-auto mb-3 shadow-lg">
            <LayoutDashboard size={26} className="text-white" />
          </div>
          <h1 className="font-heading text-2xl font-bold">{APP_NAME}</h1>
          <p className="text-gray-500 text-sm mt-1">{APP_TAGLINE}</p>
        </div>

        {/* ── Painel de diagnóstico ──────────────────────────── */}
        <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden shadow-xl">

          {/* Barra de título / controles */}
          <button
            type="button"
            onClick={() => setDiagOpen(v => !v)}
            className="w-full flex items-center justify-between px-3 py-2
                       bg-gray-900 hover:bg-gray-800 transition-colors select-none"
          >
            <span className="flex items-center gap-2 text-xs font-mono text-gray-300">
              {diagRunning && <RefreshCw size={12} className="animate-spin text-yellow-400" />}
              {!diagRunning && apiOnline === true  && <Wifi    size={12} className="text-green-400" />}
              {!diagRunning && apiOnline === false && <WifiOff size={12} className="text-red-400"   />}
              <span className="text-gray-500">diagnóstico de conexão</span>
              {diagDone && !diagRunning && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  apiOnline
                    ? 'bg-green-900/60 text-green-300'
                    : 'bg-red-900/60 text-red-300'
                }`}>
                  {apiOnline ? 'API online' : 'API offline'}
                </span>
              )}
            </span>
            <span className="flex items-center gap-2">
              {diagDone && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={e => { e.stopPropagation(); handleCopy() }}
                  onKeyDown={e => e.key === 'Enter' && handleCopy()}
                  title="Copiar log"
                  className="text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                >
                  {copied
                    ? <ClipboardCheck size={13} className="text-green-400" />
                    : <Clipboard      size={13} />
                  }
                </span>
              )}
              {diagDone && !diagRunning && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={e => { e.stopPropagation(); runDiagnostic() }}
                  onKeyDown={e => e.key === 'Enter' && runDiagnostic()}
                  title="Repetir diagnóstico"
                  className="text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
                >
                  <RefreshCw size={13} />
                </span>
              )}
              {diagOpen ? <ChevronUp size={13} className="text-gray-500" /> : <ChevronDown size={13} className="text-gray-500" />}
            </span>
          </button>

          {/* Log */}
          {diagOpen && (
            <div className="px-3 py-2.5 max-h-52 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-0.5">
              {logEntries.length === 0 && diagRunning && (
                <div className="text-gray-500 animate-pulse">Conectando…</div>
              )}
              {logEntries.map((entry, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-gray-600 shrink-0 select-none tabular-nums">[{entry.ts}]</span>
                  <span className={`shrink-0 w-4 text-center select-none ${entryColor(entry.icon)}`}>
                    {entry.icon}
                  </span>
                  <span className="text-gray-300 break-all">{entry.text}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-7">
          <h2 className="font-heading font-bold text-xl text-gray-800 mb-5">Entrar</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className={`input transition-opacity${loading ? ' opacity-50 pointer-events-none' : ''}`}
                placeholder="admin@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                readOnly={loading}
              />
            </div>

            <div>
              <label className="label" htmlFor="senha">Senha</label>
              <div className="relative">
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  className={`input pr-10 transition-opacity${loading ? ' opacity-50 pointer-events-none' : ''}`}
                  placeholder="••••••••"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  readOnly={loading}
                />
                <button
                  type="button"
                  onClick={() => setMostrar(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={16} /> Entrar
                </span>
              )}
            </button>

            <div className="text-center mt-3">
              <Link
                to="/esqueci-senha"
                className="text-xs text-gray-400 hover:text-green-600 transition-colors"
              >
                Esqueceu sua senha?
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400">
          Acesso restrito a administradores
        </p>
      </div>
    </div>
  )
}
