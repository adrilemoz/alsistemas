/**
 * AbaSistema.jsx — Métricas de CPU/memória e limpeza de cache.
 */
import { useState, useEffect } from 'react'
import { infraestruturaService } from '../../../services/api'
import toast from 'react-hot-toast'
import {
  C, Ico, Spin, formatBytes, PageCard, SectionTitle, Btn, BarraProgresso,
} from './InfraBase'

export default function AbaSistema() {
  const [metricas,      setMetricas]      = useState(null)
  const [carregando,    setCarregando]    = useState(true)
  const [limpandoCache, setLimpandoCache] = useState(false)

  async function carregarMetricas() {
    setCarregando(true)
    try { setMetricas(await infraestruturaService.sistemaMetricas()) }
    catch (err) { toast.error(err.message || 'Erro ao carregar métricas') }
    finally { setCarregando(false) }
  }

  async function limparCache() {
    setLimpandoCache(true)
    try {
      const res = await infraestruturaService.limparCache()
      toast.success(res.mensagem || 'Cache limpo com sucesso')
      carregarMetricas()
    } catch (err) { toast.error(err.message || 'Erro ao limpar cache') }
    finally { setLimpandoCache(false) }
  }

  useEffect(() => { carregarMetricas() }, [])

  if (carregando) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spin size={24} /></div>

  const { cpu, memoria, processo } = metricas || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <PageCard>
        <SectionTitle icon={Ico.cpu}>Processador</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
          <div><span style={{ color: C.muted }}>Cores:</span> <b>{cpu?.cores}</b></div>
          <div><span style={{ color: C.muted }}>Load 1 min:</span>  <b>{cpu?.loadAvg1min?.toFixed(2)}</b></div>
          <div><span style={{ color: C.muted }}>Load 5 min:</span>  <b>{cpu?.loadAvg5min?.toFixed(2)}</b></div>
          <div><span style={{ color: C.muted }}>Load 15 min:</span> <b>{cpu?.loadAvg15min?.toFixed(2)}</b></div>
        </div>
      </PageCard>

      <PageCard>
        <SectionTitle icon={Ico.memory}>Memória</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
          <div><span style={{ color: C.muted }}>Total (sistema):</span> <b>{formatBytes(memoria?.total)}</b></div>
          <div><span style={{ color: C.muted }}>Livre:</span>           <b>{formatBytes(memoria?.livre)}</b></div>
          <div><span style={{ color: C.muted }}>Uso %:</span>           <b>{memoria?.usoPercentual?.toFixed(1)}%</b></div>
          <BarraProgresso pct={memoria?.usoPercentual || 0} color={C.green} />
        </div>
        <div style={{ marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 8 }}>Processo Node.js</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, fontSize: 13 }}>
            <div><span style={{ color: C.muted }}>RSS:</span>        <b>{formatBytes(memoria?.rss)}</b></div>
            <div><span style={{ color: C.muted }}>Heap total:</span> <b>{formatBytes(memoria?.heapTotal)}</b></div>
            <div><span style={{ color: C.muted }}>Heap usado:</span> <b>{formatBytes(memoria?.heapUsed)}</b></div>
          </div>
        </div>
      </PageCard>

      <PageCard>
        <SectionTitle icon={Ico.info}>Informações do Servidor</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
          <div><span style={{ color: C.muted }}>Uptime:</span>            <b>{processo?.uptimeFormatado || '—'}</b></div>
          <div><span style={{ color: C.muted }}>Node.js:</span>           <b>{processo?.versaoNode}</b></div>
          <div><span style={{ color: C.muted }}>PID:</span>               <b>{processo?.pid}</b></div>
          <div><span style={{ color: C.muted }}>Plataforma:</span>        <b>{processo?.plataforma} ({processo?.arquitetura})</b></div>
          <div><span style={{ color: C.muted }}>Última atualização:</span> <b>{new Date(metricas?.timestamp).toLocaleString('pt-BR')}</b></div>
        </div>
      </PageCard>

      <PageCard>
        <SectionTitle icon={Ico.clear}>Cache</SectionTitle>
        <p style={{ fontSize: 13, marginBottom: 14, color: C.muted }}>
          O cache armazena respostas de rotas como configurações, módulos, etc.
          Limpe-o após alterar dados importantes no backend.
        </p>
        <Btn onClick={limparCache} loading={limpandoCache} variant="danger" style={{ width: 'auto' }}>
          {Ico.clear} Limpar todo o cache
        </Btn>
      </PageCard>
    </div>
  )
}
