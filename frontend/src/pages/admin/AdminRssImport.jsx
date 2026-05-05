/**
 * AdminRssImport — Importação de Notícias via RSS
 *
 * Funcionalidades:
 *  - Listar fontes RSS (padrão + customizadas)
 *  - Adicionar fontes padrão com um clique
 *  - Cadastrar fontes customizadas manualmente
 *  - Testar se uma URL de feed é válida antes de salvar
 *  - Importar notícias de uma fonte individual
 *  - Importar todas as fontes ativas de uma vez
 *  - Configurar auto-atualização periódica por fonte
 *  - Ver histórico de última importação e total importado
 */
import { useState } from 'react'
import { rssService, categoriasService } from '../../services/api'
import toast from 'react-hot-toast'
import { useRss } from '../../hooks/useRss'

// ─── Helpers de formatação ────────────────────────────────────────────────────

function formatarData(iso) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day:    '2-digit', month: '2-digit', year: 'numeric',
    hour:   '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

function formatarIntervalo(min) {
  if (!min) return '—'
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}min` : `${h}h`
}

// ─── Modal de cadastro / edição ───────────────────────────────────────────────

function ModalFonte({ fonte, categorias, onSalvar, onFechar }) {
  const editando = !!fonte?.id

  const [form, setForm] = useState({
    nome:          fonte?.nome          || '',
    url:           fonte?.url           || '',
    ativa:         fonte?.ativa         ?? true,
    categoria_id:  fonte?.categoria_id?.id || fonte?.categoria_id || '',
    max_items:     fonte?.max_items     || 10,
    auto_update:   fonte?.auto_update   ?? false,
    intervalo_min: fonte?.intervalo_min || 60,
  })
  const [testando,  setTestando]  = useState(false)
  const [salvando,  setSalvando]  = useState(false)
  const [testeOk,   setTesteOk]   = useState(null) // null | { valido, total_itens, preview }

  function set(campo, valor) {
    setForm(f => ({ ...f, [campo]: valor }))
    setTesteOk(null) // reseta teste ao mudar URL
  }

  async function handleTestar() {
    if (!form.url.trim()) return toast.error('Informe a URL do feed RSS')
    setTestando(true)
    try {
      const r = await rssService.testarUrl(form.url.trim())
      setTesteOk(r)
      toast.success(`Feed válido — ${r.total_itens} item(ns) encontrado(s)`)
    } catch (err) {
      setTesteOk(null)
      toast.error(err.message || 'Feed inválido ou inacessível')
    } finally { setTestando(false) }
  }

  async function handleSalvar(e) {
    e.preventDefault()
    if (!form.nome.trim()) return toast.error('Nome é obrigatório')
    if (!form.url.trim())  return toast.error('URL é obrigatória')
    setSalvando(true)
    try {
      await onSalvar({
        ...form,
        categoria_id:  form.categoria_id || null,
        max_items:     Number(form.max_items),
        intervalo_min: Number(form.intervalo_min),
      })
    } finally { setSalvando(false) }
  }

  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.65)',
      backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div style={{ background:'var(--adm-surface)', border:'1px solid var(--adm-border)',
        borderRadius:14, padding:0, width:'100%', maxWidth:520, overflow:'hidden',
        boxShadow:'0 20px 60px rgba(0,0,0,.5)' }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 20px', borderBottom:'1px solid var(--adm-border)' }}>
          <span style={{ fontWeight:700, fontSize:15, color:'var(--adm-text)' }}>
            {editando ? 'Editar Fonte RSS' : 'Nova Fonte RSS'}
          </span>
          <button onClick={onFechar} className="adm-btn adm-btn-ghost adm-btn-icon adm-btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSalvar} style={{ padding:'20px', display:'flex', flexDirection:'column', gap:14 }}>

          {/* Nome */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--adm-muted)', display:'block', marginBottom:5 }}>
              NOME DA FONTE *
            </label>
            <input className="adm-input" value={form.nome} onChange={e => set('nome', e.target.value)}
              placeholder="Ex: CNN Brasil" required style={{ width:'100%' }} />
          </div>

          {/* URL + testar */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:'var(--adm-muted)', display:'block', marginBottom:5 }}>
              URL DO FEED RSS *
            </label>
            <div style={{ display:'flex', gap:8 }}>
              <input className="adm-input" value={form.url} onChange={e => set('url', e.target.value)}
                placeholder="https://exemplo.com/feed.xml" required
                style={{ flex:1, minWidth:0 }} />
              <button type="button" onClick={handleTestar} disabled={testando}
                className="adm-btn adm-btn-secondary adm-btn-sm" style={{ flexShrink:0 }}>
                {testando ? 'Testando…' : 'Testar'}
              </button>
            </div>
            {testeOk && (
              <div style={{ marginTop:8, padding:'8px 12px', background:'rgba(34,197,94,.1)',
                border:'1px solid rgba(34,197,94,.3)', borderRadius:8, fontSize:12, color:'var(--adm-text)' }}>
                <span style={{ color:'#22c55e', fontWeight:700 }}>✓ Feed válido</span>
                {' — '}{testeOk.total_itens} item(ns) encontrado(s)
                {testeOk.preview?.length > 0 && (
                  <div style={{ marginTop:6, color:'var(--adm-muted)' }}>
                    Prévia: <em>{testeOk.preview[0]?.titulo}</em>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Linha: Categoria + Max itens */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--adm-muted)', display:'block', marginBottom:5 }}>
                CATEGORIA PADRÃO
              </label>
              <select className="adm-input" value={form.categoria_id}
                onChange={e => set('categoria_id', e.target.value)} style={{ width:'100%' }}>
                <option value="">— Sem categoria —</option>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:12, fontWeight:600, color:'var(--adm-muted)', display:'block', marginBottom:5 }}>
                MÁX. ITENS/IMPORTAÇÃO
              </label>
              <input className="adm-input" type="number" min={1} max={100} value={form.max_items}
                onChange={e => set('max_items', e.target.value)} style={{ width:'100%' }} />
            </div>
          </div>

          {/* Ativa */}
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
            <input type="checkbox" checked={form.ativa} onChange={e => set('ativa', e.target.checked)}
              style={{ width:16, height:16, accentColor:'var(--adm-accent)', cursor:'pointer' }} />
            <span style={{ fontSize:13, color:'var(--adm-text)' }}>Fonte ativa</span>
          </label>

          {/* Auto-atualização */}
          <div style={{ borderTop:'1px solid var(--adm-border)', paddingTop:14 }}>
            <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', marginBottom:12 }}>
              <input type="checkbox" checked={form.auto_update}
                onChange={e => set('auto_update', e.target.checked)}
                style={{ width:16, height:16, accentColor:'var(--adm-accent)', cursor:'pointer' }} />
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--adm-text)' }}>Atualização automática</div>
                <div style={{ fontSize:12, color:'var(--adm-muted)' }}>
                  Importa automaticamente em intervalos periódicos
                </div>
              </div>
            </label>
            {form.auto_update && (
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'var(--adm-muted)', display:'block', marginBottom:5 }}>
                  INTERVALO (MINUTOS)
                </label>
                <select className="adm-input" value={form.intervalo_min}
                  onChange={e => set('intervalo_min', Number(e.target.value))} style={{ width:'100%' }}>
                  <option value={15}>A cada 15 minutos</option>
                  <option value={30}>A cada 30 minutos</option>
                  <option value={60}>A cada 1 hora</option>
                  <option value={120}>A cada 2 horas</option>
                  <option value={360}>A cada 6 horas</option>
                  <option value={720}>A cada 12 horas</option>
                  <option value={1440}>A cada 24 horas</option>
                </select>
              </div>
            )}
          </div>

          {/* Botões */}
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" onClick={onFechar} className="adm-btn adm-btn-secondary" disabled={salvando}>
              Cancelar
            </button>
            <button type="submit" className="adm-btn adm-btn-primary" disabled={salvando}>
              {salvando
                ? <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"
                    className="adm-spin"><path d="M21 12a9 9 0 11-18 0"/></svg> Salvando…</>
                : editando ? 'Salvar alterações' : 'Cadastrar fonte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Card de cada fonte RSS ───────────────────────────────────────────────────

function CardFonte({ fonte, onImportar, onEditar, onExcluir, importando }) {
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  return (
    <div style={{ background:'var(--adm-surface)', border:'1px solid var(--adm-border)',
      borderRadius:12, padding:16, display:'flex', flexDirection:'column', gap:12,
      opacity: fonte.ativa ? 1 : 0.6 }}>

      {/* Linha superior */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
        {/* Ícone RSS */}
        <div style={{ width:36, height:36, borderRadius:8, background:'rgba(var(--adm-accent-rgb, 99,102,241),.12)',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--adm-accent)" strokeWidth="2" width="18" height="18">
            <path d="M4 11a9 9 0 019 9M4 4a16 16 0 0116 16"/>
            <circle cx="5" cy="19" r="1" fill="var(--adm-accent)" stroke="none"/>
          </svg>
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontWeight:700, fontSize:14, color:'var(--adm-text)', wordBreak:'break-word' }}>
              {fonte.nome}
            </span>
            {fonte.padrao && (
              <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:10,
                background:'rgba(99,102,241,.15)', color:'var(--adm-accent)', letterSpacing:.3 }}>
                PADRÃO
              </span>
            )}
            {!fonte.ativa && (
              <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:10,
                background:'rgba(239,68,68,.1)', color:'#ef4444' }}>
                INATIVA
              </span>
            )}
            {fonte.auto_update && (
              <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:10,
                background:'rgba(34,197,94,.1)', color:'#22c55e' }}>
                AUTO ⏱ {formatarIntervalo(fonte.intervalo_min)}
              </span>
            )}
          </div>
          <a href={fonte.url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize:11, color:'var(--adm-muted)', wordBreak:'break-all', textDecoration:'none',
              display:'block', marginTop:2 }}
            title={fonte.url}>
            {fonte.url.length > 60 ? fonte.url.slice(0, 60) + '…' : fonte.url}
          </a>
        </div>
      </div>

      {/* Estatísticas */}
      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
        <div style={{ fontSize:12 }}>
          <span style={{ color:'var(--adm-muted)' }}>Última importação: </span>
          <span style={{ color:'var(--adm-text)', fontWeight:500 }}>{formatarData(fonte.ultima_importacao)}</span>
        </div>
        <div style={{ fontSize:12 }}>
          <span style={{ color:'var(--adm-muted)' }}>Total importadas: </span>
          <span style={{ color:'var(--adm-text)', fontWeight:600 }}>{fonte.total_importadas ?? 0}</span>
        </div>
        <div style={{ fontSize:12 }}>
          <span style={{ color:'var(--adm-muted)' }}>Máx./vez: </span>
          <span style={{ color:'var(--adm-text)', fontWeight:500 }}>{fonte.max_items ?? 10}</span>
        </div>
        {fonte.categoria_id && (
          <div style={{ fontSize:12 }}>
            <span style={{ color:'var(--adm-muted)' }}>Categoria: </span>
            <span style={{ color:'var(--adm-text)', fontWeight:500 }}>
              {fonte.categoria_id?.nome || fonte.categoria_id}
            </span>
          </div>
        )}
      </div>

      {/* Ações */}
      {confirmExcluir ? (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
          background:'rgba(239,68,68,.08)', borderRadius:8, border:'1px solid rgba(239,68,68,.25)' }}>
          <span style={{ fontSize:12, color:'var(--adm-text)', flex:1 }}>Confirmar exclusão?</span>
          <button onClick={() => setConfirmExcluir(false)} className="adm-btn adm-btn-ghost adm-btn-sm">
            Cancelar
          </button>
          <button onClick={() => { setConfirmExcluir(false); onExcluir(fonte) }}
            className="adm-btn adm-btn-danger adm-btn-sm">
            Excluir
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={() => onImportar(fonte)}
            disabled={importando === fonte.id}
            className="adm-btn adm-btn-primary adm-btn-sm"
            style={{ flex:1, minWidth:100 }}>
            {importando === fonte.id
              ? <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12"
                  className="adm-spin"><path d="M21 12a9 9 0 11-18 0"/></svg> Importando…</>
              : <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Importar agora
                </>}
          </button>
          <button onClick={() => onEditar(fonte)} className="adm-btn adm-btn-secondary adm-btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Editar
          </button>
          <button onClick={() => setConfirmExcluir(true)}
            className="adm-btn adm-btn-ghost adm-btn-sm adm-btn-icon"
            title="Excluir fonte" style={{ color:'var(--adm-red)' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Painel de fontes padrão disponíveis ─────────────────────────────────────

function PainelFontesPadrao({ padrao, existentes, onAdicionar, adicionando }) {
  const existentesUrls = new Set(existentes.map(f => f.url))
  const disponiveis    = padrao.filter(p => !existentesUrls.has(p.url))

  if (!disponiveis.length) return null

  return (
    <div style={{ background:'var(--adm-surface)', border:'1px solid var(--adm-border)',
      borderRadius:12, padding:16, marginBottom:24 }}>
      <div style={{ fontSize:13, fontWeight:700, color:'var(--adm-text)', marginBottom:12 }}>
        📡 Fontes RSS sugeridas — adicione com um clique
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {disponiveis.map(p => (
          <div key={p.url} style={{ display:'flex', alignItems:'center', gap:10,
            padding:'10px 12px', background:'var(--adm-surface2)', borderRadius:8 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--adm-text)' }}>{p.nome}</div>
              <div style={{ fontSize:11, color:'var(--adm-muted)', wordBreak:'break-all' }}>{p.url}</div>
            </div>
            <button onClick={() => onAdicionar(p)}
              disabled={adicionando === p.url}
              className="adm-btn adm-btn-secondary adm-btn-sm" style={{ flexShrink:0 }}>
              {adicionando === p.url ? 'Adicionando…' : '+ Adicionar'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Painel de log de resultados ─────────────────────────────────────────────

function PainelResultados({ resultados, onFechar }) {
  if (!resultados) return null
  return (
    <div style={{ background:'var(--adm-surface)', border:'1px solid var(--adm-border)',
      borderRadius:12, padding:16, marginBottom:24 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
        <span style={{ fontSize:13, fontWeight:700, color:'var(--adm-text)' }}>Resultado da importação</span>
        <button onClick={onFechar} className="adm-btn adm-btn-ghost adm-btn-icon adm-btn-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      {resultados.resultados ? (
        // Resultado de importação em massa
        <>
          <div style={{ display:'flex', gap:20, marginBottom:12 }}>
            <div style={{ fontSize:12 }}>
              <span style={{ color:'var(--adm-muted)' }}>Importadas: </span>
              <span style={{ fontWeight:700, color:'#22c55e', fontSize:16 }}>{resultados.totalImportadas}</span>
            </div>
            <div style={{ fontSize:12 }}>
              <span style={{ color:'var(--adm-muted)' }}>Duplicadas: </span>
              <span style={{ fontWeight:700, color:'var(--adm-muted)', fontSize:16 }}>{resultados.totalDuplicadas}</span>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {resultados.resultados.map((r, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, fontSize:12,
                padding:'6px 10px', background:'var(--adm-surface2)', borderRadius:7 }}>
                <span style={{ flex:1, color:'var(--adm-text)', fontWeight:500 }}>{r.fonte}</span>
                {r.erro
                  ? <span style={{ color:'#ef4444' }}>❌ {r.erro}</span>
                  : <span style={{ color:'#22c55e' }}>✓ {r.importadas} novas, {r.duplicadas} dup.</span>}
              </div>
            ))}
          </div>
        </>
      ) : (
        // Resultado de importação individual
        <div style={{ display:'flex', gap:20 }}>
          <div style={{ fontSize:12 }}>
            <span style={{ color:'var(--adm-muted)' }}>Novas: </span>
            <span style={{ fontWeight:700, color:'#22c55e', fontSize:16 }}>{resultados.importadas}</span>
          </div>
          <div style={{ fontSize:12 }}>
            <span style={{ color:'var(--adm-muted)' }}>Duplicadas: </span>
            <span style={{ fontWeight:700, color:'var(--adm-muted)', fontSize:16 }}>{resultados.duplicadas}</span>
          </div>
          <div style={{ fontSize:12 }}>
            <span style={{ color:'var(--adm-muted)' }}>Verificadas: </span>
            <span style={{ fontWeight:700, color:'var(--adm-text)', fontSize:16 }}>{resultados.total}</span>
          </div>
        </div>
      )}
      <div style={{ marginTop:10, fontSize:12, color:'var(--adm-muted)' }}>
        ℹ️ Notícias importadas chegam como <strong>rascunho</strong> para revisão editorial antes de publicar.
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminRssImport() {
  const {
    fontes, padrao, categorias,
    carregando, importando, importandoTodas, adicionando, resultados,
    setResultados, temFontesAtivas,
    adicionarPadrao, salvarFonte, excluirFonte, importarFonte, importarTodas,
  } = useRss()

  const [modal, setModal] = useState(null) // null | {} | fonte

  async function handleSalvar(dados) {
    try {
      await salvarFonte(dados, modal?.id)
      setModal(null)
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar fonte')
      throw err // re-lança para o modal não fechar em caso de erro
    }
  }

  return (
    <div style={{ maxWidth:860, margin:'0 auto' }}>

      {/* Cabeçalho */}
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">Importar via RSS</div>
          <div className="adm-page-sub">
            Busque notícias automaticamente de feeds RSS externos e importe para o banco de dados.
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={importarTodas}
            disabled={importandoTodas || !temFontesAtivas || !!importando}
            className="adm-btn adm-btn-secondary adm-btn-sm">
            {importandoTodas
              ? <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"
                  className="adm-spin"><path d="M21 12a9 9 0 11-18 0"/></svg> Importando…</>
              : <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
                    <path d="M23 4v6h-6M1 20v-6h6"/>
                    <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                  </svg>
                  Atualizar todas
                </>}
          </button>
          <button onClick={() => setModal({})} className="adm-btn adm-btn-primary adm-btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Nova fonte
          </button>
        </div>
      </div>

      {/* Banner informativo */}
      <div style={{ background:'rgba(99,102,241,.08)', border:'1px solid rgba(99,102,241,.2)',
        borderRadius:10, padding:'12px 16px', marginBottom:20,
        display:'flex', gap:12, alignItems:'flex-start' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--adm-accent)" strokeWidth="2" width="18" height="18"
          style={{ flexShrink:0, marginTop:1 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <div style={{ fontSize:12.5, color:'var(--adm-text)', lineHeight:1.6 }}>
          Notícias importadas são salvas como <strong>rascunho</strong> e incluem automaticamente a fonte.
          Revise e publique cada uma pelo menu <strong>Notícias → Todas as Notícias</strong>.
          A deduplicação por GUID evita importar a mesma notícia duas vezes, mesmo que o título mude.
        </div>
      </div>

      {/* Resultados da última importação */}
      <PainelResultados resultados={resultados} onFechar={() => setResultados(null)} />

      {/* Fontes padrão disponíveis */}
      {!carregando && (
        <PainelFontesPadrao
          padrao={padrao}
          existentes={fontes}
          onAdicionar={adicionarPadrao}
          adicionando={adicionando}
        />
      )}

      {/* Lista de fontes cadastradas */}
      {carregando ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--adm-muted)', fontSize:14 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24"
            className="adm-spin" style={{ marginBottom:12, display:'block', margin:'0 auto 12px' }}>
            <path d="M21 12a9 9 0 11-18 0"/>
          </svg>
          Carregando fontes RSS…
        </div>
      ) : fontes.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 0' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📡</div>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--adm-text)', marginBottom:6 }}>
            Nenhuma fonte RSS cadastrada
          </div>
          <div style={{ fontSize:13, color:'var(--adm-muted)', marginBottom:16 }}>
            Adicione uma fonte sugerida acima ou cadastre manualmente.
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--adm-muted)', marginBottom:12,
            textTransform:'uppercase', letterSpacing:.5 }}>
            {fontes.length} fonte(s) cadastrada(s)
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:14 }}>
            {fontes.map(fonte => (
              <CardFonte
                key={fonte.id}
                fonte={fonte}
                onImportar={importarFonte}
                onEditar={setModal}
                onExcluir={excluirFonte}
                importando={importando}
              />
            ))}
          </div>
        </>
      )}

      {/* Modal */}
      {modal !== null && (
        <ModalFonte
          fonte={modal?.id ? modal : null}
          categorias={categorias}
          onSalvar={handleSalvar}
          onFechar={() => setModal(null)}
        />
      )}
    </div>
  )
}
