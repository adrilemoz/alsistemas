/**
 * Login.jsx — SaaS Admin (Sprint 1)
 *
 * Mudanças em relação ao original:
 * - Nome e ícone do produto lidos de VITE_APP_NAME / VITE_APP_TAGLINE
 * - Ícone substituído de Newspaper → LayoutDashboard (mais adequado para SaaS)
 * - Cor primária mantida (green-600) — muda junto com os temas no Sprint 2
 * - Toda a lógica de autenticação permanece idêntica
 *
 * Adicione ao frontend/.env:
 *   VITE_APP_NAME=SaaS Admin
 *   VITE_APP_TAGLINE=Painel de Gerenciamento
 */
import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { LayoutDashboard, Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const APP_NAME    = import.meta.env.VITE_APP_NAME    || 'SaaS Admin'
const APP_TAGLINE = import.meta.env.VITE_APP_TAGLINE || 'Painel de Gerenciamento'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]          = useState('')
  const [senha, setSenha]          = useState('')
  const [mostrarSenha, setMostrar] = useState(false)
  const [loading, setLoading]      = useState(false)

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
      <div className="w-full max-w-sm">

        {/* Cabeçalho / branding */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center
                          mx-auto mb-3 shadow-lg">
            <LayoutDashboard size={26} className="text-white" />
          </div>
          <h1 className="font-heading text-2xl font-bold">
            {APP_NAME}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{APP_TAGLINE}</p>
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

        <p className="text-center text-xs text-gray-400 mt-5">
          Acesso restrito a administradores
        </p>
      </div>
    </div>
  )
}
