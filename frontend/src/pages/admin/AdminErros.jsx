import { useState, useEffect, useCallback, useMemo } from 'react'
import { errosService } from '../../services/api'
import ConfirmModal from '../../components/ConfirmModal'
import toast from 'react-hot-toast'
import { formatarDataRelativa } from '../../utils/formatters'

// ─── Tipos e Badges ───────────────────────────────────────────
const TIPO_META = {
  render:              { label: 'Render',   cor: '#ef4444', bg: 'rgba(239,68,68,.12)'   },
  js_error:            { label: 'JS',       cor: '#f59e0b', bg: 'rgba(245,158,11,.12)'  },
  unhandled_rejection: { label: 'Promise',  cor: '#8b5cf6', bg: 'rgba(139,92,246,.12)'  },
  api:                 { label: 'API',      cor: '#3b82f6', bg: 'rgba(59,130,246,.12)'  },
}

const STATUS_META = {
  novo:        { label: 'Novo',       cor: '#ef4444', bg: 'rgba(239,68,68,.12)' },
  investigando:{ label: 'Investigando',cor: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
  resolvido:   { label: 'Resolvido',  cor: 'var(--adm-accent)', bg: 'rgba(var(--adm-accent-rgb,107,124,78),.12)' },
  ignorado:    { label: 'Ignorado',   cor: '#64748b', bg: 'rgba(100,116,139,.12)' },
}

function TipoBadge({ tipo }) {
  const meta = TIPO_META[tipo] || { label: tipo, cor: '#64748b', bg: 'rgba(100,116,139,.12)' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 700, letterSpacing: .3,
      color: meta.cor, background: meta.bg,
    }}>
      {meta.label}
    </span>
  )
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.novo
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
      fontSize: 11, fontWeight: 700,
      color: meta.cor, background: meta.bg,
    }}>
      {meta.label}
    </span>
  )
}

// ─── Parse de User Agent ─────────────────────────────────────
function parsearUA(ua) {
  if (!ua) return { browser: '—', os: '—', icone: '🌐' }
  const browsers = [
    { re: /Edg\/[\d.]+/, nome: 'Edge',    icone: '🔷' },
    { re: /OPR\/[\d.]+/, nome: 'Opera',   icone: '🔴' },
    { re: /Chrome\/[\d.]+/, nome: 'Chrome', icone: '🟡' },
    { re: /Firefox\/[\d.]+/, nome: 'Firefox', icone: '🦊' },
    { re: /Safari\/[\d.]+/, nome: 'Safari', icone: '🧭' },
  ]
  const sistemas = [
    { re: /Windows NT ([\d.]+)/, nome: 'Windows' },
    { re: /Mac OS X ([\d_.]+)/, nome: 'macOS' },
    { re: /Android ([\d.]+)/, nome: 'Android' },
    { re: /iPhone OS ([\d_]+)/, nome: 'iOS' },
    { re: /Linux/, nome: 'Linux' },
  ]
  const b = browsers.find(b => b.re.test(ua))
  const s = sistemas.find(s => s.re.test(ua))
  return {
    browser: b ? `${b.nome}` : ua.slice(0, 40),
    os: s?.nome || '—',
    icone: b?.icone || '🌐',
  }
}

// ─── Extrai arquivo:linha do stack ──────────────────────────
function extrairFramePrincipal(stack) {
  if (!stack) return null
  const linha = stack.split('\n').find(l => l.includes('/src/'))
  if (!linha) return null
  const match = linha.match(/\((.+):(\d+):(\d+)\)/) || linha.match(/at (.+):(\d+):(\d+)/)
  if (match) {
    return { arquivo: match[1], linha: match[2], coluna: match[3] }
  }
  return null
}

// ─── Fingerprint para agrupamento ───────────────────────────
function gerarFingerprint(erro) {
  const frame = extrairFramePrincipal(erro.stack)
  const arquivo = frame?.arquivo?.split('/').pop() || 'desconhecido'
  return `${erro.mensagem}::${arquivo}`
}

// ─── Stack Trace Aprimorado ─────────────────────────────────
function StackTrace({ stack }) {
  if (!stack) return <p style={{ color: 'var(--adm-muted)' }}>Sem stack trace</p>
  const linhas = stack.split('\n')
  return (
    <div style={{
      fontFamily: '"JetBrains Mono","Fira Code",monospace',
      fontSize: 11, lineHeight: 1.7,
      background: 'rgba(239,68,68,.05)',
      border: '1px solid rgba(239,68,68,.15)',
      borderRadius: 8, overflow: 'auto', maxHeight: 300,
    }}>
      <div style={{
        padding: '8px 14px', background: 'rgba(239,68,68,.12)',
        borderBottom: '1px solid rgba(239,68,68,.15)',
        color: '#fca5a5', fontWeight: 700, wordBreak: 'break-word',
      }}>
        {linhas[0]}
      </div>
      <div style={{ padding: '8px 0' }}>
        {linhas.slice(1).map((linha, i) => {
          const isSrc = linha.includes('/src/')
          const match = linha.match(/\((.+):(\d+):(\d+)\)$/) || linha.match(/at (.+):(\d+):(\d+)$/)
          return (
            <div key={i} style={{
              padding: '1px 14px',
              color: isSrc ? '#fcd34d' : 'rgba(252,165,165,.5)',
              background: isSrc ? 'rgba(252,211,77,.08)' : 'transparent',
              display: 'flex', gap: 8, alignItems: 'baseline',
            }}>
              <span style={{ color: 'rgba(255,255,255,.2)', flexShrink: 0 }}>{i + 1}</span>
              {isSrc && match ? (
                <span style={{ wordBreak: 'break-all' }}>
                  <span style={{ opacity: .6 }}>at </span>
                  <span style={{ color: '#86efac' }}>{match[1].split('/').pop()}</span>
                  <span style={{ opacity: .5 }}>:{match[2]}:{match[3]}</span>
                </span>
              ) : (
                <span style={{ opacity: .4, wordBreak: 'break-all' }}>{linha.replace(/^\s*at\s*/, '')}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Row expandível (modo detalhado) ────────────────────────
function ErroRow({ erro, onAtualizarStatus, onExcluir }) {
  const [expandido, setExpandido] = useState(false)
  const [uaExpand, setUaExpand] = useState(false)
  const ua = parsearUA(erro.user_agent)
  const frame = extrairFramePrincipal(erro.stack)

  async function copiarMarkdown() {
    const md = [
      `## Bug Report — ${new Date(erro.criado_em).toLocaleString('pt-BR')}`,
      `**Tipo:** ${erro.tipo}`,
      `**Mensagem:** ${erro.mensagem}`,
      `**URL:** ${erro.url || '—'}`,
      `**Rota:** ${erro.rota || '—'}`,
      `**Navegador:** ${ua.browser} — ${ua.os}`,
      `**Status:** ${STATUS_META[erro.status]?.label || 'Novo'}`,
      '',
      '### Stack Trace',
      '```',
      erro.stack || '(sem stack)',
      '```',
    ].join('\n')
    await navigator.clipboard.writeText(md)
    toast.success('Relatório copiado!')
  }

  return (
    <>
      <tr
        style={{ opacity: erro.status === 'resolvido' ? .6 : 1, cursor: 'pointer' }}
        onClick={() => setExpandido(e => !e)}
      >
        <td style={{ padding: '10px 8px', width: 16 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: erro.status === 'novo' ? '#ef4444' : 'transparent',
            border: erro.status !== 'novo' ? '1.5px solid var(--adm-border2)' : 'none',
          }}/>
        </td>
        <td style={{ padding: '10px 8px' }}><TipoBadge tipo={erro.tipo} /></td>
        <td style={{ padding: '10px 8px' }}><StatusBadge status={erro.status || 'novo'} /></td>
        <td style={{ padding: '10px 16px', maxWidth: 320 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text)', wordBreak: 'break-word' }}>
            {erro.mensagem}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
            {frame && (
              <span style={{ fontSize: 11, color: '#fcd34d', opacity: .8 }}>
                {frame.arquivo.split('/').pop()}:{frame.linha}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--adm-muted)' }}>
              {formatarDataRelativa(erro.criado_em)}
            </span>
          </div>
        </td>
        <td style={{ padding: '10px 16px' }}>
          <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
            <button onClick={copiarMarkdown} className="adm-btn adm-btn-ghost adm-btn-icon adm-btn-sm" title="Copiar Markdown">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
            </button>
            <select
              value={erro.status || 'novo'}
              onChange={e => onAtualizarStatus(erro.id, e.target.value)}
              className="adm-filter-select"
              style={{ fontSize: 11, padding: '2px 4px' }}
            >
              {Object.entries(STATUS_META).map(([val, meta]) => (
                <option key={val} value={val}>{meta.label}</option>
              ))}
            </select>
            <button onClick={() => onExcluir(erro.id)} className="adm-btn adm-btn-ghost adm-btn-icon adm-btn-sm" title="Excluir">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>
              </svg>
            </button>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"
              style={{ color: 'var(--adm-muted)', transform: expandido ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
        </td>
      </tr>
      {expandido && (
        <tr style={{ background: 'rgba(0,0,0,.15)' }}>
          <td colSpan={5} style={{ padding: '0 16px 16px' }}>
            <div style={{ paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 8 }}>
                <MetaItem label="🕐 Data/hora" value={new Date(erro.criado_em).toLocaleString('pt-BR')} />
                <MetaItem label="🔗 URL" value={erro.url || '—'} />
                <MetaItem label="👤 Usuário" value={erro.usuario_email || '(não logado)'} />
                <MetaItem label={`${ua.icone} Navegador`} value={`${ua.browser} / ${ua.os}`} />
              </div>
              {erro.user_agent && (
                <div>
                  <button onClick={() => setUaExpand(v => !v)} style={{ fontSize: 11, color: 'var(--adm-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {uaExpand ? '▲' : '▶'} User-Agent completo
                  </button>
                  {uaExpand && <pre style={{ marginTop: 6, fontSize: 10, color: 'var(--adm-muted)', background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', borderRadius: 6, padding: 6, whiteSpace: 'pre-wrap' }}>{erro.user_agent}</pre>}
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, color: 'var(--adm-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Stack Trace</div>
                <StackTrace stack={erro.stack} />
              </div>
              {erro.dados && Object.keys(erro.dados).length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--adm-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Contexto</div>
                  <pre style={{ fontSize: 11, color: 'var(--adm-text)', background: 'var(--adm-surface)', border: '1px solid var(--adm-border)', borderRadius: 8, padding: 10, overflow: 'auto', maxHeight: 160, whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(erro.dados, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function MetaItem({ label, value }) {
  return (
    <div style={{ background: 'var(--adm-surface)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--adm-border)' }}>
      <div style={{ fontSize: 10, color: 'var(--adm-muted)', marginBottom: 3, fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--adm-text)', wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

// ─── Grupo de erros (modo agrupado) ─────────────────────────
function GrupoRow({ grupo, onExpandir }) {
  const [expandido, setExpandido] = useState(false)
  const primeiro = grupo.exemplos[0]
  const frame = extrairFramePrincipal(primeiro.stack)
  const ua = parsearUA(primeiro.user_agent)

  return (
    <>
      <tr style={{ cursor: 'pointer' }} onClick={() => setExpandido(e => !e)}>
        <td style={{ padding: '10px 8px', width: 16 }}>
          <span style={{ background: '#ef4444', color: '#fff', borderRadius: 12, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
            {grupo.count}
          </span>
        </td>
        <td style={{ padding: '10px 8px' }}><TipoBadge tipo={primeiro.tipo} /></td>
        <td style={{ padding: '10px 16px', maxWidth: 400 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--adm-text)' }}>{primeiro.mensagem}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
            {frame && (
              <span style={{ fontSize: 11, color: '#fcd34d' }}>
                {frame.arquivo.split('/').pop()}:{frame.linha}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--adm-muted)' }}>
              Última: {formatarDataRelativa(grupo.lastOccurrence)}
            </span>
          </div>
        </td>
        <td style={{ padding: '10px 16px', fontSize: 11, color: 'var(--adm-muted)' }}>
          {ua.browser} / {ua.os}
        </td>
        <td style={{ padding: '10px 16px' }}>
          <button onClick={(e) => { e.stopPropagation(); onExpandir(grupo) }} className="adm-btn adm-btn-ghost adm-btn-sm">
            Ver todas ({grupo.count})
          </button>
        </td>
      </tr>
      {expandido && (
        <tr style={{ background: 'rgba(0,0,0,.1)' }}>
          <td colSpan={5} style={{ padding: '0 16px 16px' }}>
            <div style={{ paddingTop: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: 8, fontSize: 11, color: 'var(--adm-muted)' }}>Data</th>
                    <th style={{ textAlign: 'left', padding: 8, fontSize: 11, color: 'var(--adm-muted)' }}>Navegador</th>
                    <th style={{ textAlign: 'left', padding: 8, fontSize: 11, color: 'var(--adm-muted)' }}>Usuário</th>
                    <th style={{ textAlign: 'left', padding: 8, fontSize: 11, color: 'var(--adm-muted)' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.exemplos.map(erro => (
                    <tr key={erro.id}>
                      <td style={{ padding: 6, fontSize: 12 }}>{new Date(erro.criado_em).toLocaleString('pt-BR')}</td>
                      <td style={{ padding: 6, fontSize: 12 }}>{parsearUA(erro.user_agent).browser}</td>
                      <td style={{ padding: 6, fontSize: 12 }}>{erro.usuario_email || '—'}</td>
                      <td style={{ padding: 6 }}>
                        <button onClick={() => window.dispatchEvent(new CustomEvent('verErro', { detail: erro }))} className="adm-btn adm-btn-ghost adm-btn-sm">Ver detalhes</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Página Principal ────────────────────────────────────────

// ─── Severidade por tipo ─────────────────────────────────────
const SEVERIDADE = {
  render:              { label: 'Crítico',  cor: '#ef4444' },
  js_error:            { label: 'Aviso',    cor: '#f59e0b' },
  unhandled_rejection: { label: 'Aviso',    cor: '#f59e0b' },
  api:                 { label: 'Info',     cor: '#3b82f6' },
}

function SeveridadeBadge({ tipo }) {
  const s = SEVERIDADE[tipo] || { label: 'Info', cor: '#6b7c4e' }
  return (
    <span style={{
      display:'inline-block', padding:'1px 6px', borderRadius:4,
      fontSize:9, fontWeight:800, textTransform:'uppercase',
      background:`${s.cor}20`, color:s.cor, letterSpacing:'.05em',
    }}>{s.label}</span>
  )
}

const TIPOS_FILTRO = [
  { key: '', label: 'Todos' },
  { key: 'render', label: 'Render' },
  { key: 'js_error', label: 'JS' },
  { key: 'unhandled_rejection', label: 'Promise' },
  { key: 'api', label: 'API' },
]

const PERIODOS = [
  { value: '', label: 'Todo período' },
  { value: '24h', label: 'Últimas 24h' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
]

export default function AdminErros() {
  const [erros, setErros] = useState([])
  const [total, setTotal] = useState(0)
  const [naoLidos, setNaoLidos] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modoAgrupado, setModoAgrupado] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroOrigem, setFiltroOrigem] = useState('')
  const [pagina, setPagina] = useState(1)
  const [confirm, setConfirm] = useState({ aberto: false, titulo: '', msg: '', fn: null, carregando: false })

  const grupos = useMemo(() => {
    if (!modoAgrupado || !erros.length) return []
    const map = new Map()
    erros.forEach(e => {
      const fp = gerarFingerprint(e)
      if (!map.has(fp)) map.set(fp, { fingerprint: fp, count: 0, exemplos: [], lastOccurrence: e.criado_em, firstOccurrence: e.criado_em })
      const g = map.get(fp)
      g.count++
      if (g.exemplos.length < 10) g.exemplos.push(e)
      if (new Date(e.criado_em) > new Date(g.lastOccurrence)) g.lastOccurrence = e.criado_em
      if (new Date(e.criado_em) < new Date(g.firstOccurrence)) g.firstOccurrence = e.criado_em
    })
    let result = Array.from(map.values()).sort((a,b) => new Date(b.lastOccurrence) - new Date(a.lastOccurrence))
    if (filtroOrigem.trim()) {
      const q = filtroOrigem.toLowerCase()
      result = result.filter(g => g.exemplos.some(e => e.rota?.toLowerCase().includes(q)))
    }
    return result
  }, [erros, modoAgrupado, filtroOrigem])

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page: pagina, limit: 50 }
      if (filtroTipo) params.tipo = filtroTipo
      if (filtroStatus) params.status = filtroStatus
      if (filtroPeriodo) {
        const agora = new Date()
        if (filtroPeriodo === '24h') params.dataInicio = new Date(agora - 86400000).toISOString()
        else if (filtroPeriodo === '7d') params.dataInicio = new Date(agora - 7*86400000).toISOString()
        else if (filtroPeriodo === '30d') params.dataInicio = new Date(agora - 30*86400000).toISOString()
      }
      const [res, cnt] = await Promise.all([
        errosService.listar(params),
        errosService.contagem(),
      ])
      setErros(res.erros ?? [])
      // filtroOrigem aplicado client-side no useMemo
      setTotal(res.total ?? 0)
      setNaoLidos(cnt.nao_lidos ?? 0)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }, [filtroTipo, filtroStatus, filtroPeriodo, pagina])

  useEffect(() => { carregar() }, [carregar])

  async function handleAtualizarStatus(id, novoStatus) {
    try {
      await errosService.atualizarStatus(id, novoStatus)
      setErros(es => es.map(e => e.id === id ? { ...e, status: novoStatus } : e))
      toast.success('Status atualizado')
    } catch (err) { toast.error(err.message) }
  }

  function confirmar(titulo, msg, fn) {
    setConfirm({ aberto: true, titulo, msg, fn, carregando: false })
  }

  async function executarConfirm() {
    setConfirm(c => ({ ...c, carregando: true }))
    try {
      await confirm.fn()
      setConfirm({ aberto: false, titulo: '', msg: '', fn: null, carregando: false })
      carregar()
    } catch (err) {
      toast.error(err.message)
      setConfirm(c => ({ ...c, carregando: false }))
    }
  }

  async function handleExcluir(id) {
    confirmar('Excluir erro?', 'O registro será removido permanentemente.', async () => {
      await errosService.excluir(id)
      toast.success('Removido!')
    })
  }

  async function handleMarcarTodosLidos() {
    try {
      await errosService.marcarTodosLidos()
      setErros(es => es.map(e => ({ ...e, lido: true })))
      setNaoLidos(0)
      toast.success('Todos marcados como lidos!')
    } catch (err) { toast.error(err.message) }
  }

  function handleLimpar(titulo, params) {
    confirmar(titulo, 'Essa ação não pode ser desfeita.', async () => {
      const r = await errosService.limpar(params)
      toast.success(`${r.removidos} erro(s) removido(s)!`)
    })
  }

  function exportar(format = 'csv') {
    const dados = modoAgrupado ? grupos.flatMap(g => g.exemplos) : erros
    if (format === 'csv') {
      const csv = ['Tipo,Mensagem,Data,URL,Status'].concat(dados.map(e => 
        `"${e.tipo}","${e.mensagem.replace(/"/g,'""')}","${e.criado_em}","${e.url || ''}","${e.status || 'novo'}"`
      )).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `erros_${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const json = JSON.stringify(dados, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `erros_${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
    toast.success(`Exportado ${dados.length} registros`)
  }

  const totalPaginas = Math.max(1, Math.ceil(total / 50))

  return (
    <>
      <ConfirmModal
        aberto={confirm.aberto}
        titulo={confirm.titulo}
        mensagem={confirm.msg}
        labelConfirmar="Confirmar"
        carregando={confirm.carregando}
        onConfirmar={executarConfirm}
        onCancelar={() => setConfirm({ aberto: false, titulo: '', msg: '', fn: null, carregando: false })}
      />

      <div className="adm-page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="adm-page-title">Monitor de Erros</div>
            {naoLidos > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                {naoLidos} novo{naoLidos !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="adm-page-sub">{total} erros registrados</div>
        </div>
        <div className="adm-page-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
          <button onClick={() => setModoAgrupado(m => !m)} className="adm-btn adm-btn-secondary adm-btn-sm">
            {modoAgrupado ? '📋 Modo detalhado' : '📊 Modo agrupado'}
          </button>
          <button onClick={() => exportar('csv')} className="adm-btn adm-btn-secondary adm-btn-sm">Exportar CSV</button>
          <button onClick={() => exportar('json')} className="adm-btn adm-btn-secondary adm-btn-sm">Exportar JSON</button>
          {naoLidos > 0 && (
            <button onClick={handleMarcarTodosLidos} className="adm-btn adm-btn-secondary adm-btn-sm">Marcar todos lidos</button>
          )}
          {total > 0 && (
            <button onClick={() => handleLimpar('Limpar todos os erros?', {})} className="adm-btn adm-btn-sm" style={{ background: 'rgba(239,68,68,.12)', color: 'var(--adm-red)' }}>Limpar tudo</button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="adm-card" style={{ marginBottom: 0 }}>
        <div className="adm-table-header" style={{ borderBottom: '1px solid var(--adm-border)', padding: '12px 18px', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TIPOS_FILTRO.map(({ key, label }) => (
              <button key={key} onClick={() => { setFiltroTipo(key); setPagina(1) }} className={`adm-btn adm-btn-sm${filtroTipo === key ? ' adm-btn-primary' : ' adm-btn-ghost'}`}>{label}</button>
            ))}
          </div>
          <select className="adm-filter-select" value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPagina(1) }}>
            <option value="">Todos status</option>
            {Object.entries(STATUS_META).map(([val, meta]) => <option key={val} value={val}>{meta.label}</option>)}
          </select>
          <select className="adm-filter-select" value={filtroPeriodo} onChange={e => { setFiltroPeriodo(e.target.value); setPagina(1) }}>
            {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <input
            type="text"
            placeholder="Filtrar por rota/origem…"
            value={filtroOrigem}
            onChange={e => setFiltroOrigem(e.target.value)}
            style={{
              background:'var(--adm-surface2)', border:'1px solid var(--adm-border)',
              borderRadius:8, padding:'6px 12px', fontSize:12,
              color:'var(--adm-text)', outline:'none', minWidth:160,
            }}
          />
          <button onClick={carregar} className="adm-btn adm-btn-ghost adm-btn-icon adm-btn-sm" title="Atualizar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="adm-empty"><svg className="adm-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"><path d="M21 12a9 9 0 11-18 0" strokeOpacity=".3"/><path d="M21 12a9 9 0 00-9-9"/></svg></div>
        ) : (modoAgrupado ? grupos.length === 0 : erros.length === 0) ? (
          <div className="adm-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: .2 }}><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <p>Nenhum erro registrado</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table" style={{ minWidth: 800 }}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th style={{ width: 90 }}>Tipo</th>
                  {!modoAgrupado && <th style={{ width: 100 }}>Status</th>}
                  <th>Mensagem</th>
                  {modoAgrupado && <th style={{ width: 140 }}>Navegador / OS</th>}
                  <th style={{ width: modoAgrupado ? 100 : 150 }}></th>
                </tr>
              </thead>
              <tbody>
                {modoAgrupado
                  ? grupos.map(grupo => <GrupoRow key={grupo.fingerprint} grupo={grupo} onExpandir={() => setModoAgrupado(false)} />)
                  : erros.map(erro => <ErroRow key={erro.id} erro={erro} onAtualizarStatus={handleAtualizarStatus} onExcluir={handleExcluir} />)
                }
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '14px 18px', borderTop: '1px solid var(--adm-border)' }}>
            <button onClick={() => setPagina(p => p - 1)} disabled={pagina === 1} className="adm-btn adm-btn-secondary adm-btn-sm">← Anterior</button>
            <span style={{ fontSize: 12, color: 'var(--adm-muted)' }}>{pagina} / {totalPaginas}</span>
            <button onClick={() => setPagina(p => p + 1)} disabled={pagina >= totalPaginas} className="adm-btn adm-btn-secondary adm-btn-sm">Próximo →</button>
          </div>
        )}
      </div>
    </>
  )
}