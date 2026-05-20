/**
 * AbaPlataformas.jsx — Dashboard de status Render + Vercel
 *
 * Seção pública: status geral, componentes e incidentes ativos (sem auth).
 * Seção autenticada (opcional): serviços/projetos do deploy + histórico de deploys.
 * Auto-refresh configurável.
 */
import { useState, useEffect, useCallback } from 'react'
import { infraestruturaService } from '../../../services/api'
import { C, Ico, Spin, PageCard, SectionTitle, Btn } from './InfraBase'

// ── Constantes de cor por status ──────────────────────────────
const COR_INDICADOR = {
  operational: { bg: '#14532d', txt: '#4ade80', label: 'Operacional' },
  minor:       { bg: '#713f12', txt: '#fbbf24', label: 'Incidente minor' },
  major:       { bg: '#7f1d1d', txt: '#f87171', label: 'Incidente major' },
  critical:    { bg: '#450a0a', txt: '#ef4444', label: 'Crítico' },
}

const COR_COMPONENTE = {
  operational:          '#22c55e',
  degraded_performance: '#f59e0b',
  partial_outage:       '#f97316',
  major_outage:         '#ef4444',
  under_maintenance:    '#60a5fa',
}

const COR_DEPLOY_RENDER = {
  live:                 '#22c55e',
  build_in_progress:    '#60a5fa',
  update_in_progress:   '#60a5fa',
  canceled:             '#6b7280',
  deactivated:          '#6b7280',
  error:                '#ef4444',
}

const COR_DEPLOY_VERCEL = {
  READY:    '#22c55e',
  ERROR:    '#ef4444',
  BUILDING: '#60a5fa',
  CANCELED: '#6b7280',
  QUEUED:   '#a78bfa',
}

const LABEL_COMPONENTE = {
  operational:          'Operacional',
  degraded_performance: 'Degradado',
  partial_outage:       'Interrupção parcial',
  major_outage:         'Interrupção grave',
  under_maintenance:    'Manutenção',
}

const IMPACTO_COR = { none: C.green, minor: '#f59e0b', major: '#f97316', critical: '#ef4444' }

function ago(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'agora'
  if (m < 60)  return `${m} min atrás`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

function Badge({ cor, label }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
      background: `${cor}22`, color: cor, border: `1px solid ${cor}44`,
    }}>{label}</span>
  )
}

// ── Bloco de componentes de uma plataforma ────────────────────
function ComponentList({ componentes = [] }) {
  const [expandido, setExpandido] = useState(false)
  const SHOW = 6
  const visíveis = expandido ? componentes : componentes.slice(0, SHOW)

  if (!componentes.length) return <p style={{ fontSize: 12, color: C.muted }}>Nenhum componente reportado.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {visíveis.map((c, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '5px 8px', borderRadius: 6, background: C.surface,
          border: `1px solid ${c.ok ? C.border : COR_COMPONENTE[c.status] + '44'}`,
          fontSize: 12,
        }}>
          <span style={{ color: C.text }}>{c.nome}</span>
          <span style={{ color: COR_COMPONENTE[c.status] || '#6b7280', fontWeight: 600, fontSize: 11 }}>
            ● {LABEL_COMPONENTE[c.status] || c.status}
          </span>
        </div>
      ))}
      {componentes.length > SHOW && (
        <button onClick={() => setExpandido(v => !v)} style={{
          fontSize: 11, color: C.muted, background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left', padding: '2px 0',
        }}>
          {expandido ? '▲ Mostrar menos' : `▼ +${componentes.length - SHOW} componentes`}
        </button>
      )}
    </div>
  )
}

// ── Card de incidentes ────────────────────────────────────────
function IncidentList({ incidentes = [] }) {
  if (!incidentes.length) return (
    <p style={{ fontSize: 12, color: '#22c55e' }}>✓ Nenhum incidente ativo.</p>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {incidentes.map((inc, i) => (
        <div key={i} style={{
          padding: '8px 10px', borderRadius: 8,
          background: `${IMPACTO_COR[inc.impacto] || '#6b7280'}11`,
          border: `1px solid ${IMPACTO_COR[inc.impacto] || '#6b7280'}44`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <b style={{ fontSize: 12, color: C.text }}>{inc.nome}</b>
            <Badge cor={IMPACTO_COR[inc.impacto] || '#6b7280'} label={inc.impacto?.toUpperCase()} />
          </div>
          {inc.atualizacao && (
            <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{inc.atualizacao}</p>
          )}
          <p style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
            {inc.status} · {ago(inc.criado)}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Deploy list (Render) ──────────────────────────────────────
function DeployListRender({ deploys = [] }) {
  if (!deploys.length) return <p style={{ fontSize: 12, color: C.muted }}>Nenhum deploy encontrado.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {deploys.map((d, i) => (
        <div key={i} style={{
          padding: '6px 10px', borderRadius: 6, fontSize: 11,
          background: C.surface, border: `1px solid ${COR_DEPLOY_RENDER[d.status] || '#6b7280'}44`,
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ color: COR_DEPLOY_RENDER[d.status] || '#6b7280', fontWeight: 700, flexShrink: 0 }}>
            ● {d.status}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {d.commit && (
              <div style={{ color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <code style={{ color: '#60a5fa' }}>{d.commit.hash}</code> {d.commit.mensagem}
              </div>
            )}
            <span style={{ color: C.muted }}>{ago(d.criado)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Deploy list (Vercel) ──────────────────────────────────────
function DeployListVercel({ deploys = [] }) {
  if (!deploys.length) return <p style={{ fontSize: 12, color: C.muted }}>Nenhum deploy encontrado.</p>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {deploys.map((d, i) => (
        <div key={i} style={{
          padding: '6px 10px', borderRadius: 6, fontSize: 11,
          background: C.surface, border: `1px solid ${COR_DEPLOY_VERCEL[d.estado] || '#6b7280'}44`,
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <span style={{ color: COR_DEPLOY_VERCEL[d.estado] || '#6b7280', fontWeight: 700, flexShrink: 0 }}>
            ● {d.estado}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {d.commit && (
              <div style={{ color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.hash && <code style={{ color: '#60a5fa' }}>{d.hash} </code>}
                {d.commit}
              </div>
            )}
            <div style={{ color: C.muted, display: 'flex', gap: 8 }}>
              <span>{d.ambiente}</span>
              {d.branch && <span>← {d.branch}</span>}
              <span>{ago(d.criado)}</span>
            </div>
          </div>
          {d.url && (
            <a href={d.url} target="_blank" rel="noreferrer"
              style={{ color: '#60a5fa', flexShrink: 0 }}>{Ico.extLink}</a>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Bloco de serviços Render ──────────────────────────────────
function ServicosRender({ servicos = [] }) {
  const [selecionado, setSelecionado] = useState(null)
  const [deploys, setDeploys] = useState({})
  const [loadingId, setLoadingId] = useState(null)

  async function carregarDeploys(id) {
    if (deploys[id]) { setSelecionado(id === selecionado ? null : id); return }
    setLoadingId(id)
    try {
      const res = await infraestruturaService.renderDeploys(id)
      setDeploys(prev => ({ ...prev, [id]: res.deploys || [] }))
      setSelecionado(id)
    } catch (err) {
      setSelecionado(id)
      setDeploys(prev => ({ ...prev, [id]: [] }))
    } finally { setLoadingId(null) }
  }

  const COR_ESTADO = {
    live: '#22c55e', suspended: '#6b7280',
    build_in_progress: '#60a5fa', error: '#ef4444',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {servicos.map(s => (
        <div key={s.id}>
          <div style={{
            padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
            background: C.surface, border: `1px solid ${COR_ESTADO[s.estado] || '#6b7280'}44`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }} onClick={() => carregarDeploys(s.id)}>
            <div>
              <b style={{ fontSize: 13 }}>{s.nome}</b>
              <div style={{ fontSize: 11, color: C.muted }}>
                {s.tipo} {s.regiao ? `· ${s.regiao}` : ''} {s.branch ? `· ${s.branch}` : ''}
              </div>
              {s.url && <div style={{ fontSize: 11, color: '#60a5fa' }}>{s.url}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: COR_ESTADO[s.estado] || '#6b7280', fontSize: 11, fontWeight: 700 }}>
                ● {s.estado}
              </span>
              {loadingId === s.id ? <Spin size={12} /> : <span style={{ color: C.muted, fontSize: 10 }}>▼</span>}
            </div>
          </div>
          {selecionado === s.id && (
            <div style={{ padding: '8px 4px' }}>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Últimos deploys:</p>
              <DeployListRender deploys={deploys[s.id] || []} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Bloco de projetos Vercel ──────────────────────────────────
function ProjetosVercel({ projetos = [] }) {
  const [selecionado, setSelecionado] = useState(null)
  const [deploys, setDeploys] = useState({})
  const [loadingId, setLoadingId] = useState(null)

  async function carregarDeploys(id) {
    if (deploys[id]) { setSelecionado(id === selecionado ? null : id); return }
    setLoadingId(id)
    try {
      const res = await infraestruturaService.vercelDeploys(id)
      setDeploys(prev => ({ ...prev, [id]: res.deploys || [] }))
      setSelecionado(id)
    } catch { setSelecionado(id); setDeploys(prev => ({ ...prev, [id]: [] })) }
    finally { setLoadingId(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {projetos.map(p => (
        <div key={p.id}>
          <div style={{
            padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
            background: C.surface, border: `1px solid ${C.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }} onClick={() => carregarDeploys(p.id)}>
            <div>
              <b style={{ fontSize: 13 }}>{p.nome}</b>
              <div style={{ fontSize: 11, color: C.muted }}>
                {p.framework}
                {p.git ? ` · ${p.git.tipo}: ${p.git.repositorio}` : ''}
              </div>
              {p.dominio && <div style={{ fontSize: 11, color: '#60a5fa' }}>{p.dominio}</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {loadingId === p.id ? <Spin size={12} /> : <span style={{ color: C.muted, fontSize: 10 }}>▼</span>}
            </div>
          </div>
          {selecionado === p.id && (
            <div style={{ padding: '8px 4px' }}>
              <p style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Últimos deploys:</p>
              <DeployListVercel deploys={deploys[p.id] || []} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Card de plataforma (status geral + componentes + incidentes) ─
function PlatformCard({ nome, dados, cor, logoChar }) {
  const [abaLocal, setAbaLocal] = useState('status')
  if (!dados) return (
    <PageCard>
      <SectionTitle>{logoChar} {nome}</SectionTitle>
      <p style={{ fontSize: 13, color: C.muted }}>Não foi possível obter status.</p>
    </PageCard>
  )

  const ind = COR_INDICADOR[dados.indicador] || COR_INDICADOR.minor
  const nIncidentes = dados.incidentes?.length || 0

  return (
    <PageCard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{logoChar}</span>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{nome}</h3>
            {dados.pagina_url && (
              <a href={dados.pagina_url} target="_blank" rel="noreferrer"
                style={{ fontSize: 11, color: '#60a5fa' }}>status page ↗</a>
            )}
          </div>
        </div>
        <div style={{
          padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 11,
          background: ind.bg, color: ind.txt,
        }}>
          {dados.descricao}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
        {['status', 'incidentes'].map(t => (
          <button key={t} onClick={() => setAbaLocal(t)} style={{
            fontSize: 11, padding: '3px 10px', borderRadius: 20, cursor: 'pointer', border: 'none',
            background: abaLocal === t ? cor : C.border,
            color: abaLocal === t ? '#fff' : C.muted,
            fontWeight: abaLocal === t ? 700 : 400,
          }}>
            {t === 'incidentes' ? `Incidentes${nIncidentes ? ` (${nIncidentes})` : ''}` : 'Componentes'}
          </button>
        ))}
      </div>

      {abaLocal === 'status'     && <ComponentList componentes={dados.componentes} />}
      {abaLocal === 'incidentes' && <IncidentList  incidentes={dados.incidentes}  />}

      {dados.atualizado && (
        <p style={{ fontSize: 10, color: C.muted, marginTop: 10, textAlign: 'right' }}>
          Atualizado: {new Date(dados.atualizado).toLocaleString('pt-BR')}
        </p>
      )}
    </PageCard>
  )
}

// ═════════════════════════════════════════════════════════════
// Componente principal
// ═════════════════════════════════════════════════════════════
export default function AbaPlataformas() {
  const [status,      setStatus]      = useState(null)
  const [render,      setRender]      = useState(null)
  const [vercel,      setVercel]      = useState(null)
  const [carregando,  setCarregando]  = useState(true)
  const [erroApiKeys, setErroApiKeys] = useState({ render: null, vercel: null })
  const [intervalo,   setIntervalo]   = useState(30000)
  const [ultimoCheck, setUltimoCheck] = useState(null)

  const INTERVALOS = [
    { label: 'Off',  ms: 0 },
    { label: '30 s', ms: 30000 },
    { label: '1 min', ms: 60000 },
    { label: '5 min', ms: 300000 },
  ]

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true)
    try {
      const dados = await infraestruturaService.plataformasStatus()
      setStatus(dados)
      setUltimoCheck(new Date())
    } catch { /* silencioso */ }
    finally { if (!silencioso) setCarregando(false) }
  }, [])

  const carregarRender = useCallback(async () => {
    try {
      const dados = await infraestruturaService.renderServicos()
      setRender(dados.servicos || [])
      setErroApiKeys(e => ({ ...e, render: null }))
    } catch (err) {
      setErroApiKeys(e => ({ ...e, render: err.message }))
    }
  }, [])

  const carregarVercel = useCallback(async () => {
    try {
      const dados = await infraestruturaService.vercelProjetos()
      setVercel(dados.projetos || [])
      setErroApiKeys(e => ({ ...e, vercel: null }))
    } catch (err) {
      setErroApiKeys(e => ({ ...e, vercel: err.message }))
    }
  }, [])

  useEffect(() => {
    carregar()
    carregarRender()
    carregarVercel()
  }, [carregar, carregarRender, carregarVercel])

  useEffect(() => {
    if (!intervalo) return
    const id = setInterval(() => carregar(true), intervalo)
    return () => clearInterval(id)
  }, [intervalo, carregar])

  if (carregando) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size={24} /></div>
  )

  const totalIncidentes =
    (status?.render?.incidentes?.length || 0) +
    (status?.vercel?.incidentes?.length || 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Barra de controle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', borderRadius: 10, flexWrap: 'wrap', gap: 10,
        background: C.surface, border: `1px solid ${C.border}`, fontSize: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted }}>
          {Ico.refresh}
          <span>Auto-refresh:</span>
          {INTERVALOS.map(op => (
            <button key={op.ms} onClick={() => setIntervalo(op.ms)} style={{
              padding: '2px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11, border: 'none',
              background: intervalo === op.ms ? '#3b82f6' : C.border,
              color: intervalo === op.ms ? '#fff' : C.text,
              fontWeight: intervalo === op.ms ? 700 : 400,
            }}>{op.label}</button>
          ))}
          {totalIncidentes > 0 && (
            <span style={{
              background: '#7f1d1d', color: '#f87171',
              padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            }}>
              ⚠ {totalIncidentes} incidente{totalIncidentes > 1 ? 's' : ''} ativo{totalIncidentes > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {ultimoCheck && (
            <span style={{ fontSize: 11, color: C.muted }}>
              Verificado: {ultimoCheck.toLocaleTimeString('pt-BR')}
            </span>
          )}
          <Btn onClick={() => { carregar(); carregarRender(); carregarVercel() }}
            variant="secondary" style={{ padding: '3px 12px', fontSize: 11, width: 'auto' }}>
            {Ico.refresh} Atualizar tudo
          </Btn>
        </div>
      </div>

      {/* Status público — 2 colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        <PlatformCard nome="Render"  dados={status?.render} cor="#7c3aed" logoChar="⬛" />
        <PlatformCard nome="Vercel"  dados={status?.vercel} cor="#000000" logoChar="▲" />
      </div>

      {/* APIs autenticadas — Render */}
      <PageCard>
        <SectionTitle icon={Ico.gear}>Render — Serviços e Deploys</SectionTitle>
        {erroApiKeys.render ? (
          <div style={{ fontSize: 13 }}>
            <p style={{ color: '#f87171', marginBottom: 8 }}>
              ⚠ {erroApiKeys.render}
            </p>
            <p style={{ color: C.muted, fontSize: 12 }}>
              Para habilitar: adicione <code style={{ background: C.border, padding: '1px 5px', borderRadius: 4 }}>RENDER_API_KEY</code> nas
              variáveis de ambiente do seu serviço no Render.<br />
              Obtenha a chave em: <a href="https://dashboard.render.com/u/settings#api-keys"
                target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>
                dashboard.render.com → Account Settings → API Keys ↗
              </a>
            </p>
          </div>
        ) : render === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spin size={16} /></div>
        ) : (
          <ServicosRender servicos={render} />
        )}
      </PageCard>

      {/* APIs autenticadas — Vercel */}
      <PageCard>
        <SectionTitle icon={Ico.gear}>Vercel — Projetos e Deploys</SectionTitle>
        {erroApiKeys.vercel ? (
          <div style={{ fontSize: 13 }}>
            <p style={{ color: '#f87171', marginBottom: 8 }}>
              ⚠ {erroApiKeys.vercel}
            </p>
            <p style={{ color: C.muted, fontSize: 12 }}>
              Para habilitar: adicione <code style={{ background: C.border, padding: '1px 5px', borderRadius: 4 }}>VERCEL_TOKEN</code> nas
              variáveis de ambiente do seu serviço no Render.<br />
              Obtenha o token em: <a href="https://vercel.com/account/tokens"
                target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>
                vercel.com → Account → Tokens ↗
              </a>
            </p>
          </div>
        ) : vercel === null ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Spin size={16} /></div>
        ) : (
          <ProjetosVercel projetos={vercel} />
        )}
      </PageCard>

    </div>
  )
}
