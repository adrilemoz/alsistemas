/**
 * Converte Markdown simples em HTML seguro para exibição de notícias.
 * Suporte: headings, negrito, itálico, links, listas, blockquote, parágrafos.
 */
export function markdownParaHtml(md) {
  if (!md) return ''

  let html = md
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2>$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1>$1</h1>')
    // Negrito e itálico
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g,     '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,         '<em>$1</em>')
    // Links  [texto](url) — apenas protocolos seguros (http/https)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, texto, url) => {
      const urlSegura = /^https?:\/\//i.test(url.trim()) ? url.trim() : '#'
      return `<a href="${urlSegura}" target="_blank" rel="noopener noreferrer">${texto}</a>`
    })
    // Blockquote
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    // Itens de lista
    .replace(/^- (.+)$/gm, '<li>$1</li>')

  // Agrupa <li> consecutivos dentro de <ul>
  html = html.replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)

  // Parágrafos: blocos separados por linha em branco
  html = html
    .split(/\n{2,}/)
    .map(bloco => {
      bloco = bloco.trim()
      if (!bloco) return ''
      if (/^<(h[1-3]|ul|blockquote)/.test(bloco)) return bloco
      return `<p>${bloco.replace(/\n/g, '<br>')}</p>`
    })
    .join('\n')

  return html
}
