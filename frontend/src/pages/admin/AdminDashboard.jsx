/**
 * AdminDashboard.jsx — Sprint 2 (DS Migrado)
 *
 * MIGRADO: DS Sprint
 *   - MetricCard     → DSStatCard
 *   - ServiceChip    → DSServiceChip
 *   - SectionHead    → DSSectionTitle
 *   - Cores hex      → tokens T.*
 *   - Espaçamentos   → SPACE.*
 *   - Border-radius  → RADIUS.*
 *   - FontSizes      → FONT.*
 */
import { Link } from 'react-router-dom'
import { useSystemHealth }      from '../../hooks/useSystemHealth'
import { useSystemLogs }        from '../../hooks/useSystemLogs'
import { useUsersStats }        from '../../hooks/useUsersStats'
import { useGitHubRepos }       from '../../modules/github/useGitHubRepos'
import { useProjetos }          from '../../modules/projetos/useProjetos'
import { useAnalysisOverview }  from '../../modules/analysis/useAnalysis.js'
import { T as C, SPACE, RADIUS, FONT, badgeStyle } from '../../themes/tokens'
import AdminIcon                from '../../components/admin/ui/AdminIcon'
import { DSStatCard, DSServiceChip, DSSectionTitle, DSBadge } from '../../components/admin/ui/DS'

/* ─── Utilitários ─────────────────────────────────────── */
function fmt(n) { return (n ?? 0).toLocaleString('pt-BR') }

function RelTime({ iso }) {
  if (!iso) return <span style={{ color: C.muted }}>—</span>
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return <span>agora</span>
  if (m < 60) return <span>{m}min atrás</span>
  const h = Math.floor(m / 60)
  if (h < 24) return <span>{h}h atrás</span>
  return <span>{Math.floor(h / 24)}d atrás</span>
}

function Dot({ color }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: color, flexShrink: 0, boxShadow: `0 0 6px ${color}88`,
    }} />
  )
}
function Spin() { return <AdminIcon name="spinSm" size={14} /> }

/* ─── Module button ───────────────────────────────────── */
function ModuleBtn({ to, icon, label, color, badge }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.sm,
        padding: `${SPACE.xl}px ${SPACE.md + 2}px`,
        borderRadius: RADIUS.xl,
        textDecoration: 'none',
        background: C.surf2,
        border: `1px solid ${C.border}`,
        transition: 'all .15s',
        position: 'relative',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = `${color}14` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surf2 }}
    >
      {badge > 0 && (
        <span style={{
          position: 'absolute', top: SPACE.md, right: SPACE.md,
          background: C.red, color: '#fff',
          fontSize: FONT.xs - 1, fontWeight: 800,
          borderRadius: RADIUS.pill, padding: '1px 5px',
          minWidth: 14, textAlign: 'center',
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <span style={{ color, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <span style={{ fontSize: FONT.sm, fontWeight: 600, color: C.muted, whiteSpace: 'nowrap', textAlign: 'center' }}>{label}</span>
    </Link>
  )
}

function PlaceholderModule({ icon, label, desc }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.sm,
      padding: `${SPACE.xl}px ${SPACE.md + 2}px`,
      borderRadius: RADIUS.xl,
      background: `${C.surf2}80`,
      border: `1px dashed ${C.border}`,
      opacity: .65, cursor: 'default',
    }}>
      <span style={{ color: C.muted, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <span style={{ fontSize: FONT.sm, fontWeight: 600, color: C.muted, textAlign: 'center' }}>{label}</span>
      {desc && (
        <span style={{
          fontSize: FONT.xs - 1, color: C.muted, opacity: .7,
          background: `${C.muted}18`, borderRadius: RADIUS.xs,
          padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '.05em',
        }}>{desc}</span>
      )}
    </div>
  )
}

/* ─── Linhas de log ───────────────────────────────────── */
const ERRO_META = {
  render:              { label: 'Render',  cor: C.red   },
  js_error:            { label: 'JS',      cor: C.amber },
  unhandled_rejection: { label: 'Promise', cor: C.purple },
  api:                 { label: 'API',     cor: C.blue  },
}

function ErroRow({ erro }) {
  const meta = ERRO_META[erro.tipo] || { label: erro.tipo || '?', cor: C.muted }
  return (
    <div style={{ display: 'flex', gap: SPACE.md + 2, padding: `9px 0`, borderBottom: `1px solid ${C.border}` }}>
      <span style={{ flexShrink: 0, ...badgeStyle('gray'), background: `${meta.cor}20`, color: meta.cor }}>
        {meta.label}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: FONT.base, color: C.text, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {erro.mensagem || '(sem mensagem)'}
        </div>
        <div style={{ fontSize: FONT.sm, color: C.muted, marginTop: 2, display: 'flex', gap: SPACE.md }}>
          <RelTime iso={erro.criado_em} />
          {erro.rota && <span style={{ opacity: .6 }}>{erro.rota}</span>}
        </div>
      </div>
    </div>
  )
}

function AuditRow({ log }) {
  return (
    <div style={{ display: 'flex', gap: SPACE.md + 2, padding: `9px 0`, borderBottom: `1px solid ${C.border}` }}>
      <span style={{ flexShrink: 0, ...badgeStyle('blue') }}>
        {log.acao || 'ação'}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: FONT.base, color: C.text, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {log.recurso || '—'}{log.admin_email ? ` · ${log.admin_email}` : ''}
        </div>
        <div style={{ fontSize: FONT.sm, color: C.muted, marginTop: 2 }}>
          <RelTime iso={log.criado_em} />
        </div>
      </div>
    </div>
  )
}

function UserRow({ u }) {
  const cor        = u.ativo !== false ? C.greenSolid : C.red
  const nomePerfil = u.perfil_id?.nome || '—'
  const perfilCor  = u.perfil_id?.cor  || C.muted
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md + 2, padding: `9px 0`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{
        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
        background: `${perfilCor}22`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: FONT.md, fontWeight: 700, color: perfilCor,
      }}>
        {(u.nome || u.email || '?')[0].toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: FONT.base, color: C.text, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {u.nome || u.email}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, marginTop: 2 }}>
          <span style={{ ...badgeStyle('gray'), background: `${perfilCor}18`, color: perfilCor, borderRadius: RADIUS.xs }}>
            {nomePerfil}
          </span>
          <Dot color={cor} />
          <span style={{ fontSize: FONT.xs, color: C.muted }}>
            {u.ativo !== false ? 'ativo' : 'inativo'}
          </span>
        </div>
      </div>
      <div style={{ fontSize: FONT.xs, color: C.muted, textAlign: 'right', flexShrink: 0 }}>
        {u.ultimo_login ? <RelTime iso={u.ultimo_login} /> : 'sem login'}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const health   = useSystemHealth()
  const logs     = useSystemLogs({ limitErros: 8, limitAudit: 6 })
  const users    = useUsersStats()
  const github   = useGitHubRepos({ per_page: 5 })
  const projetos = useProjetos()
  const analysis = useAnalysisOverview()

  const agora = new Date()
  const hora  = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const data  = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  const sistemaOk = health.mongodb.ok && health.cloudinary.ok && health.api.ok

  return (
    <>
      <style>{`
        .db2-grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:${SPACE.lg}px; margin-bottom:${SPACE.xl2}px; }
        @media(max-width:1100px){ .db2-grid-4 { grid-template-columns:repeat(2,1fr); } }
        @media(max-width:500px)  { .db2-grid-4 { grid-template-columns:repeat(2,1fr); } }
        .db2-row-2 { display:grid; grid-template-columns:1fr 1fr; gap:${SPACE.xl}px; margin-bottom:${SPACE.xl2}px; }
        @media(max-width:768px){ .db2-row-2 { grid-template-columns:1fr; } }
        .db2-card { background:var(--adm-surface); border:1px solid var(--adm-border); border-radius:${RADIUS.xl}px; padding:${SPACE.xl}px; margin-bottom:${SPACE.xl2}px; }
        .db2-mod-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:${SPACE.md}px; margin-bottom:${SPACE.lg}px; }
        @media(max-width:600px) { .db2-mod-grid { grid-template-columns:repeat(3,1fr); } }
        .db2-chips { display:flex; gap:${SPACE.md}px; flex-wrap:wrap; margin-bottom:${SPACE.xl}px; }
        .db2-uptime-bar { display:grid; grid-template-columns:repeat(3,1fr); gap:${SPACE.md + 2}px; }
        @media(max-width:500px){ .db2-uptime-bar { grid-template-columns:1fr; } }
      `}</style>

      {/* ── Cabeçalho ─────────────────────────────── */}
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">AL Sistemas</div>
          <div className="adm-page-sub">SaaS Admin Panel · {data} · {hora}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md }}>
          <DSBadge variant={sistemaOk ? 'green' : 'red'}>
            <Dot color={sistemaOk ? C.greenSolid : C.red} />
            {health.loading ? 'Verificando...' : sistemaOk ? 'Sistema OK' : 'Atenção'}
          </DSBadge>
        </div>
      </div>

      {/* ── Saúde do Sistema ──────────────────────── */}
      <div className="db2-card">
        <DSSectionTitle
          icon={<AdminIcon name="server" size={14} />}
          actions={
            <Link to="/admin/infraestrutura" style={{ fontSize: FONT.sm, color: C.blue, textDecoration: 'none', fontWeight: 600 }}>
              Ver infraestrutura →
            </Link>
          }
        >
          Saúde do Sistema
        </DSSectionTitle>
        <div className="db2-chips">
          <DSServiceChip label="MongoDB"    ok={health.mongodb.ok}    loading={health.loading} detalhe={health.mongodb.status} />
          <DSServiceChip label="Redis"      ok={health.redis.ok}      loading={health.loading} detalhe={health.redis.status} />
          <DSServiceChip label="Cloudinary" ok={health.cloudinary.ok} loading={health.loading} detalhe={health.cloudinary.status} />
          <DSServiceChip label="API"        ok={health.api.ok}        loading={health.loading} detalhe={health.api.latencia != null ? `${health.api.latencia}ms` : undefined} />
        </div>
        <div className="db2-uptime-bar">
          {[
            { label: 'Uptime',       value: health.uptime || '—' },
            { label: 'Latência API', value: health.api.latencia != null ? `${health.api.latencia}ms` : '—' },
            { label: 'Heap Usado',   value: health.memoria != null ? `${Math.round(health.memoria / 1024 / 1024)}MB` : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: C.surf2, border: `1px solid ${C.border}`,
              borderRadius: RADIUS.md, padding: `${SPACE.md + 2}px 14px`,
            }}>
              <div style={{ fontSize: FONT.xs, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: SPACE.xs }}>{label}</div>
              <div style={{ fontSize: FONT.xl - 2, fontWeight: 800, color: C.text }}>{health.loading ? '···' : value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Integrações Externas ───────────────────── */}
      <div className="db2-card">
        <DSSectionTitle
          icon={<AdminIcon name="git" size={14} />}
          actions={
            <Link to="/admin/github" style={{ fontSize: FONT.sm, color: C.blue, textDecoration: 'none', fontWeight: 600 }}>
              Ver GitHub →
            </Link>
          }
        >
          Integrações Externas
        </DSSectionTitle>
        <div className="db2-chips">
          <DSServiceChip label="GitHub"    ok={health.github.ok} loading={health.loading} detalhe={health.github.status} />
          <DSServiceChip label="Groq / IA" ok={health.groq.ok}   loading={health.loading} detalhe={health.groq.status} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE.md + 2 }}>
          {[
            { key: 'github', label: 'GitHub API',         icon: 'git', ok: health.github.ok, status: health.github.status },
            { key: 'groq',   label: 'Groq / IA Assistant', icon: 'ia',  ok: health.groq.ok,   status: health.groq.status   },
          ].map(({ key, label, icon, ok, status }) => (
            <div key={key} style={{
              background: C.surf2, border: `1px solid ${C.border}`,
              borderRadius: RADIUS.md, padding: `${SPACE.md + 2}px 14px`,
              display: 'flex', alignItems: 'center', gap: SPACE.md + 2,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: RADIUS.md, flexShrink: 0,
                background: health.loading ? `${C.muted}18` : ok ? `${C.greenSolid}18` : `${C.red}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: health.loading ? C.muted : ok ? C.greenSolid : C.red,
              }}>
                <AdminIcon name={icon} size={16} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: FONT.sm, fontWeight: 700, color: C.text }}>{label}</div>
                <div style={{ fontSize: FONT.xs, color: C.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {health.loading ? 'verificando…' : status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Métricas SaaS ─────────────────────────── */}
      <div className="db2-grid-4">
        <DSStatCard icon={<AdminIcon name="users"  size={18} />} label="Total usuários"   value={users.total}                     accent={C.blue}        loading={users.loading} />
        <DSStatCard icon={<AdminIcon name="check"  size={18} />} label="Ativos"           value={users.ativos}                    accent={C.greenSolid}  loading={users.loading} />
        <DSStatCard icon={<AdminIcon name="alert"  size={18} />} label="Erros não lidos"  value={logs.contagemErros.nao_lidos}    accent={C.red}         loading={logs.loading}  sub={logs.contagemErros.total ? `${logs.contagemErros.total} total` : undefined} />
        <DSStatCard icon={<AdminIcon name="layers" size={18} />} label="Perfis de acesso" value={users.totalPerfis}               accent={C.purple}      loading={users.loading} />
      </div>

      {/* ── Atividade: Erros + Audit ──────────────── */}
      <div className="db2-row-2">
        <div className="db2-card" style={{ marginBottom: 0 }}>
          <DSSectionTitle
            icon={<AdminIcon name="alert" size={14} />}
            actions={
              <Link to="/admin/erros" style={{ fontSize: FONT.sm, fontWeight: 600, textDecoration: 'none', color: logs.contagemErros.nao_lidos > 0 ? C.red : C.blue }}>
                {logs.contagemErros.nao_lidos > 0 ? `${logs.contagemErros.nao_lidos} não lidos →` : 'Ver todos →'}
              </Link>
            }
          >
            Erros Recentes
          </DSSectionTitle>
          {logs.loading
            ? <div style={{ color: C.muted, fontSize: FONT.md, display: 'flex', gap: SPACE.sm, padding: `${SPACE.lg}px 0` }}><Spin /> Carregando…</div>
            : logs.erros.length === 0
              ? <div style={{ textAlign: 'center', padding: `${SPACE.xl2}px 0`, color: C.muted, fontSize: FONT.md, opacity: .6 }}>✓ Nenhum erro registrado</div>
              : logs.erros.slice(0, 6).map((e, i) => <ErroRow key={e._id ?? i} erro={e} />)
          }
        </div>

        <div className="db2-card" style={{ marginBottom: 0 }}>
          <DSSectionTitle
            icon={<AdminIcon name="db" size={14} />}
            actions={<span style={{ fontSize: FONT.sm, color: C.muted, fontWeight: 600 }}>últimas ações</span>}
          >
            Atividade Administrativa
          </DSSectionTitle>
          {logs.loading
            ? <div style={{ color: C.muted, fontSize: FONT.md, display: 'flex', gap: SPACE.sm, padding: `${SPACE.lg}px 0` }}><Spin /> Carregando…</div>
            : logs.auditLogs.length === 0
              ? <div style={{ textAlign: 'center', padding: `${SPACE.xl2}px 0`, color: C.muted, fontSize: FONT.md, opacity: .6 }}>Nenhuma ação registrada</div>
              : logs.auditLogs.slice(0, 6).map((l, i) => <AuditRow key={l._id ?? i} log={l} />)
          }
        </div>
      </div>

      {/* ── Usuários ──────────────────────────────── */}
      <div className="db2-row-2">
        <div className="db2-card" style={{ marginBottom: 0 }}>
          <DSSectionTitle
            icon={<AdminIcon name="users" size={14} />}
            actions={<Link to="/admin/usuarios" style={{ fontSize: FONT.sm, color: C.blue, textDecoration: 'none', fontWeight: 600 }}>Gerenciar →</Link>}
          >
            Usuários — Últimos Acessos
          </DSSectionTitle>
          {users.loading
            ? <div style={{ color: C.muted, fontSize: FONT.md, display: 'flex', gap: SPACE.sm, padding: `${SPACE.lg}px 0` }}><Spin /> Carregando…</div>
            : users.usuarios.length === 0
              ? <div style={{ textAlign: 'center', padding: `${SPACE.xl2}px 0`, color: C.muted, fontSize: FONT.md, opacity: .6 }}>Nenhum usuário cadastrado</div>
              : [...users.usuarios]
                  .sort((a, b) => {
                    if (!a.ultimo_login && !b.ultimo_login) return 0
                    if (!a.ultimo_login) return 1
                    if (!b.ultimo_login) return -1
                    return new Date(b.ultimo_login) - new Date(a.ultimo_login)
                  })
                  .slice(0, 6)
                  .map((u, i) => <UserRow key={u._id ?? u.id ?? i} u={u} />)
          }
        </div>

        <div className="db2-card" style={{ marginBottom: 0 }}>
          <DSSectionTitle
            icon={<AdminIcon name="layers" size={14} />}
            actions={<Link to="/admin/usuarios" style={{ fontSize: FONT.sm, color: C.blue, textDecoration: 'none', fontWeight: 600 }}>Editar →</Link>}
          >
            Perfis de Acesso
          </DSSectionTitle>
          {users.loading
            ? <div style={{ color: C.muted, fontSize: FONT.md, display: 'flex', gap: SPACE.sm, padding: `${SPACE.lg}px 0` }}><Spin /> Carregando…</div>
            : users.porPerfil.length === 0
              ? <div style={{ textAlign: 'center', padding: `${SPACE.xl2}px 0`, color: C.muted, fontSize: FONT.md, opacity: .6 }}>Nenhum perfil configurado</div>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
                  {users.porPerfil.map((p, i) => {
                    const cor = p.cor || C.accent
                    const pct = Math.round(((p.count || 0) / (users.total || 1)) * 100)
                    return (
                      <div key={p._id ?? i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: SPACE.xs }}>
                          <span style={{ fontSize: FONT.base, fontWeight: 600, color: C.text }}>{p.nome}</span>
                          <span style={{ fontSize: FONT.sm, color: C.muted }}>{p.count} usuário{p.count !== 1 ? 's' : ''}</span>
                        </div>
                        <div style={{ height: 5, borderRadius: RADIUS.xs, background: C.border, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: RADIUS.xs, background: cor, width: `${pct}%`, transition: 'width .4s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
          }
        </div>
      </div>

      {/* ── Módulos SaaS ──────────────────────────── */}
      <div className="db2-card">
        <DSSectionTitle icon={<AdminIcon name="layers" size={14} />}>Módulos SaaS</DSSectionTitle>

        <div className="db2-mod-grid">
          <ModuleBtn to="/admin/usuarios"       label="Usuários"       icon={<AdminIcon name="users"    size={18} />} color={C.blue} />
          <ModuleBtn to="/admin/erros"          label="Erros & Logs"   icon={<AdminIcon name="alert"    size={18} />} color={C.red}    badge={logs.contagemErros.nao_lidos} />
          <ModuleBtn to="/admin/infraestrutura" label="Infraestrutura" icon={<AdminIcon name="server"   size={18} />} color={C.cyan} />
          <ModuleBtn to="/admin/backup"         label="Backup"         icon={<AdminIcon name="db"       size={18} />} color={C.amber} />
          <ModuleBtn to="/admin/arquivos"       label="Arquivos"       icon={<AdminIcon name="fileEdit" size={18} />} color={C.purple} />
          <ModuleBtn to="/admin/setup"          label="Setup"          icon={<AdminIcon name="setup"    size={18} />} color={C.greenSolid} />
          <ModuleBtn to="/admin/temas"          label="Temas"          icon={<AdminIcon name="palette"  size={18} />} color="#ec4899" />
        </div>

        {/* Portal legado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md + 2, marginBottom: SPACE.md + 2, paddingTop: SPACE.md, borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: FONT.xs, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', whiteSpace: 'nowrap' }}>
            Módulo: Portal (legado)
          </span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <DSBadge variant="gray">isolado</DSBadge>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: SPACE.md, marginBottom: SPACE.xl, opacity: .75 }}>
          <ModuleBtn to="/admin/noticias"   label="Notícias"   icon={<AdminIcon name="news" size={18} />} color={C.muted} />
          <ModuleBtn to="/admin/categorias" label="Categorias" icon={<AdminIcon name="cat"  size={18} />} color={C.muted} />
          <ModuleBtn to="/admin/rss-import" label="RSS"        icon={<AdminIcon name="rss"  size={18} />} color={C.muted} />
          <ModuleBtn to="/admin/eventos"    label="Eventos"    icon={<AdminIcon name="cal"  size={18} />} color={C.muted} />
        </div>

        {/* Integrações sprint 3 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md + 2, marginBottom: SPACE.md + 2, paddingTop: SPACE.md, borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: FONT.xs, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', whiteSpace: 'nowrap' }}>Integrações</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <DSBadge variant="green">sprint 3</DSBadge>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: SPACE.md + 2, marginBottom: SPACE.xl }}>
          {[
            { to: '/admin/github',   icon: 'git',    color: C.accent,  label: 'GitHub Module',   loading: github.loading,   erro: github.erro,   sub: github.erro ? 'token não configurado' : `${github.total} repositório${github.total !== 1 ? 's' : ''}${github.status?.login ? ` · ${github.status.login}` : ''}` },
            { to: '/admin/projetos', icon: 'layers', color: C.purple,  label: 'Projetos Locais', loading: projetos.loading, erro: projetos.erro, sub: projetos.erro ? 'diretório não encontrado' : `${projetos.total} projeto${projetos.total !== 1 ? 's' : ''}${projetos.contagens?.ativo > 0 ? ` · ${projetos.contagens.ativo} ativos` : ''}` },
          ].map(({ to, icon, color, label, loading, erro, sub }) => (
            <Link key={to} to={to} style={{ textDecoration: 'none' }}>
              <div style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: RADIUS.lg, padding: `${SPACE.lg}px 14px`,
                display: 'flex', alignItems: 'center', gap: SPACE.lg,
                transition: 'border-color .15s, background .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}60`; e.currentTarget.style.background = C.surf2 }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border;     e.currentTarget.style.background = C.surface }}
              >
                <div style={{ width: 36, height: 36, borderRadius: RADIUS.md, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                  <AdminIcon name={icon} size={18} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: FONT.base, fontWeight: 700, color: C.text }}>{label}</div>
                  <div style={{ fontSize: FONT.xs, color: loading ? C.muted : erro ? C.amber : C.muted, marginTop: 2 }}>
                    {loading ? 'carregando…' : sub}
                  </div>
                </div>
                <AdminIcon name="chevR" size={12} />
              </div>
            </Link>
          ))}
        </div>

        {/* Inteligência sprint 4 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md + 2, marginBottom: SPACE.md + 2, paddingTop: SPACE.md, borderTop: `1px solid ${C.border}` }}>
          <span style={{ fontSize: FONT.xs, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.07em', whiteSpace: 'nowrap' }}>Inteligência</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <DSBadge variant="purple">sprint 4</DSBadge>
        </div>
        <div className="db2-mod-grid">
          <ModuleBtn to="/admin/ai-assistant" label="IA Assistant" icon={<AdminIcon name="ia" size={18} />} color={C.purple} />
        </div>
      </div>

      {/* ── Inteligência do Sistema ────────────────── */}
      <div className="db2-card">
        <DSSectionTitle
          icon={<AdminIcon name="ia" size={14} />}
          actions={
            <Link to="/admin/ai-assistant" style={{ fontSize: FONT.sm, color: C.purple, textDecoration: 'none', fontWeight: 600 }}>
              Abrir IA Assistant →
            </Link>
          }
        >
          🧠 Inteligência do Sistema
        </DSSectionTitle>

        {analysis.loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, color: C.muted, fontSize: FONT.base, marginBottom: SPACE.lg }}>
            <Spin /> Analisando sistema…
          </div>
        ) : analysis.data?.saude ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: SPACE.md + 2, marginBottom: SPACE.lg,
            padding: `${SPACE.md + 2}px 14px`, borderRadius: RADIUS.md,
            background: C.surf2, border: `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 20 }}>{analysis.data.saude.nivel.emoji}</span>
            <div>
              <span style={{ fontSize: FONT.md, fontWeight: 800, color: analysis.data.saude.nivel.cor }}>
                {analysis.data.saude.nivel.label}
              </span>
              <span style={{ fontSize: FONT.sm, color: C.muted, marginLeft: SPACE.md }}>
                Score: {analysis.data.saude.score}/100
              </span>
            </div>
            {analysis.data.saude.problemas?.length > 0 && (
              <span style={{ fontSize: FONT.xs, color: C.muted, marginLeft: 'auto' }}>
                {analysis.data.saude.problemas.length} problema(s) detectado(s)
              </span>
            )}
          </div>
        ) : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: SPACE.md + 2 }}>
          {[
            { label: 'Projetos Ativos',       value: analysis.data?.stats?.projetos?.ativos      ?? '—', cor: C.greenSolid, sub: 'locais'  },
            { label: 'Proj. Abandonados',     value: analysis.data?.stats?.projetos?.abandonados  ?? '—', cor: C.red,        sub: 'locais'  },
            { label: 'Repos Desatualizados',  value: analysis.data?.stats?.repos?.abandonados     ?? '—', cor: C.orange,     sub: 'GitHub'  },
            { label: 'Alertas Críticos',      value: analysis.data?.alertasCriticos?.length        ?? '—', cor: C.purple,     sub: 'sistema' },
          ].map(({ label, value, cor, sub }) => (
            <div key={label} style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: RADIUS.md, padding: `${SPACE.lg}px 14px`,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: cor }} />
              <div style={{ fontSize: FONT.xs - 1, color: C.muted, textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 700, marginBottom: SPACE.sm }}>{label}</div>
              <div style={{ fontSize: FONT.xl + 4, fontWeight: 900, color: analysis.loading ? C.muted : C.text }}>
                {analysis.loading ? '···' : value}
              </div>
              <div style={{ fontSize: FONT.xs - 1, color: C.muted, marginTop: 2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {!analysis.loading && analysis.data?.alertasCriticos?.length > 0 && (
          <div style={{ marginTop: SPACE.lg, paddingTop: SPACE.lg, borderTop: `1px solid ${C.border}` }}>
            <div style={{ fontSize: FONT.xs, fontWeight: 700, color: C.text, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: SPACE.md }}>
              Alertas Recentes
            </div>
            {analysis.data.alertasCriticos.slice(0, 3).map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, padding: `7px 0`, borderBottom: `1px solid ${C.border}` }}>
                <DSBadge variant={a.severidade === 'alto' ? 'orange' : 'red'}>
                  {a.severidade?.toUpperCase()}
                </DSBadge>
                <span style={{ fontSize: FONT.sm, color: C.text, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.titulo}
                </span>
                <span style={{ fontSize: FONT.xs, color: C.muted, flexShrink: 0, fontFamily: 'monospace' }}>{a.projeto}</span>
              </div>
            ))}
            <Link to="/admin/ai-assistant" style={{ display: 'block', textAlign: 'center', marginTop: SPACE.md + 2, fontSize: FONT.sm, color: C.purple, textDecoration: 'none', fontWeight: 600 }}>
              Ver todos os alertas →
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
