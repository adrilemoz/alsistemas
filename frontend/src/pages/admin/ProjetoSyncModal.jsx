/**
 * ProjetoSyncModal.jsx — Modal de Sincronização GitHub para Projetos Locais
 *
 * Sprint 7 — ADIÇÃO PURA.
 *
 * Funcionalidades:
 *   • Exibe status de sincronização do projeto com GitHub
 *   • Permite vincular o projeto a um repositório GitHub (busca na lista de repos)
 *   • Executa pull (download + extração do zipball) para sincronizar
 *   • Permite desvincular o repositório
 *
 * Props:
 *   projeto   {object}   — objeto do projeto local (nome, status, tecnologias…)
 *   onClose   {Function} — fecha o modal
 *   onSynced  {Function} — callback após sync bem-sucedido (para recarregar lista)
 */
import { useState, useEffect, useMemo } from 'react'
import { T as C }                        from '../../themes/tokens'
import AdminIcon                         from '../../components/admin/ui/AdminIcon'
import { useProjetosSync }               from '../../modules/projetos/useProjetosSync.js'
import { githubService }                 from '../../services/domains/github.js'

/* ── Helpers ────────────────────────────────────────────────── */

function relTime(iso) {
  if (!iso) return '—'
  const diff = Date.now() - new Date(iso).getTime()
  const d    = Math.floor(diff / 86_400_000)
  if (d < 1)   return 'hoje'
  if (d < 7)   return `${d}d atrás`
  if (d < 30)  return `${Math.floor(d / 7)}sem atrás`
  if (d < 365) return `${Math.floor(d / 30)}mo atrás`
  return `${Math.floor(d / 365)}a atrás`
}

/* ── Badge de status de sync ────────────────────────────────── */
const SYNC_META = {
  atualizado:   { label: 'Em sincronia',  cor: '#22c55e', icon: 'check'   },
  desatualizado:{ label: 'Desatualizado', cor: '#f59e0b', icon: 'alert'   },
  desconhecido: { label: 'Desconhecido',  cor: '#64748b', icon: 'info'    },
}

function SyncBadge({ statusSync }) {
  const meta = SYNC_META[statusSync] || SYNC_META.desconhecido
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      fontSize:10, fontWeight:700, color: meta.cor,
      background:`${meta.cor}18`, border:`1px solid ${meta.cor}30`,
      borderRadius:20, padding:'3px 10px',
    }}>
      <AdminIcon name={meta.icon} size={10} />
      {meta.label}
    </span>
  )
}

/* ── Linha de info ──────────────────────────────────────────── */
function InfoRow({ label, value }) {
  return (
    <div style={{ display:'flex', gap:8, alignItems:'baseline' }}>
      <span style={{ fontSize:11, color:C.muted, flexShrink:0, width:120 }}>{label}</span>
      <span style={{ fontSize:11, color:C.text }}>{value || '—'}</span>
    </div>
  )
}

/* ── Item de repositório na lista de busca ──────────────────── */
function RepoItem({ repo, selecionado, onSelect }) {
  const ativo = selecionado?.nomeCompleto === repo.nomeCompleto
  return (
    <button
      onClick={() => onSelect(repo)}
      style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        width:'100%', background: ativo ? `${C.blue}18` : 'none',
        border:`1px solid ${ativo ? C.blue : C.border}`,
        borderRadius:7, padding:'8px 12px', cursor:'pointer',
        textAlign:'left', transition:'all .15s',
      }}
    >
      <div>
        <div style={{ fontSize:12, fontWeight:600, color: ativo ? C.blue : C.text }}>
          {repo.nomeCompleto}
        </div>
        {repo.descricao && (
          <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>
            {repo.descricao.slice(0, 80)}{repo.descricao.length > 80 ? '…' : ''}
          </div>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0, marginLeft:10 }}>
        {repo.linguagem && (
          <span style={{ fontSize:10, color:C.muted }}>{repo.linguagem}</span>
        )}
        {ativo && <AdminIcon name="check" size={12} style={{ color:C.blue }} />}
      </div>
    </button>
  )
}

/* ══════════════════════════════════════════════════════════════
   Componente principal
══════════════════════════════════════════════════════════════ */
export default function ProjetoSyncModal({ projeto, onClose, onSynced }) {
  const {
    syncStatus, loadingSync, erroSync, carregarStatus,
    vincular, desvincular, loadingLink, erroLink,
    sincronizar, loadingPull, erroPull, pullOk,
  } = useProjetosSync(projeto.nome)

  // ── Lista de repos GitHub para vincular ───────────────────
  const [repos,         setRepos]         = useState([])
  const [loadingRepos,  setLoadingRepos]  = useState(false)
  const [erroRepos,     setErroRepos]     = useState(null)
  const [busca,         setBusca]         = useState('')
  const [repoSelecionado, setRepoSelecionado] = useState(null)

  // ── Tela: 'status' | 'vincular' ───────────────────────────
  const [tela, setTela] = useState('status')

  // ── Confirmação de desvincular ─────────────────────────────
  const [confirmarDesv, setConfirmarDesv] = useState(false)

  /* Carrega status ao abrir */
  useEffect(() => { carregarStatus() }, [carregarStatus])

  /* Carrega repos ao entrar na tela de vincular */
  useEffect(() => {
    if (tela !== 'vincular') return
    setLoadingRepos(true)
    setErroRepos(null)
    githubService.repos({ per_page: 100, sort: 'updated' })
      .then(data => setRepos(data.repos || []))
      .catch(e   => setErroRepos(e.message || 'Erro ao carregar repositórios'))
      .finally(() => setLoadingRepos(false))
  }, [tela])

  /* Filtro local de repos por busca */
  const reposFiltrados = useMemo(() => {
    if (!busca.trim()) return repos
    const q = busca.toLowerCase()
    return repos.filter(r =>
      r.nomeCompleto.toLowerCase().includes(q) ||
      (r.descricao || '').toLowerCase().includes(q)
    )
  }, [repos, busca])

  /* ── Handlers ─────────────────────────────────────────────── */

  async function handleVincular() {
    if (!repoSelecionado) return
    const [owner, repo] = repoSelecionado.nomeCompleto.split('/')
    const ok = await vincular(owner, repo)
    if (ok) setTela('status')
  }

  async function handleSincronizar() {
    const ok = await sincronizar()
    if (ok && onSynced) onSynced()
  }

  async function handleDesvincular() {
    await desvincular()
    setConfirmarDesv(false)
  }

  /* ── Overlay e container ──────────────────────────────────── */
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position:'fixed', inset:0, zIndex:9999,
        background:'rgba(0,0,0,.65)', backdropFilter:'blur(4px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:'20px',
      }}
    >
      <div style={{
        background:C.surface, border:`1px solid ${C.border}`,
        borderRadius:14, width:'100%', maxWidth:560,
        maxHeight:'90vh', display:'flex', flexDirection:'column',
        overflow:'hidden',
      }}>

        {/* ── Cabeçalho ─────────────────────────────────────── */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 20px', borderBottom:`1px solid ${C.border}`, flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* Ícone GitHub (SVG inline) */}
            <svg width={18} height={18} viewBox="0 0 24 24" fill={C.text}>
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:C.text }}>
                {tela === 'vincular' ? 'Vincular ao GitHub' : 'Sincronização GitHub'}
              </div>
              <div style={{ fontSize:11, color:C.muted }}>{projeto.nome}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background:'none', border:'none', cursor:'pointer',
              color:C.muted, padding:4, borderRadius:4,
            }}
          >
            <AdminIcon name="x" size={16} />
          </button>
        </div>

        {/* ── Corpo ─────────────────────────────────────────── */}
        <div style={{ overflowY:'auto', flex:1, padding:'20px' }}>

          {/* ══ TELA: STATUS ══════════════════════════════════ */}
          {tela === 'status' && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

              {/* Carregando status */}
              {loadingSync && (
                <div style={{ textAlign:'center', padding:'30px 0', color:C.muted, fontSize:12 }}>
                  <AdminIcon name="spinSm" size={16} />
                  <span style={{ marginLeft:8 }}>Verificando status…</span>
                </div>
              )}

              {/* Erro ao carregar status */}
              {erroSync && !loadingSync && (
                <div style={{
                  background:`${C.red}10`, border:`1px solid ${C.red}30`,
                  borderRadius:8, padding:'12px 14px', fontSize:12, color:C.red,
                }}>
                  {erroSync}
                  <button
                    onClick={carregarStatus}
                    style={{ marginLeft:12, fontSize:11, color:C.blue, background:'none', border:'none', cursor:'pointer' }}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {/* Não vinculado */}
              {!loadingSync && syncStatus && !syncStatus.vinculado && (
                <div style={{
                  textAlign:'center', padding:'30px 20px',
                  background:C.surf2, borderRadius:10, border:`1px solid ${C.border}`,
                }}>
                  <div style={{ color:C.muted, marginBottom:12 }}>
                    <svg width={32} height={32} viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22"/>
                    </svg>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:6 }}>
                    Sem repositório vinculado
                  </div>
                  <div style={{ fontSize:11, color:C.muted, marginBottom:16 }}>
                    Vincule este projeto a um repositório GitHub para habilitar a sincronização.
                  </div>
                  <button
                    onClick={() => setTela('vincular')}
                    style={{
                      display:'inline-flex', alignItems:'center', gap:6,
                      fontSize:12, fontWeight:600, color:'#fff',
                      background:C.blue, border:'none', borderRadius:7,
                      padding:'8px 16px', cursor:'pointer',
                    }}
                  >
                    <AdminIcon name="plus" size={12} />
                    Vincular repositório
                  </button>
                </div>
              )}

              {/* Vinculado — exibe status */}
              {!loadingSync && syncStatus?.vinculado && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

                  {/* Card do repositório */}
                  <div style={{
                    background:C.surf2, borderRadius:10, border:`1px solid ${C.border}`,
                    padding:'14px 16px',
                  }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <svg width={14} height={14} viewBox="0 0 24 24" fill={C.text}>
                          <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                        </svg>
                        <a
                          href={syncStatus.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize:13, fontWeight:700, color:C.blue, textDecoration:'none' }}
                        >
                          {syncStatus.nomeCompleto || `${syncStatus.owner}/${syncStatus.repo}`}
                        </a>
                      </div>
                      {syncStatus.statusSync && (
                        <SyncBadge statusSync={syncStatus.statusSync} />
                      )}
                    </div>

                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <InfoRow label="Branch padrão"    value={syncStatus.branch} />
                      <InfoRow label="Último push"      value={syncStatus.dataPushGitHub ? relTime(syncStatus.dataPushGitHub) : '—'} />
                      <InfoRow label="Local modificado" value={syncStatus.dataLocalModificacao ? relTime(syncStatus.dataLocalModificacao) : '—'} />
                      <InfoRow label="Última sync"      value={syncStatus.ultimaSincronizacao ? relTime(syncStatus.ultimaSincronizacao) : 'Nunca'} />
                      {syncStatus.vinculadoEm && (
                        <InfoRow label="Vinculado"      value={relTime(syncStatus.vinculadoEm)} />
                      )}
                    </div>
                  </div>

                  {/* Mensagem de erro do GitHub */}
                  {syncStatus.erro && (
                    <div style={{
                      background:`${C.amber}10`, border:`1px solid ${C.amber}30`,
                      borderRadius:8, padding:'10px 12px', fontSize:11, color:C.amber,
                    }}>
                      ⚠ Não foi possível verificar o GitHub: {syncStatus.erro}
                    </div>
                  )}

                  {/* Aviso de desatualizado */}
                  {syncStatus.statusSync === 'desatualizado' && !syncStatus.erro && (
                    <div style={{
                      background:`${C.amber}10`, border:`1px solid ${C.amber}30`,
                      borderRadius:8, padding:'10px 12px', fontSize:11, color:C.amber,
                    }}>
                      O repositório no GitHub possui commits mais recentes que o projeto local.
                      Clique em <strong>Sincronizar agora</strong> para atualizar.
                    </div>
                  )}

                  {/* Sucesso após pull */}
                  {pullOk && (
                    <div style={{
                      background:`#22c55e10`, border:`1px solid #22c55e30`,
                      borderRadius:8, padding:'10px 12px', fontSize:11, color:'#22c55e',
                      display:'flex', alignItems:'center', gap:6,
                    }}>
                      <AdminIcon name="check" size={12} />
                      Projeto sincronizado com sucesso!
                    </div>
                  )}

                  {/* Erro do pull */}
                  {erroPull && (
                    <div style={{
                      background:`${C.red}10`, border:`1px solid ${C.red}30`,
                      borderRadius:8, padding:'10px 12px', fontSize:11, color:C.red,
                    }}>
                      {erroPull}
                    </div>
                  )}

                  {/* Ações */}
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {/* Sincronizar (pull) */}
                    <button
                      onClick={handleSincronizar}
                      disabled={loadingPull}
                      style={{
                        display:'flex', alignItems:'center', gap:6, flex:1,
                        justifyContent:'center',
                        fontSize:12, fontWeight:600, color:'#fff',
                        background: loadingPull ? C.surf2 : C.blue,
                        border:`1px solid ${loadingPull ? C.border : C.blue}`,
                        borderRadius:7, padding:'9px 14px',
                        cursor: loadingPull ? 'not-allowed' : 'pointer',
                        opacity: loadingPull ? .7 : 1,
                      }}
                    >
                      {loadingPull
                        ? <><AdminIcon name="spinSm" size={13} /> Sincronizando…</>
                        : <><AdminIcon name="cloudUp" size={13} /> Sincronizar agora</>
                      }
                    </button>

                    {/* Trocar repositório */}
                    <button
                      onClick={() => setTela('vincular')}
                      style={{
                        display:'flex', alignItems:'center', gap:6,
                        fontSize:12, fontWeight:600, color:C.text,
                        background:C.surf2, border:`1px solid ${C.border}`,
                        borderRadius:7, padding:'9px 14px', cursor:'pointer',
                      }}
                    >
                      <AdminIcon name="refresh" size={12} />
                      Trocar
                    </button>

                    {/* Atualizar status */}
                    <button
                      onClick={carregarStatus}
                      disabled={loadingSync}
                      title="Atualizar status"
                      style={{
                        display:'flex', alignItems:'center', gap:4,
                        fontSize:12, fontWeight:600, color:C.muted,
                        background:'none', border:`1px solid ${C.border}`,
                        borderRadius:7, padding:'9px 10px', cursor:'pointer',
                      }}
                    >
                      <AdminIcon name={loadingSync ? 'spinSm' : 'refresh'} size={12} />
                    </button>
                  </div>

                  {/* Desvincular */}
                  {!confirmarDesv ? (
                    <button
                      onClick={() => setConfirmarDesv(true)}
                      style={{
                        background:'none', border:'none', cursor:'pointer',
                        fontSize:11, color:C.muted, textAlign:'left',
                        textDecoration:'underline', padding:'2px 0',
                      }}
                    >
                      Desvincular repositório
                    </button>
                  ) : (
                    <div style={{
                      background:`${C.red}08`, border:`1px solid ${C.red}25`,
                      borderRadius:8, padding:'10px 12px',
                      display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
                    }}>
                      <span style={{ fontSize:11, color:C.text }}>
                        Remover vínculo com <strong>{syncStatus.nomeCompleto}</strong>?
                      </span>
                      <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                        <button
                          onClick={() => setConfirmarDesv(false)}
                          style={{
                            fontSize:11, color:C.muted, background:'none',
                            border:`1px solid ${C.border}`, borderRadius:5,
                            padding:'4px 10px', cursor:'pointer',
                          }}
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleDesvincular}
                          disabled={loadingLink}
                          style={{
                            fontSize:11, fontWeight:600, color:'#fff',
                            background:C.red, border:'none',
                            borderRadius:5, padding:'4px 10px', cursor:'pointer',
                          }}
                        >
                          {loadingLink ? 'Removendo…' : 'Remover'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══ TELA: VINCULAR ════════════════════════════════ */}
          {tela === 'vincular' && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ fontSize:12, color:C.muted }}>
                Selecione o repositório GitHub que corresponde ao projeto{' '}
                <strong style={{ color:C.text }}>{projeto.nome}</strong>.
              </div>

              {/* Campo de busca */}
              <input
                type="text"
                placeholder="Buscar repositório…"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                style={{
                  width:'100%', boxSizing:'border-box',
                  background:C.surf2, border:`1px solid ${C.border}`,
                  borderRadius:7, padding:'8px 12px',
                  fontSize:12, color:C.text, outline:'none',
                }}
              />

              {/* Lista de repos */}
              <div style={{
                display:'flex', flexDirection:'column', gap:6,
                maxHeight:300, overflowY:'auto',
              }}>
                {loadingRepos && (
                  <div style={{ textAlign:'center', padding:'20px', color:C.muted, fontSize:12 }}>
                    <AdminIcon name="spinSm" size={14} /> Carregando repositórios…
                  </div>
                )}
                {erroRepos && !loadingRepos && (
                  <div style={{ fontSize:12, color:C.red, padding:'10px 0' }}>
                    {erroRepos}
                  </div>
                )}
                {!loadingRepos && !erroRepos && reposFiltrados.length === 0 && (
                  <div style={{ fontSize:12, color:C.muted, padding:'10px 0' }}>
                    Nenhum repositório encontrado.
                  </div>
                )}
                {!loadingRepos && reposFiltrados.map(r => (
                  <RepoItem
                    key={r.nomeCompleto}
                    repo={r}
                    selecionado={repoSelecionado}
                    onSelect={setRepoSelecionado}
                  />
                ))}
              </div>

              {/* Erro de vinculação */}
              {erroLink && (
                <div style={{
                  background:`${C.red}10`, border:`1px solid ${C.red}30`,
                  borderRadius:8, padding:'10px 12px', fontSize:11, color:C.red,
                }}>
                  {erroLink}
                </div>
              )}

              {/* Ações */}
              <div style={{ display:'flex', gap:8 }}>
                <button
                  onClick={() => setTela('status')}
                  style={{
                    fontSize:12, fontWeight:600, color:C.text,
                    background:C.surf2, border:`1px solid ${C.border}`,
                    borderRadius:7, padding:'9px 14px', cursor:'pointer',
                  }}
                >
                  Voltar
                </button>
                <button
                  onClick={handleVincular}
                  disabled={!repoSelecionado || loadingLink}
                  style={{
                    flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    fontSize:12, fontWeight:600, color:'#fff',
                    background: !repoSelecionado || loadingLink ? C.surf2 : C.blue,
                    border:`1px solid ${!repoSelecionado || loadingLink ? C.border : C.blue}`,
                    borderRadius:7, padding:'9px 14px',
                    cursor: !repoSelecionado || loadingLink ? 'not-allowed' : 'pointer',
                    opacity: !repoSelecionado ? .6 : 1,
                  }}
                >
                  {loadingLink
                    ? <><AdminIcon name="spinSm" size={13} /> Vinculando…</>
                    : <><AdminIcon name="save" size={13} /> Confirmar vínculo</>
                  }
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
