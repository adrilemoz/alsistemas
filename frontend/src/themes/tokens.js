/**
 * tokens.js — Fonte única de verdade para tokens de design do painel admin.
 *
 * Uso em componentes:
 *   import { T as C } from '../../themes/tokens'
 *   (alias C preserva compatibilidade com código legado)
 *
 * Todas as cores dinâmicas usam CSS variables com fallback para o
 * tema Escuro, que é o padrão do AdminSetup (sem .admin-shell).
 */

export const T = {
  // ── Fundos ────────────────────────────────────────────────────
  pageBg:   '#0f172a',                          // AdminSetup standalone
  bg:       'var(--adm-bg,      #0f172a)',
  surface:  'var(--adm-surface, #1e293b)',
  surf2:    'var(--adm-surface2,#263248)',
  elevated: 'var(--adm-surface2,#263248)',       // alias usado em AdminSetup

  // ── Bordas ────────────────────────────────────────────────────
  border:   'var(--adm-border,  #334155)',
  border2:  'var(--adm-border2, #475569)',
  borderFoc:'var(--adm-blue,    #3b82f6)',

  // ── Texto ─────────────────────────────────────────────────────
  text:     'var(--adm-text,    #f1f5f9)',
  muted:    'var(--adm-muted,   #64748b)',
  subtle:   '#94a3b8',

  // ── Acento do tema (verde floresta por padrão) ─────────────────
  accent:   'var(--adm-accent)',
  accentD:  'var(--adm-accent-d)',
  green:    'var(--adm-accent)',                 // alias semântico (Dashboardn / Infra)

  // ── Verde hardcoded do AdminSetup (botões de ação primária) ────
  greenDk:  '#166534',
  greenHov: '#15803d',
  greenAcc: '#4ade80',

  // ── Cores de estado ───────────────────────────────────────────
  red:      'var(--adm-red,    #dc2626)',
  redDim:   '#7f1d1d',
  amber:    'var(--adm-amber,  #d97706)',
  blue:     'var(--adm-blue,   #3b82f6)',

  // ── Cores fixas ───────────────────────────────────────────────
  orange:   '#f97316',
  yellow:   '#eab308',
  purple:   '#8b5cf6',
  cyan:     '#06b6d4',
}
