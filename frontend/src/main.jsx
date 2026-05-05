import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import { errosService } from './services/api'
import App from './App.jsx'
import './index.css'

// ─── Deduplicação de erros ───────────────────────────────────
let ultimoErro = ''
let ultimoTs   = 0

function deveEnviar(msg) {
  const agora = Date.now()
  const chave = msg?.slice(0, 100)
  if (chave === ultimoErro && agora - ultimoTs < 5000) return false
  ultimoErro = chave
  ultimoTs   = agora
  return true
}

// ─── ChunkLoadError: reload automático após deploy ──────────
// Quando um novo deploy invalida chunks antigos (hashes Vite mudam),
// o import() lança "Failed to fetch dynamically imported module".
// Recarregamos uma única vez — sessionStorage previne loop infinito.
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason?.message || String(event.reason || '')

  const isChunkError =
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    event.reason?.name === 'ChunkLoadError'

  if (isChunkError) {
    if (!sessionStorage.getItem('_als_chunk_reload')) {
      sessionStorage.setItem('_als_chunk_reload', '1')
      window.location.reload()
    }
    return
  }

  // Outros erros de promise não tratados
  const razao = event.reason
  const mensagem = razao?.message || String(razao) || 'Promise rejeitada sem motivo'
  if (!deveEnviar(mensagem)) return
  errosService.capturar({
    tipo: 'unhandled_rejection',
    mensagem,
    stack: razao?.stack || null,
    dados: { type: typeof razao },
  })
})

// ─── Erros JS síncronos ──────────────────────────────────────
window.onerror = function (mensagem, fonte, linha, coluna, erroObj) {
  const msg = erroObj?.message || String(mensagem)
  if (!deveEnviar(msg)) return false
  errosService.capturar({
    tipo: 'js_error',
    mensagem: msg,
    stack: erroObj?.stack || `${fonte}:${linha}:${coluna}`,
    dados: { fonte, linha, coluna },
  })
  return false
}

// ─── Limpa flag de chunk reload em navegação bem-sucedida ───
window.addEventListener('load', () => {
  sessionStorage.removeItem('_als_chunk_reload')
})

// ─── Service Worker ──────────────────────────────────────────
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // Produção: registra o SW (cache versionado pelo vite.config.js)
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          // Escuta mensagens do SW (ex: nova versão disponível)
          navigator.serviceWorker.addEventListener('message', event => {
            if (event.data?.type === 'SW_UPDATED') {
              toast.custom(
                t => (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: '#1e293b', color: '#f1f5f9',
                    padding: '10px 16px', borderRadius: 10,
                    boxShadow: '0 4px 20px rgba(0,0,0,.3)',
                    fontSize: 13,
                  }}>
                    <span>🚀 Nova versão disponível</span>
                    <button
                      onClick={() => { toast.dismiss(t.id); window.location.reload() }}
                      style={{
                        background: '#22c55e', color: '#fff', border: 'none',
                        borderRadius: 6, padding: '4px 12px', cursor: 'pointer',
                        fontWeight: 600, fontSize: 12,
                      }}
                    >
                      Atualizar
                    </button>
                    <button
                      onClick={() => toast.dismiss(t.id)}
                      style={{
                        background: 'transparent', color: '#94a3b8', border: 'none',
                        cursor: 'pointer', fontSize: 12, padding: '4px 6px',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ),
                { duration: Infinity }
              )
            }
          })
        })
        .catch(err => console.warn('SW registration failed:', err))
    })
  } else {
    // Desenvolvimento: desregistra qualquer SW existente e limpa todos os caches.
    // Resolve "página em branco após update" sem precisar limpar dados manualmente.
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(r => r.unregister())
    })
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)))
  }
}

// ─── Data Router ────────────────────────────────────────────
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: { borderRadius: '10px', background: '#1e293b', color: '#f1f5f9', fontSize: '14px', maxWidth: '420px', textAlign: 'center' },
            success: { iconTheme: { primary: '#22c55e', secondary: '#f1f5f9' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
          }}
        />
      </AuthProvider>
    ),
    errorElement: <ErrorBoundary contexto="router" />,
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
