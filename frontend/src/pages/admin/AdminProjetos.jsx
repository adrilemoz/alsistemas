/**
 * AdminProjetos.jsx — Módulo Projetos Locais
 *
 * Sprint 3 — ADIÇÃO PURA.
 * Sprint 7 — GitHub Sync: badge de status + botão de sincronização por card.
 *
 * Lê e exibe projetos do diretório /projetos via backend.
 * Cada projeto pode ser vinculado a um repositório GitHub e sincronizado
 * (pull do zipball) diretamente pelo painel.
 */
import { useState, useEffect }       from 'react'
import { useProjetos }               from '../../modules/projetos/useProjetos.js'
import { projetosService }           from '../../services/domains/projetos.js'
import { T as C }                    from '../../themes/tokens'
import AdminIcon                     from '../../components/admin/ui/AdminIcon'
import ProjetoSyncModal              from './ProjetoSyncModal.jsx'

/* ── Cores por status ────────────────────────────────────────── */
const STATUS_META = {
  ativo:        { label:'Ativo',        cor:'#22c55e' },
  pausado:      { label:'Pausado',      cor:'#f59e0b' },
  arquivado:    { label:'Arquivado',    cor:C.muted   },
  desconhecido: { label:'Desconhecido', cor:'#64748b' },
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.desconhecido
  return (
    <span style={{
      fontSize:9, fontWeight:700, color:meta.cor,
      background:`${meta.cor}18`, border:`1px solid ${meta.cor}30`,
      borderRadius:4, padding:'2px 7px', textTransform:'uppercase',
      letterSpacing:'.06em',
    }}>
      {meta.label}
    </span>
  )
}

/* ── Chips de tecnologia ─────────────────────────────────────── */
const TECH_COR = {
  'Node.js': '#68a063', Python: '#3572a5', Rust: '#dea584',
  Go: '#00add8', Java: '#b07219', PHP: '#4f5d95', Ruby: '#701516',
  Docker: '#2496ed', 'GitHub CI': '#2088ff',
}

function TechChip({ tech }) {
  const cor = TECH_COR[tech] || '#6b7c4e'
  return (
    <span style={{
      fontSize:9, fontWeight:600, color:C.text,
      background:`${cor}22`, border:`1px solid ${cor}44`,
      borderRadius:4, padding:'2px 6px',
    }}>
      {tech}
    </span>
  )
}

/* ── Formatador de data ──────────────────────────────────────── */
function relTime(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d < 1)   return 'hoje'
  if (d < 7)   return `${d}d atrás`
  if (d < 30)  return `${Math.floor(d / 7)}sem atrás`
  if (d < 365) return `${Math.floor(d / 30)}mo atrás`
  return `${Math.floor(d / 365)}a atrás`
}

/* ── Badge de sincronização GitHub ──────────────────────────────
   Carrega o sync-status de forma lazy (apenas ao expandir o card
   ou quando solicitado) para não sobrecarregar a API do GitHub
   com chamadas em bulk ao listar todos os projetos.
──────────────────────────────────────────────────────────────── */
const SYNC_COR = {
  atualizado:   '#22c55e',
  desatualizado:'#f59e0b',
  desconhecido: '#64748b',
}
const SYNC_LABEL = {
  atualizado:   'Em sincronia',
  desatualizado:'Desatualizado',
  desconhecido: 'Sem info',
}

function GitHubSyncBadge({ syncStatus, loading }) {
  if (loading) {
    return (
      <span style={{
        fontSize:9, color:C.muted,
        display:'inline-flex', alignItems:'center', gap:4,
      }}>
        <AdminIcon name="spinSm" size={10} />
        verificando…
      </span>
    )
  }

  if (!syncStatus) return null

  if (!syncStatus.vinculado) {
    return (
      <span style={{
        fontSize:9, fontWeight:600, color:C.muted,
        border:`1px dashed ${C.border}`, borderRadius:4,
        padding:'2px 6px',
      }}>
        sem vínculo GitHub
      </span>
    )
  }

  const cor   = SYNC_COR[syncStatus.statusSync]   || SYNC_COR.desconhecido
  const label = SYNC_LABEL[syncStatus.statusSync] || SYNC_LABEL.desconhecido

  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:4,
      fontSize:9, fontWeight:700, color:cor,
      background:`${cor}18`, border:`1px solid ${cor}30`,
      borderRadius:4, padding:'2px 7px',
    }}>
      {/* Ícone GitHub mini */}
      <svg width={8} height={8} viewBox="0 0 24 24" fill={cor}>
        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
      {label}
    </span>
  )
}

/* ── Card de projeto ─────────────────────────────────────────── */
function ProjetoCard({ projeto, onOpenSync }) {
  const [expandido, setExpandido] = useState(false)

  // ── Sync status — carregado lazily ao expandir ────────────
  const [syncStatus,  setSyncStatus]  = useState(null)
  const [loadingSync, setLoadingSync] = useState(false)
  const [syncCarregado, setSyncCarregado] = useState(false)

  useEffect(() => {
    // Carrega o sync-status quando o card é expandido (uma única vez)
    if (!expandido || syncCarregado) return
    setLoadingSync(true)
    projetosService.syncStatus(projeto.nome)
      .then(data  => { setSyncStatus(data); setSyncCarregado(true) })
      .catch(()   => { setSyncStatus({ vinculado: false }); setSyncCarregado(true) })
      .finally(() => setLoadingSync(false))
  }, [expandido, syncCarregado, projeto.nome])

  function handleSynced() {
    // Após sync, força re-fetch do status
    setSyncCarregado(false)
    setSyncStatus(null)
  }

  return (
    <div style={{
      background:C.surface, border:`1px solid ${C.border}`,
      borderRadius:10, padding:'14px 16px',
      display:'flex', flexDirection:'column', gap:10,
    }}>
      {/* ── Linha principal ──────────────────────────────── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:3 }}>
            <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{projeto.nome}</span>
            <StatusBadge status={projeto.status} />
            {/* Badge de sync — visível apenas quando expandido */}
            {expandido && (
              <GitHubSyncBadge syncStatus={syncStatus} loading={loadingSync} />
            )}
          </div>
          <div style={{ fontSize:11, color:C.muted, lineHeight:1.4 }}>
            {projeto.descricao !== '—'
              ? projeto.descricao.length > 120
                ? projeto.descricao.slice(0, 120) + '…'
                : projeto.descricao
              : <span style={{ fontStyle:'italic' }}>Sem descrição</span>
            }
          </div>
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
          {/* Abrir no GitHub — só aparece quando o card está expandido e o projeto está vinculado */}
          {expandido && syncStatus?.vinculado && syncStatus?.url && (
            <a
              href={syncStatus.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Abrir ${syncStatus.nomeCompleto || syncStatus.repo} no GitHub`}
              style={{
                background:'none', border:`1px solid ${C.border}`,
                color:C.muted, padding:'5px 7px', borderRadius:6,
                display:'flex', alignItems:'center', gap:4,
                textDecoration:'none', transition:'all .15s',
              }}
            >
              <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <span style={{ fontSize:10, fontWeight:600 }}>GitHub ↗</span>
            </a>
          )}

          {/* Botão de sincronização GitHub — abre o modal */}
          <button
            onClick={() => onOpenSync(projeto)}
            title="Sincronizar com GitHub"
            style={{
              background:'none', border:`1px solid ${C.border}`,
              color:C.muted, cursor:'pointer', padding:'5px 7px',
              borderRadius:6, transition:'all .15s', display:'flex',
              alignItems:'center', gap:4,
            }}
          >
            <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span style={{ fontSize:10, fontWeight:600 }}>Sync</span>
          </button>

          {/* Expandir / recolher */}
          <button
            onClick={() => setExpandido(v => !v)}
            style={{
              background:'none', border:'none',
              color:C.muted, cursor:'pointer', padding:4, borderRadius:4,
              transition:'color .15s',
            }}
            title={expandido ? 'Recolher' : 'Ver detalhes'}
          >
            <AdminIcon name={expandido ? 'chevUp' : 'chevDown'} size={14} />
          </button>
        </div>
      </div>

      {/* ── Tecnologias + meta ───────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:6 }}>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {projeto.tecnologias?.length > 0
            ? projeto.tecnologias.map(t => <TechChip key={t} tech={t} />)
            : <span style={{ fontSize:10, color:C.muted, fontStyle:'italic' }}>stack não detectada</span>
          }
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {projeto.package?.versao && (
            <span style={{ fontSize:10, color:C.muted }}>v{projeto.package.versao}</span>
          )}
          <span style={{ fontSize:10, color:C.muted }}>{relTime(projeto.ultimaAlteracao)}</span>
        </div>
      </div>

      {/* ── Detalhes expandidos ──────────────────────────── */}
      {expandido && (
        <div style={{
          borderTop:`1px solid ${C.border}`, paddingTop:10,
          display:'flex', flexDirection:'column', gap:6,
        }}>
          <div style={{ fontSize:11, color:C.muted }}>
            <span style={{ color:C.subtle }}>Caminho:</span>{' '}
            <code style={{
              fontSize:10, background:C.surf2, padding:'1px 5px',
              borderRadius:3, color:C.text,
            }}>
              {projeto.caminho}
            </code>
          </div>

          {projeto.package?.scripts?.length > 0 && (
            <div style={{ display:'flex', gap:5, flexWrap:'wrap', alignItems:'center' }}>
              <span style={{ fontSize:10, color:C.muted }}>Scripts:</span>
              {projeto.package.scripts.map(s => (
                <code key={s} style={{
                  fontSize:9, background:C.surf2, padding:'1px 5px',
                  borderRadius:3, color:'#60a5fa',
                }}>
                  {s}
                </code>
              ))}
            </div>
          )}

          {/* Info de sync quando vinculado */}
          {syncStatus?.vinculado && (
            <div style={{
              marginTop:4, background:C.surf2, borderRadius:7,
              border:`1px solid ${C.border}`, padding:'8px 10px',
              display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
            }}>
              <div style={{ fontSize:10, color:C.muted }}>
                <svg width={10} height={10} viewBox="0 0 24 24" fill={C.muted}
                  style={{ verticalAlign:'middle', marginRight:4 }}>
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                {syncStatus.nomeCompleto || `${syncStatus.owner}/${syncStatus.repo}`}
                {syncStatus.ultimaSincronizacao && (
                  <span style={{ marginLeft:8 }}>
                    · sync {relTime(syncStatus.ultimaSincronizacao)}
                  </span>
                )}
              </div>
              <button
                onClick={() => onOpenSync(projeto)}
                style={{
                  fontSize:9, fontWeight:700, color:C.blue,
                  background:`${C.blue}12`, border:`1px solid ${C.blue}30`,
                  borderRadius:4, padding:'2px 8px', cursor:'pointer',
                }}
              >
                Gerenciar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ── Skeleton ────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div style={{ display:'grid', gap:10 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{
          background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:10, height:90, opacity: 1 - i * 0.15,
        }} />
      ))}
    </div>
  )
}

/* ── Chips de filtro por status ──────────────────────────────── */
const FILTROS = ['todos', 'ativo', 'pausado', 'arquivado', 'desconhecido']

function FiltroChips({ atual, onChange, contagens }) {
  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
      {FILTROS.map(f => {
        const ativo = f === atual
        const meta  = STATUS_META[f] || { label: 'Todos', cor: C.blue }
        const label = f === 'todos' ? 'Todos' : meta.label
        const cor   = f === 'todos' ? C.blue : meta.cor
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            style={{
              fontSize:11, fontWeight:700,
              color:    ativo ? cor : C.muted,
              background: ativo ? `${cor}18` : 'none',
              border:   `1px solid ${ativo ? `${cor}40` : C.border}`,
              borderRadius:20, padding:'4px 12px', cursor:'pointer',
              transition:'all .15s',
            }}
          >
            {label}
            {contagens[f] > 0 && (
              <span style={{ marginLeft:5, fontSize:9, opacity:.8 }}>
                {contagens[f]}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ── Componente principal ────────────────────────────────────── */
export default function AdminProjetos() {
  const {
    projetos, total, diretorio,
    loading, erro, recarregar,
    filtroStatus, setFiltroStatus, contagens,
  } = useProjetos()

  // ── Modal de sync GitHub ───────────────────────────────────
  const [projetoSync, setProjetoSync] = useState(null) // projeto aberto no modal

  // ── Busca por nome ────────────────────────────────────────
  const [busca, setBusca] = useState('')

  // ── Ordenação: campo ('nome'|'data'|'status') + direção ──
  const [ordemCampo, setOrdemCampo] = useState('status')
  const [ordemAsc,   setOrdemAsc]   = useState(true)

  function toggleOrdem(campo) {
    if (ordemCampo === campo) setOrdemAsc(v => !v)
    else { setOrdemCampo(campo); setOrdemAsc(true) }
  }

  // ── Projetos filtrados + ordenados (processamento local) ──
  const projetosFiltrados = (() => {
    const q = busca.trim().toLowerCase()
    let lista = q
      ? projetos.filter(p => p.nome.toLowerCase().includes(q) || (p.descricao || '').toLowerCase().includes(q))
      : [...projetos]

    lista.sort((a, b) => {
      let va, vb
      if (ordemCampo === 'nome') {
        va = a.nome.toLowerCase(); vb = b.nome.toLowerCase()
      } else if (ordemCampo === 'data') {
        va = new Date(a.ultimaAlteracao || 0).getTime()
        vb = new Date(b.ultimaAlteracao || 0).getTime()
      } else { // status
        const ord = { ativo:0, pausado:1, arquivado:2, desconhecido:3 }
        va = ord[a.status] ?? 3; vb = ord[b.status] ?? 3
      }
      if (va < vb) return ordemAsc ? -1 : 1
      if (va > vb) return ordemAsc ?  1 : -1
      return 0
    })
    return lista
  })()

  return (
    <div style={{ padding:'20px 24px', maxWidth:900 }}>

      {/* ── Cabeçalho ─── */}
      <div style={{ marginBottom:16 }}>
        {/* Linha 1: título + contador + atualizar */}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12, gap:12 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ color:'#6b7c4e' }}><AdminIcon name="layers" size={18} /></span>
              <h1 style={{ fontSize:18, fontWeight:800, color:C.text, margin:0 }}>Projetos Locais</h1>
            </div>
            <div style={{ fontSize:12, color:C.muted }}>
              {diretorio
                ? <>Lendo <code style={{ fontSize:10, background:C.surf2, padding:'1px 5px', borderRadius:3 }}>{diretorio}</code></>
                : 'Projetos detectados no servidor'
              }
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {!loading && !erro && (
              <span style={{
                fontSize:11, fontWeight:700,
                color:C.text, background:C.surf2,
                border:`1px solid ${C.border}`, borderRadius:20,
                padding:'4px 10px',
              }}>
                {projetosFiltrados.length !== total
                  ? `${projetosFiltrados.length} de ${total}`
                  : `${total} ${total === 1 ? 'projeto' : 'projetos'}`}
              </span>
            )}
            <button
              onClick={recarregar}
              disabled={loading}
              style={{
                display:'flex', alignItems:'center', gap:6,
                fontSize:12, fontWeight:600, color:C.text,
                background:C.surface, border:`1px solid ${C.border}`,
                borderRadius:7, padding:'7px 12px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? .6 : 1,
              }}
            >
              <AdminIcon name="refresh" size={12} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Linha 2: busca + botões de ordenação */}
        {!loading && !erro && (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            {/* Campo de busca */}
            <div style={{ position:'relative', flex:'1', minWidth:180 }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                stroke={C.muted} strokeWidth="2"
                style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar por nome ou descrição…"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                style={{
                  width:'100%', boxSizing:'border-box',
                  paddingLeft:28, paddingRight: busca ? 28 : 10,
                  paddingTop:7, paddingBottom:7,
                  fontSize:12, color:C.text,
                  background:C.surface, border:`1px solid ${C.border}`,
                  borderRadius:7, outline:'none',
                }}
              />
              {busca && (
                <button onClick={() => setBusca('')}
                  style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:C.muted,
                    fontSize:14, lineHeight:1, padding:0 }}>
                  ×
                </button>
              )}
            </div>

            {/* Botões de ordenação */}
            {[
              { campo:'status', label:'Status'  },
              { campo:'nome',   label:'Nome'    },
              { campo:'data',   label:'Data'    },
            ].map(({ campo, label }) => {
              const ativo = ordemCampo === campo
              return (
                <button key={campo} onClick={() => toggleOrdem(campo)}
                  style={{
                    fontSize:11, fontWeight:700,
                    color:    ativo ? C.blue : C.muted,
                    background: ativo ? `${C.blue}15` : C.surface,
                    border:   `1px solid ${ativo ? C.blue + '50' : C.border}`,
                    borderRadius:7, padding:'6px 10px', cursor:'pointer',
                    display:'flex', alignItems:'center', gap:4,
                    transition:'all .15s',
                  }}>
                  {label}
                  <span style={{ fontSize:10, opacity: ativo ? 1 : 0.4 }}>
                    {ativo ? (ordemAsc ? '↑' : '↓') : '↕'}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Conteúdo ─── */}
      {erro ? (
        <div style={{
          background:`${C.red}10`, border:`1px solid ${C.red}30`,
          borderRadius:10, padding:'20px 24px', textAlign:'center',
        }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.red, marginBottom:8 }}>
            Erro ao carregar projetos
          </div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>{erro}</div>
          <button
            onClick={recarregar}
            style={{
              fontSize:12, fontWeight:600, color:C.text,
              background:C.surf2, border:`1px solid ${C.border}`,
              borderRadius:7, padding:'7px 16px', cursor:'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : loading ? (
        <Skeleton />
      ) : projetos.length === 0 && contagens.todos === 0 ? (
        <div style={{
          background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:10, padding:'40px 24px', textAlign:'center',
        }}>
          <div style={{ color:C.muted, marginBottom:10 }}>
            <AdminIcon name="layers" size={32} />
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:6 }}>
            Nenhum projeto encontrado
          </div>
          <div style={{ fontSize:12, color:C.muted }}>
            Crie subdiretórios em{' '}
            <code style={{ fontSize:10, background:C.surf2, padding:'1px 5px', borderRadius:3 }}>
              {diretorio || '/projetos'}
            </code>{' '}
            ou configure <code style={{ fontSize:10, background:C.surf2, padding:'1px 5px', borderRadius:3 }}>PROJETOS_PATH</code> no .env.
          </div>
        </div>
      ) : (
        <>
          <FiltroChips
            atual={filtroStatus}
            onChange={setFiltroStatus}
            contagens={contagens}
          />
          {projetosFiltrados.length === 0 ? (
            <div style={{ textAlign:'center', padding:'30px', color:C.muted, fontSize:12 }}>
              {busca.trim()
                ? `Nenhum projeto encontrado para "${busca.trim()}".`
                : `Nenhum projeto com status "${filtroStatus}".`
              }
            </div>
          ) : (
            <div style={{ display:'grid', gap:10 }}>
              {projetosFiltrados.map(p => (
                <ProjetoCard
                  key={p.nome}
                  projeto={p}
                  onOpenSync={setProjetoSync}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Modal de GitHub Sync ─── */}
      {projetoSync && (
        <ProjetoSyncModal
          projeto={projetoSync}
          onClose={() => setProjetoSync(null)}
          onSynced={recarregar}
        />
      )}
    </div>
  )
}
