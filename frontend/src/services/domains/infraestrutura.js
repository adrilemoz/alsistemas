import { api } from './http.js'

export const infraestruturaService = {
  async testarConexoes() {
    return api('/admin/infraestrutura/testar-conexoes', { method: 'POST', body: '{}' })
  },
  async mongoStatus()         { return api('/admin/infraestrutura/mongodb/status') },
  async mongoColecoes()       { return api('/admin/infraestrutura/mongodb/colecoes') },
  async mongoDocumentos(nome, page = 1, limit = 20, q = '') {
    const p = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (q) p.set('q', q)
    return api(`/admin/infraestrutura/mongodb/colecoes/${encodeURIComponent(nome)}?${p}`)
  },
  async mongoExcluirDoc(colecao, id) {
    return api(`/admin/infraestrutura/mongodb/colecoes/${encodeURIComponent(colecao)}/doc/${id}`, { method: 'DELETE' })
  },
  async mongoStatsColecao(nome) {
    return api(`/admin/infraestrutura/mongodb/colecoes/${encodeURIComponent(nome)}/stats`)
  },
  async mongoIndices(nome) {
    return api(`/admin/infraestrutura/mongodb/colecoes/${encodeURIComponent(nome)}/indices`)
  },
  async mongoCriarIndice(nome, campos, unique = false) {
    return api(`/admin/infraestrutura/mongodb/colecoes/${encodeURIComponent(nome)}/indices`, {
      method: 'POST',
      body: JSON.stringify({ campos, unique, background: true }),
    })
  },
  async mongoRemoverIndice(nome, nomeIndice) {
    return api(`/admin/infraestrutura/mongodb/colecoes/${encodeURIComponent(nome)}/indices/${encodeURIComponent(nomeIndice)}`, {
      method: 'DELETE',
    })
  },
  async cloudinaryStatus()    { return api('/admin/infraestrutura/cloudinary/status') },
  async cloudinaryRecursos(tipo = 'image', max = 20, cursor = null) {
    const p = new URLSearchParams({ tipo, max: String(max) })
    if (cursor) p.set('cursor', cursor)
    return api(`/admin/infraestrutura/cloudinary/recursos?${p}`)
  },
  async cloudinaryExcluir(public_id, tipo = 'image') {
    return api('/admin/infraestrutura/cloudinary/recursos', {
      method: 'DELETE', body: JSON.stringify({ public_id, tipo }),
    })
  },
  async sistemaMetricas()     { return api('/admin/infraestrutura/sistema/metricas') },
  async limparCache()         { return api('/admin/infraestrutura/sistema/limpar-cache', { method: 'POST', body: '{}' }) },
}
