/**
 * http.js — Cliente HTTP base compartilhado por todos os módulos de serviço.
 * Gerencia cookies HttpOnly, redirecionamento 401 e parse de erros.
 */
export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Base sem o sufixo /api — usado para montar URLs de download autenticado
export const apiBase = BASE_URL.replace(/\/api$/, '')

export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  })
  if (res.status === 401 && !path.startsWith('/auth/')) {
    if (window.location.pathname !== '/login') window.location.href = '/login'
    throw new Error('Sessão expirada. Faça login novamente.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`)
  return data
}
