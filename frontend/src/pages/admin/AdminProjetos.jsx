/**
 * AdminProjetos.jsx — Módulo Projetos Locais
 *
 * Sprint 3 — ADIÇÃO PURA.
 * Sprint 7 — GitHub Sync: badge de status + botão de sincronização por card.
 *
 * DS Sprint (conformidade total):
 *   - DSPageHeader  → substitui header div inline com título/contador/botão manuais
 *   - DSBtn         → substitui todos os <button> raw com inline styles (7×)
 *   - DSBadge       → substitui StatusBadge com span inline
 *   - DSEmptyState  → substitui empty state manual
 *   - C.surface2    → corrige alias errado C.surf2 (8×)
 */
import { useState, useEffect }            from 'react'
import { useProjetos }                    from '../../modules/projetos/useProjetos.js'
import { projetosService }                from '../../services/domains/projetos.js'
import { T as C, SPACE, RADIUS, FONT }   from '../../themes/tokens'
import {
  DSPageHeader,
  DSBtn, DSBadge, DSEmptyState,
} from '../../components/admin/ui/DS'
import AdminIcon         from '../../components/admin/ui/AdminIcon'
import ProjetoSyncModal  from './ProjetoSyncModal.jsx'
import ProjetoPublicarModal from './ProjetoPublicarModal.jsx'

/* ── Cores por status ────────────────────────────────────────── */
const STATUS_META = {
  ativo:        { label: 'Ativo',        cor: C.greenSolid },
  pausado:      { label: 'Pausado',      cor: C.amber      },
  arquivado:    { label: 'Arquivado',    cor: C.muted      },
  desconhecido: { label: 'Desconhecido', cor: C.subtle     },
}

// ✅ DSBadge substitui <span style={{ fontSize:FONT.xs, fontWeight:700, ... }}> manual
function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.desconhecido
  return (
    <DSBadge style={{
      background: `${meta.cor}18`, color: meta.cor,
      border: `1px solid ${meta.cor}30`,
      textTransform: 'uppercase', letterSpacing: '.06em',
    }}>
      {meta.label}
    </DSBadge>
  )
}

/* ── Chips de tecnologia ─────────────────────────────────────── */
const TECH_COR = {
  'Node.js': '#68a063', Python: '#3572a5', Rust: '#dea584',
  Go: '#00add8', Java: '#b07219', PHP: '#4f5d95', Ruby: '#701516',
  Docker: '#2496ed', 'GitHub CI': '#2088ff',
}

function TechChip({ tech }) {
  const cor = TECH_COR[tech] || C.accent
  return (
    <span style={{
      fontSize: FONT.xs, fontWeight: 600, color: C.text,
      background: `${cor}22`, border: `1px solid ${cor}44`,
      borderRadius: RADIUS.xs, padding: '2px 6px',
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
   ou quando solicitado) para não sobrecarregar a API do GitHub.
──────────────────────────────────────────────────────────────── */
const SYNC_COR = {
  atualizado:    C.greenSolid,
  desatualizado: C.amber,
  desconhecido:  C.subtle,
}
const SYNC_LABEL = {
  atualizado:    'Em sincronia',
  desatualizado: 'Desatualizado',
  desconhecido:  'Sem info',
}

function GitHubSyncBadge({ syncStatus, loading }) {
  if (loading) {
    return (
      <span style={{ fontSize: FONT.xs, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: SPACE.xs }}>
        <AdminIcon name="spinSm" size={10} />
        verificando…
      </span>
    )
  }

  if (!syncStatus) return null

  if (!syncStatus.vinculado) {
    return (
      <span style={{
        fontSize: FONT.xs, fontWeight: 600, color: C.muted,
        border: `1px dashed ${C.border}`, borderRadius: RADIUS.xs,
        padding: '2px 6px',
      }}>
        sem vínculo GitHub
      </span>
    )
  }

  const cor   = SYNC_COR[syncStatus.statusSync]   || SYNC_COR.desconhecido
  const label = SYNC_LABEL[syncStatus.statusSync] || SYNC_LABEL.desconhecido

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: SPACE.xs,
      fontSize: FONT.xs, fontWeight: 700, color: cor,
      background: `${cor}18`, border: `1px solid ${cor}30`,
      borderRadius: RADIUS.xs, padding: '2px 7px',
    }}>
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

  const [syncStatus,    setSyncStatus]    = useState(null)
  const [loadingSync,   setLoadingSync]   = useState(false)
  const [syncCarregado, setSyncCarregado] = useState(false)

  useEffect(() => {
    if (!expandido || syncCarregado) return
    setLoadingSync(true)
    projetosService.syncStatus(projeto.nome)
      .then(data  => { setSyncStatus(data); setSyncCarregado(true) })
      .catch(()   => { setSyncStatus({ vinculado: false }); setSyncCarregado(true) })
      .finally(() => setLoadingSync(false))
  }, [expandido, syncCarregado, projeto.nome])

  function handleSynced() {
    setSyncCarregado(false)
    setSyncStatus(null)
  }

  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: RADIUS.lg, padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* ── Linha principal ──────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACE.md }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: FONT.md, fontWeight: 700, color: C.text }}>{projeto.nome}</span>
            <StatusBadge status={projeto.status} />
            {expandido && <GitHubSyncBadge syncStatus={syncStatus} loading={loadingSync} />}
          </div>
          <div style={{ fontSize: FONT.sm, color: C.muted, lineHeight: 1.4 }}>
            {projeto.descricao !== '—'
              ? projeto.descricao.length > 120
                ? projeto.descricao.slice(0, 120) + '…'
                : projeto.descricao
              : <span style={{ fontStyle: 'italic' }}>Sem descrição</span>
            }
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, flexShrink: 0 }}>
          {/* Link GitHub — só quando expandido e vinculado */}
          {expandido && syncStatus?.vinculado && syncStatus?.url && (
            <a
              href={syncStatus.url}
              target="_blank"
              rel="noopener noreferrer"
              title={`Abrir ${syncStatus.nomeCompleto || syncStatus.repo} no GitHub`}
              style={{
                background: 'none', border: `1px solid ${C.border}`,
                color: C.muted, padding: '5px 7px', borderRadius: RADIUS.sm,
                display: 'flex', alignItems: 'center', gap: SPACE.xs,
                textDecoration: 'none', transition: 'all .15s',
              }}
            >
              <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              <span style={{ fontSize: 10, fontWeight: 600 }}>GitHub ↗</span>
            </a>
          )}

          {/* ✅ DSBtn substitui <button style={{ background:'none', border:`1px solid ${C.border}`, ... }}> */}
          <DSBtn size="sm" variant="ghost" onClick={() => onOpenSync(projeto)} title="Sincronizar com GitHub">
            <svg width={11} height={11} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span style={{ fontSize: 10, fontWeight: 600 }}>GitHub</span>
          </DSBtn>

          {/* ✅ DSBtn substitui <button style={{ background:'none', border:'none', ... }}> */}
          <DSBtn size="icon" variant="ghost" onClick={() => setExpandido(v => !v)}
            title={expandido ? 'Recolher' : 'Ver detalhes'}>
            <AdminIcon name={expandido ? 'chevUp' : 'chevDown'} size={14} />
          </DSBtn>
        </div>
      </div>

      {/* ── Tecnologias + meta ───────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: SPACE.sm }}>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {projeto.tecnologias?.length > 0
            ? projeto.tecnologias.map(t => <TechChip key={t} tech={t} />)
            : <span style={{ fontSize: 10, color: C.muted, fontStyle: 'italic' }}>stack não detectada</span>
          }
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md }}>
          {projeto.package?.versao && (
            <span style={{ fontSize: 10, color: C.muted }}>v{projeto.package.versao}</span>
          )}
          <span style={{ fontSize: 10, color: C.muted }}>{relTime(projeto.ultimaAlteracao)}</span>
        </div>
      </div>

      {/* ── Detalhes expandidos ──────────────────────────── */}
      {expandido && (
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
          <div style={{ fontSize: FONT.sm, color: C.muted }}>
            <span style={{ color: C.subtle }}>Caminho:</span>{' '}
            {/* ✅ C.surf2 → C.surface2 */}
            <code style={{ fontSize: 10, background: C.surface2, padding: '1px 5px', borderRadius: 3, color: C.text }}>
              {projeto.caminho}
            </code>
          </div>

          {projeto.package?.scripts?.length > 0 && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: C.muted }}>Scripts:</span>
              {projeto.package.scripts.map(s => (
                <code key={s} style={{ fontSize: FONT.xs, background: C.surface2, padding: '1px 5px', borderRadius: RADIUS.xs, color: C.blue }}>
                  {s}
                </code>
              ))}
            </div>
          )}

          {syncStatus?.vinculado && (
            <div style={{
              marginTop: 4, background: C.surface2, borderRadius: 7,  /* ✅ C.surf2 → C.surface2 */
              border: `1px solid ${C.border}`, padding: '8px 10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.md,
            }}>
              <div style={{ fontSize: 10, color: C.muted }}>
                <svg width={10} height={10} viewBox="0 0 24 24" fill={C.muted} style={{ verticalAlign: 'middle', marginRight: 4 }}>
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                {syncStatus.nomeCompleto || `${syncStatus.owner}/${syncStatus.repo}`}
                {syncStatus.ultimaSincronizacao && (
                  <span style={{ marginLeft: 8 }}>· sync {relTime(syncStatus.ultimaSincronizacao)}</span>
                )}
              </div>
              {/* ✅ DSBtn substitui <button style={{ fontSize:FONT.xs, fontWeight:700, color:C.blue, ... }}> */}
              <DSBtn size="sm" variant="ghost" onClick={() => onOpenSync(projeto)}>
                Gerenciar
              </DSBtn>
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
    <div style={{ display: 'grid', gap: 10 }}>
      {[...Array(5)].map((_, i) => (
        <div key={i} style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: RADIUS.lg, height: 90, opacity: 1 - i * 0.15,
        }} />
      ))}
    </div>
  )
}

/* ── Chips de filtro por status ──────────────────────────────── */
const FILTROS = ['todos', 'ativo', 'pausado', 'arquivado', 'desconhecido']

function FiltroChips({ atual, onChange, contagens }) {
  return (
    <div style={{ display: 'flex', gap: SPACE.sm, flexWrap: 'wrap', marginBottom: 14 }}>
      {FILTROS.map(f => {
        const ativo = f === atual
        const meta  = STATUS_META[f] || { label: 'Todos', cor: C.blue }
        const label = f === 'todos' ? 'Todos' : meta.label
        const cor   = f === 'todos' ? C.blue : meta.cor
        return (
          // ✅ DSBtn substitui <button style={{ fontSize:FONT.sm, fontWeight:700, borderRadius:20, ... }}>
          <DSBtn
            key={f}
            size="sm"
            variant="ghost"
            onClick={() => onChange(f)}
            style={{
              color:      ativo ? cor  : C.muted,
              background: ativo ? `${cor}18` : 'none',
              border:     `1px solid ${ativo ? `${cor}40` : C.border}`,
              borderRadius: 20,
            }}
          >
            {label}
            {contagens[f] > 0 && (
              <span style={{ marginLeft: 5, fontSize: FONT.xs, opacity: .8 }}>
                {contagens[f]}
              </span>
            )}
          </DSBtn>
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

  const [projetoSync,   setProjetoSync]   = useState(null)
  const [showPublicar,  setShowPublicar]  = useState(false)
  const [busca,       setBusca]       = useState('')
  const [ordemCampo,  setOrdemCampo]  = useState('status')
  const [ordemAsc,    setOrdemAsc]    = useState(true)

  function toggleOrdem(campo) {
    if (ordemCampo === campo) setOrdemAsc(v => !v)
    else { setOrdemCampo(campo); setOrdemAsc(true) }
  }

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
      } else {
        const ord = { ativo: 0, pausado: 1, arquivado: 2, desconhecido: 3 }
        va = ord[a.status] ?? 3; vb = ord[b.status] ?? 3
      }
      if (va < vb) return ordemAsc ? -1 : 1
      if (va > vb) return ordemAsc ?  1 : -1
      return 0
    })
    return lista
  })()

  return (
    <div className="adm-page">

      {/* ✅ DSPageHeader substitui header div inline com h1/counter/button manuais */}
      <DSPageHeader
        title={<span style={{ display: 'flex', alignItems: 'center', gap: SPACE.md }}>
          <span style={{ color: C.accent }}><AdminIcon name="layers" size={18} /></span>
          Projetos Locais
        </span>}
        sub={diretorio
          ? <>Lendo <code style={{ fontSize: 10, background: C.surface2, padding: '1px 5px', borderRadius: 3 }}>{diretorio}</code></>
          : 'Projetos detectados no servidor'
        }
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md }}>
            {!loading && !erro && (
              <span style={{
                fontSize: FONT.sm, fontWeight: 700,
                color: C.text, background: C.surface2,  /* ✅ C.surf2 → C.surface2 */
                border: `1px solid ${C.border}`, borderRadius: 20,
                padding: '4px 10px',
              }}>
                {projetosFiltrados.length !== total
                  ? `${projetosFiltrados.length} de ${total}`
                  : `${total} ${total === 1 ? 'projeto' : 'projetos'}`}
              </span>
            )}
            {/* ✅ DSBtn substitui <button style={{ display:'flex', alignItems:'center', ... }}> */}
            <DSBtn variant="primary" onClick={() => setShowPublicar(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                width="13" height="13">
                <polyline points="16 16 12 12 8 16"/>
                <line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
              </svg>
              Publicar projeto
            </DSBtn>
            <DSBtn variant="secondary" onClick={recarregar} disabled={loading}>
              <AdminIcon name="refresh" size={12} />
              Atualizar
            </DSBtn>
          </div>
        }
      />

      {/* ── Barra de busca + ordenação ────────────────────── */}
      {!loading && !erro && (
        <div style={{ display: 'flex', gap: SPACE.md, flexWrap: 'wrap', alignItems: 'center', marginBottom: SPACE.lg }}>
          <div style={{ position: 'relative', flex: '1', minWidth: 180 }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
              stroke={C.muted} strokeWidth="2"
              style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou descrição…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                paddingLeft: 28, paddingRight: busca ? 28 : 10,
                paddingTop: 7, paddingBottom: 7,
                fontSize: 12, color: C.text,
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 7, outline: 'none',
              }}
            />
            {busca && (
              <button onClick={() => setBusca('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: C.muted,
                  fontSize: 14, lineHeight: 1, padding: 0 }}>
                ×
              </button>
            )}
          </div>

          {/* ✅ DSBtn substitui <button style={{ fontSize:FONT.sm, ..., borderRadius:7 }}> nos sort buttons */}
          {[
            { campo: 'status', label: 'Status' },
            { campo: 'nome',   label: 'Nome'   },
            { campo: 'data',   label: 'Data'   },
          ].map(({ campo, label }) => {
            const ativo = ordemCampo === campo
            return (
              <DSBtn key={campo} size="sm" variant="ghost"
                onClick={() => toggleOrdem(campo)}
                style={{
                  color:      ativo ? C.blue : C.muted,
                  background: ativo ? `${C.blue}15` : C.surface,
                  border:     `1px solid ${ativo ? C.blue + '50' : C.border}`,
                }}
              >
                {label}
                <span style={{ fontSize: 10, opacity: ativo ? 1 : 0.4 }}>
                  {ativo ? (ordemAsc ? '↑' : '↓') : '↕'}
                </span>
              </DSBtn>
            )
          })}
        </div>
      )}

      {/* ── Conteúdo ─────────────────────────────────────── */}
      {erro ? (
        <div style={{
          background: `${C.red}10`, border: `1px solid ${C.red}30`,
          borderRadius: RADIUS.lg, padding: '20px 24px', textAlign: 'center',
        }}>
          <div style={{ fontSize: FONT.md, fontWeight: 700, color: C.red, marginBottom: 8 }}>
            Erro ao carregar projetos
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>{erro}</div>
          {/* ✅ DSBtn substitui <button style={{ background:C.surf2, ... }}> */}
          <DSBtn variant="secondary" onClick={recarregar}>Tentar novamente</DSBtn>
        </div>
      ) : loading ? (
        <Skeleton />
      ) : projetos.length === 0 && contagens.todos === 0 ? (
        // ✅ DSEmptyState substitui div manual com ícone/título/descrição inline
        <DSEmptyState
          icon={<AdminIcon name="layers" size={32} />}
          title="Nenhum projeto encontrado"
          desc={<>
            Crie subdiretórios em{' '}
            <code style={{ fontSize: 10, background: C.surface2, padding: '1px 5px', borderRadius: 3 }}>
              {diretorio || '/projetos'}
            </code>{' '}
            ou configure{' '}
            <code style={{ fontSize: 10, background: C.surface2, padding: '1px 5px', borderRadius: 3 }}>
              PROJETOS_PATH
            </code>{' '}
            no .env.
          </>}
        />
      ) : (
        <>
          <FiltroChips
            atual={filtroStatus}
            onChange={setFiltroStatus}
            contagens={contagens}
          />
          {projetosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: C.muted, fontSize: 12 }}>
              {busca.trim()
                ? `Nenhum projeto encontrado para "${busca.trim()}".`
                : `Nenhum projeto com status "${filtroStatus}".`
              }
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
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

      {showPublicar && (
        <ProjetoPublicarModal
          onClose={() => setShowPublicar(false)}
          onConcluido={recarregar}
        />
      )}
    </div>
  )
}
