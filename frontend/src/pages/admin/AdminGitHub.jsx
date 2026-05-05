/**
 * AdminGitHub.jsx — Painel Completo de Ciclo de Vida de Repositórios
 *
 * Sprint 3 EXTENSÃO — reescrito para painel completo.
 * Token GitHub NUNCA exposto — toda comunicação via proxy backend.
 *
 * Seções:
 *   - Lista de repositórios com filtro/sort
 *   - Painel de detalhes (click no repo)
 *     ├─ Visão Geral (README, linguagens, stats)
 *     ├─ Metadados Internos (alias, tags, status, vínculo local)
 *     ├─ Commits
 *     ├─ Releases (listar + criar)
 *     ├─ Artefatos (Actions)
 *     ├─ Análise de Stack
 *     └─ Exclusão (dupla confirmação)
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useGitHubRepos }   from '../../modules/github/useGitHubRepos.js'
import { githubService }    from '../../services/domains/github.js'
import { T as C }           from '../../themes/tokens'
import AdminIcon            from '../../components/admin/ui/AdminIcon'

/* ── Helpers ─────────────────────────────────────────────── */
function relTime(iso) {
  if (!iso) return '—'
  const m = Math.floor((Date.now() - new Date(iso)) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}min atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d atrás`
  const mo = Math.floor(d / 30)
  return mo < 12 ? `${mo}mo atrás` : `${Math.floor(mo / 12)}a atrás`
}

function fmtBytes(b) {
  if (!b) return '0 B'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}

const LANG_COR = {
  JavaScript:'#f7df1e', TypeScript:'#3178c6', Python:'#3572A5',
  Rust:'#dea584', Go:'#00ADD8', Java:'#b07219', PHP:'#4F5D95',
  Ruby:'#701516', CSS:'#563d7c', HTML:'#e34c26', Shell:'#89e051',
  Kotlin:'#7F52FF', Dart:'#0175C2', Swift:'#F05138',
}

function LangBadge({ lang, size = 10 }) {
  if (!lang) return null
  const cor = LANG_COR[lang] || C.muted
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:3,
      fontSize:size, fontWeight:600, color:C.text,
      background:`${cor}22`, border:`1px solid ${cor}44`,
      borderRadius:4, padding:'2px 6px',
    }}>
      <span style={{ width:7, height:7, borderRadius:'50%', background:cor, flexShrink:0 }} />
      {lang}
    </span>
  )
}

const STATUS_CFG = {
  ativo:      { cor:'#22c55e', label:'Ativo' },
  arquivado:  { cor:'#64748b', label:'Arquivado' },
  estudo:     { cor:'#3b82f6', label:'Estudo' },
  legado:     { cor:'#f59e0b', label:'Legado' },
}
const MATURIDADE_COR = {
  ativo:'#22c55e', moderado:'#f59e0b', inativo:'#f97316', abandonado:'#dc2626',
}
const FREQ_COR = {
  alta:'#22c55e', média:'#3b82f6', baixa:'#f59e0b', inativa:'#64748b',
}

/* ── Toast simples ────────────────────────────────────────── */
function useToast() {
  const [toast, setToast] = useState(null)
  const show = useCallback((msg, tipo = 'ok') => {
    setToast({ msg, tipo })
    setTimeout(() => setToast(null), 3200)
  }, [])
  return { toast, show }
}

function Toast({ toast }) {
  if (!toast) return null
  const bg = toast.tipo === 'erro' ? '#dc262620' : '#22c55e20'
  const border = toast.tipo === 'erro' ? '#dc262640' : '#22c55e40'
  const color  = toast.tipo === 'erro' ? '#dc2626'   : '#22c55e'
  return (
    <div style={{
      position:'fixed', bottom:24, right:24, zIndex:9999,
      background:bg, border:`1px solid ${border}`, borderRadius:10,
      padding:'12px 20px', fontSize:13, fontWeight:600, color,
      boxShadow:'0 4px 20px #0008', maxWidth:340,
    }}>
      {toast.msg}
    </div>
  )
}

/* ── Skeleton ─────────────────────────────────────────────── */
function Skeleton({ n = 6 }) {
  return (
    <div style={{ display:'grid', gap:10 }}>
      {[...Array(n)].map((_, i) => (
        <div key={i} style={{
          background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:10, padding:'14px 16px', height:76,
          opacity:1-i*0.12,
        }} />
      ))}
    </div>
  )
}

/* ── Bloco de seção ───────────────────────────────────────── */
function Secao({ titulo, children, acao }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        marginBottom:12, paddingBottom:8, borderBottom:`1px solid ${C.border}`,
      }}>
        <span style={{ fontSize:12, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:1 }}>
          {titulo}
        </span>
        {acao}
      </div>
      {children}
    </div>
  )
}

/* ── Botão ────────────────────────────────────────────────── */
function Btn({ onClick, children, variante='secundario', disabled, small, style:s={} }) {
  const base = {
    display:'inline-flex', alignItems:'center', gap:5,
    fontSize: small ? 11 : 12, fontWeight:600, borderRadius:7,
    padding: small ? '5px 10px' : '7px 14px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? .5 : 1, border:'1px solid',
    transition:'background .15s',
  }
  const vars = {
    primario:   { background:'var(--adm-accent,#6b7c4e)', borderColor:'var(--adm-accent,#6b7c4e)', color:'#fff' },
    secundario: { background:C.surface, borderColor:C.border, color:C.text },
    perigo:     { background:'#dc262620', borderColor:'#dc262640', color:'#dc2626' },
  }
  return <button style={{...base,...vars[variante],...s}} onClick={onClick} disabled={disabled}>{children}</button>
}

/* ═══════════════════════════════════════════════════════════
   PAINEL DE DETALHES
═══════════════════════════════════════════════════════════ */

function PainelDetalhes({ repo, onFechar, toastShow }) {
  const [aba, setAba] = useState('visao')
  const [meta, setMeta] = useState(null)
  const [readme, setReadme] = useState(null)
  const [commits, setCommits] = useState(null)
  const [releases, setReleases] = useState(null)
  const [artifacts, setArtifacts] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [secrets, setSecrets] = useState(null)
  const [workflows, setWorkflows] = useState(null)
  const [projetosLocais, setProjetosLocais] = useState([])
  const [loadingAba, setLoadingAba] = useState(false)
  const [erroAba, setErroAba] = useState(null)

  // Modal delete
  const [deleteStep, setDeleteStep] = useState(0) // 0=off 1=prim 2=sec
  const [deleteInput, setDeleteInput] = useState('')
  const [deletandoRepo, setDeletandoRepo] = useState(false)

  // Modal nova release
  const [showRelease, setShowRelease] = useState(false)
  const [novaRelease, setNovaRelease] = useState({ tag:'', nome:'', descricao:'', preRelease:false, rascunho:false })
  const [criandoRelease, setCriandoRelease] = useState(false)

  // Salvar meta
  const [metaDraft, setMetaDraft] = useState(null)
  const [salvandoMeta, setSalvandoMeta] = useState(false)

  // Modal Salvar em Projetos (Sprint 5)
  const [showSalvar, setShowSalvar]           = useState(false)
  const [nomeProjeto, setNomeProjeto]         = useState('')
  const [substituir, setSubstituir]           = useState(false)
  const [salvarEtapa, setSalvarEtapa]         = useState(null) // null | 'baixando' | 'extraindo' | 'ok' | 'erro'
  const [salvarErro, setSalvarErro]           = useState(null)
  const [salvarNomeResultado, setSalvarNomeResultado] = useState(null)

  const [owner, repoNome] = (repo.nomeCompleto || `?/${repo.nome}`).split('/')

  // Carrega meta sempre ao abrir
  useEffect(() => {
    githubService.getMeta(repo.id).then(m => {
      setMeta(m)
      setMetaDraft({ alias:m.alias||'', tags:(m.tags||[]).join(', '), favorito:m.favorito, statusInterno:m.statusInterno||'ativo', observacoes:m.observacoes||'', projetoLocal:m.projetoLocal||'' })
    }).catch(() => {})
    githubService.projetosLocais().then(d => setProjetosLocais(d.projetos||[])).catch(() => {})
  }, [repo.id])

  // Carrega dados por aba
  const carregarAba = useCallback(async (a) => {
    setLoadingAba(true); setErroAba(null)
    try {
      if (a === 'visao' && !readme) {
        const r = await githubService.readme(owner, repoNome)
        setReadme(r)
      }
      if (a === 'commits' && !commits) {
        const c = await githubService.commits(owner, repoNome)
        setCommits(c.commits || [])
      }
      if (a === 'releases' && !releases) {
        const r = await githubService.releases(owner, repoNome)
        setReleases(r.releases || [])
      }
      if (a === 'artifacts' && !artifacts) {
        const ar = await githubService.artifacts(owner, repoNome)
        setArtifacts(ar.artifacts || [])
      }
      if (a === 'analysis' && !analysis) {
        const an = await githubService.analysis(owner, repoNome)
        setAnalysis(an)
      }
      if (a === 'secrets') {
        const s = await githubService.secrets(owner, repoNome)
        setSecrets(s.secrets || [])
      }
      if (a === 'workflows') {
        const w = await githubService.workflows(owner, repoNome)
        setWorkflows(w.workflows || [])
      }
    } catch(e) {
      setErroAba(e.message || 'Erro ao carregar')
    } finally {
      setLoadingAba(false)
    }
  }, [owner, repoNome, readme, commits, releases, artifacts, analysis])

  useEffect(() => { carregarAba(aba) }, [aba])

  const mudarAba = (a) => { setAba(a); setErroAba(null) }

  /* ── Salvar metadados ──────────────────────────────────── */
  async function salvarMeta() {
    setSalvandoMeta(true)
    try {
      const tagsList = metaDraft.tags.split(',').map(t => t.trim()).filter(Boolean)
      const salvo = await githubService.salvarMeta(repo.id, {
        nomeCompleto: repo.nomeCompleto,
        alias: metaDraft.alias || null,
        tags: tagsList,
        favorito: metaDraft.favorito,
        statusInterno: metaDraft.statusInterno,
        observacoes: metaDraft.observacoes || null,
        projetoLocal: metaDraft.projetoLocal || null,
      })
      setMeta(salvo)
      toastShow('Metadados salvos com sucesso!')
    } catch(e) {
      toastShow('Erro ao salvar: ' + e.message, 'erro')
    } finally {
      setSalvandoMeta(false)
    }
  }

  /* ── Criar release ─────────────────────────────────────── */
  async function criarRelease() {
    if (!novaRelease.tag) return toastShow('Tag é obrigatória', 'erro')
    setCriandoRelease(true)
    try {
      await githubService.criarRelease(owner, repoNome, {
        tag: novaRelease.tag, nome: novaRelease.nome,
        descricao: novaRelease.descricao, rascunho: novaRelease.rascunho,
        preRelease: novaRelease.preRelease,
      })
      setShowRelease(false)
      setNovaRelease({ tag:'', nome:'', descricao:'', preRelease:false, rascunho:false })
      setReleases(null)   // força reload
      toastShow('Release criada com sucesso!')
      setTimeout(() => carregarAba('releases'), 200)
    } catch(e) {
      toastShow('Erro: ' + e.message, 'erro')
    } finally {
      setCriandoRelease(false)
    }
  }

  /* ── Excluir repositório ───────────────────────────────── */
  async function confirmarDelete() {
    if (deleteInput !== repoNome) return toastShow('Nome digitado incorreto', 'erro')
    setDeletandoRepo(true)
    try {
      await githubService.excluirRepo(owner, repoNome, repoNome)
      toastShow(`Repositório ${repoNome} excluído.`)
      setTimeout(() => onFechar(true), 1200)
    } catch(e) {
      toastShow('Erro: ' + e.message, 'erro')
    } finally {
      setDeletandoRepo(false)
    }
  }

  /* ── Salvar repositório em Projetos (Sprint 5) ─────────── */
  function abrirModalSalvar() {
    setNomeProjeto(repoNome)
    setSubstituir(false)
    setSalvarEtapa(null)
    setSalvarErro(null)
    setSalvarNomeResultado(null)
    setShowSalvar(true)
  }

  async function executarSalvarProjeto() {
    const nome = nomeProjeto.trim()
    if (!nome) return
    setSalvarEtapa('baixando')
    setSalvarErro(null)
    try {
      // O backend faz tudo (download + extração). Etapas são visuais —
      // indicamos "extraindo" após um delay arbitrário para melhorar UX.
      const timer = setTimeout(() => setSalvarEtapa('extraindo'), 3500)
      const resultado = await githubService.salvarProjeto(owner, repoNome, nome, substituir)
      clearTimeout(timer)
      setSalvarEtapa('ok')
      setSalvarNomeResultado(resultado.nomeProjeto)
    } catch (e) {
      setSalvarEtapa('erro')
      setSalvarErro(e.message || 'Erro ao salvar projeto.')
    }
  }

  const NOMES_ETAPA = {
    baixando: '⬇ Baixando código-fonte...',
    extraindo:'📦 Extraindo arquivos...',
    ok:       '✅ Projeto salvo com sucesso!',
    erro:     '❌ Erro ao salvar',
  }

  const ABAS = [
    { id:'visao',     label:'Visão Geral' },
    { id:'meta',      label:'Metadados' },
    { id:'commits',   label:'Commits' },
    { id:'releases',  label:'Releases' },
    { id:'artifacts', label:'Artefatos' },
    { id:'secrets',   label:'🔑 Secrets' },
    { id:'workflows', label:'⚙ Workflows' },
    { id:'analysis', label:'Análise' },
    { id:'delete',   label:'⚠ Excluir', perigo:true },
  ]

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:1000,
      background:'#000a',
      display:'flex', alignItems:'flex-start', justifyContent:'flex-end',
    }} onClick={e => e.target === e.currentTarget && onFechar()}>
      <div style={{
        width:'min(640px, 100vw)', height:'100vh',
        background:C.bg, borderLeft:`1px solid ${C.border}`,
        display:'flex', flexDirection:'column',
        overflowY:'auto',
      }}>
        {/* Header */}
        <div style={{
          padding:'16px 20px', borderBottom:`1px solid ${C.border}`,
          display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12,
          position:'sticky', top:0, background:C.bg, zIndex:10,
        }}>
          <div style={{ minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:15, fontWeight:800, color:C.text, wordBreak:'break-all' }}>{repo.nomeCompleto}</span>
              {meta?.favorito && <span style={{ fontSize:14 }}>⭐</span>}
              {meta?.statusInterno && meta.statusInterno !== 'ativo' && (
                <span style={{
                  fontSize:9, fontWeight:700, color:STATUS_CFG[meta.statusInterno]?.cor || C.muted,
                  background:`${STATUS_CFG[meta.statusInterno]?.cor || C.muted}18`,
                  borderRadius:3, padding:'1px 5px', textTransform:'uppercase',
                }}>{STATUS_CFG[meta.statusInterno]?.label}</span>
              )}
            </div>
            {meta?.alias && (
              <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>alias: {meta.alias}</div>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <button
              onClick={abrirModalSalvar}
              title="Baixar e salvar na pasta Projetos"
              style={{
                display:'flex', alignItems:'center', gap:6,
                fontSize:11, fontWeight:700,
                color:'#fff', background:C.accent,
                border:'none', borderRadius:7, padding:'6px 12px',
                cursor:'pointer', whiteSpace:'nowrap',
              }}
            >
              📥 Salvar em Projetos
            </button>
            <button onClick={() => onFechar()} style={{
              background:'none', border:'none', color:C.muted, cursor:'pointer',
              fontSize:18, lineHeight:1, padding:4,
            }}>✕</button>
          </div>
        </div>

        {/* ── Modal: Salvar em Projetos (Sprint 5) ── */}
        {showSalvar && (
          <div style={{
            position:'fixed', inset:0, zIndex:2000,
            background:'rgba(0,0,0,.7)', backdropFilter:'blur(3px)',
            display:'flex', alignItems:'center', justifyContent:'center', padding:20,
          }}
            onClick={e => { if (e.target === e.currentTarget && !salvarEtapa) setShowSalvar(false) }}
          >
            <div style={{
              background:C.bg, border:`1px solid ${C.border}`,
              borderRadius:14, padding:24, width:'100%', maxWidth:420,
              boxShadow:'0 20px 60px rgba(0,0,0,.5)',
              display:'flex', flexDirection:'column', gap:18,
            }}>
              {/* Título */}
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:22 }}>📥</span>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:C.text }}>Salvar em Projetos</div>
                  <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>
                    Baixa o código-fonte de{' '}
                    <code style={{ fontSize:10, background:C.surface, padding:'1px 4px', borderRadius:3 }}>
                      {repo.nomeCompleto}
                    </code>
                    {' '}e extrai na pasta Projetos do servidor.
                  </div>
                </div>
              </div>

              {/* Barra de progresso / status */}
              {salvarEtapa && (
                <div style={{
                  background: salvarEtapa === 'erro' ? `${C.red}12` : `${C.accent}12`,
                  border:`1px solid ${salvarEtapa === 'erro' ? `${C.red}40` : `${C.accent}40`}`,
                  borderRadius:8, padding:'12px 16px',
                  display:'flex', alignItems:'flex-start', gap:10,
                }}>
                  {(salvarEtapa === 'baixando' || salvarEtapa === 'extraindo') && (
                    <svg style={{ flexShrink:0, marginTop:1,
                      animation:'adm-spin 1s linear infinite' }}
                      viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5" width="16" height="16">
                      <path d="M21 12a9 9 0 11-18 0"/>
                    </svg>
                  )}
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:700,
                      color: salvarEtapa === 'erro' ? C.red : C.text }}>
                      {NOMES_ETAPA[salvarEtapa]}
                    </div>
                    {salvarEtapa === 'ok' && salvarNomeResultado && (
                      <div style={{ fontSize:11, color:C.muted, marginTop:4, lineHeight:1.5 }}>
                        Disponível em{' '}
                        <code style={{ background:C.surface, padding:'1px 4px', borderRadius:3, fontSize:10 }}>
                          projetos/{salvarNomeResultado}/
                        </code>
                        {' — '}
                        <a href="/admin/projetos" style={{ color:C.accent, fontWeight:700, textDecoration:'none' }}>
                          Ver em Projetos →
                        </a>
                      </div>
                    )}
                    {salvarEtapa === 'erro' && salvarErro && (
                      <div style={{ fontSize:11, color:C.muted, marginTop:4, lineHeight:1.5 }}>
                        {salvarErro}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Formulário — só visível antes da execução */}
              {!salvarEtapa && (
                <>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <label style={{ fontSize:11, fontWeight:700, color:C.muted, letterSpacing:.04 }}>
                      NOME DO PROJETO
                    </label>
                    <input
                      value={nomeProjeto}
                      onChange={e => setNomeProjeto(
                        e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 60)
                      )}
                      placeholder={repoNome}
                      autoFocus
                      style={{
                        background:C.surface, border:`1px solid ${C.border}`,
                        borderRadius:7, padding:'9px 12px',
                        fontSize:13, color:C.text, outline:'none',
                        width:'100%', boxSizing:'border-box',
                      }}
                      onKeyDown={e => { if (e.key === 'Enter' && nomeProjeto.trim()) executarSalvarProjeto() }}
                    />
                    <div style={{ fontSize:10, color:C.muted }}>
                      Será criado em{' '}
                      <code style={{ background:C.surface, padding:'1px 4px', borderRadius:3, fontSize:9 }}>
                        projetos/{nomeProjeto.trim() || repoNome}/
                      </code>
                    </div>
                  </div>

                  <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}>
                    <input
                      type="checkbox"
                      checked={substituir}
                      onChange={e => setSubstituir(e.target.checked)}
                      style={{ width:14, height:14, marginTop:2, accentColor:C.accent, flexShrink:0 }}
                    />
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:C.text }}>
                        Substituir se já existir
                      </div>
                      <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>
                        Remove a pasta existente antes de extrair o novo conteúdo
                      </div>
                    </div>
                  </label>
                </>
              )}

              {/* Botões de ação */}
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                {(salvarEtapa === 'ok' || salvarEtapa === 'erro') ? (
                  <>
                    {salvarEtapa === 'erro' && (
                      <button
                        onClick={() => setSalvarEtapa(null)}
                        style={{
                          fontSize:12, fontWeight:600, color:C.text,
                          background:C.surface, border:`1px solid ${C.border}`,
                          borderRadius:7, padding:'8px 16px', cursor:'pointer',
                        }}
                      >
                        Tentar novamente
                      </button>
                    )}
                    <button
                      onClick={() => { setShowSalvar(false); setSalvarEtapa(null) }}
                      style={{
                        fontSize:12, fontWeight:700, color:C.text,
                        background:C.surface, border:`1px solid ${C.border}`,
                        borderRadius:7, padding:'8px 20px', cursor:'pointer',
                      }}
                    >
                      Fechar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setShowSalvar(false)}
                      disabled={!!salvarEtapa}
                      style={{
                        fontSize:12, fontWeight:600, color:C.muted,
                        background:'none', border:`1px solid ${C.border}`,
                        borderRadius:7, padding:'8px 16px',
                        cursor: salvarEtapa ? 'not-allowed' : 'pointer',
                        opacity: salvarEtapa ? .5 : 1,
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={executarSalvarProjeto}
                      disabled={!nomeProjeto.trim() || !!salvarEtapa}
                      style={{
                        fontSize:12, fontWeight:700,
                        color:'#fff', background: (!nomeProjeto.trim() || salvarEtapa) ? '#6b7c4e80' : C.accent,
                        border:'none', borderRadius:7, padding:'8px 20px',
                        cursor: (!nomeProjeto.trim() || salvarEtapa) ? 'not-allowed' : 'pointer',
                        display:'flex', alignItems:'center', gap:6,
                      }}
                    >
                      📥 Salvar
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
        <div style={{
          display:'flex', gap:2, padding:'8px 20px',
          borderBottom:`1px solid ${C.border}`, flexWrap:'wrap',
          position:'sticky', top:57, background:C.bg, zIndex:9,
        }}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => mudarAba(a.id)} style={{
              fontSize:11, fontWeight:600, padding:'5px 10px', borderRadius:6,
              border:`1px solid ${aba===a.id ? (a.perigo?'#dc262640':C.accent) : 'transparent'}`,
              background: aba===a.id ? (a.perigo?'#dc262618':'var(--adm-accent,#6b7c4e)18') : 'none',
              color: a.perigo ? '#dc2626' : (aba===a.id ? C.text : C.muted),
              cursor:'pointer',
            }}>{a.label}</button>
          ))}
        </div>

        {/* Conteúdo da aba */}
        <div style={{ padding:'20px', flex:1 }}>
          {loadingAba ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:C.muted, fontSize:12 }}>
              Carregando...
            </div>
          ) : erroAba ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:C.amber, fontSize:12 }}>
              {erroAba}
            </div>
          ) : (
            <>
              {aba === 'visao' && <AbaVisao repo={repo} readme={readme} />}
              {aba === 'meta' && metaDraft && (
                <AbaMeta
                  metaDraft={metaDraft} setMetaDraft={setMetaDraft}
                  projetosLocais={projetosLocais} salvandoMeta={salvandoMeta}
                  onSalvar={salvarMeta}
                />
              )}
              {aba === 'commits' && <AbaCommits commits={commits} />}
              {aba === 'releases' && (
                <AbaReleases
                  releases={releases} showRelease={showRelease}
                  setShowRelease={setShowRelease} novaRelease={novaRelease}
                  setNovaRelease={setNovaRelease} onCriar={criarRelease}
                  criandoRelease={criandoRelease}
                />
              )}
              {aba === 'artifacts' && <AbaArtifacts artifacts={artifacts} owner={owner} repo={repoNome} />}
              {aba === 'analysis' && <AbaAnalysis analysis={analysis} />}
              {aba === 'secrets' && (
                <AbaSecrets
                  secrets={secrets} owner={owner} repo={repoNome}
                  onRefresh={() => { setSecrets(null); carregarAba('secrets') }}
                  toastShow={toastShow}
                />
              )}
              {aba === 'workflows' && (
                <AbaWorkflows
                  workflows={workflows} owner={owner} repo={repoNome}
                  toastShow={toastShow}
                />
              )}
              {aba === 'delete' && (
                <AbaDelete
                  repo={repo} repoNome={repoNome}
                  deleteStep={deleteStep} setDeleteStep={setDeleteStep}
                  deleteInput={deleteInput} setDeleteInput={setDeleteInput}
                  onConfirmar={confirmarDelete} deletandoRepo={deletandoRepo}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── ABA: Visão Geral ─────────────────────────────────────── */
function AbaVisao({ repo, readme }) {
  return (
    <div>
      <Secao titulo="Informações do Repositório">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
          {[
            { label:'Linguagem',   val: repo.linguagem || '—' },
            { label:'Branch',      val: repo.branch || '—' },
            { label:'Stars',       val: `★ ${repo.stars}` },
            { label:'Forks',       val: `⑂ ${repo.forks}` },
            { label:'Issues',      val: `● ${repo.issues}` },
            { label:'Criado em',   val: repo.criadoEm ? new Date(repo.criadoEm).toLocaleDateString('pt-BR') : '—' },
            { label:'Atualizado',  val: relTime(repo.ultimaAtualizacao) },
            { label:'Tamanho',     val: repo.tamanho ? `${repo.tamanho} KB` : '—' },
          ].map(item => (
            <div key={item.label} style={{
              background:C.surface, borderRadius:8, padding:'10px 14px',
              border:`1px solid ${C.border}`,
            }}>
              <div style={{ fontSize:9, color:C.muted, fontWeight:700, textTransform:'uppercase', marginBottom:4 }}>{item.label}</div>
              <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{item.val}</div>
            </div>
          ))}
        </div>
        {repo.descricao && (
          <div style={{ marginTop:12, fontSize:12, color:C.muted, lineHeight:1.6 }}>{repo.descricao}</div>
        )}
        {repo.temas?.length > 0 && (
          <div style={{ marginTop:10, display:'flex', gap:6, flexWrap:'wrap' }}>
            {repo.temas.map(t => (
              <span key={t} style={{ fontSize:10, color:'#60a5fa', background:'#3b82f610', border:'1px solid #3b82f620', borderRadius:4, padding:'2px 6px', fontWeight:600 }}>{t}</span>
            ))}
          </div>
        )}
        <div style={{ marginTop:12 }}>
          <a href={repo.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'var(--adm-blue,#3b82f6)', textDecoration:'none' }}>
            🔗 Abrir no GitHub →
          </a>
        </div>
      </Secao>

      <Secao titulo="README">
        {readme === null ? (
          <div style={{ fontSize:12, color:C.muted }}>Sem README.</div>
        ) : readme?.conteudo ? (
          <pre style={{
            background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:8, padding:'14px', fontSize:11, color:C.text,
            lineHeight:1.7, whiteSpace:'pre-wrap', wordBreak:'break-word',
            maxHeight:320, overflowY:'auto',
          }}>{readme.conteudo.slice(0, 4000)}{readme.conteudo.length > 4000 ? '\n\n[...truncado]' : ''}</pre>
        ) : (
          <div style={{ fontSize:12, color:C.muted }}>Carregando README...</div>
        )}
      </Secao>
    </div>
  )
}

/* ── ABA: Metadados Internos ──────────────────────────────── */
function AbaMeta({ metaDraft, setMetaDraft, projetosLocais, salvandoMeta, onSalvar }) {
  const upd = (k,v) => setMetaDraft(p => ({ ...p, [k]:v }))
  const inp = {
    background:C.surface, border:`1px solid ${C.border}`,
    borderRadius:7, padding:'8px 12px', fontSize:12, color:C.text,
    outline:'none', width:'100%', boxSizing:'border-box',
  }
  return (
    <div>
      <Secao titulo="Metadados Internos (somente AL Sistemas)">
        <p style={{ fontSize:11, color:C.muted, marginBottom:16 }}>
          Esses dados são <strong style={{color:C.text}}>internos</strong> e não alteram o GitHub.
        </p>
        <div style={{ display:'grid', gap:12 }}>
          <label>
            <div style={{ fontSize:11, color:C.muted, marginBottom:4, fontWeight:600 }}>Alias interno</div>
            <input value={metaDraft.alias} onChange={e => upd('alias', e.target.value)} placeholder="Nome amigável (ex: Portal Principal)" style={inp} />
          </label>
          <label>
            <div style={{ fontSize:11, color:C.muted, marginBottom:4, fontWeight:600 }}>Tags (separadas por vírgula)</div>
            <input value={metaDraft.tags} onChange={e => upd('tags', e.target.value)} placeholder="mobile, api, frontend" style={inp} />
          </label>
          <label>
            <div style={{ fontSize:11, color:C.muted, marginBottom:4, fontWeight:600 }}>Status</div>
            <select value={metaDraft.statusInterno} onChange={e => upd('statusInterno', e.target.value)} style={inp}>
              {Object.entries(STATUS_CFG).map(([k,v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </label>
          {projetosLocais.length > 0 && (
            <label>
              <div style={{ fontSize:11, color:C.muted, marginBottom:4, fontWeight:600 }}>Vínculo com projeto local</div>
              <select value={metaDraft.projetoLocal} onChange={e => upd('projetoLocal', e.target.value)} style={inp}>
                <option value="">— Nenhum —</option>
                {projetosLocais.map(p => <option key={p.nome} value={p.nome}>{p.nome}</option>)}
              </select>
            </label>
          )}
          <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
            <input type="checkbox" checked={metaDraft.favorito} onChange={e => upd('favorito', e.target.checked)} />
            <span style={{ fontSize:12, color:C.text }}>⭐ Marcar como favorito</span>
          </label>
          <label>
            <div style={{ fontSize:11, color:C.muted, marginBottom:4, fontWeight:600 }}>Observações</div>
            <textarea value={metaDraft.observacoes} onChange={e => upd('observacoes', e.target.value)}
              rows={3} placeholder="Notas internas sobre este repositório..."
              style={{ ...inp, resize:'vertical', fontFamily:'inherit' }} />
          </label>
        </div>
        <div style={{ marginTop:16, display:'flex', justifyContent:'flex-end' }}>
          <Btn variante="primario" onClick={onSalvar} disabled={salvandoMeta}>
            {salvandoMeta ? 'Salvando...' : '💾 Salvar Metadados'}
          </Btn>
        </div>
      </Secao>
    </div>
  )
}

/* ── ABA: Commits ─────────────────────────────────────────── */
function AbaCommits({ commits }) {
  if (!commits) return <div style={{ fontSize:12, color:C.muted }}>Carregando...</div>
  if (commits.length === 0) return <div style={{ fontSize:12, color:C.muted }}>Sem commits encontrados.</div>
  return (
    <Secao titulo={`Commits recentes (${commits.length})`}>
      <div style={{ display:'grid', gap:8 }}>
        {commits.map((c, i) => (
          <div key={i} style={{
            background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:8, padding:'10px 14px',
            display:'flex', gap:10, alignItems:'flex-start',
          }}>
            {c.avatar && <img src={c.avatar} alt={c.autor} style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, marginTop:2 }} />}
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:12, color:C.text, fontWeight:600, wordBreak:'break-word', lineHeight:1.4 }}>{c.mensagem}</div>
              <div style={{ fontSize:10, color:C.muted, marginTop:3, display:'flex', gap:8, flexWrap:'wrap' }}>
                <span style={{ fontFamily:'monospace', color:'var(--adm-blue,#3b82f6)' }}>{c.sha}</span>
                <span>{c.autor}</span>
                <span>{relTime(c.data)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Secao>
  )
}

/* ── ABA: Releases ────────────────────────────────────────── */
function AbaReleases({ releases, showRelease, setShowRelease, novaRelease, setNovaRelease, onCriar, criandoRelease }) {
  const upd = (k,v) => setNovaRelease(p => ({ ...p, [k]:v }))
  const inp = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:7, padding:'8px 12px', fontSize:12, color:C.text, outline:'none', width:'100%', boxSizing:'border-box' }
  return (
    <div>
      <Secao titulo={`Releases (${releases?.length ?? '…'})`} acao={
        <Btn small variante="primario" onClick={() => setShowRelease(true)}>+ Nova Release</Btn>
      }>
        {showRelease && (
          <div style={{ background:C.surf2, border:`1px solid ${C.border}`, borderRadius:10, padding:16, marginBottom:16 }}>
            <div style={{ fontSize:12, fontWeight:800, color:C.text, marginBottom:12 }}>Nova Release</div>
            <div style={{ display:'grid', gap:10 }}>
              <input value={novaRelease.tag} onChange={e => upd('tag', e.target.value)} placeholder="Tag (ex: v1.0.0) *" style={inp} />
              <input value={novaRelease.nome} onChange={e => upd('nome', e.target.value)} placeholder="Nome da release" style={inp} />
              <textarea value={novaRelease.descricao} onChange={e => upd('descricao', e.target.value)}
                rows={4} placeholder="Changelog / descrição..." style={{ ...inp, resize:'vertical', fontFamily:'inherit' }} />
              <div style={{ display:'flex', gap:16 }}>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:C.text, cursor:'pointer' }}>
                  <input type="checkbox" checked={novaRelease.preRelease} onChange={e => upd('preRelease', e.target.checked)} />
                  Pre-release
                </label>
                <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:C.text, cursor:'pointer' }}>
                  <input type="checkbox" checked={novaRelease.rascunho} onChange={e => upd('rascunho', e.target.checked)} />
                  Rascunho
                </label>
              </div>
              <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                <Btn small onClick={() => setShowRelease(false)}>Cancelar</Btn>
                <Btn small variante="primario" onClick={onCriar} disabled={criandoRelease}>
                  {criandoRelease ? 'Criando...' : '🚀 Publicar'}
                </Btn>
              </div>
            </div>
          </div>
        )}
        {!releases ? (
          <div style={{ fontSize:12, color:C.muted }}>Carregando...</div>
        ) : releases.length === 0 ? (
          <div style={{ fontSize:12, color:C.muted }}>Nenhuma release encontrada.</div>
        ) : (
          <div style={{ display:'grid', gap:10 }}>
            {releases.map(r => (
              <div key={r.id} style={{
                background:C.surface, border:`1px solid ${C.border}`,
                borderRadius:8, padding:'12px 14px',
              }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, flexWrap:'wrap' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:13, fontWeight:800, color:C.text, fontFamily:'monospace' }}>{r.tag}</span>
                    {r.rascunho   && <span style={{ fontSize:9, background:'#64748b20', color:C.muted, borderRadius:3, padding:'1px 5px', fontWeight:700 }}>RASCUNHO</span>}
                    {r.preRelease && <span style={{ fontSize:9, background:'#f59e0b20', color:'#f59e0b', borderRadius:3, padding:'1px 5px', fontWeight:700 }}>PRE-RELEASE</span>}
                  </div>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ fontSize:10, color:C.muted }}>{relTime(r.publicadoEm || r.criadoEm)}</span>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, color:'var(--adm-blue,#3b82f6)', textDecoration:'none' }}>ver →</a>
                  </div>
                </div>
                {r.nome && r.nome !== r.tag && (
                  <div style={{ fontSize:11, color:C.text, marginTop:4 }}>{r.nome}</div>
                )}
                {r.assets?.length > 0 && (
                  <div style={{ marginTop:8, display:'flex', gap:6, flexWrap:'wrap' }}>
                    {r.assets.map(a => (
                      <a key={a.id} href={a.url} style={{
                        fontSize:10, color:C.text, background:C.surf2,
                        border:`1px solid ${C.border}`, borderRadius:5, padding:'3px 8px',
                        textDecoration:'none', display:'inline-flex', alignItems:'center', gap:4,
                      }}>
                        📦 {a.nome} <span style={{ color:C.muted }}>({fmtBytes(a.tamanho)})</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Secao>
    </div>
  )
}

/* ── ABA: Artefatos ───────────────────────────────────────── */
function AbaArtifacts({ artifacts, owner, repo }) {
  if (!artifacts) return <div style={{ fontSize:12, color:C.muted }}>Carregando...</div>
  return (
    <Secao titulo={`Artefatos de Build (${artifacts.length})`}>
      {artifacts.length === 0 ? (
        <div style={{ fontSize:12, color:C.muted }}>
          Nenhum artefato encontrado. Artefatos são gerados pelo GitHub Actions (CI/CD).
        </div>
      ) : (
        <div style={{ display:'grid', gap:8 }}>
          {artifacts.map(a => (
            <div key={a.id} style={{
              background:C.surface, border:`1px solid ${C.border}`,
              borderRadius:8, padding:'12px 14px',
              display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap',
            }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:C.text, display:'flex', alignItems:'center', gap:6 }}>
                  📦 {a.nome}
                  {a.expirado && <span style={{ fontSize:9, background:'#dc262620', color:'#dc2626', borderRadius:3, padding:'1px 5px', fontWeight:700 }}>EXPIRADO</span>}
                  {/apk/i.test(a.nome) && <span style={{ fontSize:9, background:'#22c55e20', color:'#22c55e', borderRadius:3, padding:'1px 5px', fontWeight:700 }}>APK</span>}
                </div>
                <div style={{ fontSize:10, color:C.muted, marginTop:3, display:'flex', gap:8 }}>
                  <span>{fmtBytes(a.tamanho)}</span>
                  <span>criado {relTime(a.criadoEm)}</span>
                  {a.expiradoEm && <span>expira {new Date(a.expiradoEm).toLocaleDateString('pt-BR')}</span>}
                  {a.workflowRunId && <span style={{ color:C.muted }}>Run #{a.workflowRunId}</span>}
                </div>
              </div>
              {!a.expirado && (
                <a
                  href={githubService.downloadArtifactUrl(a.id, owner, repo, a.nome)}
                  style={{
                    fontSize:11, fontWeight:600, color:'#fff',
                    background:'var(--adm-accent,#6b7c4e)', borderRadius:6,
                    padding:'5px 12px', textDecoration:'none', whiteSpace:'nowrap',
                  }}
                >
                  ⬇ Baixar {/apk/i.test(a.nome) ? 'APK' : 'ZIP'}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </Secao>
  )
}

/* ── ABA: Análise ─────────────────────────────────────────── */
function AbaAnalysis({ analysis: an }) {
  if (!an) return <div style={{ fontSize:12, color:C.muted }}>Carregando análise...</div>
  const badge = (label, cor) => (
    <span style={{ fontSize:11, fontWeight:700, color:cor, background:`${cor}18`, border:`1px solid ${cor}30`, borderRadius:5, padding:'3px 9px' }}>
      {label}
    </span>
  )
  return (
    <div>
      <Secao titulo="Stack Detectada">
        {an.stack?.length > 0 ? (
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {an.stack.map(s => <LangBadge key={s} lang={s} size={12} />)}
          </div>
        ) : (
          <span style={{ fontSize:12, color:C.muted }}>Stack não identificada</span>
        )}
      </Secao>

      <Secao titulo="Indicadores">
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
          <div style={{ background:C.surface, borderRadius:8, padding:'12px 14px', border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>Maturidade</div>
            {badge(an.maturidade, MATURIDADE_COR[an.maturidade] || C.muted)}
            <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>{an.diasSemAtividade}d sem atividade</div>
          </div>
          <div style={{ background:C.surface, borderRadius:8, padding:'12px 14px', border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>Commits recentes</div>
            {badge(an.frequenciaCommits, FREQ_COR[an.frequenciaCommits] || C.muted)}
          </div>
          <div style={{ background:C.surface, borderRadius:8, padding:'12px 14px', border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>Complexidade</div>
            {badge(an.complexidade, C.text)}
          </div>
          <div style={{ background:C.surface, borderRadius:8, padding:'12px 14px', border:`1px solid ${C.border}` }}>
            <div style={{ fontSize:9, color:C.muted, fontWeight:700, textTransform:'uppercase', marginBottom:6 }}>Arquivos raiz</div>
            <span style={{ fontSize:14, fontWeight:700, color:C.text }}>{an.totalArquivos}</span>
          </div>
        </div>
      </Secao>

      <Secao titulo="Features Detectadas">
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {[
            { ok:an.hasCI,     label:'CI/CD',    icone:'⚙' },
            { ok:an.hasDocker, label:'Docker',   icone:'🐳' },
            { ok:an.hasTestes, label:'Testes',   icone:'✅' },
            { ok:an.temLicense,label:'Licença',  icone:'📄' },
          ].map(f => (
            <span key={f.label} style={{
              fontSize:11, fontWeight:700, borderRadius:5, padding:'4px 10px',
              border:`1px solid ${f.ok ? '#22c55e40' : C.border}`,
              color: f.ok ? '#22c55e' : C.muted,
              background: f.ok ? '#22c55e12' : C.surface,
            }}>{f.icone} {f.label}</span>
          ))}
        </div>
      </Secao>

      {an.linguagens && Object.keys(an.linguagens).length > 0 && (
        <Secao titulo="Distribuição de Linguagens">
          {(() => {
            const total = Object.values(an.linguagens).reduce((a,b) => a+b, 0)
            return Object.entries(an.linguagens)
              .sort(([,a],[,b]) => b-a)
              .map(([lang, bytes]) => {
                const pct = ((bytes/total)*100).toFixed(1)
                const cor = LANG_COR[lang] || C.muted
                return (
                  <div key={lang} style={{ marginBottom:8 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                      <span style={{ fontSize:11, color:C.text, fontWeight:600 }}>{lang}</span>
                      <span style={{ fontSize:10, color:C.muted }}>{pct}%</span>
                    </div>
                    <div style={{ height:5, background:C.surface, borderRadius:3, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:cor, borderRadius:3 }} />
                    </div>
                  </div>
                )
              })
          })()}
        </Secao>
      )}

      {an.dependencias?.length > 0 && (
        <Secao titulo="Dependências Principais">
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {an.dependencias.map(d => (
              <span key={d} style={{ fontSize:10, background:C.surface, border:`1px solid ${C.border}`, borderRadius:4, padding:'3px 8px', color:C.text, fontFamily:'monospace' }}>{d}</span>
            ))}
          </div>
        </Secao>
      )}
    </div>
  )
}

/* ── ABA: Excluir ─────────────────────────────────────────── */
function AbaDelete({ repo, repoNome, deleteStep, setDeleteStep, deleteInput, setDeleteInput, onConfirmar, deletandoRepo }) {
  return (
    <div>
      <div style={{
        background:'#dc262610', border:'1px solid #dc262640',
        borderRadius:10, padding:20,
      }}>
        <div style={{ fontSize:14, fontWeight:800, color:'#dc2626', marginBottom:8 }}>
          ⚠ Zona de Perigo — Excluir Repositório
        </div>
        <p style={{ fontSize:12, color:C.text, lineHeight:1.6, marginBottom:16 }}>
          Excluir <strong>{repo.nomeCompleto}</strong> é uma ação <strong>permanente e irreversível</strong>.
          O repositório será removido do GitHub e todos os dados serão perdidos.
        </p>

        {deleteStep === 0 && (
          <Btn variante="perigo" onClick={() => setDeleteStep(1)}>
            🗑 Quero excluir este repositório
          </Btn>
        )}

        {deleteStep === 1 && (
          <div style={{ background:'#dc262618', borderRadius:8, padding:16 }}>
            <p style={{ fontSize:12, color:'#dc2626', fontWeight:700, marginBottom:12 }}>
              Confirmação 1 de 2 — Você tem certeza absoluta?
            </p>
            <p style={{ fontSize:11, color:C.text, marginBottom:12 }}>
              Esta ação vai excluir permanentemente <code style={{ background:C.surface, padding:'1px 4px', borderRadius:3 }}>{repo.nomeCompleto}</code> incluindo todos os branches, commits, releases e wikis.
            </p>
            <div style={{ display:'flex', gap:8 }}>
              <Btn onClick={() => setDeleteStep(0)}>Cancelar</Btn>
              <Btn variante="perigo" onClick={() => setDeleteStep(2)}>Sim, quero excluir</Btn>
            </div>
          </div>
        )}

        {deleteStep === 2 && (
          <div style={{ background:'#dc262618', borderRadius:8, padding:16 }}>
            <p style={{ fontSize:12, color:'#dc2626', fontWeight:700, marginBottom:12 }}>
              Confirmação 2 de 2 — Digite o nome do repositório para confirmar
            </p>
            <p style={{ fontSize:11, color:C.muted, marginBottom:8 }}>
              Digite <code style={{ background:C.surface, padding:'1px 4px', borderRadius:3, color:'#dc2626' }}>{repoNome}</code> para confirmar:
            </p>
            <input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder={repoNome}
              style={{
                background:C.surface, border:`2px solid #dc262640`,
                borderRadius:7, padding:'8px 12px', fontSize:12, color:C.text,
                outline:'none', width:'100%', boxSizing:'border-box', marginBottom:12,
              }}
            />
            <div style={{ display:'flex', gap:8 }}>
              <Btn onClick={() => { setDeleteStep(0); setDeleteInput('') }}>Cancelar</Btn>
              <Btn
                variante="perigo"
                disabled={deleteInput !== repoNome || deletandoRepo}
                onClick={onConfirmar}
              >
                {deletandoRepo ? 'Excluindo...' : '🗑 Excluir definitivamente'}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ABA: Secrets — Sprint 4
═══════════════════════════════════════════════════════════ */
const INP_STYLE = {
  background:'var(--adm-surface,#1a1a1a)', border:'1px solid var(--adm-border,#333)',
  borderRadius:7, padding:'8px 12px', fontSize:12,
  color:'var(--adm-text,#e5e7eb)', outline:'none',
  width:'100%', boxSizing:'border-box',
}

function AbaSecrets({ secrets, owner, repo, onRefresh, toastShow }) {
  const [novoNome, setNovoNome]   = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [salvando, setSalvando]   = useState(false)
  const [excluindo, setExcluindo] = useState(null)
  const [showForm, setShowForm]   = useState(false)

  async function salvarSecret() {
    if (!novoNome.trim()) return toastShow('Nome do secret obrigatório', 'erro')
    if (!novoValor.trim()) return toastShow('Valor obrigatório', 'erro')
    setSalvando(true)
    try {
      await githubService.criarSecret(owner, repo, novoNome.toUpperCase().trim(), novoValor)
      toastShow(`Secret "${novoNome.toUpperCase()}" salvo!`)
      setNovoNome(''); setNovoValor(''); setShowForm(false)
      onRefresh()
    } catch(e) {
      toastShow('Erro: ' + e.message, 'erro')
    } finally { setSalvando(false) }
  }

  async function excluirSecret(nome) {
    setExcluindo(nome)
    try {
      await githubService.excluirSecret(owner, repo, nome)
      toastShow(`Secret "${nome}" removido.`)
      onRefresh()
    } catch(e) {
      toastShow('Erro: ' + e.message, 'erro')
    } finally { setExcluindo(null) }
  }

  if (!secrets) return <div style={{ fontSize:12, color:C.muted }}>Carregando...</div>

  return (
    <div>
      <Secao
        titulo={`Secrets do Actions (${secrets.length})`}
        acao={
          <Btn small variante="primario" onClick={() => setShowForm(v => !v)}>
            {showForm ? '✕ Cancelar' : '+ Novo Secret'}
          </Btn>
        }
      >
        {/* Aviso de segurança */}
        <div style={{
          background:'#f59e0b10', border:'1px solid #f59e0b30',
          borderRadius:8, padding:'10px 14px', fontSize:11, color:'#f59e0b', marginBottom:14,
          lineHeight:1.6,
        }}>
          🔒 O GitHub <strong>nunca expõe</strong> os valores dos secrets — apenas os nomes são listados.
          Os valores são criptografados com a chave pública do repositório antes de serem enviados.
        </div>

        {/* Formulário novo secret */}
        {showForm && (
          <div style={{
            background:C.surface, border:`1px solid ${C.border}`,
            borderRadius:10, padding:16, marginBottom:16,
          }}>
            <div style={{ fontSize:12, fontWeight:700, color:C.text, marginBottom:12 }}>
              Novo Secret de Actions
            </div>
            <div style={{ display:'grid', gap:10 }}>
              <div>
                <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Nome (MAIÚSCULAS, ex: API_KEY)</div>
                <input
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                  placeholder="NOME_DO_SECRET"
                  style={INP_STYLE}
                />
              </div>
              <div>
                <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Valor (será criptografado)</div>
                <input
                  type="password"
                  value={novoValor}
                  onChange={e => setNovoValor(e.target.value)}
                  placeholder="valor-secreto"
                  style={INP_STYLE}
                />
              </div>
              <Btn variante="primario" disabled={salvando} onClick={salvarSecret}>
                {salvando ? 'Salvando...' : '🔐 Salvar Secret'}
              </Btn>
            </div>
          </div>
        )}

        {/* Lista de secrets */}
        {secrets.length === 0 ? (
          <div style={{ fontSize:12, color:C.muted }}>
            Nenhum secret configurado neste repositório.
          </div>
        ) : (
          <div style={{ display:'grid', gap:6 }}>
            {secrets.map(s => (
              <div key={s.nome} style={{
                background:C.surface, border:`1px solid ${C.border}`,
                borderRadius:8, padding:'10px 14px',
                display:'flex', justifyContent:'space-between', alignItems:'center', gap:12,
              }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:C.text, display:'flex', alignItems:'center', gap:6 }}>
                    🔑 {s.nome}
                  </div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>
                    atualizado {s.atualizadoEm ? relTime(s.atualizadoEm) : '—'}
                    {s.criadoEm && <span> · criado {relTime(s.criadoEm)}</span>}
                  </div>
                </div>
                <Btn
                  small variante="perigo"
                  disabled={excluindo === s.nome}
                  onClick={() => excluirSecret(s.nome)}
                >
                  {excluindo === s.nome ? '...' : '🗑'}
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Secao>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   ABA: Workflows & Runs — Sprint 4
═══════════════════════════════════════════════════════════ */

const STATUS_RUN_COR = {
  success:   '#22c55e',
  failure:   '#dc2626',
  cancelled: '#64748b',
  skipped:   '#94a3b8',
  in_progress: '#3b82f6',
  queued:    '#f59e0b',
  waiting:   '#f59e0b',
}

function fmtDuracao(ms) {
  if (!ms || ms < 0) return '—'
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function AbaWorkflows({ workflows, owner, repo, toastShow }) {
  const [wfSel, setWfSel]           = useState(null)
  const [runs, setRuns]             = useState(null)
  const [loadRuns, setLoadRuns]     = useState(false)
  const [runAberto, setRunAberto]   = useState(null)
  const [jobs, setJobs]             = useState(null)
  const [loadJobs, setLoadJobs]     = useState(false)
  const [jobLogAberto, setJobLogAberto] = useState(null)
  const [logTexto, setLogTexto]     = useState(null)
  const [loadLog, setLoadLog]       = useState(false)
  // Cache de artefatos do repositório — carregado ao abrir qualquer run.
  // Cruzado com run.id via artifact.workflowRunId para mostrar botão de APK
  // dentro do contexto de cada execução, sem sair da aba Workflows.
  const [artifactsCache, setArtifactsCache] = useState(null)  // null=não carregado, []=carregado

  async function selecionarWorkflow(wf) {
    setWfSel(wf); setRuns(null); setRunAberto(null); setJobs(null); setArtifactsCache(null)
    setLoadRuns(true)
    try {
      const d = await githubService.runs(owner, repo, wf.id)
      setRuns(d.runs || [])
    } catch(e) {
      toastShow('Erro ao carregar runs: ' + e.message, 'erro')
    } finally { setLoadRuns(false) }
  }

  async function abrirRun(run) {
    setRunAberto(run); setJobs(null); setJobLogAberto(null); setLogTexto(null)
    if (!run?.id) return   // guard: chamada de fechamento não faz fetch
    setLoadJobs(true)
    // Jobs + artefatos em paralelo
    const [jobsPromise, artsPromise] = [
      githubService.jobs(run.id, owner, repo),
      artifactsCache === null ? githubService.artifacts(owner, repo) : Promise.resolve(null),
    ]
    try {
      const d = await jobsPromise
      setJobs(d.jobs || [])
    } catch(e) {
      toastShow('Erro ao carregar jobs: ' + e.message, 'erro')
    } finally { setLoadJobs(false) }

    // Artefatos — não bloqueia UI; falha silenciosa
    if (artifactsCache === null) {
      artsPromise
        .then(d => setArtifactsCache(d?.artifacts || []))
        .catch(() => setArtifactsCache([]))
    }
  }

  function fecharRun() {
    setRunAberto(null); setJobs(null); setJobLogAberto(null); setLogTexto(null)
  }

  async function verLog(job) {
    setJobLogAberto(job.id === jobLogAberto ? null : job.id)
    if (job.id === jobLogAberto) return
    setLoadLog(true); setLogTexto(null)
    try {
      const texto = await githubService.jobLogs(job.id, owner, repo)
      setLogTexto(texto)
    } catch(e) {
      setLogTexto(`Erro ao carregar log: ${e.message}`)
    } finally { setLoadLog(false) }
  }

  if (!workflows) return <div style={{ fontSize:12, color:C.muted }}>Carregando...</div>
  if (workflows.length === 0) return (
    <div style={{ fontSize:12, color:C.muted }}>
      Nenhum workflow encontrado. Crie arquivos <code>.github/workflows/*.yml</code> no repositório.
    </div>
  )

  const corStatus = (s, c) => STATUS_RUN_COR[c || s] || C.muted
  const badgeStatus = (status, conclusao) => {
    const cor = corStatus(status, conclusao)
    const label = conclusao || status || '?'
    return (
      <span style={{
        fontSize:9, fontWeight:700, color:cor,
        background:`${cor}18`, border:`1px solid ${cor}30`,
        borderRadius:4, padding:'2px 6px', textTransform:'uppercase',
      }}>{label}</span>
    )
  }

  return (
    <div>
      {/* Selector de workflow */}
      <Secao titulo={`Workflows (${workflows.length})`}>
        <div style={{ display:'grid', gap:6 }}>
          {workflows.map(wf => (
            <button key={wf.id} onClick={() => selecionarWorkflow(wf)} style={{
              background: wfSel?.id === wf.id ? `var(--adm-accent,#6b7c4e)18` : C.surface,
              border: `1px solid ${wfSel?.id === wf.id ? 'var(--adm-accent,#6b7c4e)' : C.border}`,
              borderRadius:8, padding:'10px 14px', cursor:'pointer', textAlign:'left',
              display:'flex', justifyContent:'space-between', alignItems:'center',
            }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:C.text }}>⚙ {wf.nome}</div>
                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{wf.arquivo}</div>
              </div>
              <span style={{
                fontSize:9, fontWeight:700,
                color: wf.estado === 'active' ? '#22c55e' : '#f59e0b',
                background: wf.estado === 'active' ? '#22c55e18' : '#f59e0b18',
                border: `1px solid ${wf.estado === 'active' ? '#22c55e30' : '#f59e0b30'}`,
                borderRadius:4, padding:'2px 7px', textTransform:'uppercase',
              }}>{wf.estado}</span>
            </button>
          ))}
        </div>
      </Secao>

      {/* Lista de runs */}
      {wfSel && (
        <Secao titulo={`Execuções — ${wfSel.nome}`}>
          {loadRuns ? (
            <div style={{ fontSize:12, color:C.muted }}>Carregando execuções...</div>
          ) : runs && runs.length === 0 ? (
            <div style={{ fontSize:12, color:C.muted }}>Nenhuma execução encontrada.</div>
          ) : runs ? (
            <div style={{ display:'grid', gap:6 }}>
              {runs.map(run => {
                const cor = corStatus(run.status, run.conclusao)
                const isAberto = runAberto?.id === run.id
                return (
                  <div key={run.id}>
                    <div style={{
                      background:C.surface, border:`1px solid ${isAberto ? cor : C.border}`,
                      borderRadius:8, padding:'10px 14px',
                      display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10,
                    }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:C.text, display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                          {badgeStatus(run.status, run.conclusao)}
                          <span style={{ wordBreak:'break-word' }}>{run.mensagem || run.nome}</span>
                        </div>
                        <div style={{ fontSize:10, color:C.muted, marginTop:3, display:'flex', gap:8, flexWrap:'wrap' }}>
                          <span>🌿 {run.branch}</span>
                          {run.sha && <span>#{run.sha}</span>}
                          <span>{relTime(run.criadoEm)}</span>
                          {run.duracaoMs > 0 && <span>⏱ {fmtDuracao(run.duracaoMs)}</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        <Btn small onClick={() => isAberto ? fecharRun() : abrirRun(run)}>
                          {isAberto ? 'Fechar' : 'Ver Jobs'}
                        </Btn>
                        <a
                          href={githubService.downloadLogsUrl(run.id, owner, repo)}
                          style={{
                            fontSize:11, fontWeight:600, color:C.text,
                            background:C.surface, border:`1px solid ${C.border}`,
                            borderRadius:6, padding:'4px 10px', textDecoration:'none',
                            whiteSpace:'nowrap',
                          }}
                          title="Baixar todos os logs como ZIP"
                        >⬇ Logs</a>
                      </div>
                    </div>

                    {/* Jobs do run */}
                    {isAberto && (
                      <div style={{ marginLeft:12, marginTop:4, display:'grid', gap:4 }}>
                        {loadJobs ? (
                          <div style={{ fontSize:11, color:C.muted, padding:'8px 0' }}>Carregando jobs...</div>
                        ) : jobs && jobs.map(job => {
                          const jcor = corStatus(job.status, job.conclusao)
                          const logAberto = jobLogAberto === job.id
                          return (
                            <div key={job.id}>
                              <div style={{
                                background:C.bg, border:`1px solid ${logAberto ? jcor : C.border}`,
                                borderRadius:7, padding:'8px 12px',
                                display:'flex', justifyContent:'space-between', alignItems:'center', gap:8,
                              }}>
                                <div>
                                  <div style={{ fontSize:11, fontWeight:700, color:C.text, display:'flex', gap:6, alignItems:'center' }}>
                                    {badgeStatus(job.status, job.conclusao)}
                                    {job.nome}
                                  </div>
                                  {job.fimEm && job.inicioEm && (
                                    <div style={{ fontSize:10, color:C.muted }}>
                                      ⏱ {fmtDuracao(new Date(job.fimEm) - new Date(job.inicioEm))}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display:'flex', gap:6 }}>
                                  <Btn small onClick={() => verLog(job)}>
                                    {logAberto ? '✕ Fechar Log' : '📋 Ver Log'}
                                  </Btn>
                                </div>
                              </div>

                              {/* Visualizador inline de log */}
                              {logAberto && (
                                <div style={{
                                  background:'#0a0a0a', border:`1px solid ${jcor}40`,
                                  borderRadius:'0 0 7px 7px', marginTop:-1,
                                  padding:12, maxHeight:320, overflowY:'auto',
                                  fontFamily:'monospace', fontSize:10, color:'#d4d4d4',
                                  lineHeight:1.6, whiteSpace:'pre-wrap', wordBreak:'break-all',
                                }}>
                                  {loadLog ? (
                                    <span style={{ color:C.muted }}>Carregando log...</span>
                                  ) : logTexto ? (
                                    // Coloriza linhas de erro/sucesso
                                    logTexto.split('\n').map((linha, i) => {
                                      const cor = /error|fail|✗/i.test(linha)
                                        ? '#f87171'
                                        : /success|passed|✓/i.test(linha)
                                          ? '#86efac'
                                          : /warning|warn/i.test(linha)
                                            ? '#fcd34d'
                                            : '#d4d4d4'
                                      return <div key={i} style={{ color:cor }}>{linha || '\u00a0'}</div>
                                    })
                                  ) : (
                                    <span style={{ color:C.muted }}>Log vazio.</span>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {/* ── Artefatos desta Run ── */}
                        {(() => {
                          if (artifactsCache === null) return null   // ainda carregando em background
                          const arts = artifactsCache.filter(a => a.workflowRunId === run.id && !a.expirado)
                          if (arts.length === 0) return null
                          return (
                            <div style={{
                              marginTop:6, background:C.surface,
                              border:`1px solid ${C.border}`,
                              borderRadius:8, padding:'10px 12px',
                            }}>
                              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:.5, marginBottom:8 }}>
                                📦 Artefatos desta execução
                              </div>
                              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                                {arts.map(a => {
                                  const isApk = /apk/i.test(a.nome)
                                  return (
                                    <a
                                      key={a.id}
                                      href={githubService.downloadArtifactUrl(a.id, owner, repo, a.nome)}
                                      style={{
                                        display:'inline-flex', alignItems:'center', gap:6,
                                        fontSize:11, fontWeight:700,
                                        color: isApk ? '#fff' : C.text,
                                        background: isApk ? '#22c55e' : C.surf2,
                                        border: `1px solid ${isApk ? '#22c55e' : C.border}`,
                                        borderRadius:6, padding:'5px 12px',
                                        textDecoration:'none', whiteSpace:'nowrap',
                                      }}
                                      title={`${fmtBytes(a.tamanho)} · criado ${relTime(a.criadoEm)}`}
                                    >
                                      {isApk ? '📱' : '📦'} ⬇ {isApk ? 'Baixar APK' : a.nome}
                                    </a>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : null}
        </Secao>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   CARD DE REPO (lista)
═══════════════════════════════════════════════════════════ */
function RepoCard({ repo, meta, onAbrir }) {
  const statusCfg = STATUS_CFG[meta?.statusInterno]
  return (
    <div
      onClick={() => onAbrir(repo)}
      style={{
        background:C.surface, border:`1px solid ${C.border}`,
        borderRadius:10, padding:'14px 16px',
        display:'flex', flexDirection:'column', gap:10,
        cursor:'pointer', transition:'border-color .15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--adm-accent,#6b7c4e)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
            {meta?.favorito && <span style={{ fontSize:12 }}>⭐</span>}
            <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{repo.nome}</span>
            {meta?.alias && <span style={{ fontSize:10, color:C.muted }}>({meta.alias})</span>}
            {repo.privado && <span style={{ fontSize:9, fontWeight:700, color:'#d97706', background:'#d9770618', border:'1px solid #d9770630', borderRadius:3, padding:'1px 5px', textTransform:'uppercase' }}>privado</span>}
            {repo.arquivado && <span style={{ fontSize:9, fontWeight:700, color:C.muted, background:`${C.muted}18`, borderRadius:3, padding:'1px 5px', textTransform:'uppercase' }}>arquivado</span>}
            {statusCfg && meta?.statusInterno !== 'ativo' && (
              <span style={{ fontSize:9, fontWeight:700, color:statusCfg.cor, background:`${statusCfg.cor}18`, borderRadius:3, padding:'1px 5px', textTransform:'uppercase' }}>{statusCfg.label}</span>
            )}
          </div>
          {repo.descricao && (
            <div style={{ fontSize:11, color:C.muted, marginTop:3, lineHeight:1.4 }}>
              {repo.descricao.length > 90 ? repo.descricao.slice(0, 90) + '…' : repo.descricao}
            </div>
          )}
          {meta?.tags?.length > 0 && (
            <div style={{ display:'flex', gap:4, marginTop:5, flexWrap:'wrap' }}>
              {meta.tags.map(t => (
                <span key={t} style={{ fontSize:9, color:'#a78bfa', background:'#8b5cf610', border:'1px solid #8b5cf620', borderRadius:3, padding:'1px 5px' }}>{t}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ flexShrink:0, color:C.muted, fontSize:10, marginTop:2 }}>›</div>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          <LangBadge lang={repo.linguagem} />
          {repo.temas?.slice(0, 3).map(t => (
            <span key={t} style={{ fontSize:9, color:'#60a5fa', background:'#3b82f610', border:'1px solid #3b82f620', borderRadius:4, padding:'2px 5px', fontWeight:600 }}>{t}</span>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {repo.stars > 0 && <span style={{ fontSize:10, color:C.muted }}>★ {repo.stars}</span>}
          {repo.forks > 0 && <span style={{ fontSize:10, color:C.muted }}>⑂ {repo.forks}</span>}
          {repo.issues > 0 && <span style={{ fontSize:10, color:'#d97706' }}>● {repo.issues}</span>}
          <span style={{ fontSize:10, color:C.muted }}>{relTime(repo.ultimaAtualizacao)}</span>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════════════════════ */
const SORTS = [
  { value:'updated',   label:'Atualização' },
  { value:'created',   label:'Criação'     },
  { value:'full_name', label:'Nome'        },
  { value:'pushed',    label:'Último push' },
]
const FILTRO_STATUS = [
  { value:'todos',     label:'Todos' },
  { value:'favoritos', label:'⭐ Favoritos' },
  { value:'ativo',     label:'Ativos'    },
  { value:'estudo',    label:'Estudo'    },
  { value:'legado',    label:'Legado'    },
  { value:'arquivado', label:'Arquivados' },
]

export default function AdminGitHub() {
  const [sort,        setSort]        = useState('updated')
  const [busca,       setBusca]       = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [repoAberto,  setRepoAberto]  = useState(null)
  const [metas,       setMetas]       = useState({})   // repoId → meta

  const { repos, status, total, loading, erro, recarregar } = useGitHubRepos({ sort })
  const { toast, show: toastShow } = useToast()

  // Carrega metas para todos os repos (não-bloqueante)
  useEffect(() => {
    if (repos.length === 0) return
    repos.forEach(r => {
      githubService.getMeta(r.id)
        .then(m => setMetas(prev => ({ ...prev, [r.id]: m })))
        .catch(() => {})
    })
  }, [repos.length])

  // Filtros locais
  const reposFiltrados = repos.filter(r => {
    const meta = metas[r.id]
    const matchBusca = !busca.trim() ||
      r.nome.toLowerCase().includes(busca.toLowerCase()) ||
      (r.descricao || '').toLowerCase().includes(busca.toLowerCase()) ||
      (meta?.alias || '').toLowerCase().includes(busca.toLowerCase()) ||
      (meta?.tags || []).some(t => t.toLowerCase().includes(busca.toLowerCase()))
    const matchStatus =
      filtroStatus === 'todos' ? true :
      filtroStatus === 'favoritos' ? meta?.favorito :
      (meta?.statusInterno || 'ativo') === filtroStatus
    return matchBusca && matchStatus
  })

  function fecharPainel(recarregarLista = false) {
    setRepoAberto(null)
    if (recarregarLista) recarregar()
  }

  return (
    <div style={{ padding:'20px 24px', maxWidth:900 }}>
      <Toast toast={toast} />

      {/* Cabeçalho */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
            <span style={{ color:'#6b7c4e' }}><AdminIcon name="git" size={18} /></span>
            <h1 style={{ fontSize:18, fontWeight:800, color:C.text, margin:0 }}>GitHub Module</h1>
          </div>
          {status?.ok ? (
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              {status.avatar && <img src={status.avatar} alt={status.login} style={{ width:20, height:20, borderRadius:'50%', border:`1px solid ${C.border}` }} />}
              <span style={{ fontSize:12, color:C.muted }}>{status.nome || status.login}{status.empresa && ` · ${status.empresa}`}</span>
              <span style={{ fontSize:9, fontWeight:700, color:'#22c55e', background:'#22c55e18', borderRadius:3, padding:'1px 5px' }}>conectado</span>
            </div>
          ) : (
            <span style={{ fontSize:12, color:C.muted }}>Repositórios via proxy seguro</span>
          )}
        </div>
        <button onClick={recarregar} disabled={loading} style={{
          display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600,
          color:C.text, background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:7, padding:'7px 12px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? .6 : 1,
        }}>
          <AdminIcon name="refresh" size={12} /> Atualizar
        </button>
      </div>

      {/* Filtros */}
      {!erro && !loading && (
        <div style={{ marginBottom:14, display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <input
              value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, descrição, alias, tag..."
              style={{ flex:'1 1 200px', background:C.surface, border:`1px solid ${C.border}`, borderRadius:7, padding:'7px 12px', fontSize:12, color:C.text, outline:'none' }}
            />
            <select value={sort} onChange={e => setSort(e.target.value)} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:7, padding:'7px 10px', fontSize:12, color:C.text, cursor:'pointer' }}>
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center' }}>
            {FILTRO_STATUS.map(f => (
              <button key={f.value} onClick={() => setFiltroStatus(f.value)} style={{
                fontSize:11, fontWeight:600, padding:'4px 10px', borderRadius:6,
                border:`1px solid ${filtroStatus === f.value ? 'var(--adm-accent,#6b7c4e)' : C.border}`,
                background: filtroStatus === f.value ? 'var(--adm-accent,#6b7c4e)18' : C.surface,
                color: filtroStatus === f.value ? C.text : C.muted, cursor:'pointer',
              }}>{f.label}</button>
            ))}
            <span style={{ fontSize:11, color:C.muted, marginLeft:'auto' }}>{reposFiltrados.length}/{total} repos</span>
          </div>
        </div>
      )}

      {/* Lista */}
      {erro ? (
        <div style={{ background:`${C.amber}10`, border:`1px solid ${C.amber}30`, borderRadius:10, padding:'20px 24px', textAlign:'center' }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.amber, marginBottom:8 }}>
            {erro.includes('GITHUB_TOKEN') ? 'Token GitHub não configurado' : 'Erro ao carregar repositórios'}
          </div>
          <div style={{ fontSize:12, color:C.muted, marginBottom:14 }}>
            {erro.includes('GITHUB_TOKEN') ? 'Adicione GITHUB_TOKEN no .env do backend.' : erro}
          </div>
          {!erro.includes('GITHUB_TOKEN') && (
            <button onClick={recarregar} style={{ fontSize:12, fontWeight:600, color:C.text, background:C.surf2, border:`1px solid ${C.border}`, borderRadius:7, padding:'7px 16px', cursor:'pointer' }}>
              Tentar novamente
            </button>
          )}
        </div>
      ) : loading ? (
        <Skeleton />
      ) : reposFiltrados.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 20px', color:C.muted, fontSize:13 }}>
          {busca || filtroStatus !== 'todos' ? 'Nenhum repositório para esses filtros.' : 'Nenhum repositório disponível.'}
        </div>
      ) : (
        <div style={{ display:'grid', gap:10 }}>
          {reposFiltrados.map(repo => (
            <RepoCard key={repo.id} repo={repo} meta={metas[repo.id]} onAbrir={setRepoAberto} />
          ))}
        </div>
      )}

      {/* Painel lateral de detalhes */}
      {repoAberto && (
        <PainelDetalhes
          repo={repoAberto}
          onFechar={fecharPainel}
          toastShow={toastShow}
        />
      )}
    </div>
  )
}
