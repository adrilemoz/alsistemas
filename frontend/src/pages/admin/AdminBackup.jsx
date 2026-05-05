import { useState, useEffect, useCallback, useRef } from 'react'
import { backupService } from '../../services/api'
import toast from 'react-hot-toast'

function fmtBytes(b) {
  if (!b) return '—'
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(2)} MB`
}

function fmtData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Modal de confirmação genérico ───────────────────────────
function ModalConfirm({ titulo, descricao, labelConfirm, danger = false, loading, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(0,0,0,.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        background: 'var(--adm-surface)', border: '1px solid var(--adm-border)',
        borderRadius: 14, padding: 24, maxWidth: 380, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,.6)',
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
          <span style={{ fontSize: 26, lineHeight: 1 }}>⚠️</span>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--adm-text)', marginBottom: 6 }}>
              {titulo}
            </p>
            <p style={{ fontSize: 13, color: 'var(--adm-muted)', lineHeight: 1.55 }}>
              {descricao}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="adm-btn adm-btn-secondary" disabled={loading}>
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`adm-btn ${danger ? 'adm-btn-danger' : 'adm-btn-primary'}`}
            disabled={loading}
          >
            {loading ? 'Aguarde...' : labelConfirm}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Card de um backup ────────────────────────────────────────
function BackupCard({ bk, onRestaurar, onExcluir }) {
  return (
    <div style={{
      background: 'var(--adm-surface2)',
      border: '1px solid var(--adm-border)',
      borderRadius: 12,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Título + badge */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontWeight: 700, fontSize: 13, color: 'var(--adm-text)',
            wordBreak: 'break-word', lineHeight: 1.4, marginBottom: 2,
          }}>
            {bk.descricao}
          </p>
          {bk.importado && (
            <span style={{
              display: 'inline-block', fontSize: 10, fontWeight: 700,
              padding: '2px 7px', borderRadius: 4,
              background: 'rgba(99,102,241,.18)', color: '#818cf8',
            }}>
              IMPORTADO
            </span>
          )}
        </div>
      </div>

      {/* Metadados em grid 2 colunas */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: '6px 12px', fontSize: 12, color: 'var(--adm-muted)',
      }}>
        <span><span style={{ marginRight: 4 }}>📅</span>{fmtData(bk.criado_em)}</span>
        <span><span style={{ marginRight: 4 }}>👤</span>{bk.criado_por}</span>
        <span><span style={{ marginRight: 4 }}>💾</span>{fmtBytes(bk.tamanho_bytes)}</span>
        <span><span style={{ marginRight: 4 }}>📄</span>{bk.total_documentos} documentos</span>
        {bk.arquivo_original && (
          <span style={{ gridColumn: '1 / -1' }}>
            <span style={{ marginRight: 4 }}>📁</span>{bk.arquivo_original}
          </span>
        )}
      </div>

      {/* Ações */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a
          href={backupService.downloadUrl(bk.id)}
          download
          className="adm-btn adm-btn-ghost adm-btn-sm"
          style={{ flex: '1 1 auto', justifyContent: 'center' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download
        </a>
        <button
          onClick={() => onRestaurar(bk.id)}
          className="adm-btn adm-btn-secondary adm-btn-sm"
          style={{ flex: '1 1 auto', justifyContent: 'center' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
          </svg>
          Restaurar
        </button>
        <button
          onClick={() => onExcluir(bk.id, bk.descricao)}
          className="adm-btn adm-btn-danger adm-btn-sm"
          style={{ flex: '0 0 auto' }}
          title="Excluir backup"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
          Excluir
        </button>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────
export default function AdminBackup() {
  const [backups,      setBackups]      = useState([])
  const [stats,        setStats]        = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [criando,      setCriando]      = useState(false)
  const [desc,         setDesc]         = useState('')

  // Restore confirmation
  const [confirmarRestore,  setConfirmarRestore]  = useState(null) // { id }
  const [restaurando,       setRestaurando]       = useState(false)

  // Delete confirmation
  const [confirmarExcluir,  setConfirmarExcluir]  = useState(null) // { id, descricao }
  const [excluindo,         setExcluindo]         = useState(false)

  // Import
  const [importArquivo, setImportArquivo] = useState(null)
  const [importDesc,    setImportDesc]    = useState('')
  const [importando,    setImportando]    = useState(false)
  const inputFileRef = useRef(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const [b, s] = await Promise.all([backupService.listar(), backupService.stats()])
      setBackups(b.backups || [])
      setStats(s)
    } catch (err) {
      toast.error('Erro ao carregar backups: ' + err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function criar() {
    setCriando(true)
    try {
      const r = await backupService.criar(desc)
      toast.success('Backup criado com sucesso!')
      setDesc('')
      setBackups(prev => [r.backup, ...prev])
    } catch (err) {
      toast.error('Erro ao criar backup: ' + err.message)
    } finally {
      setCriando(false)
    }
  }

  async function restaurar() {
    if (!confirmarRestore) return
    setRestaurando(true)
    try {
      const r = await backupService.restaurar(confirmarRestore.id)
      toast.success(r.mensagem || 'Restore concluído com sucesso!')
      setConfirmarRestore(null)
    } catch (err) {
      toast.error('Erro no restore: ' + err.message)
    } finally {
      setRestaurando(false)
    }
  }

  async function excluir() {
    if (!confirmarExcluir) return
    setExcluindo(true)
    try {
      await backupService.excluir(confirmarExcluir.id)
      toast.success('Backup excluído.')
      setBackups(prev => prev.filter(b => b.id !== confirmarExcluir.id))
      setConfirmarExcluir(null)
    } catch (err) {
      toast.error('Erro ao excluir: ' + err.message)
    } finally {
      setExcluindo(false)
    }
  }

  async function importar() {
    if (!importArquivo) { toast.error('Selecione um arquivo .json antes de importar.'); return }
    setImportando(true)
    try {
      const r = await backupService.importar(importArquivo, importDesc)
      toast.success(r.mensagem || 'Backup importado com sucesso!')
      setImportArquivo(null)
      setImportDesc('')
      if (inputFileRef.current) inputFileRef.current.value = ''
      setBackups(prev => [r.backup, ...prev])
    } catch (err) {
      toast.error('Erro ao importar: ' + err.message)
    } finally {
      setImportando(false)
    }
  }

  const card = {
    background: 'var(--adm-surface)',
    border: '1px solid var(--adm-border)',
    borderRadius: 12,
    padding: 20,
  }

  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <div className="adm-page-title">Backup do Banco de Dados</div>
          <div className="adm-page-sub">Crie, importe, gerencie e restaure backups completos do MongoDB</div>
        </div>
      </div>

      {/* Modal — confirmar restore */}
      {confirmarRestore && (
        <ModalConfirm
          titulo="Restaurar este backup?"
          descricao="Todos os dados atuais serão substituídos pelos dados deste backup. Esta ação não pode ser desfeita facilmente."
          labelConfirm="Sim, restaurar"
          danger
          loading={restaurando}
          onConfirm={restaurar}
          onCancel={() => setConfirmarRestore(null)}
        />
      )}

      {/* Modal — confirmar exclusão */}
      {confirmarExcluir && (
        <ModalConfirm
          titulo="Excluir este backup?"
          descricao={`O backup "${confirmarExcluir.descricao}" será removido permanentemente do servidor. Esta ação não pode ser desfeita.`}
          labelConfirm="Sim, excluir"
          danger
          loading={excluindo}
          onConfirm={excluir}
          onCancel={() => setConfirmarExcluir(null)}
        />
      )}

      {/* Stats do banco */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: 10, marginBottom: 20,
        }}>
          {Object.entries(stats.colecoes || {}).map(([col, qtd]) => (
            <div key={col} style={{ ...card, padding: '14px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--adm-accent)' }}>{qtd}</div>
              <div style={{ fontSize: 11, color: 'var(--adm-muted)', marginTop: 3, wordBreak: 'break-word' }}>{col}</div>
            </div>
          ))}
          <div style={{ ...card, padding: '14px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--adm-text)' }}>{stats.total_documentos}</div>
            <div style={{ fontSize: 11, color: 'var(--adm-muted)', marginTop: 3 }}>Total de docs</div>
          </div>
        </div>
      )}

      {/* Criar novo backup */}
      <div style={{ ...card, marginBottom: 12 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--adm-text)', marginBottom: 12 }}>
          Criar novo backup
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            type="text"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder="Descrição opcional (ex.: antes da migração v3)"
            className="adm-input"
            onKeyDown={e => e.key === 'Enter' && criar()}
          />
          <button
            onClick={criar}
            disabled={criando}
            className="adm-btn adm-btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {criando
              ? <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="adm-spin"><path d="M21 12a9 9 0 11-18 0" /></svg> Criando...</>
              : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg> Fazer backup agora</>
            }
          </button>
        </div>
      </div>

      {/* Importar backup */}
      <div style={{ ...card, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--adm-text)', marginBottom: 4 }}>
          Importar backup
        </h2>
        <p style={{ fontSize: 12, color: 'var(--adm-muted)', marginBottom: 12, lineHeight: 1.55 }}>
          Envie um arquivo <code>.json</code> exportado anteriormente para registrá-lo e poder restaurá-lo.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div
            onClick={() => !importando && inputFileRef.current?.click()}
            style={{
              border: `2px dashed ${importArquivo ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
              borderRadius: 8, padding: '14px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              cursor: importando ? 'not-allowed' : 'pointer',
              background: importArquivo ? 'rgba(99,102,241,.07)' : 'transparent',
              transition: 'border-color .2s, background .2s',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"
              style={{ flexShrink: 0, color: importArquivo ? 'var(--adm-accent)' : 'var(--adm-muted)' }}>
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
            <div style={{ flex: 1, minWidth: 0 }}>
              {importArquivo
                ? <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--adm-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {importArquivo.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--adm-muted)', marginTop: 2 }}>
                      {fmtBytes(importArquivo.size)}
                    </div>
                  </>
                : <div style={{ fontSize: 13, color: 'var(--adm-muted)' }}>
                    Toque para selecionar arquivo <code>.json</code>
                  </div>
              }
            </div>
            {importArquivo && (
              <button
                onClick={e => { e.stopPropagation(); setImportArquivo(null); if (inputFileRef.current) inputFileRef.current.value = '' }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-muted)', padding: 4, lineHeight: 1, fontSize: 16 }}
                title="Remover arquivo"
              >✕</button>
            )}
          </div>
          <input
            ref={inputFileRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={e => setImportArquivo(e.target.files[0] || null)}
          />
          <input
            type="text"
            value={importDesc}
            onChange={e => setImportDesc(e.target.value)}
            placeholder="Descrição opcional para este backup importado"
            className="adm-input"
          />
          <button
            onClick={importar}
            disabled={importando || !importArquivo}
            className="adm-btn adm-btn-secondary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {importando
              ? <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" className="adm-spin"><path d="M21 12a9 9 0 11-18 0" /></svg> Importando...</>
              : <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> Importar backup</>
            }
          </button>
        </div>
      </div>

      {/* Lista de backups */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--adm-text)' }}>
            Backups disponíveis{' '}
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--adm-muted)' }}>({backups.length})</span>
          </h2>
          <button onClick={carregar} className="adm-btn adm-btn-ghost adm-btn-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            Atualizar
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--adm-muted)', fontSize: 13 }}>
            Carregando backups...
          </div>
        ) : backups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40"
              style={{ margin: '0 auto 10px', display: 'block', color: 'var(--adm-muted)', opacity: .4 }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p style={{ fontSize: 13, color: 'var(--adm-muted)' }}>
              Nenhum backup encontrado. Crie ou importe o primeiro agora.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {backups.map(bk => (
              <BackupCard
                key={bk.id}
                bk={bk}
                onRestaurar={id => setConfirmarRestore({ id })}
                onExcluir={(id, descricao) => setConfirmarExcluir({ id, descricao })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info de segurança */}
      <div style={{
        marginTop: 20,
        background: 'rgba(234,179,8,.07)',
        border: '1px solid rgba(234,179,8,.2)',
        borderRadius: 10, padding: '12px 16px',
        fontSize: 12, color: '#fbbf24', lineHeight: 1.6,
      }}>
        <strong>⚠️ Importante:</strong> Os backups são armazenados no servidor (
        <code>backend/backups/</code>). Para segurança máxima, faça o download regular
        dos arquivos e guarde em local seguro (nuvem, disco externo, etc.).
      </div>
    </div>
  )
}
