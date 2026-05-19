/**
 * ProjetoPublicarModal.jsx — Sprint 10
 *
 * Modal de 3 passos para publicar/enviar um projeto local sem depender do GitHub:
 *
 *   Passo 1 — ZIP
 *     Seleciona o arquivo .zip. Preview de tamanho + nome.
 *     Campo "Nome do projeto" (pasta de destino).
 *     Checkbox "substituir se já existir".
 *     Botão "Enviar para o servidor" → chama POST /api/projetos/upload.
 *
 *   Passo 2 — GitHub (opcional)
 *     Aparece após o upload bem-sucedido.
 *     Opção A: vincular a um repositório existente (owner/repo).
 *     Opção B: criar um repositório novo (nome, descrição, privado).
 *     Botão "Pular" → fecha sem vincular.
 *     Botão "Confirmar" → vincula + dispara commit-stream SSE.
 *
 *   Passo 3 — Push (SSE)
 *     Progresso em tempo real via commit-stream (mesmo padrão do ProjetoSyncModal).
 *     Narrativa de etapas: criando blobs → tree → commit → push.
 *     Ao finalizar: link "Ver projeto" + botão Fechar.
 */
import { useState, useRef, useCallback } from 'react'
import { projetosService } from '../../services/domains/projetos.js'
import { githubService }   from '../../services/domains/github.js'
import { T as C, SPACE, RADIUS, FONT } from '../../themes/tokens'
import {
  DSModal, DSBtn, DSAlert,
} from '../../components/admin/ui/DS'
import toast from 'react-hot-toast'

// ── Helpers ───────────────────────────────────────────────────

function fmtBytes(b) {
  if (!b) return '0 B'
  if (b < 1024)       return `${b} B`
  if (b < 1024 ** 2)  return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 ** 2).toFixed(1)} MB`
}

function nomeSemExt(nome) {
  return nome.replace(/\.zip$/i, '').replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 60)
}

// ── Sub-componentes ───────────────────────────────────────────

function Step({ num, label, ativo, concluido }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, flex: 1 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: FONT.xs, fontWeight: 800,
        background: concluido ? `${C.greenSolid}20`
                  : ativo     ? `${C.blue}18`
                  : C.surface2,
        border: `2px solid ${concluido ? C.greenSolid : ativo ? C.blue : C.border}`,
        color:  concluido ? C.greenSolid : ativo ? C.blue : C.muted,
        transition: 'all .25s',
      }}>
        {concluido
          ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              width="11" height="11"><polyline points="20 6 9 17 4 12"/></svg>
          : num}
      </div>
      <span style={{
        fontSize: FONT.xs, fontWeight: ativo || concluido ? 700 : 400,
        color: ativo ? C.text : concluido ? C.muted : C.muted,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
    </div>
  )
}

function StepBar({ passo }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 0,
      padding: `${SPACE.md}px ${SPACE.lg}px`,
      borderBottom: `1px solid ${C.border}`,
      background: C.surface2,
    }}>
      <Step num="1" label="Enviar ZIP"   ativo={passo === 1} concluido={passo > 1} />
      <div style={{ flex: 1, height: 2, background: passo > 1 ? C.greenSolid : C.border, margin: `0 ${SPACE.sm}px`, transition: 'background .3s' }} />
      <Step num="2" label="GitHub"       ativo={passo === 2} concluido={passo > 2} />
      <div style={{ flex: 1, height: 2, background: passo > 2 ? C.greenSolid : C.border, margin: `0 ${SPACE.sm}px`, transition: 'background .3s' }} />
      <Step num="3" label="Publicando"   ativo={passo === 3} concluido={passo > 3} />
    </div>
  )
}

// ── Campo de input estilizado ─────────────────────────────────

function Campo({ label, value, onChange, placeholder, tipo = 'text', hint }) {
  return (
    <div style={{ marginBottom: SPACE.md }}>
      <label style={{
        display: 'block', fontSize: FONT.xs, fontWeight: 700,
        color: C.muted, marginBottom: SPACE.xs,
        textTransform: 'uppercase', letterSpacing: '.04em',
      }}>
        {label}
      </label>
      <input
        type={tipo} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: `${SPACE.sm}px ${SPACE.md}px`,
          borderRadius: RADIUS.md, border: `1.5px solid ${C.border}`,
          background: C.surface, color: C.text,
          fontSize: FONT.base, outline: 'none',
        }}
        onFocus={e  => { e.currentTarget.style.borderColor = C.accent }}
        onBlur={e   => { e.currentTarget.style.borderColor = C.border }}
      />
      {hint && <div style={{ fontSize: FONT.xs, color: C.muted, marginTop: SPACE.xs }}>{hint}</div>}
    </div>
  )
}

// ── Passo 1: Selecionar e enviar ZIP ─────────────────────────

function Passo1({ onConcluido }) {
  const inputRef             = useRef(null)
  const [arquivo,  setArquivo]  = useState(null)
  const [nome,     setNome]     = useState('')
  const [subst,    setSubst]    = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro,     setErro]     = useState('')
  const [progresso,setProgresso]= useState(0)
  const xhrRef = useRef(null)

  function onFile(file) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setErro('Apenas arquivos .zip são aceitos.')
      return
    }
    setErro('')
    setArquivo(file)
    setNome(nomeSemExt(file.name))
  }

  function onDrop(e) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  async function enviar() {
    if (!arquivo || !nome.trim()) return
    setEnviando(true); setErro(''); setProgresso(0)

    const fd = new FormData()
    fd.append('zip', arquivo)
    fd.append('nomeProjeto', nome.trim())
    fd.append('substituir', String(subst))

    // Usa XHR para ter progresso de upload
    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhrRef.current = xhr
      xhr.open('POST', `${import.meta.env.VITE_API_URL || 'https://alsistemas.onrender.com/api'}/projetos/upload`)

      // Auth via cookie HttpOnly — mesmo padrão do resto do app (credentials: 'include')
      xhr.withCredentials = true

      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) setProgresso(Math.round(e.loaded / e.total * 90))
      })

      xhr.onload = () => {
        setProgresso(100)
        const text = xhr.responseText || ''
        try {
          const data = JSON.parse(text)
          if (xhr.status >= 400) reject(new Error(data.erro || `Erro ${xhr.status}`))
          else resolve(data)
        } catch {
          reject(new Error(text.slice(0, 200) || `Erro ${xhr.status}`))
        }
      }
      xhr.onerror   = () => reject(new Error('Falha de conexão com o servidor'))
      xhr.ontimeout = () => reject(new Error('Tempo limite esgotado'))
      xhr.timeout   = 120_000
      xhr.send(fd)
    })
      .then(data => onConcluido(data.nomeProjeto, data.arquivos))
      .catch(e   => { setErro(e.message); setEnviando(false); setProgresso(0) })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
      {/* Drop zone */}
      <div
        onClick={() => !enviando && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${arquivo ? C.accent : C.border}`,
          borderRadius: RADIUS.lg,
          padding: `${SPACE.xl2}px ${SPACE.xl}px`,
          textAlign: 'center', cursor: enviando ? 'not-allowed' : 'pointer',
          background: arquivo ? `${C.accent}08` : C.surface2,
          transition: 'all .2s',
        }}
      >
        <input ref={inputRef} type="file" accept=".zip" style={{ display: 'none' }}
          onChange={e => onFile(e.target.files[0])} />

        {arquivo ? (
          <>
            <div style={{ fontSize: 28, marginBottom: SPACE.sm }}>📦</div>
            <div style={{ fontWeight: 700, color: C.text, fontSize: FONT.md, marginBottom: 4 }}>
              {arquivo.name}
            </div>
            <div style={{ fontSize: FONT.sm, color: C.muted }}>{fmtBytes(arquivo.size)}</div>
            {!enviando && (
              <div style={{ fontSize: FONT.xs, color: C.muted, marginTop: SPACE.sm }}>
                Clique para trocar o arquivo
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 36, marginBottom: SPACE.md }}>⬆</div>
            <div style={{ fontWeight: 600, color: C.text, marginBottom: 4 }}>
              Arraste o ZIP aqui ou clique para selecionar
            </div>
            <div style={{ fontSize: FONT.sm, color: C.muted }}>Máximo: 200 MB</div>
          </>
        )}
      </div>

      {/* Nome */}
      {arquivo && (
        <Campo
          label="Nome do projeto"
          value={nome}
          onChange={v => setNome(v.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 60))}
          placeholder="meu-projeto"
          hint={`Será criado em projetos/${nome || 'meu-projeto'}/`}
        />
      )}

      {/* Substituir */}
      {arquivo && (
        <label style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, cursor: 'pointer' }}>
          <input type="checkbox" checked={subst} onChange={e => setSubst(e.target.checked)}
            style={{ width: 14, height: 14, accentColor: C.accent }} />
          <div>
            <div style={{ fontSize: FONT.base, fontWeight: 600, color: C.text }}>
              Substituir se já existir
            </div>
            <div style={{ fontSize: FONT.xs, color: C.muted }}>
              Remove a pasta existente antes de extrair o novo conteúdo
            </div>
          </div>
        </label>
      )}

      {/* Progresso de upload */}
      {enviando && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            fontSize: FONT.xs, color: C.muted, marginBottom: SPACE.xs }}>
            <span>{progresso < 90 ? 'Enviando…' : 'Extraindo no servidor…'}</span>
            <span>{progresso}%</span>
          </div>
          <div style={{ height: 6, background: C.surface2, borderRadius: RADIUS.xs, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: RADIUS.xs,
              width: `${progresso}%`,
              background: `linear-gradient(90deg, ${C.blue}, ${C.accent})`,
              transition: 'width .4s ease',
            }} />
          </div>
        </div>
      )}

      {erro && <DSAlert variant="red">{erro}</DSAlert>}

      <DSBtn
        variant="primary"
        onClick={enviar}
        disabled={!arquivo || !nome.trim() || enviando}
        loading={enviando}
        style={{ alignSelf: 'flex-end' }}
      >
        {enviando ? 'Enviando…' : '⬆ Enviar para o servidor'}
      </DSBtn>
    </div>
  )
}

// ── Passo 2: Vincular ao GitHub ───────────────────────────────

function Passo2({ nomeProjeto, onPular, onVincularEPushar }) {
  const [modo,      setModo]      = useState('existente') // 'existente' | 'novo'
  const [owner,     setOwner]     = useState('')
  const [repo,      setRepo]      = useState('')
  const [nomeNovo,  setNomeNovo]  = useState(nomeProjeto)
  const [descricao, setDescricao] = useState('')
  const [privado,   setPrivado]   = useState(true)
  const [msgCommit, setMsgCommit] = useState('feat: initial commit')
  const [carregando,setCarregando]= useState(false)
  const [erro,      setErro]      = useState('')

  async function confirmar() {
    setCarregando(true); setErro('')
    try {
      let finalOwner, finalRepo

      if (modo === 'novo') {
        if (!nomeNovo.trim()) { setErro('Informe o nome do repositório.'); setCarregando(false); return }
        const criado = await githubService.criarRepo(nomeNovo.trim(), descricao.trim(), privado)
        finalOwner = criado.owner
        finalRepo  = criado.repo
        toast.success(`Repositório ${criado.nomeCompleto} criado!`)
      } else {
        if (!owner.trim() || !repo.trim()) { setErro('Preencha owner e repositório.'); setCarregando(false); return }
        finalOwner = owner.trim()
        finalRepo  = repo.trim()
      }

      // Vincula no banco
      await projetosService.vincular(nomeProjeto, finalOwner, finalRepo)
      // Dispara push
      onVincularEPushar(finalOwner, finalRepo, msgCommit.trim() || 'feat: initial commit')
    } catch (e) {
      setErro(e.message || 'Erro ao configurar GitHub')
      setCarregando(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
      {/* Sucesso do upload */}
      <div style={{
        background: `${C.greenSolid}0d`, border: `1px solid ${C.greenSolid}30`,
        borderRadius: RADIUS.md, padding: `${SPACE.sm}px ${SPACE.md}px`,
        display: 'flex', alignItems: 'center', gap: SPACE.sm,
        fontSize: FONT.sm, color: C.text,
      }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={C.greenSolid} strokeWidth="2.5"
          width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>
        Projeto <strong>{nomeProjeto}</strong> salvo na pasta Projetos com sucesso.
      </div>

      {/* Escolha de modo */}
      <div style={{ display: 'flex', gap: SPACE.sm }}>
        {[
          { id: 'existente', label: '🔗 Vincular repositório existente' },
          { id: 'novo',      label: '✨ Criar repositório novo'         },
        ].map(({ id, label }) => (
          <button key={id} onClick={() => setModo(id)} style={{
            flex: 1, padding: `${SPACE.sm}px ${SPACE.md}px`,
            borderRadius: RADIUS.md, cursor: 'pointer',
            border: `1.5px solid ${modo === id ? C.accent : C.border}`,
            background: modo === id ? `${C.accent}12` : C.surface,
            color: modo === id ? C.text : C.muted,
            fontSize: FONT.sm, fontWeight: modo === id ? 700 : 400,
            transition: 'all .15s',
          }}>
            {label}
          </button>
        ))}
      </div>

      {/* Formulário: existente */}
      {modo === 'existente' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: `0 ${SPACE.md}px` }}>
          <Campo label="Owner" value={owner} onChange={setOwner} placeholder="adrilemoz" />
          <Campo label="Repositório" value={repo} onChange={setRepo} placeholder="meu-repo" />
        </div>
      )}

      {/* Formulário: novo */}
      {modo === 'novo' && (
        <>
          <Campo label="Nome do repositório" value={nomeNovo} onChange={setNomeNovo} placeholder={nomeProjeto} />
          <Campo label="Descrição (opcional)" value={descricao} onChange={setDescricao} placeholder="O que esse projeto faz?" />
          <label style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, cursor: 'pointer', marginBottom: SPACE.xs }}>
            <input type="checkbox" checked={privado} onChange={e => setPrivado(e.target.checked)}
              style={{ width: 14, height: 14, accentColor: C.accent }} />
            <span style={{ fontSize: FONT.base, fontWeight: 600, color: C.text }}>Repositório privado</span>
          </label>
        </>
      )}

      {/* Mensagem do commit */}
      <Campo
        label="Mensagem do primeiro commit"
        value={msgCommit}
        onChange={setMsgCommit}
        placeholder="feat: initial commit"
      />

      {erro && <DSAlert variant="red">{erro}</DSAlert>}

      <div style={{ display: 'flex', gap: SPACE.sm, justifyContent: 'flex-end' }}>
        <DSBtn variant="ghost" onClick={onPular} disabled={carregando}>
          Pular — não vincular ao GitHub
        </DSBtn>
        <DSBtn variant="primary" onClick={confirmar} loading={carregando}>
          Vincular e publicar no GitHub →
        </DSBtn>
      </div>
    </div>
  )
}

// ── Passo 3: SSE push em tempo real ──────────────────────────

function Passo3({ nomeProjeto, owner, repo, msgCommit, onConcluido }) {
  const [linhas,    setLinhas]    = useState([])
  const [etapa,     setEtapa]     = useState('')
  const [progresso, setProgresso] = useState(0)
  const [status,    setStatus]    = useState(null) // 'success' | 'error'
  const [msgFinal,  setMsgFinal]  = useState('')
  const logRef = useRef(null)

  const iniciar = useCallback(() => {
    const q = new URLSearchParams({
      message: msgCommit,
      autor:   '',
    })
    const base = import.meta.env.VITE_API_URL || 'https://alsistemas.onrender.com/api'
    const url  = `${base}/projetos/${encodeURIComponent(nomeProjeto)}/commit-stream?${q}`
    const es   = new EventSource(url, { withCredentials: true })

    es.onmessage = e => {
      try {
        const ev = JSON.parse(e.data)
        if (ev.type === 'narration') {
          setLinhas(prev => [...prev, { msg: ev.msg, nivel: ev.nivel }])
          requestAnimationFrame(() => {
            logRef.current?.lastElementChild?.scrollIntoView({ behavior: 'smooth' })
          })
        }
        if (ev.type === 'step') {
          setEtapa(ev.etapa); setProgresso(ev.progresso || 0)
        }
        if (ev.type === 'done') {
          setStatus(ev.status); setMsgFinal(ev.msg)
          es.close()
          if (ev.status === 'success') onConcluido()
        }
      } catch {}
    }
    es.onerror = () => {
      setStatus('error'); setMsgFinal('Conexão perdida com o servidor.')
      es.close()
    }

    return () => es.close()
  }, [nomeProjeto, msgCommit, onConcluido])

  // Inicia assim que o componente monta
  useState(() => { const cleanup = iniciar(); return cleanup })

  const corNivel = { info: C.muted, sucesso: C.greenSolid, erro: C.red, aviso: C.amber }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
      {/* Etapa atual */}
      {etapa && !status && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: SPACE.md,
          fontSize: FONT.sm, fontWeight: 600, color: C.text,
        }}>
          <svg style={{ animation: 'adm-spin 1s linear infinite', flexShrink: 0 }}
            viewBox="0 0 24 24" fill="none" stroke={C.blue} strokeWidth="2.5"
            width="14" height="14">
            <path d="M21 12a9 9 0 11-18 0"/>
          </svg>
          {etapa}
        </div>
      )}

      {/* Barra */}
      <div style={{ height: 5, background: C.surface2, borderRadius: RADIUS.xs, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: RADIUS.xs,
          width: `${progresso}%`,
          background: status === 'error'
            ? C.red
            : status === 'success'
              ? C.greenSolid
              : `linear-gradient(90deg, ${C.blue}, ${C.accent})`,
          transition: 'width .5s ease, background .3s',
        }} />
      </div>

      {/* Log narrativo */}
      <div
        ref={logRef}
        style={{
          background: C.surface2, border: `1px solid ${C.border}`,
          borderRadius: RADIUS.md, padding: SPACE.md,
          maxHeight: 200, overflowY: 'auto',
          fontFamily: 'monospace', fontSize: FONT.xs,
          display: 'flex', flexDirection: 'column', gap: 3,
        }}
      >
        {linhas.length === 0 && (
          <span style={{ color: C.muted }}>Iniciando pipeline de commit…</span>
        )}
        {linhas.map((l, i) => (
          <span key={i} style={{ color: corNivel[l.nivel] || C.text, lineHeight: 1.5 }}>
            {l.msg}
          </span>
        ))}
      </div>

      {/* Resultado */}
      {status === 'success' && (
        <DSAlert variant="green">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', gap: SPACE.sm, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700 }}>Publicado com sucesso no GitHub!</span>
            <a
              href={`https://github.com/${owner}/${repo}`}
              target="_blank" rel="noopener noreferrer"
              style={{ color: C.blue, fontWeight: 700, textDecoration: 'none', fontSize: FONT.sm }}
            >
              Abrir {owner}/{repo} ↗
            </a>
          </div>
        </DSAlert>
      )}

      {status === 'error' && (
        <DSAlert variant="red">{msgFinal || 'Falha no push. Tente novamente.'}</DSAlert>
      )}
    </div>
  )
}

// ── Modal principal ───────────────────────────────────────────

export default function ProjetoPublicarModal({ onClose, onConcluido }) {
  const [passo,       setPasso]       = useState(1)
  const [nomeProjeto, setNomeProjeto] = useState('')
  const [arquivos,    setArquivos]    = useState(0)
  const [pushInfo,    setPushInfo]    = useState(null)
  const [pushDone,    setPushDone]    = useState(false)

  function onUploadOk(nome, qtd) {
    setNomeProjeto(nome); setArquivos(qtd); setPasso(2)
    toast.success(`${qtd} arquivos extraídos em projetos/${nome}/`)
  }

  function onPular() {
    onConcluido?.(); onClose()
  }

  function onVincularEPushar(owner, repo, msgCommit) {
    setPushInfo({ owner, repo, msgCommit }); setPasso(3)
  }

  function onPushDone() {
    setPushDone(true)
    onConcluido?.()
  }

  const titulo = ['', 'Publicar projeto', 'Vincular ao GitHub', 'Publicando no GitHub'][passo] || ''

  return (
    <DSModal
      open
      onClose={() => {
        if (passo === 3 && !pushDone) return // bloqueia fechar durante o push
        onClose()
      }}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            width="16" height="16">
            <polyline points="16 16 12 12 8 16"/>
            <line x1="12" y1="12" x2="12" y2="21"/>
            <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3"/>
          </svg>
          {titulo}
        </span>
      }
      size="md"
      headerExtra={<StepBar passo={passo} />}
      footer={
        passo === 3 && (pushDone) ? (
          <DSBtn variant="primary" onClick={onClose}>Fechar</DSBtn>
        ) : null
      }
    >
      {passo === 1 && <Passo1 onConcluido={onUploadOk} />}
      {passo === 2 && (
        <Passo2
          nomeProjeto={nomeProjeto}
          onPular={onPular}
          onVincularEPushar={onVincularEPushar}
        />
      )}
      {passo === 3 && pushInfo && (
        <Passo3
          nomeProjeto={nomeProjeto}
          owner={pushInfo.owner}
          repo={pushInfo.repo}
          msgCommit={pushInfo.msgCommit}
          onConcluido={onPushDone}
        />
      )}
    </DSModal>
  )
}
