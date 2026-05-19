/**
 * AbaSistema.jsx — Métricas completas do servidor
 *
 * Exibe: CPU (modelo, load, sparkline), RAM, V8 Heap, SO, Processo,
 * Interfaces de Rede, Ambiente e Cache.
 * Auto-refresh configurável (5s / 10s / 30s / off).
 * Mantém histórico das últimas 40 leituras para sparklines SVG.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { infraestruturaService } from '../../../services/api'
import toast from 'react-hot-toast'
import {
  C, Ico, Spin, formatBytes, PageCard, SectionTitle, Btn, BarraProgresso,
} from './InfraBase'

// ── Sparkline SVG puro ────────────────────────────────────────
function Sparkline({ data = [], color = '#22c55e', height = 32, width = 120 }) {
  if (data.length < 2) return null
  const max   = Math.max(...data, 1)
  const min   = Math.min(...data, 0)
  const range = max - min || 1
  const pts   = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const last = data[data.length - 1]
  const lastX = width
  const lastY = height - ((last - min) / range) * height

  return (
    <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  )
}

// ── Utilitários ───────────────────────────────────────────────
function pct(value, total) {
  if (!total) return 0
  return Math.min(100, (value / total) * 100)
}

function corCarga(loadAvg, cores) {
  const ratio = loadAvg / (cores || 1)
  if (ratio > 1.5) return '#ef4444'
  if (ratio > 0.8) return '#f59e0b'
  return '#22c55e'
}

function corMemoria(pctVal) {
  if (pctVal > 90) return '#ef4444'
  if (pctVal > 75) return '#f59e0b'
  return '#22c55e'
}

const INTERVALOS = [
  { label: 'Off',  ms: 0 },
  { label: '5 s',  ms: 5000 },
  { label: '10 s', ms: 10000 },
  { label: '30 s', ms: 30000 },
]

const MAX_HIST = 40

// ── Componente principal ──────────────────────────────────────
export default function AbaSistema() {
  const [metricas,      setMetricas]      = useState(null)
  const [carregando,    setCarregando]    = useState(true)
  const [limpandoCache, setLimpandoCache] = useState(false)
  const [intervalo,     setIntervalo]     = useState(10000)
  const [ultimoRefresh, setUltimoRefresh] = useState(null)

  // Histórico para sparklines
  const histRef = useRef({ load: [], memPct: [], heapPct: [] })

  const carregarMetricas = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true)
    try {
      const dados = await infraestruturaService.sistemaMetricas()
      setMetricas(dados)
      setUltimoRefresh(new Date())

      // Atualiza histórico
      const h = histRef.current
      h.load    = [...h.load.slice(-(MAX_HIST - 1)),    dados.cpu?.loadAvg1min  ?? 0]
      h.memPct  = [...h.memPct.slice(-(MAX_HIST - 1)),  dados.memoria?.usoPercentual ?? 0]
      h.heapPct = [...h.heapPct.slice(-(MAX_HIST - 1)), dados.v8?.usoPercentual ?? 0]
    } catch (err) {
      if (!silencioso) toast.error(err.message || 'Erro ao carregar métricas')
    } finally {
      if (!silencioso) setCarregando(false)
    }
  }, [])

  async function limparCache() {
    setLimpandoCache(true)
    try {
      const res = await infraestruturaService.limparCache()
      toast.success(res.mensagem || 'Cache limpo com sucesso')
      carregarMetricas()
    } catch (err) { toast.error(err.message || 'Erro ao limpar cache') }
    finally { setLimpandoCache(false) }
  }

  // Primeira carga
  useEffect(() => { carregarMetricas() }, [carregarMetricas])

  // Auto-refresh
  useEffect(() => {
    if (!intervalo) return
    const id = setInterval(() => carregarMetricas(true), intervalo)
    return () => clearInterval(id)
  }, [intervalo, carregarMetricas])

  if (carregando && !metricas) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size={24} /></div>
  }

  const { cpu, memoria, v8: v8Stats, sistema, processo, ambiente, rede } = metricas || {}
  const hist = histRef.current

  // ── Renderização ──────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Barra de controle ───────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px', borderRadius: 10,
        background: C.surface, border: `1px solid ${C.border}`,
        fontSize: 12, gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.muted }}>
          {Ico.refresh}
          <span>Auto-refresh:</span>
          {INTERVALOS.map(op => (
            <button key={op.ms} onClick={() => setIntervalo(op.ms)} style={{
              padding: '2px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11,
              background: intervalo === op.ms ? C.green : C.border,
              color: intervalo === op.ms ? '#fff' : C.text,
              border: 'none', fontWeight: intervalo === op.ms ? 700 : 400,
              transition: 'all 0.15s',
            }}>{op.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {ultimoRefresh && (
            <span style={{ color: C.muted, fontSize: 11 }}>
              Atualizado: {ultimoRefresh.toLocaleTimeString('pt-BR')}
            </span>
          )}
          <Btn onClick={() => carregarMetricas()} variant="secondary"
            style={{ padding: '3px 12px', fontSize: 11, width: 'auto' }}>
            {Ico.refresh} Atualizar
          </Btn>
        </div>
      </div>

      {/* ── Grade principal 2 colunas em telas largas ──────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>

        {/* ── CPU ─────────────────────────────────────────── */}
        <PageCard>
          <SectionTitle icon={Ico.cpu}>Processador</SectionTitle>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, wordBreak: 'break-word' }}>
            {cpu?.modelo || '—'} &nbsp;·&nbsp; {cpu?.velocidadeMhz ? `${cpu.velocidadeMhz} MHz` : '—'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, marginBottom: 12 }}>
            <div><span style={{ color: C.muted }}>Cores:</span> <b>{cpu?.cores ?? '—'}</b></div>
            <div><span style={{ color: C.muted }}>Load 1 min:</span>{' '}
              <b style={{ color: corCarga(cpu?.loadAvg1min, cpu?.cores) }}>
                {cpu?.loadAvg1min?.toFixed(2) ?? '—'}
              </b>
            </div>
            <div><span style={{ color: C.muted }}>Load 5 min:</span>  <b>{cpu?.loadAvg5min?.toFixed(2)  ?? '—'}</b></div>
            <div><span style={{ color: C.muted }}>Load 15 min:</span> <b>{cpu?.loadAvg15min?.toFixed(2) ?? '—'}</b></div>
            <div><span style={{ color: C.muted }}>CPU user:</span>  <b>{cpu?.usoUsuarioMs != null ? `${cpu.usoUsuarioMs} ms` : '—'}</b></div>
            <div><span style={{ color: C.muted }}>CPU system:</span> <b>{cpu?.usoSistemaMs != null ? `${cpu.usoSistemaMs} ms` : '—'}</b></div>
          </div>
          {hist.load.length > 1 && (
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>Load avg (histórico)</div>
              <Sparkline data={hist.load} color={corCarga(cpu?.loadAvg1min, cpu?.cores)} width={280} height={36} />
            </div>
          )}
        </PageCard>

        {/* ── RAM ─────────────────────────────────────────── */}
        <PageCard>
          <SectionTitle icon={Ico.memory}>Memória RAM</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, marginBottom: 10 }}>
            <div><span style={{ color: C.muted }}>Total:</span>  <b>{formatBytes(memoria?.total)}</b></div>
            <div><span style={{ color: C.muted }}>Usada:</span>  <b>{formatBytes(memoria?.usada)}</b></div>
            <div><span style={{ color: C.muted }}>Livre:</span>  <b>{formatBytes(memoria?.livre)}</b></div>
            <div><span style={{ color: C.muted }}>Uso %:</span>{' '}
              <b style={{ color: corMemoria(memoria?.usoPercentual) }}>
                {memoria?.usoPercentual?.toFixed(1) ?? '—'}%
              </b>
            </div>
          </div>
          <BarraProgresso pct={memoria?.usoPercentual || 0}
            color={corMemoria(memoria?.usoPercentual || 0)} />

          {hist.memPct.length > 1 && (
            <div style={{ marginTop: 8 }}>
              <Sparkline data={hist.memPct} color={corMemoria(memoria?.usoPercentual || 0)} width={280} height={28} />
            </div>
          )}

          <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8 }}>Processo Node.js</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              <div><span style={{ color: C.muted }}>RSS:</span>          <b>{formatBytes(memoria?.rss)}</b></div>
              <div><span style={{ color: C.muted }}>Heap total:</span>   <b>{formatBytes(memoria?.heapTotal)}</b></div>
              <div><span style={{ color: C.muted }}>Heap usado:</span>   <b>{formatBytes(memoria?.heapUsed)}</b></div>
              <div><span style={{ color: C.muted }}>Externo:</span>      <b>{formatBytes(memoria?.externo)}</b></div>
              <div><span style={{ color: C.muted }}>ArrayBuffers:</span> <b>{formatBytes(memoria?.arrayBuffers)}</b></div>
            </div>
          </div>
        </PageCard>

        {/* ── V8 Heap ──────────────────────────────────────── */}
        <PageCard>
          <SectionTitle icon={Ico.info}>V8 Heap</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, marginBottom: 10 }}>
            <div><span style={{ color: C.muted }}>Limite:</span>        <b>{formatBytes(v8Stats?.heapSizeLimit)}</b></div>
            <div><span style={{ color: C.muted }}>Usado:</span>         <b>{formatBytes(v8Stats?.usedHeapSize)}</b></div>
            <div><span style={{ color: C.muted }}>Total alocado:</span> <b>{formatBytes(v8Stats?.totalHeapSize)}</b></div>
            <div><span style={{ color: C.muted }}>Disponível:</span>    <b>{formatBytes(v8Stats?.totalAvailable)}</b></div>
            <div><span style={{ color: C.muted }}>Físico:</span>        <b>{formatBytes(v8Stats?.totalPhysical)}</b></div>
            <div><span style={{ color: C.muted }}>Uso %:</span>{' '}
              <b style={{ color: corMemoria(v8Stats?.usoPercentual) }}>
                {v8Stats?.usoPercentual?.toFixed(1) ?? '—'}%
              </b>
            </div>
          </div>
          <BarraProgresso pct={v8Stats?.usoPercentual || 0}
            color={corMemoria(v8Stats?.usoPercentual || 0)} />
          {hist.heapPct.length > 1 && (
            <div style={{ marginTop: 8 }}>
              <Sparkline data={hist.heapPct} color={corMemoria(v8Stats?.usoPercentual || 0)} width={280} height={28} />
            </div>
          )}
          <div style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
            <div><span>Malloc atual:</span>  <b style={{ color: C.text }}>{formatBytes(v8Stats?.mallocedMemory)}</b></div>
            <div><span>Malloc pico:</span>   <b style={{ color: C.text }}>{formatBytes(v8Stats?.peakMallocedMemory)}</b></div>
          </div>
        </PageCard>

        {/* ── Sistema Operacional ───────────────────────────── */}
        <PageCard>
          <SectionTitle icon={Ico.info}>Sistema Operacional</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
            <div><span style={{ color: C.muted }}>Hostname:</span>     <b style={{ wordBreak: 'break-all' }}>{sistema?.hostname || '—'}</b></div>
            <div><span style={{ color: C.muted }}>SO:</span>           <b>{sistema?.so || '—'}</b></div>
            <div><span style={{ color: C.muted }}>Versão:</span>       <b style={{ wordBreak: 'break-all' }}>{sistema?.versaoSo || '—'}</b></div>
            <div><span style={{ color: C.muted }}>Plataforma:</span>   <b>{sistema?.plataforma || '—'}</b></div>
            <div><span style={{ color: C.muted }}>Arquitetura:</span>  <b>{sistema?.arquitetura || '—'}</b></div>
            <div><span style={{ color: C.muted }}>Endianness:</span>   <b>{sistema?.endianness || '—'}</b></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: C.muted }}>Uptime SO:</span>{' '}
              <b>{sistema?.uptimeFormatado || '—'}</b>
              {sistema?.uptimeSegundos && (
                <span style={{ color: C.muted, fontSize: 11 }}> ({Math.floor(sistema.uptimeSegundos / 86400)} dias)</span>
              )}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: C.muted }}>Tmp dir:</span>{' '}
              <code style={{ fontSize: 11, background: C.border, padding: '1px 5px', borderRadius: 4 }}>
                {sistema?.tmpdir || '—'}
              </code>
            </div>
          </div>
        </PageCard>

        {/* ── Processo Node.js ─────────────────────────────── */}
        <PageCard>
          <SectionTitle icon={Ico.info}>Processo Node.js</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
            <div><span style={{ color: C.muted }}>Node.js:</span>       <b>{processo?.versaoNode || '—'}</b></div>
            <div><span style={{ color: C.muted }}>App versão:</span>    <b>{processo?.versaoApp || '—'}</b></div>
            <div><span style={{ color: C.muted }}>PID:</span>           <b>{processo?.pid ?? '—'}</b></div>
            <div><span style={{ color: C.muted }}>PPID:</span>          <b>{processo?.ppid ?? '—'}</b></div>
            <div><span style={{ color: C.muted }}>Handles ativos:</span> <b>{processo?.handles ?? '—'}</b></div>
            <div><span style={{ color: C.muted }}>Requests ativos:</span> <b>{processo?.requests ?? '—'}</b></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: C.muted }}>Uptime processo:</span>{' '}
              <b>{processo?.uptimeFormatado || '—'}</b>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: C.muted }}>Título:</span>{' '}
              <code style={{ fontSize: 11, background: C.border, padding: '1px 5px', borderRadius: 4 }}>
                {processo?.titulo || '—'}
              </code>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: C.muted }}>CWD:</span>{' '}
              <code style={{ fontSize: 11, background: C.border, padding: '1px 5px', borderRadius: 4, wordBreak: 'break-all' }}>
                {processo?.cwd || '—'}
              </code>
            </div>
          </div>
        </PageCard>

        {/* ── Interfaces de Rede ───────────────────────────── */}
        <PageCard>
          <SectionTitle icon={Ico.info}>Interfaces de Rede</SectionTitle>
          {!rede?.interfaces?.length ? (
            <p style={{ fontSize: 13, color: C.muted }}>Nenhuma interface externa detectada.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rede.interfaces.map((iface, i) => (
                <div key={i} style={{
                  padding: '8px 10px', borderRadius: 8,
                  background: C.surface, border: `1px solid ${C.border}`,
                  fontSize: 12,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <b style={{ fontSize: 13 }}>{iface.nome}</b>
                    <span style={{
                      background: iface.familia === 'IPv4' ? '#1d4ed8' : '#7c3aed',
                      color: '#fff', padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    }}>{iface.familia}</span>
                  </div>
                  <div style={{ color: C.muted, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div><span>IP:</span> <b style={{ color: C.text, fontFamily: 'monospace' }}>{iface.endereco}</b></div>
                    <div><span>Máscara:</span> <code style={{ fontSize: 11 }}>{iface.mascara}</code></div>
                    <div><span>MAC:</span> <code style={{ fontSize: 11 }}>{iface.mac}</code></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageCard>

        {/* ── Ambiente ─────────────────────────────────────── */}
        <PageCard>
          <SectionTitle icon={Ico.gear}>Ambiente</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
            <div>
              <span style={{ color: C.muted }}>NODE_ENV:</span>{' '}
              <span style={{
                background: ambiente?.nodeEnv === 'production' ? '#14532d' : '#713f12',
                color: '#fff', padding: '1px 8px', borderRadius: 20,
                fontSize: 11, fontWeight: 700,
              }}>{ambiente?.nodeEnv || '—'}</span>
            </div>
            <div><span style={{ color: C.muted }}>Porta:</span>       <b>{ambiente?.porta || '—'}</b></div>
            <div><span style={{ color: C.muted }}>Timezone:</span>    <b>{ambiente?.tz || '—'}</b></div>
            <div><span style={{ color: C.muted }}>AI Provider:</span> <b>{ambiente?.aiProvider || '—'}</b></div>
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: C.muted }}>Modelo IA:</span>  <b>{ambiente?.groqModel || '—'}</b>
            </div>
            <div><span style={{ color: C.muted }}>Log level:</span>  <b>{ambiente?.logLevel || '—'}</b></div>
          </div>
        </PageCard>

        {/* ── Cache ────────────────────────────────────────── */}
        <PageCard>
          <SectionTitle icon={Ico.clear}>Cache</SectionTitle>
          <p style={{ fontSize: 13, marginBottom: 14, color: C.muted }}>
            Limpe o cache após alterar dados importantes no backend (configurações, módulos, etc.).
          </p>
          <Btn onClick={limparCache} loading={limpandoCache} variant="danger" style={{ width: 'auto' }}>
            {Ico.clear} Limpar todo o cache
          </Btn>
        </PageCard>

      </div>

      {/* ── Rodapé com timestamp ─────────────────────────────── */}
      {metricas?.timestamp && (
        <div style={{ textAlign: 'right', fontSize: 11, color: C.muted }}>
          Última leitura: {new Date(metricas.timestamp).toLocaleString('pt-BR')}
        </div>
      )}
    </div>
  )
}
