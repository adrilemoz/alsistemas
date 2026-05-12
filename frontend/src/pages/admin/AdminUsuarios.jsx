/**
 * AdminUsuarios.jsx — Usuários & Perfis de Acesso
 *
 * MIGRADO: DS Sprint
 *   - Badge local          → DSBadge com estilo dinâmico por cor
 *   - ModalUsuario inline  → DSModal
 *   - ModalPerfil inline   → DSModal
 *   - Modal excluir inline → DSModal (DSBtn variant="danger")
 *   - Status ativo/inativo → DSBadge variant="green"/"red"
 *   - Perfil badge inline  → DSBadge com cor dinâmica do perfil
 *   - Cores hex hardcoded  → tokens T.*
 *   - Espaçamentos         → SPACE.* e RADIUS.*
 *   - Abas                 → mantidas (já usam adm-tab-btn corretamente)
 */
import { useState } from 'react'
import { usuariosService } from '../../services/api'
import toast from 'react-hot-toast'
import { GRUPOS_PERMISSOES } from '../../utils/permissions'
import ForcaSenha from '../../components/admin/ui/ForcaSenha'
import AdminIcon from '../../components/admin/ui/AdminIcon'
import { useUsuarios } from '../../hooks/useUsuarios'
import { T as C, SPACE, RADIUS, FONT } from '../../themes/tokens'
import { DSModal, DSBtn, DSBadge } from '../../components/admin/ui/DS'

function IconeOlho({ aberto }) {
  return <AdminIcon name={aberto ? 'eye' : 'eyeOff'} size={15} />
}

function RegrasSenha({ senha }) {
  if (!senha) return null
  const regras = [
    { ok: senha.length >= 8,              texto: 'Mínimo 8 caracteres' },
    { ok: /[a-zA-Z]/.test(senha),         texto: 'Pelo menos uma letra' },
    { ok: /[0-9]/.test(senha),            texto: 'Pelo menos um número' },
    { ok: /[^a-zA-Z0-9]/.test(senha),     texto: 'Pelo menos um símbolo (!@#…)' },
  ]
  return (
    <div style={{ marginTop: SPACE.sm, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {regras.map(r => (
        <span key={r.texto} style={{ fontSize: FONT.sm, display: 'flex', alignItems: 'center', gap: SPACE.xs + 1, color: r.ok ? 'var(--adm-accent)' : 'var(--adm-muted)' }}>
          {r.ok
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11"><circle cx="12" cy="12" r="9"/></svg>
          }
          {r.texto}
        </span>
      ))}
    </div>
  )
}

// ── Modal de Usuário ─────────────────────────────────────────────
function ModalUsuario({ usuario, perfis, onSalvar, onFechar }) {
  const editando = !!(usuario?.id || usuario?._id)
  const perfilIdInicial = usuario?.perfil_id?._id?.toString()
    || usuario?.perfil_id?.id
    || (typeof usuario?.perfil_id === 'string' ? usuario.perfil_id : '')

  const [form, setForm] = useState({
    nome:         usuario?.nome         || '',
    email:        usuario?.email        || '',
    senha:        '',
    confirmSenha: '',
    perfil_id:    perfilIdInicial,
    ativo:        usuario?.ativo ?? true,
  })
  const [loading,        setLoading]        = useState(false)
  const [mostrarSenha,   setMostrarSenha]   = useState(false)
  const [mostrarConfirm, setMostrarConfirm] = useState(false)

  const senhasIguais   = form.senha && form.senha === form.confirmSenha
  const senhasDiferentes = form.confirmSenha && form.senha !== form.confirmSenha

  async function handleSalvar(e) {
    e.preventDefault()
    if (!form.nome.trim() || !form.email.trim()) { toast.error('Nome e email são obrigatórios'); return }
    if (!editando && !form.senha) { toast.error('Senha é obrigatória'); return }
    if (form.senha && form.senha !== form.confirmSenha) { toast.error('As senhas não coincidem'); return }
    setLoading(true)
    try {
      const dados = { nome: form.nome, email: form.email, perfil_id: form.perfil_id || null, ativo: form.ativo }
      if (form.senha) dados.senha = form.senha
      if (editando) {
        const r = await usuariosService.editar(usuario.id || usuario._id, dados)
        toast.success('Usuário atualizado!'); onSalvar(r.usuario)
      } else {
        const r = await usuariosService.criar(dados)
        toast.success('Usuário criado!'); onSalvar(r.usuario)
      }
      onFechar()
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  return (
    <DSModal open onClose={onFechar} title={editando ? 'Editar Usuário' : 'Novo Usuário'} size="sm"
      footer={
        <>
          <DSBtn variant="primary" type="submit" loading={loading} onClick={handleSalvar}>
            {editando ? 'Salvar alterações' : 'Criar usuário'}
          </DSBtn>
          <DSBtn onClick={onFechar} disabled={loading}>Cancelar</DSBtn>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
        <div>
          <label style={{ fontSize: FONT.base, fontWeight: 600, color: 'var(--adm-muted)', display: 'block', marginBottom: SPACE.xs + 1 }}>Nome completo</label>
          <input className="adm-input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex.: João da Silva" />
        </div>
        <div>
          <label style={{ fontSize: FONT.base, fontWeight: 600, color: 'var(--adm-muted)', display: 'block', marginBottom: SPACE.xs + 1 }}>Email</label>
          <input className="adm-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
        </div>
        <div>
          <label style={{ fontSize: FONT.base, fontWeight: 600, color: 'var(--adm-muted)', display: 'block', marginBottom: SPACE.xs + 1 }}>
            {editando ? 'Nova senha (deixe vazio para manter)' : 'Senha'}
          </label>
          <div style={{ position: 'relative' }}>
            <input className="adm-input" type={mostrarSenha ? 'text' : 'password'} value={form.senha}
              onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
              placeholder="Mínimo 8 caracteres, letras, números e símbolo"
              style={{ paddingRight: 38 }} />
            <button type="button" onClick={() => setMostrarSenha(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-muted)', padding: 0, display: 'flex' }}>
              <IconeOlho aberto={mostrarSenha} />
            </button>
          </div>
          {form.senha && <ForcaSenha senha={form.senha} />}
          {form.senha && <RegrasSenha senha={form.senha} />}
        </div>
        <div>
          <label style={{ fontSize: FONT.base, fontWeight: 600, color: 'var(--adm-muted)', display: 'block', marginBottom: SPACE.xs + 1 }}>
            Confirmar senha {!editando && <span style={{ color: 'var(--adm-muted)' }}>*</span>}
          </label>
          <div style={{ position: 'relative' }}>
            <input className="adm-input" type={mostrarConfirm ? 'text' : 'password'} value={form.confirmSenha}
              onChange={e => setForm(f => ({ ...f, confirmSenha: e.target.value }))}
              placeholder="Repita a senha acima"
              style={{ paddingRight: 38, borderColor: senhasIguais ? 'var(--adm-accent)' : senhasDiferentes ? C.red : undefined, transition: 'border-color .2s' }} />
            <button type="button" onClick={() => setMostrarConfirm(v => !v)}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-muted)', padding: 0, display: 'flex' }}>
              <IconeOlho aberto={mostrarConfirm} />
            </button>
          </div>
          {form.confirmSenha && (
            <span style={{ fontSize: FONT.sm, marginTop: SPACE.xs, display: 'flex', alignItems: 'center', gap: SPACE.xs + 1, color: senhasIguais ? 'var(--adm-accent)' : C.red, fontWeight: 600 }}>
              {senhasIguais
                ? <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg> Senhas conferem</>
                : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="11" height="11"><path d="M18 6L6 18M6 6l12 12"/></svg> Senhas não conferem</>
              }
            </span>
          )}
        </div>
        <div>
          <label style={{ fontSize: FONT.base, fontWeight: 600, color: 'var(--adm-muted)', display: 'block', marginBottom: SPACE.xs + 1 }}>Perfil de acesso</label>
          <select className="adm-input" value={form.perfil_id} onChange={e => setForm(f => ({ ...f, perfil_id: e.target.value }))}>
            <option value="">Sem perfil definido</option>
            {perfis.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.nome}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md + 2 }}>
          <input type="checkbox" id="ativo" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
          <label htmlFor="ativo" style={{ fontSize: FONT.md, color: 'var(--adm-text)', cursor: 'pointer' }}>Usuário ativo</label>
        </div>
      </div>
    </DSModal>
  )
}

// ── Modal de Perfil ──────────────────────────────────────────────
function ModalPerfil({ perfil, onSalvar, onFechar }) {
  const editando = !!perfil?.id
  const [form, setForm] = useState({
    nome:       perfil?.nome       || '',
    descricao:  perfil?.descricao  || '',
    permissoes: perfil?.permissoes || [],
    cor:        perfil?.cor        || '#6366f1',
  })
  const [loading, setLoading] = useState(false)
  const isSistema  = perfil?.sistema
  const eSuperadmin = form.permissoes.includes('*')

  function togglePerm(id) {
    setForm(f => ({ ...f, permissoes: f.permissoes.includes(id) ? f.permissoes.filter(p => p !== id) : [...f.permissoes, id] }))
  }
  function toggleGrupo(perms) {
    const ids  = perms.map(p => p.id)
    const todos = ids.every(id => form.permissoes.includes(id))
    setForm(f => ({ ...f, permissoes: todos ? f.permissoes.filter(p => !ids.includes(p)) : [...new Set([...f.permissoes, ...ids])] }))
  }

  async function handleSalvar(e) {
    e.preventDefault()
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return }
    setLoading(true)
    try {
      if (editando) { const r = await usuariosService.editarPerfil(perfil.id, form); toast.success('Perfil atualizado!'); onSalvar(r.perfil) }
      else          { const r = await usuariosService.criarPerfil(form);            toast.success('Perfil criado!');    onSalvar(r.perfil) }
      onFechar()
    } catch (err) { toast.error(err.message) }
    finally { setLoading(false) }
  }

  return (
    <DSModal open onClose={onFechar} title={editando ? 'Editar Perfil' : 'Novo Perfil'} size="md"
      footer={
        <>
          <DSBtn variant="primary" onClick={handleSalvar} loading={loading}>
            {editando ? 'Salvar' : 'Criar perfil'}
          </DSBtn>
          <DSBtn onClick={onFechar} disabled={loading}>Cancelar</DSBtn>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: SPACE.md + 2, marginBottom: SPACE.lg }}>
        <div>
          <label style={{ fontSize: FONT.base, fontWeight: 600, color: 'var(--adm-muted)', display: 'block', marginBottom: SPACE.xs + 1 }}>Nome do perfil</label>
          <input className="adm-input" value={form.nome} disabled={isSistema && editando}
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Ex.: Jornalista" />
        </div>
        <div>
          <label style={{ fontSize: FONT.base, fontWeight: 600, color: 'var(--adm-muted)', display: 'block', marginBottom: SPACE.xs + 1 }}>Cor</label>
          <input type="color" value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))}
            style={{ width: 46, height: 38, borderRadius: RADIUS.md, border: '1px solid var(--adm-border)', cursor: 'pointer', padding: 3 }} />
        </div>
      </div>
      <div style={{ marginBottom: SPACE.xl }}>
        <label style={{ fontSize: FONT.base, fontWeight: 600, color: 'var(--adm-muted)', display: 'block', marginBottom: SPACE.xs + 1 }}>Descrição</label>
        <input className="adm-input" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o nível de acesso" />
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.md + 2 }}>
          <label style={{ fontSize: FONT.base, fontWeight: 600, color: 'var(--adm-muted)' }}>Permissões</label>
          {!isSistema && (
            <div style={{ display: 'flex', gap: SPACE.md, alignItems: 'center' }}>
              <input type="checkbox" id="super" checked={eSuperadmin} onChange={e => setForm(f => ({ ...f, permissoes: e.target.checked ? ['*'] : [] }))} />
              <label htmlFor="super" style={{ fontSize: FONT.base, color: 'var(--adm-text)', cursor: 'pointer' }}>Superadmin (acesso total)</label>
            </div>
          )}
        </div>
        {isSistema ? (
          <div style={{ fontSize: FONT.base, color: 'var(--adm-muted)', background: 'var(--adm-surface2)', borderRadius: RADIUS.md, padding: SPACE.md + 2 }}>
            Perfil do sistema — permissões não editáveis.
          </div>
        ) : !eSuperadmin ? (
          <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--adm-border)', borderRadius: RADIUS.lg, padding: SPACE.md }}>
            {GRUPOS_PERMISSOES.map(({ grupo, perms }) => {
              const todosAtivos = perms.every(p => form.permissoes.includes(p.id))
              return (
                <div key={grupo} style={{ marginBottom: SPACE.md + 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.xs }}>
                    <input type="checkbox" checked={todosAtivos} onChange={() => toggleGrupo(perms)} />
                    <span style={{ fontSize: FONT.sm, fontWeight: 700, color: 'var(--adm-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{grupo}</span>
                  </div>
                  <div style={{ paddingLeft: SPACE.xl2, display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
                    {perms.map(p => (
                      <label key={p.id} style={{ display: 'flex', gap: SPACE.md, alignItems: 'center', fontSize: FONT.base, color: 'var(--adm-text)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.permissoes.includes(p.id)} onChange={() => togglePerm(p.id)} />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ fontSize: FONT.base, color: C.muted, background: C.redBg, border: `1px solid ${C.redBorder}`, borderRadius: RADIUS.md, padding: SPACE.md + 2 }}>
            ⚡ Acesso total a todas as funcionalidades do sistema.
          </div>
        )}
      </div>
    </DSModal>
  )
}

// ── Componente principal ─────────────────────────────────────────
export default function AdminUsuarios() {
  const {
    aba, setAba,
    perfis, loading,
    busca, setBusca,
    usuariosFiltrados,
    excluirUsuario,
    excluirPerfil,
    onSalvarUsuario,
    onSalvarPerfil,
    usuarios,
  } = useUsuarios()

  const [modalUsr,  setModalUsr]  = useState(null)
  const [modalPrf,  setModalPrf]  = useState(null)
  const [excluindo, setExcluindo] = useState(null)

  async function handleExcluir() {
    if (excluindo.tipo === 'usuario') await excluirUsuario(excluindo.id)
    else await excluirPerfil(excluindo.id)
    setExcluindo(null)
  }

  return (
    <div className="adm-page">
      {/* Modais */}
      {modalUsr && (
        <ModalUsuario
          usuario={modalUsr === 'novo' ? null : modalUsr}
          perfis={perfis}
          onSalvar={onSalvarUsuario}
          onFechar={() => setModalUsr(null)}
        />
      )}
      {modalPrf && (
        <ModalPerfil
          perfil={modalPrf === 'novo' ? null : modalPrf}
          onSalvar={onSalvarPerfil}
          onFechar={() => setModalPrf(null)}
        />
      )}

      {/* Modal de exclusão */}
      <DSModal
        open={!!excluindo}
        onClose={() => setExcluindo(null)}
        title="Confirmar exclusão"
        size="sm"
        footer={
          <>
            <DSBtn variant="danger" onClick={handleExcluir}>Excluir</DSBtn>
            <DSBtn onClick={() => setExcluindo(null)}>Cancelar</DSBtn>
          </>
        }
      >
        <p style={{ fontSize: FONT.md, color: C.muted }}>Esta ação não pode ser desfeita.</p>
      </DSModal>

      {/* Header */}
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">Usuários &amp; Perfis</div>
          <div className="adm-page-sub">Gerencie os acessos ao painel administrativo</div>
        </div>
        <DSBtn variant="primary" onClick={() => aba === 'usuarios' ? setModalUsr('novo') : setModalPrf('novo')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13"><path d="M12 5v14M5 12h14"/></svg>
          {aba === 'usuarios' ? 'Novo usuário' : 'Novo perfil'}
        </DSBtn>
      </div>

      {/* Abas — já usam adm-tab-btn corretamente */}
      <div className="adm-tabs">
        {[['usuarios', 'Usuários'], ['perfis', 'Perfis de Acesso']].map(([id, label]) => (
          <button key={id} onClick={() => setAba(id)} className={`adm-tab-btn${aba === id ? ' active' : ''}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Busca — apenas usuários */}
      {aba === 'usuarios' && (
        <div style={{ marginBottom: SPACE.xl, position: 'relative' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"
            style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-muted)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="adm-input" style={{ paddingLeft: 32 }} placeholder="Buscar por nome ou email..."
            value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: `${SPACE.xl5}px 0`, color: 'var(--adm-muted)', fontSize: FONT.md }}>Carregando...</div>
      ) : aba === 'usuarios' ? (
        <div className="adm-card">
          {usuariosFiltrados.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--adm-muted)', fontSize: FONT.md, padding: `${SPACE.xl4}px 0` }}>
              {busca ? 'Nenhum usuário encontrado para esta busca.' : 'Nenhum usuário cadastrado.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md + 2 }}>
              {usuariosFiltrados.map(u => {
                const uid    = u.id || u._id
                const perfil = u.perfil_id
                const acCor  = perfil?.cor || 'var(--adm-accent)'
                return (
                  <div key={uid} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: SPACE.lg, background: 'var(--adm-surface2)', borderRadius: RADIUS.lg,
                    padding: `${SPACE.lg}px 14px`, flexWrap: 'wrap',
                    borderLeft: `3px solid ${u.ativo !== false ? (perfil?.cor || 'var(--adm-accent)') : C.red}`,
                    opacity: u.ativo !== false ? 1 : 0.75,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.lg, flex: 1, minWidth: 0 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                        background: perfil?.cor ? `${perfil.cor}22` : 'var(--adm-accent)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: FONT.lg - 1,
                        color: perfil?.cor || '#fff',
                        border: `2px solid ${acCor}40`,
                      }}>
                        {(u.nome || u.email)?.[0]?.toUpperCase()}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: FONT.md, color: 'var(--adm-text)', display: 'flex', alignItems: 'center', gap: SPACE.md, flexWrap: 'wrap' }}>
                          {u.nome}
                          <DSBadge variant={u.ativo !== false ? 'green' : 'red'}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                            {u.ativo !== false ? 'Ativo' : 'Inativo'}
                          </DSBadge>
                          {u.bloqueado_ate && new Date(u.bloqueado_ate) > new Date() && (
                            <DSBadge variant="orange">🔒 Bloqueado</DSBadge>
                          )}
                        </div>
                        <div style={{ fontSize: FONT.sm, color: 'var(--adm-muted)', marginTop: 1 }}>{u.email}</div>

                        {/* Perfil badge — usa cor dinâmica do perfil */}
                        {perfil && (
                          <div style={{ marginTop: SPACE.xs }}>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: SPACE.xs,
                              padding: `2px ${SPACE.md}px`, borderRadius: RADIUS.sm,
                              fontSize: FONT.sm, fontWeight: 700,
                              background: `${perfil.cor || '#6366f1'}18`,
                              color: perfil.cor || '#6366f1',
                              border: `1px solid ${perfil.cor || '#6366f1'}30`,
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: perfil.cor || '#6366f1', display: 'inline-block' }} />
                              {perfil.nome}
                            </span>
                          </div>
                        )}

                        {/* Último login */}
                        <div style={{ fontSize: FONT.xs, color: 'var(--adm-muted)', marginTop: 3, display: 'flex', gap: SPACE.lg }}>
                          {u.ultimo_login && <span>Login: {new Date(u.ultimo_login).toLocaleString('pt-BR')}</span>}
                          {u.ultimo_acesso && !u.ultimo_login && <span>Acesso: {new Date(u.ultimo_acesso).toLocaleString('pt-BR')}</span>}
                          {!u.ultimo_login && !u.ultimo_acesso && <span style={{ opacity: .6 }}>Sem login registrado</span>}
                          {u.tentativas_login > 0 && (
                            <span style={{ color: C.orange }}>
                              ⚠ {u.tentativas_login} tentativa{u.tentativas_login !== 1 ? 's' : ''} falha{u.tentativas_login !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: SPACE.sm }}>
                      <button onClick={() => setModalUsr(u)} className="adm-btn adm-btn-ghost adm-btn-sm">Editar</button>
                      <button onClick={() => setExcluindo({ tipo: 'usuario', id: uid })} className="adm-btn adm-btn-danger adm-btn-sm">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: SPACE.lg }}>
          {perfis.map(p => {
            const pid      = p.id || p._id
            const qtdUsers = usuarios.filter(u => {
              const ref = u.perfil_id?.id || u.perfil_id
              return ref === pid
            }).length
            return (
              <div key={pid} className="adm-card" style={{ position: 'relative', padding: SPACE.xl2 }}>
                {p.sistema && (
                  <span style={{ position: 'absolute', top: SPACE.md + 2, right: SPACE.md + 2, fontSize: FONT.xs, fontWeight: 700, color: 'var(--adm-muted)', background: 'var(--adm-surface2)', borderRadius: RADIUS.sm, padding: `2px ${SPACE.md}px` }}>
                    SISTEMA
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md + 2, marginBottom: SPACE.md + 2 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: p.cor, flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: FONT.lg - 1, color: 'var(--adm-text)' }}>{p.nome}</span>
                </div>
                <p style={{ fontSize: FONT.base, color: 'var(--adm-muted)', marginBottom: SPACE.md + 2, lineHeight: 1.5, minHeight: 32 }}>{p.descricao || '—'}</p>
                <div style={{ fontSize: FONT.sm, color: 'var(--adm-muted)', marginBottom: SPACE.lg }}>
                  {p.permissoes?.includes('*') ? '⚡ Acesso total' : `${p.permissoes?.length || 0} permissão(ões)`} · {qtdUsers} usuário(s)
                </div>
                <div style={{ display: 'flex', gap: SPACE.sm }}>
                  <button onClick={() => setModalPrf(p)} className="adm-btn adm-btn-ghost adm-btn-sm" style={{ flex: 1 }}>Editar</button>
                  {!p.sistema && (
                    <button onClick={() => setExcluindo({ tipo: 'perfil', id: pid })} className="adm-btn adm-btn-danger adm-btn-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
