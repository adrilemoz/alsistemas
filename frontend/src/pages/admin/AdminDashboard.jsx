/**
 * AdminDashboard.jsx — Sprint 2
 *
 * Painel SaaS do AL Sistemas.
 * Substitui métricas de portal por saúde do sistema, atividade,
 * usuários e módulos SaaS. Usa apenas APIs existentes via hooks.
 */
import { Link } from 'react-router-dom'
import { useSystemHealth } from '../../hooks/useSystemHealth'
import { useSystemLogs }   from '../../hooks/useSystemLogs'
import { useUsersStats }   from '../../hooks/useUsersStats'
// Sprint 3 — hooks dos novos módulos
import { useGitHubRepos }  from '../../modules/github/useGitHubRepos'
import { useProjetos }     from '../../modules/projetos/useProjetos'
// Sprint 4 — hook de análise para seção de inteligência
import { useAnalysisOverview } from '../../modules/analysis/useAnalysis.js'
import { T as C }          from '../../themes/tokens'
import AdminIcon            from '../../components/admin/ui/AdminIcon'

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
      display:'inline-block', width:8, height:8, borderRadius:'50%',
      background:color, flexShrink:0, boxShadow:`0 0 6px ${color}88`,
    }} />
  )
}
function Spin() { return <AdminIcon name="spinSm" size={14} /> }

/* ─── Chip de serviço ─────────────────────────────────── */
function ServiceChip({ label, ok, loading, detalhe }) {
  const cor = loading ? C.amber : ok ? '#22c55e' : '#ef4444'
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:8,
      padding:'8px 14px', borderRadius:10,
      background:`${cor}12`, border:`1px solid ${cor}30`,
    }}>
      <div style={{ flexShrink:0 }}>
        {loading ? <Spin /> : <Dot color={cor} />}
      </div>
      <div>
        <div style={{ fontSize:12, fontWeight:700, color:cor }}>{label}</div>
        {detalhe && <div style={{ fontSize:10, color:C.muted, marginTop:1 }}>{detalhe}</div>}
      </div>
    </div>
  )
}

/* ─── Metric card ─────────────────────────────────────── */
function MetricCard({ icon, label, value, sub, accent, loading }) {
  const ac = accent || '#6b7c4e'
  return (
    <div style={{
      background:C.surface, border:`1px solid ${C.border}`,
      borderRadius:12, padding:'16px 18px',
      display:'flex', flexDirection:'column', gap:8,
      position:'relative', overflow:'hidden',
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:ac, borderRadius:'12px 12px 0 0' }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div style={{ width:34, height:34, borderRadius:8, background:`${ac}22`, display:'flex', alignItems:'center', justifyContent:'center', color:ac }}>{icon}</div>
        <span style={{ fontSize:11, fontWeight:600, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', paddingTop:2 }}>{label}</span>
      </div>
      <div style={{ fontSize:28, fontWeight:800, color:C.text, lineHeight:1 }}>
        {loading ? <span style={{ opacity:.3, fontSize:20 }}>···</span> : typeof value === 'string' ? value : fmt(value)}
      </div>
      {sub && <div style={{ fontSize:11, color:C.muted }}>{sub}</div>}
    </div>
  )
}

/* ─── Section head ────────────────────────────────────── */
function SectionHead({ icon, title, action }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
        <span style={{ color:C.muted }}>{icon}</span>
        <span style={{ fontSize:11, fontWeight:700, color:C.text, textTransform:'uppercase', letterSpacing:'.08em' }}>{title}</span>
      </div>
      {action}
    </div>
  )
}

/* ─── Module button ───────────────────────────────────── */
function ModuleBtn({ to, icon, label, color, badge }) {
  return (
    <Link
      to={to}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', gap:6,
        padding:'16px 10px', borderRadius:12, textDecoration:'none',
        background:C.surf2, border:`1px solid ${C.border}`,
        transition:'all .15s', position:'relative',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=color; e.currentTarget.style.background=`${color}14` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background=C.surf2 }}
    >
      {badge > 0 && (
        <span style={{
          position:'absolute', top:8, right:8,
          background:'#ef4444', color:'#fff', fontSize:9, fontWeight:800,
          borderRadius:10, padding:'1px 5px', minWidth:14, textAlign:'center',
        }}>{badge > 99 ? '99+' : badge}</span>
      )}
      <span style={{ color, width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</span>
      <span style={{ fontSize:11, fontWeight:600, color:C.muted, whiteSpace:'nowrap', textAlign:'center' }}>{label}</span>
    </Link>
  )
}

/* ─── Placeholder de módulo futuro ───────────────────── */
function PlaceholderModule({ icon, label, desc }) {
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap:6,
      padding:'16px 10px', borderRadius:12,
      background:`${C.surf2}80`, border:`1px dashed ${C.border}`,
      opacity:.65, cursor:'default',
    }}>
      <span style={{ color:C.muted, width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center' }}>{icon}</span>
      <span style={{ fontSize:11, fontWeight:600, color:C.muted, textAlign:'center' }}>{label}</span>
      {desc && (
        <span style={{
          fontSize:9, color:C.muted, opacity:.7,
          background:`${C.muted}18`, borderRadius:4, padding:'2px 6px',
          textTransform:'uppercase', letterSpacing:'.05em',
        }}>{desc}</span>
      )}
    </div>
  )
}

/* ─── Linhas de log ───────────────────────────────────── */
const ERRO_META = {
  render:              { label:'Render',  cor:'#ef4444' },
  js_error:            { label:'JS',      cor:'#f59e0b' },
  unhandled_rejection: { label:'Promise', cor:'#8b5cf6' },
  api:                 { label:'API',     cor:'#3b82f6' },
}

function ErroRow({ erro }) {
  const meta = ERRO_META[erro.tipo] || { label: erro.tipo || '?', cor: C.muted }
  return (
    <div style={{ display:'flex', gap:10, padding:'9px 0', borderBottom:`1px solid ${C.border}` }}>
      <span style={{ flexShrink:0, padding:'2px 7px', borderRadius:5, fontSize:10, fontWeight:700, background:`${meta.cor}20`, color:meta.cor }}>{meta.label}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, color:C.text, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{erro.mensagem || '(sem mensagem)'}</div>
        <div style={{ fontSize:11, color:C.muted, marginTop:2, display:'flex', gap:8 }}>
          <RelTime iso={erro.criado_em} />
          {erro.rota && <span style={{ opacity:.6 }}>{erro.rota}</span>}
        </div>
      </div>
    </div>
  )
}

function AuditRow({ log }) {
  return (
    <div style={{ display:'flex', gap:10, padding:'9px 0', borderBottom:`1px solid ${C.border}` }}>
      <span style={{ flexShrink:0, padding:'2px 7px', borderRadius:5, fontSize:10, fontWeight:700, background:'#3b82f620', color:'#3b82f6' }}>{log.acao || 'ação'}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, color:C.text, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
          {log.recurso || '—'}{log.admin_email ? ` · ${log.admin_email}` : ''}
        </div>
        <div style={{ fontSize:11, color:C.muted, marginTop:2 }}><RelTime iso={log.criado_em} /></div>
      </div>
    </div>
  )
}

function UserRow({ u }) {
  const cor       = u.ativo !== false ? '#22c55e' : '#ef4444'
  const nomePerfil = u.perfil_id?.nome || '—'
  const perfilCor  = u.perfil_id?.cor  || C.muted
  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:`1px solid ${C.border}` }}>
      <div style={{
        width:30, height:30, borderRadius:'50%', flexShrink:0,
        background:`${perfilCor}22`, display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:13, fontWeight:700, color:perfilCor,
      }}>
        {(u.nome || u.email || '?')[0].toUpperCase()}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:12, color:C.text, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{u.nome || u.email}</div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:2 }}>
          <span style={{ fontSize:10, fontWeight:700, color:perfilCor, background:`${perfilCor}18`, borderRadius:4, padding:'1px 5px' }}>{nomePerfil}</span>
          <Dot color={cor} />
          <span style={{ fontSize:10, color:C.muted }}>{u.ativo !== false ? 'ativo' : 'inativo'}</span>
        </div>
      </div>
      <div style={{ fontSize:10, color:C.muted, textAlign:'right', flexShrink:0 }}>
        {u.ultimo_login ? <RelTime iso={u.ultimo_login} /> : 'sem login'}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  const health = useSystemHealth()
  const logs   = useSystemLogs({ limitErros: 8, limitAudit: 6 })
  const users  = useUsersStats()
  // Sprint 3 — dados dos novos módulos para cards do dashboard
  const github   = useGitHubRepos({ per_page: 5 })
  const projetos = useProjetos()
  // Sprint 4 — análise inteligente para seção de inteligência
  const analysis = useAnalysisOverview()

  const agora = new Date()
  const hora  = agora.toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })
  const data  = agora.toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' })

  const sistemaOk = health.mongodb.ok && health.cloudinary.ok && health.api.ok

  return (
    <>
      <style>{`
        .db2-grid-4 { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
        @media(max-width:1100px){ .db2-grid-4 { grid-template-columns:repeat(2,1fr); } }
        @media(max-width:500px)  { .db2-grid-4 { grid-template-columns:repeat(2,1fr); } }
        .db2-row-2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px; }
        @media(max-width:768px){ .db2-row-2 { grid-template-columns:1fr; } }
        .db2-card { background:var(--adm-surface); border:1px solid var(--adm-border); border-radius:12px; padding:18px; }
        .db2-mod-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:12px; }
        @media(max-width:600px) { .db2-mod-grid { grid-template-columns:repeat(3,1fr); } }
        .db2-future-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
        .db2-chips { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
        .db2-uptime-bar { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        @media(max-width:500px){ .db2-uptime-bar { grid-template-columns:1fr; } }
      `}</style>

      {/* ── Cabeçalho ─────────────────────────────── */}
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">AL Sistemas</div>
          <div className="adm-page-sub">SaaS Admin Panel · {data} · {hora}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{
            padding:'6px 14px', borderRadius:8, fontSize:12, fontWeight:700,
            background: sistemaOk ? '#22c55e14' : '#ef444414',
            border:`1px solid ${sistemaOk ? '#22c55e30' : '#ef444430'}`,
            color: sistemaOk ? '#22c55e' : '#ef4444',
            display:'flex', alignItems:'center', gap:6,
          }}>
            <Dot color={sistemaOk ? '#22c55e' : '#ef4444'} />
            {health.loading ? 'Verificando...' : sistemaOk ? 'Sistema OK' : 'Atenção'}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SEÇÃO 1 — SAÚDE DO SISTEMA
      ══════════════════════════════════════════════ */}
      <div className="db2-card" style={{ marginBottom:20 }}>
        <SectionHead
          icon={<AdminIcon name="server" size={14} />}
          title="Saúde do Sistema"
          action={
            <Link to="/admin/infraestrutura" style={{ fontSize:11, color:'#3b82f6', textDecoration:'none', fontWeight:600 }}>
              Ver infraestrutura →
            </Link>
          }
        />
        <div className="db2-chips">
          <ServiceChip label="MongoDB"    ok={health.mongodb.ok}    loading={health.loading} detalhe={health.mongodb.status} />
          <ServiceChip label="Redis"      ok={health.redis.ok}      loading={health.loading} detalhe={health.redis.status} />
          <ServiceChip label="Cloudinary" ok={health.cloudinary.ok} loading={health.loading} detalhe={health.cloudinary.status} />
          <ServiceChip label="API"        ok={health.api.ok}        loading={health.loading} detalhe={health.api.latencia != null ? `${health.api.latencia}ms` : undefined} />
        </div>
        <div className="db2-uptime-bar">
          {[
            { label:'Uptime', value: health.uptime || '—' },
            { label:'Latência API', value: health.api.latencia != null ? `${health.api.latencia}ms` : '—' },
            { label:'Heap Usado', value: health.memoria != null ? `${Math.round(health.memoria/1024/1024)}MB` : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background:C.surf2, border:`1px solid ${C.border}`, borderRadius:8, padding:'10px 14px' }}>
              <div style={{ fontSize:10, color:C.muted, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:16, fontWeight:800, color:C.text }}>{health.loading ? '···' : value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SEÇÃO 2 — MÉTRICAS SAAS
      ══════════════════════════════════════════════ */}
      <div className="db2-grid-4">
        <MetricCard icon={<AdminIcon name="users"  size={18}/>} label="Total usuários"    value={users.total}                     accent="#3b82f6"  loading={users.loading} />
        <MetricCard icon={<AdminIcon name="check"  size={18}/>} label="Ativos"            value={users.ativos}                    accent="#22c55e"  loading={users.loading} />
        <MetricCard icon={<AdminIcon name="alert"  size={18}/>} label="Erros não lidos"   value={logs.contagemErros.nao_lidos}    accent="#ef4444"  loading={logs.loading}  sub={logs.contagemErros.total ? `${logs.contagemErros.total} total` : undefined} />
        <MetricCard icon={<AdminIcon name="layers" size={18}/>} label="Perfis de acesso"  value={users.totalPerfis}               accent="#8b5cf6"  loading={users.loading} />
      </div>

      {/* ══════════════════════════════════════════════
          SEÇÃO 3 — ATIVIDADE (erros + audit)
      ══════════════════════════════════════════════ */}
      <div className="db2-row-2">
        <div className="db2-card">
          <SectionHead
            icon={<AdminIcon name="alert" size={14} />}
            title="Erros Recentes"
            action={
              <Link to="/admin/erros" style={{ fontSize:11, fontWeight:600, textDecoration:'none', color: logs.contagemErros.nao_lidos > 0 ? '#ef4444' : '#3b82f6' }}>
                {logs.contagemErros.nao_lidos > 0 ? `${logs.contagemErros.nao_lidos} não lidos →` : 'Ver todos →'}
              </Link>
            }
          />
          {logs.loading
            ? <div style={{ color:C.muted, fontSize:13, display:'flex', gap:6, padding:'12px 0' }}><Spin /> Carregando…</div>
            : logs.erros.length === 0
              ? <div style={{ textAlign:'center', padding:'20px 0', color:C.muted, fontSize:13, opacity:.6 }}>✓ Nenhum erro registrado</div>
              : logs.erros.slice(0,6).map((e,i) => <ErroRow key={e._id??i} erro={e} />)
          }
        </div>

        <div className="db2-card">
          <SectionHead
            icon={<AdminIcon name="db" size={14} />}
            title="Atividade Administrativa"
            action={<span style={{ fontSize:11, color:C.muted, fontWeight:600 }}>últimas ações</span>}
          />
          {logs.loading
            ? <div style={{ color:C.muted, fontSize:13, display:'flex', gap:6, padding:'12px 0' }}><Spin /> Carregando…</div>
            : logs.auditLogs.length === 0
              ? <div style={{ textAlign:'center', padding:'20px 0', color:C.muted, fontSize:13, opacity:.6 }}>Nenhuma ação registrada</div>
              : logs.auditLogs.slice(0,6).map((l,i) => <AuditRow key={l._id??i} log={l} />)
          }
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SEÇÃO 4 — USUÁRIOS
      ══════════════════════════════════════════════ */}
      <div className="db2-row-2">
        <div className="db2-card">
          <SectionHead
            icon={<AdminIcon name="users" size={14} />}
            title="Usuários — Últimos Acessos"
            action={<Link to="/admin/usuarios" style={{ fontSize:11, color:'#3b82f6', textDecoration:'none', fontWeight:600 }}>Gerenciar →</Link>}
          />
          {users.loading
            ? <div style={{ color:C.muted, fontSize:13, display:'flex', gap:6, padding:'12px 0' }}><Spin /> Carregando…</div>
            : users.usuarios.length === 0
              ? <div style={{ textAlign:'center', padding:'20px 0', color:C.muted, fontSize:13, opacity:.6 }}>Nenhum usuário cadastrado</div>
              : [...users.usuarios]
                  .sort((a,b) => {
                    if (!a.ultimo_login && !b.ultimo_login) return 0
                    if (!a.ultimo_login) return 1
                    if (!b.ultimo_login) return -1
                    return new Date(b.ultimo_login) - new Date(a.ultimo_login)
                  })
                  .slice(0,6)
                  .map((u,i) => <UserRow key={u._id??u.id??i} u={u} />)
          }
        </div>

        <div className="db2-card">
          <SectionHead
            icon={<AdminIcon name="layers" size={14} />}
            title="Perfis de Acesso"
            action={<Link to="/admin/usuarios" style={{ fontSize:11, color:'#3b82f6', textDecoration:'none', fontWeight:600 }}>Editar →</Link>}
          />
          {users.loading
            ? <div style={{ color:C.muted, fontSize:13, display:'flex', gap:6, padding:'12px 0' }}><Spin /> Carregando…</div>
            : users.porPerfil.length === 0
              ? <div style={{ textAlign:'center', padding:'20px 0', color:C.muted, fontSize:13, opacity:.6 }}>Nenhum perfil configurado</div>
              : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {users.porPerfil.map((p,i) => {
                    const cor = p.cor || '#6b7c4e'
                    const pct = Math.round(((p.count || 0) / (users.total || 1)) * 100)
                    return (
                      <div key={p._id??i}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:C.text }}>{p.nome}</span>
                          <span style={{ fontSize:11, color:C.muted }}>{p.count} usuário{p.count!==1?'s':''}</span>
                        </div>
                        <div style={{ height:5, borderRadius:4, background:C.border, overflow:'hidden' }}>
                          <div style={{ height:'100%', borderRadius:4, background:cor, width:`${pct}%`, transition:'width .4s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
          }
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          SEÇÃO 5 — MÓDULOS SAAS + LEGADO + FUTURO
      ══════════════════════════════════════════════ */}
      <div className="db2-card" style={{ marginBottom:20 }}>
        <SectionHead icon={<AdminIcon name="layers" size={14} />} title="Módulos SaaS" />

        {/* Core SaaS */}
        <div className="db2-mod-grid">
          <ModuleBtn to="/admin/usuarios"       label="Usuários"       icon={<AdminIcon name="users"    size={18}/>} color="#3b82f6" />
          <ModuleBtn to="/admin/erros"          label="Erros & Logs"   icon={<AdminIcon name="alert"    size={18}/>} color="#ef4444" badge={logs.contagemErros.nao_lidos} />
          <ModuleBtn to="/admin/infraestrutura" label="Infraestrutura" icon={<AdminIcon name="server"   size={18}/>} color="#06b6d4" />
          <ModuleBtn to="/admin/backup"         label="Backup"         icon={<AdminIcon name="db"       size={18}/>} color="#f59e0b" />
          <ModuleBtn to="/admin/arquivos"       label="Arquivos"       icon={<AdminIcon name="fileEdit" size={18}/>} color="#8b5cf6" />
          <ModuleBtn to="/admin/setup"          label="Setup"          icon={<AdminIcon name="setup"    size={18}/>} color="#10b981" />
          <ModuleBtn to="/admin/temas"          label="Temas"          icon={<AdminIcon name="palette"  size={18}/>} color="#ec4899" />
        </div>

        {/* Legado: Portal */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, paddingTop:8, borderTop:`1px solid ${C.border}` }}>
          <span style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', whiteSpace:'nowrap' }}>Módulo: Portal (legado)</span>
          <div style={{ flex:1, height:1, background:C.border }} />
          <span style={{ fontSize:9, color:C.muted, background:`${C.muted}16`, borderRadius:4, padding:'2px 6px', fontWeight:600, textTransform:'uppercase' }}>isolado</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16, opacity:.75 }}>
          <ModuleBtn to="/admin/noticias"   label="Notícias"   icon={<AdminIcon name="news" size={18}/>} color={C.muted} />
          <ModuleBtn to="/admin/categorias" label="Categorias" icon={<AdminIcon name="cat"  size={18}/>} color={C.muted} />
          <ModuleBtn to="/admin/rss-import" label="RSS"        icon={<AdminIcon name="rss"  size={18}/>} color={C.muted} />
          <ModuleBtn to="/admin/eventos"    label="Eventos"    icon={<AdminIcon name="cal"  size={18}/>} color={C.muted} />
        </div>

        {/* Sprint 3: Integrações — cards reais */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, paddingTop:8, borderTop:`1px solid ${C.border}` }}>
          <span style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', whiteSpace:'nowrap' }}>Integrações</span>
          <div style={{ flex:1, height:1, background:C.border }} />
          <span style={{ fontSize:9, color:'#22c55e', background:'#22c55e16', borderRadius:4, padding:'2px 6px', fontWeight:600, textTransform:'uppercase' }}>sprint 3</span>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10, marginBottom:16 }}>
          {/* Card GitHub */}
          <Link to="/admin/github" style={{ textDecoration:'none' }}>
            <div style={{
              background:C.surface, border:`1px solid ${C.border}`, borderRadius:10,
              padding:'12px 14px', display:'flex', alignItems:'center', gap:12,
              transition:'border-color .15s, background .15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#6b7c4e60'; e.currentTarget.style.background=C.surf2 }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=C.border;    e.currentTarget.style.background=C.surface }}
            >
              <div style={{ width:36, height:36, borderRadius:8, background:'#6b7c4e22', display:'flex', alignItems:'center', justifyContent:'center', color:'#6b7c4e', flexShrink:0 }}>
                <AdminIcon name="git" size={18} />
              </div>
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.text }}>GitHub Module</div>
                {github.loading ? (
                  <div style={{ fontSize:10, color:C.muted }}>carregando…</div>
                ) : github.erro ? (
                  <div style={{ fontSize:10, color:C.amber }}>token não configurado</div>
                ) : (
                  <div style={{ fontSize:10, color:C.muted }}>
                    {github.total} {github.total === 1 ? 'repositório' : 'repositórios'}
                    {github.status?.login && ` · ${github.status.login}`}
                  </div>
                )}
              </div>
              <AdminIcon name="chevR" size={12} />
            </div>
          </Link>

          {/* Card Projetos Locais */}
          <Link to="/admin/projetos" style={{ textDecoration:'none' }}>
            <div style={{
              background:C.surface, border:`1px solid ${C.border}`, borderRadius:10,
              padding:'12px 14px', display:'flex', alignItems:'center', gap:12,
              transition:'border-color .15s, background .15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='#8b5cf660'; e.currentTarget.style.background=C.surf2 }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=C.border;    e.currentTarget.style.background=C.surface }}
            >
              <div style={{ width:36, height:36, borderRadius:8, background:'#8b5cf622', display:'flex', alignItems:'center', justifyContent:'center', color:'#8b5cf6', flexShrink:0 }}>
                <AdminIcon name="layers" size={18} />
              </div>
              <div style={{ minWidth:0, flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.text }}>Projetos Locais</div>
                {projetos.loading ? (
                  <div style={{ fontSize:10, color:C.muted }}>carregando…</div>
                ) : projetos.erro ? (
                  <div style={{ fontSize:10, color:C.amber }}>diretório não encontrado</div>
                ) : (
                  <div style={{ fontSize:10, color:C.muted }}>
                    {projetos.total} {projetos.total === 1 ? 'projeto' : 'projetos'}
                    {projetos.contagens?.ativo > 0 && ` · ${projetos.contagens.ativo} ativos`}
                  </div>
                )}
              </div>
              <AdminIcon name="chevR" size={12} />
            </div>
          </Link>
        </div>

        {/* Futuro — IA Assistant */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, paddingTop:8, borderTop:`1px solid ${C.border}` }}>
          <span style={{ fontSize:10, color:C.muted, fontWeight:700, textTransform:'uppercase', letterSpacing:'.07em', whiteSpace:'nowrap' }}>Inteligência</span>
          <div style={{ flex:1, height:1, background:C.border }} />
          <span style={{ fontSize:9, color:'#8b5cf6', background:'#8b5cf616', borderRadius:4, padding:'2px 6px', fontWeight:600, textTransform:'uppercase' }}>sprint 4</span>
        </div>
        <div className="db2-mod-grid">
          <ModuleBtn to="/admin/ai-assistant" label="IA Assistant" icon={<AdminIcon name="ia" size={18}/>} color="#8b5cf6" />
        </div>
      </div>
      {/* ══════════════════════════════════════════════
          SEÇÃO 6 — 🧠 INTELIGÊNCIA DO SISTEMA (Sprint 4)
      ══════════════════════════════════════════════ */}
      <div className="db2-card" style={{ marginBottom:20 }}>
        <SectionHead
          icon={<AdminIcon name="ia" size={14} />}
          title="🧠 Inteligência do Sistema"
          action={
            <Link to="/admin/ai-assistant" style={{ fontSize:11, color:'#8b5cf6', textDecoration:'none', fontWeight:600 }}>
              Abrir IA Assistant →
            </Link>
          }
        />

        {/* Score de saúde */}
        {analysis.loading ? (
          <div style={{ display:'flex', alignItems:'center', gap:8, color:C.muted, fontSize:12, marginBottom:12 }}>
            <Spin /> Analisando sistema…
          </div>
        ) : analysis.data?.saude ? (
          <div style={{
            display:'flex', alignItems:'center', gap:10, marginBottom:14,
            padding:'10px 14px', borderRadius:8, background:C.surf2, border:`1px solid ${C.border}`,
          }}>
            <span style={{ fontSize:20 }}>{analysis.data.saude.nivel.emoji}</span>
            <div>
              <span style={{ fontSize:13, fontWeight:800, color:analysis.data.saude.nivel.cor }}>
                {analysis.data.saude.nivel.label}
              </span>
              <span style={{ fontSize:11, color:C.muted, marginLeft:8 }}>
                Score: {analysis.data.saude.score}/100
              </span>
            </div>
            {analysis.data.saude.problemas?.length > 0 && (
              <span style={{ fontSize:10, color:C.muted, marginLeft:'auto' }}>
                {analysis.data.saude.problemas.length} problema(s) detectado(s)
              </span>
            )}
          </div>
        ) : null}

        {/* Cards de inteligência */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:10 }}>
          {[
            {
              label: 'Projetos Ativos',
              value: analysis.data?.stats?.projetos?.ativos ?? '—',
              cor: '#22c55e',
              sub: 'locais',
            },
            {
              label: 'Proj. Abandonados',
              value: analysis.data?.stats?.projetos?.abandonados ?? '—',
              cor: '#ef4444',
              sub: 'locais',
            },
            {
              label: 'Repos Desatualizados',
              value: analysis.data?.stats?.repos?.abandonados ?? '—',
              cor: '#f97316',
              sub: 'GitHub',
            },
            {
              label: 'Alertas Críticos',
              value: analysis.data?.alertasCriticos?.length ?? '—',
              cor: '#8b5cf6',
              sub: 'sistema',
            },
          ].map(({ label, value, cor, sub }) => (
            <div key={label} style={{
              background:C.surface, border:`1px solid ${C.border}`, borderRadius:8,
              padding:'12px 14px', position:'relative', overflow:'hidden',
            }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:cor }} />
              <div style={{ fontSize:9, color:C.muted, textTransform:'uppercase', letterSpacing:'.07em', fontWeight:700, marginBottom:6 }}>{label}</div>
              <div style={{ fontSize:22, fontWeight:900, color: analysis.loading ? C.muted : C.text }}>
                {analysis.loading ? '···' : value}
              </div>
              <div style={{ fontSize:9, color:C.muted, marginTop:2 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Alertas críticos resumidos */}
        {!analysis.loading && analysis.data?.alertasCriticos?.length > 0 && (
          <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}` }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.text, textTransform:'uppercase', letterSpacing:'.07em', marginBottom:8 }}>
              Alertas Recentes
            </div>
            {analysis.data.alertasCriticos.slice(0, 3).map((a, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'7px 0', borderBottom:`1px solid ${C.border}`,
              }}>
                <span style={{
                  fontSize:9, fontWeight:800,
                  color: a.severidade === 'alto' ? '#f97316' : '#ef4444',
                  background: a.severidade === 'alto' ? '#f9731618' : '#ef444418',
                  borderRadius:4, padding:'2px 6px', flexShrink:0,
                }}>
                  {a.severidade?.toUpperCase()}
                </span>
                <span style={{ fontSize:11, color:C.text, flex:1, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {a.titulo}
                </span>
                <span style={{ fontSize:10, color:C.muted, flexShrink:0, fontFamily:'monospace' }}>{a.projeto}</span>
              </div>
            ))}
            <Link to="/admin/ai-assistant" style={{ display:'block', textAlign:'center', marginTop:10, fontSize:11, color:'#8b5cf6', textDecoration:'none', fontWeight:600 }}>
              Ver todos os alertas →
            </Link>
          </div>
        )}
      </div>
    </>
  )
}
