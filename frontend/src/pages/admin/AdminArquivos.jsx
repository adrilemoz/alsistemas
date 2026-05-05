/**
 * AdminArquivos.jsx — Editor de arquivos de configuração do projeto.
 *
 * Layout:
 *   Desktop: coluna esquerda (lista de arquivos) + coluna direita (editor)
 *   Mobile:  tela de lista → tela de editor (navegação por estado)
 *
 * Usa apenas variáveis CSS do tema admin (--adm-*) e as classes .adm-btn
 * já definidas em admin.css — sem dependências extras.
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { arquivosService } from '../../services/api'
import { markdownParaHtml } from '../../utils/markdown'
import toast from 'react-hot-toast'

// ─── Constantes ───────────────────────────────────────────────
const LANG_META = {
  dotenv:     { label: '.env',  cor: '#f59e0b', bg: 'rgba(245,158,11,.12)' },
  typescript: { label: 'TS',   cor: '#3b82f6', bg: 'rgba(59,130,246,.12)' },
  yaml:       { label: 'YAML', cor: '#8b5cf6', bg: 'rgba(139,92,246,.12)' },
  markdown:   { label: 'MD',   cor: 'var(--adm-accent)', bg: 'rgba(107,124,78,.12)' },
}

// ─── Sub-componentes ──────────────────────────────────────────

function LangBadge({ linguagem }) {
  const meta = LANG_META[linguagem] || { label: linguagem, cor: '#64748b', bg: 'rgba(100,116,139,.12)' }
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 5,
      fontSize: 10, fontWeight: 800, letterSpacing: .4,
      color: meta.cor, background: meta.bg, flexShrink: 0,
    }}>
      {meta.label}
    </span>
  )
}

function ExisteIndicador({ existe }) {
  return (
    <span style={{
      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
      background: existe ? '#22c55e' : '#64748b',
      boxShadow: existe ? '0 0 5px rgba(34,197,94,.4)' : 'none',
    }} title={existe ? 'Arquivo encontrado no disco' : 'Arquivo não encontrado (será criado ao salvar)'} />
  )
}

function AvisoBanner({ texto }) {
  if (!texto) return null
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)',
      borderRadius: 8, padding: '10px 14px', marginBottom: 14,
    }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2"
        width="15" height="15" style={{ flexShrink: 0, marginTop: 1 }}>
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span style={{ fontSize: 12.5, color: '#f59e0b', lineHeight: 1.55 }}>{texto}</span>
    </div>
  )
}

function ItemLista({ arq, ativo, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 9,
      width: '100%', padding: '10px 12px', borderRadius: 8, marginBottom: 2,
      background: ativo ? 'var(--adm-surface2)' : 'transparent',
      border: 'none', cursor: 'pointer', textAlign: 'left',
      borderLeft: '2px solid', borderLeftColor: ativo ? 'var(--adm-accent)' : 'transparent',
      transition: 'all .15s',
    }}>
      <ExisteIndicador existe={arq.existe} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, fontWeight: 600, color: ativo ? 'var(--adm-text)' : 'var(--adm-muted)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {arq.label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--adm-muted)', marginTop: 1, lineHeight: 1.3 }}>
          {arq.descricao}
        </div>
      </div>
      <LangBadge linguagem={arq.linguagem} />
    </button>
  )
}

function GrupoLista({ grupo, arquivos, ativoKey, onSelect }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, letterSpacing: .8, textTransform: 'uppercase',
        color: 'var(--adm-muted)', padding: '0 12px 6px',
      }}>
        {grupo}
      </div>
      {arquivos.map(arq => (
        <ItemLista key={arq.key} arq={arq} ativo={ativoKey === arq.key} onClick={() => onSelect(arq.key)} />
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────
export default function AdminArquivos() {
  const [lista,       setLista]       = useState([])
  const [carregandoLista, setCarregandoLista] = useState(true)
  const [ativoKey,    setAtivoKey]    = useState(null)
  const [arquivo,     setArquivo]     = useState(null)   // { ...meta, conteudo }
  const [conteudo,    setConteudo]    = useState('')
  const [original,   setOriginal]    = useState('')
  const [carregando, setCarregando]   = useState(false)
  const [salvando,   setSalvando]     = useState(false)
  const [mobileView, setMobileView]   = useState('lista') // 'lista' | 'editor'
  const [copiado,    setCopiado]      = useState(false)
  const textareaRef = useRef(null)

  const modificado = conteudo !== original

  // Carrega a lista de arquivos
  useEffect(() => {
    setCarregandoLista(true)
    arquivosService.listar()
      .then(setLista)
      .catch(() => toast.error('Erro ao carregar lista de arquivos'))
      .finally(() => setCarregandoLista(false))
  }, [])

  // Abre um arquivo
  const abrirArquivo = useCallback(async (key) => {
    if (ativoKey === key) return
    setAtivoKey(key)
    setArquivo(null)
    setConteudo('')
    setOriginal('')
    setCarregando(true)
    setMobileView('editor')
    try {
      const dados = await arquivosService.ler(key)
      setArquivo(dados)
      setConteudo(dados.conteudo)
      setOriginal(dados.conteudo)
    } catch {
      toast.error('Erro ao ler o arquivo')
      setAtivoKey(null)
      setMobileView('lista')
    } finally {
      setCarregando(false)
    }
  }, [ativoKey])

  // Salva
  async function handleSalvar() {
    if (!ativoKey || salvando) return
    setSalvando(true)
    try {
      await arquivosService.salvar(ativoKey, conteudo)
      setOriginal(conteudo)
      // Atualiza existe=true na lista local
      setLista(prev => prev.map(a => a.key === ativoKey ? { ...a, existe: true } : a))
      toast.success('Arquivo salvo com sucesso!')
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  // Desfaz alterações
  function handleDescartar() {
    setConteudo(original)
  }

  // Copia conteúdo
  async function handleCopiar() {
    try {
      await navigator.clipboard.writeText(conteudo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  // Tab no textarea insere 2 espaços
  function handleKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault()
      const ta = textareaRef.current
      const s = ta.selectionStart, en = ta.selectionEnd
      const novo = conteudo.slice(0, s) + '  ' + conteudo.slice(en)
      setConteudo(novo)
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2 })
    }
    // Ctrl+S / Cmd+S para salvar
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSalvar()
    }
  }

  // Grupos
  const grupos = [...new Set(lista.map(a => a.grupo))]

  // ── Barra de status do arquivo atual
  function fmtBytes(b) {
    if (!b) return '0 B'
    if (b < 1024) return `${b} B`
    return `${(b / 1024).toFixed(1)} KB`
  }

  function fmtLinhas(texto) {
    return `${texto.split('\n').length} linhas`
  }

  // ─── Painel lista ─────────────────────────────────────────
  const painelLista = (
    <div style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--adm-surface)', borderRight: '1px solid var(--adm-border)',
    }}>
      {/* Cabeçalho da lista */}
      <div style={{
        padding: '14px 16px 10px', borderBottom: '1px solid var(--adm-border)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconArquivos />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--adm-text)' }}>
            Arquivos do projeto
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--adm-muted)', marginTop: 4 }}>
          {lista.filter(a => a.existe).length}/{lista.length} arquivos encontrados no disco
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
        {carregandoLista ? (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <IconSpin />
            <div style={{ fontSize: 12, color: 'var(--adm-muted)', marginTop: 8 }}>Carregando...</div>
          </div>
        ) : (
          grupos.map(grupo => (
            <GrupoLista
              key={grupo}
              grupo={grupo}
              arquivos={lista.filter(a => a.grupo === grupo)}
              ativoKey={ativoKey}
              onSelect={abrirArquivo}
            />
          ))
        )}
      </div>
    </div>
  )

  // ─── Painel editor ────────────────────────────────────────
  const painelEditor = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        borderBottom: '1px solid var(--adm-border)', flexShrink: 0,
        flexWrap: 'wrap', rowGap: 6,
      }}>
        {/* Botão voltar (mobile) */}
        <button
          onClick={() => setMobileView('lista')}
          className="adm-btn adm-btn-ghost adm-btn-sm adm-only-mobile"
          style={{ display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Voltar
        </button>

        {/* Nome + badge */}
        {arquivo && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
              <ExisteIndicador existe={arquivo.existe} />
              <span style={{
                fontSize: 13, fontWeight: 600, color: 'var(--adm-text)',
                fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {arquivo.label}
              </span>
              <LangBadge linguagem={arquivo.linguagem} />
              {arquivo.linguagem === 'markdown' && (
                <span style={{
                  fontSize: 10, fontWeight: 600, color: 'var(--adm-muted)',
                  background: 'var(--adm-surface2)', borderRadius: 4, padding: '2px 7px',
                  border: '1px solid var(--adm-border)', letterSpacing: .2,
                }}>
                  👁 somente leitura
                </span>
              )}
              {arquivo.linguagem !== 'markdown' && modificado && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#f59e0b',
                  background: 'rgba(245,158,11,.12)', borderRadius: 4, padding: '2px 6px',
                }}>
                  MODIFICADO
                </span>
              )}
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={handleCopiar} className="adm-btn adm-btn-ghost adm-btn-sm"
                title="Copiar conteúdo" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {copiado
                  ? <><IconCheck /> Copiado</>
                  : <><IconCopy /> <span className="adm-only-desktop">Copiar</span></>
                }
              </button>
              {arquivo.linguagem !== 'markdown' && (
                <>
                  {modificado && (
                    <button onClick={handleDescartar} className="adm-btn adm-btn-secondary adm-btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <IconUndo />
                      <span className="adm-only-desktop">Descartar</span>
                    </button>
                  )}
                  <button onClick={handleSalvar} disabled={salvando || !modificado}
                    className="adm-btn adm-btn-primary adm-btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {salvando
                      ? <><IconSpin small /> Salvando...</>
                      : <><IconSave /> Salvar</>
                    }
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Aviso + editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!ativoKey && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            color: 'var(--adm-muted)', padding: 32,
          }}>
            <IconArquivos grande />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--adm-text)' }}>
              Selecione um arquivo
            </div>
            <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>
              Escolha um arquivo na lista ao lado para visualizar e editar seu conteúdo.
            </div>
            <div style={{
              fontSize: 11.5, color: 'var(--adm-muted)', marginTop: 4,
              background: 'var(--adm-surface2)', padding: '6px 12px', borderRadius: 6,
            }}>
              Dica: use <kbd style={{ fontFamily: 'monospace' }}>Ctrl+S</kbd> para salvar rapidamente
            </div>
          </div>
        )}

        {ativoKey && carregando && (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 10,
          }}>
            <IconSpin />
            <div style={{ fontSize: 12, color: 'var(--adm-muted)' }}>Carregando arquivo...</div>
          </div>
        )}

        {arquivo && !carregando && (
          <>
            {/* Aviso */}
            {arquivo.aviso && (
              <div style={{ padding: '10px 16px 0', flexShrink: 0 }}>
                <AvisoBanner texto={arquivo.aviso} />
              </div>
            )}

            {/* Aviso arquivo não encontrado */}
            {!arquivo.existe && (
              <div style={{ padding: arquivo.aviso ? '0 16px 0' : '10px 16px 0', flexShrink: 0 }}>
                <AvisoBanner texto="Este arquivo não foi encontrado no disco. Ao salvar, ele será criado automaticamente." />
              </div>
            )}

            {/* Editor ou Preview */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 16px 16px', overflow: 'hidden' }}>
              {arquivo.linguagem === 'markdown' ? (
                <>
                  {/* Visualização read-only estilo GitHub */}
                  <div
                    className="prose-news"
                    dangerouslySetInnerHTML={{ __html: markdownParaHtml(conteudo) }}
                    style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '20px 24px',
                      borderRadius: 8,
                      border: '1px solid var(--adm-border)',
                      background: 'var(--adm-bg, var(--adm-surface))',
                      color: 'var(--adm-text)',
                      lineHeight: 1.8,
                      fontSize: 14,
                      minHeight: 200,
                    }}
                  />
                  {/* Barra de status read-only */}
                  <div style={{
                    display: 'flex', gap: 12, alignItems: 'center',
                    padding: '6px 2px 0', flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--adm-muted)' }}>
                      {fmtLinhas(conteudo)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--adm-muted)' }}>
                      {conteudo.length} caracteres
                    </span>
                    {arquivo.tamanho > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--adm-muted)' }}>
                        {fmtBytes(arquivo.tamanho)} no disco
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--adm-muted)', marginLeft: 'auto' }}>
                      Arquivo de documentação — somente leitura
                    </span>
                  </div>
                </>
              ) : (
                <>
                  {/* Editor de texto para .env, YAML, TS, etc. */}
                  <textarea
                    ref={textareaRef}
                    value={conteudo}
                    onChange={e => setConteudo(e.target.value)}
                    onKeyDown={handleKeyDown}
                    spellCheck={false}
                    placeholder={`# Conteúdo de ${arquivo?.label ?? 'arquivo'}`}
                    style={{
                      flex: 1,
                      width: '100%',
                      resize: 'none',
                      fontFamily: '"Cascadia Code", "Fira Code", "Source Code Pro", Consolas, monospace',
                      fontSize: 12.5,
                      lineHeight: 1.7,
                      padding: '12px 14px',
                      borderRadius: 8,
                      border: '1px solid var(--adm-border)',
                      background: 'var(--adm-bg, var(--adm-surface))',
                      color: 'var(--adm-text)',
                      outline: 'none',
                      transition: 'border-color .15s',
                      minHeight: 200,
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--adm-accent)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--adm-border)' }}
                  />
                  {/* Barra de status */}
                  <div style={{
                    display: 'flex', gap: 12, alignItems: 'center',
                    padding: '6px 2px 0', flexWrap: 'wrap',
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--adm-muted)' }}>
                      {fmtLinhas(conteudo)}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--adm-muted)' }}>
                      {conteudo.length} caracteres
                    </span>
                    {arquivo.tamanho > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--adm-muted)' }}>
                        {fmtBytes(arquivo.tamanho)} no disco
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--adm-muted)', marginLeft: 'auto' }}>
                      Tab = 2 espaços · Ctrl+S salva
                    </span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )

  // ─── Render ───────────────────────────────────────────────
  return (
    <>
      {/* Estilos específicos desta página */}
      <style>{`
        .arq-shell {
          display: flex;
          height: calc(100vh - 52px);
          overflow: hidden;
        }
        .arq-sidebar {
          width: 260px;
          flex-shrink: 0;
          height: 100%;
          overflow: hidden;
        }
        .arq-editor {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }
        /* Mobile: empilha e controla qual painel mostra */
        @media (max-width: 640px) {
          .arq-shell { height: calc(100dvh - 52px); }
          .arq-sidebar {
            width: 100%;
            display: ${mobileView === 'lista' ? 'block' : 'none'};
            height: 100%;
          }
          .arq-editor {
            display: ${mobileView === 'editor' ? 'flex' : 'none'};
            height: 100%;
          }
          .adm-only-mobile { display: flex !important; }
          .adm-only-desktop { display: none !important; }
        }
        @media (min-width: 641px) {
          .adm-only-mobile { display: none !important; }
        }
      `}</style>

      <div className="arq-shell">
        <div className="arq-sidebar">
          {painelLista}
        </div>
        <div className="arq-editor">
          {painelEditor}
        </div>
      </div>
    </>
  )
}

// ─── Ícones ───────────────────────────────────────────────────
function IconArquivos({ grande }) {
  const s = grande ? 40 : 16
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      width={s} height={s} style={{ opacity: grande ? .3 : 1 }}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  )
}

function IconSave() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
      <polyline points="17 21 17 13 7 13 7 21"/>
      <polyline points="7 3 7 8 15 8"/>
    </svg>
  )
}

function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" width="13" height="13">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

function IconUndo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13">
      <path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
    </svg>
  )
}

function IconSpin({ small }) {
  const s = small ? 12 : 20
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      width={s} height={s} className="adm-spin">
      <path d="M21 12a9 9 0 11-18 0"/>
    </svg>
  )
}
