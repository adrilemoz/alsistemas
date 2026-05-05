/**
 * App.jsx — SaaS Admin Panel (Sprint 1)
 *
 * Mudanças em relação ao original:
 * - Rotas públicas (home, notícia, ônibus, eventos) removidas do roteamento
 * - Raiz "/" redireciona para "/login"
 * - Módulo Portal agrupado sob /admin/* (rotas mantidas, sem quebrar links)
 * - Navbar e Footer públicos não são mais renderizados
 * - GlobalMeta removido (não há SEO em sistema admin-only)
 */
import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import PrivateRoute, { AdminRoute } from './components/PrivateRoute'
import LoadingSpinner from './components/LoadingSpinner'
import { ThemeProvider } from './context/ThemeContext'

// ── Autenticação (carregadas no bundle principal — pequenas, sempre necessárias)
import Login          from './pages/Login'
import EsqueciSenha   from './pages/EsqueciSenha'
import RedefinirSenha from './pages/RedefinirSenha'

// ── Core SaaS — lazy chunks
const AdminLayout         = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard      = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminErros          = lazy(() => import('./pages/admin/AdminErros'))
const AdminUsuarios       = lazy(() => import('./pages/admin/AdminUsuarios'))
const AdminBackup         = lazy(() => import('./pages/admin/AdminBackup'))
const AdminSetup          = lazy(() => import('./pages/admin/AdminSetup'))
const AdminInfraestrutura = lazy(() => import('./pages/admin/AdminInfraestrutura'))
const AdminArquivos       = lazy(() => import('./pages/admin/AdminArquivos'))
const AdminTemas          = lazy(() => import('./pages/admin/AdminTemas'))

// ── Módulo Portal (notícias/CMS) — mantido, apenas reagrupado na nav
// Estas páginas continuam funcionando em /admin/noticias, /admin/categorias etc.
// Em Sprint 3 serão movidas para src/modules/portal/
const AdminNoticias    = lazy(() => import('./pages/admin/AdminNoticias'))
const AdminNoticiaForm = lazy(() => import('./pages/admin/AdminNoticiaForm'))
const AdminCategorias  = lazy(() => import('./pages/admin/AdminCategorias'))
const AdminModulos     = lazy(() => import('./pages/admin/AdminModulos'))
const AdminOnibus      = lazy(() => import('./pages/admin/AdminOnibus'))
const AdminEventos     = lazy(() => import('./pages/admin/AdminEventos'))
const AdminNewsletter  = lazy(() => import('./pages/admin/AdminNewsletter'))
const AdminSEO         = lazy(() => import('./pages/admin/AdminSEO'))
const AdminRssImport   = lazy(() => import('./pages/admin/AdminRssImport'))
const AdminFontes      = lazy(() => import('./pages/admin/AdminFontes'))

// ── Sprint 3: Integrações ──────────────────────────────────────
const AdminGitHub      = lazy(() => import('./pages/admin/AdminGitHub'))
const AdminProjetos    = lazy(() => import('./pages/admin/AdminProjetos'))
// ── Sprint 4: Inteligência ─────────────────────────────────────
const AdminAIAssistant = lazy(() => import('./pages/admin/AdminAIAssistant'))

// Wrapper de Suspense reutilizável
function S({ children }) {
  return (
    <Suspense fallback={<LoadingSpinner texto="Carregando painel..." />}>
      {children}
    </Suspense>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Raiz → redireciona direto para login (sem portal público) */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* ── Autenticação ──────────────────────────────────────── */}
      <Route path="/login"           element={<Login />} />
      <Route path="/esqueci-senha"   element={<EsqueciSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />

      {/* Setup inicial — sem auth, redireciona se já instalado */}
      <Route path="/admin/setup" element={<S><AdminSetup /></S>} />

      {/* ── Admin SaaS ────────────────────────────────────────── */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <ThemeProvider>
              <S><AdminLayout /></S>
            </ThemeProvider>
          </AdminRoute>
        }
      >
        {/* Core SaaS */}
        <Route index                 element={<S><AdminDashboard /></S>} />
        <Route path="erros"          element={<S><AdminErros /></S>} />
        <Route path="usuarios"       element={<S><AdminUsuarios /></S>} />
        <Route path="backup"         element={<S><AdminBackup /></S>} />
        <Route path="infraestrutura" element={<S><AdminInfraestrutura /></S>} />
        <Route path="arquivos"       element={<S><AdminArquivos /></S>} />
        <Route path="temas"          element={<S><AdminTemas /></S>} />

        {/* Módulo Portal — rotas preservadas para não quebrar bookmarks/links */}
        <Route path="noticias"       element={<S><AdminNoticias /></S>} />
        <Route path="nova-noticia"   element={<S><AdminNoticiaForm /></S>} />
        <Route path="editar/:id"     element={<S><AdminNoticiaForm /></S>} />
        <Route path="categorias"     element={<S><AdminCategorias /></S>} />
        <Route path="modulos"        element={<S><AdminModulos /></S>} />
        <Route path="onibus"         element={<S><AdminOnibus /></S>} />
        <Route path="eventos"        element={<S><AdminEventos /></S>} />
        <Route path="newsletter"     element={<S><AdminNewsletter /></S>} />
        <Route path="seo"            element={<S><AdminSEO /></S>} />
        <Route path="rss-import"     element={<S><AdminRssImport /></S>} />
        <Route path="fontes"         element={<S><AdminFontes /></S>} />

        {/* Sprint 3: Integrações */}
        <Route path="github"    element={<S><AdminGitHub /></S>} />
        <Route path="projetos"  element={<S><AdminProjetos /></S>} />
        {/* Sprint 4: Inteligência */}
        <Route path="ai-assistant" element={<S><AdminAIAssistant /></S>} />
      </Route>

      {/* 404 */}
      <Route
        path="*"
        element={
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', gap: 12, fontFamily: 'system-ui, sans-serif',
          }}>
            <h1 style={{ fontSize: 72, fontWeight: 900, color: '#e5e7eb', margin: 0 }}>404</h1>
            <p style={{ color: '#6b7280', margin: 0, fontSize: 14 }}>Página não encontrada</p>
            <a
              href="/login"
              style={{
                marginTop: 8, color: '#16a34a', fontWeight: 600,
                fontSize: 14, textDecoration: 'none',
              }}
            >
              Ir para o painel →
            </a>
          </div>
        }
      />
    </Routes>
  )
}
