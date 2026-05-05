/**
 * InfraBase.jsx — Primitivos de UI compartilhados pelas 4 abas do AdminInfraestrutura.
 *
 * Exporta: C, Ico, Spin, formatBytes,
 *          PageCard, SectionTitle, Badge, Btn, Input,
 *          StatusDot, BarraProgresso, ModalConfirm
 */
import { useState }  from 'react'
import { T as C }    from '../../../themes/tokens'
import AdminIcon     from '../ui/AdminIcon'

export { C }

export const Ico = {
  gear:    <AdminIcon name="gear"    size={16} />,
  db:      <AdminIcon name="db"      size={16} />,
  cloud:   <AdminIcon name="cloud"   size={16} />,
  eye:     <AdminIcon name="eye"     size={14} />,
  eyeOff:  <AdminIcon name="eyeOff"  size={14} />,
  trash:   <AdminIcon name="trash"   size={14} />,
  save:    <AdminIcon name="save"    size={14} />,
  refresh: <AdminIcon name="refresh" size={14} />,
  check:   <AdminIcon name="check"   size={14} />,
  x:       <AdminIcon name="x"       size={14} />,
  chevL:   <AdminIcon name="chevL"   size={14} />,
  chevR:   <AdminIcon name="chevR"   size={14} />,
  img:     <AdminIcon name="img"     size={14} />,
  video:   <AdminIcon name="video"   size={14} />,
  info:    <AdminIcon name="info"    size={14} />,
  copy:    <AdminIcon name="copy"    size={13} />,
  extLink: <AdminIcon name="extLink" size={12} />,
  cpu:     <AdminIcon name="cpu"     size={16} />,
  memory:  <AdminIcon name="memory"  size={16} />,
  clear:   <AdminIcon name="clear"   size={14} />,
  index:   <AdminIcon name="index"   size={14} />,
}

export function Spin({ size = 16 }) {
  return <AdminIcon name="spinSm" size={size} />
}

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++ }
  return `${bytes.toFixed(1)} ${units[i]}`
}

export function PageCard({ children, style }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 18px', ...style }}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, icon }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
      <span style={{ color: C.blue }}>{icon}</span>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>{children}</h2>
    </div>
  )
}

export function Badge({ color, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + '22', color }}>
      {children}
    </span>
  )
}

export function Btn({ onClick, disabled, loading, variant = 'primary', small, children, style }) {
  const colors = {
    primary: { bg: '#1d4ed8' },
    success: { bg: '#166534' },
    danger:  { bg: '#7f1d1d' },
    ghost:   { bg: 'transparent', border: C.border },
  }
  const clr = colors[variant] || colors.primary
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: small ? '6px 12px' : '9px 16px',
        border: clr.border ? `1px solid ${clr.border}` : 'none',
        borderRadius: 8, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontSize: small ? 12 : 13, fontWeight: 600,
        background: clr.bg, color: disabled ? C.muted : C.text,
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'opacity .15s, background .15s',
        ...style,
      }}
    >
      {loading ? <Spin size={13} /> : null}
      {children}
    </button>
  )
}

export function Input({ label, value, onChange, type = 'text', placeholder, helper, showToggle, style }) {
  const [vis, setVis] = useState(false)
  const inputType = showToggle ? (vis ? 'text' : 'password') : type
  return (
    <div style={{ marginBottom: 14, ...style }}>
      {label && (
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.subtle, marginBottom: 5, letterSpacing: '.04em', textTransform: 'uppercase' }}>
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type={inputType} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: '100%', padding: showToggle ? '9px 40px 9px 12px' : '9px 12px', borderRadius: 8, fontSize: 13, background: C.bg, border: `1.5px solid ${C.border}`, color: C.text, outline: 'none', boxSizing: 'border-box' }}
        />
        {showToggle && (
          <button type="button" onClick={() => setVis(!vis)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex' }}>
            {vis ? Ico.eyeOff : Ico.eye}
          </button>
        )}
      </div>
      {helper && <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{helper}</p>}
    </div>
  )
}

export function StatusDot({ ok }) {
  return (
    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: ok ? C.green : C.red, boxShadow: ok ? `0 0 6px ${C.green}88` : `0 0 6px ${C.red}88` }}/>
  )
}

export function BarraProgresso({ pct, color }) {
  return (
    <div style={{ height: 6, borderRadius: 3, background: C.border, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, pct || 0)}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s' }}/>
    </div>
  )
}

export function ModalConfirm({ titulo, descricao, loading, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 24, maxWidth: 380, width: '100%' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 8 }}>{titulo}</p>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.55 }}>{descricao}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn onClick={onCancel} variant="ghost" disabled={loading}>Cancelar</Btn>
          <Btn onClick={onConfirm} variant="danger" loading={loading}>Confirmar exclusão</Btn>
        </div>
      </div>
    </div>
  )
}
