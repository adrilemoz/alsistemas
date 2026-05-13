/**
 * projetos.js — Serviço de domínio: Projetos Locais
 *
 * Sprint 3 — ADIÇÃO PURA.
 * Sprint 7 — GitHub Sync: vincular, desvincular, syncStatus, registrarSincronizacao.
 */
import { api } from './http.js'

export const projetosService = {
  /* ── Originais (Sprint 3 — inalterados) ──────────────────── */

  /** Lista todos os projetos do diretório /projetos */
  listar: () => api('/projetos'),

  /** Detalhes de um projeto específico por nome */
  detalhe: (nome) => api(`/projetos/${encodeURIComponent(nome)}`),

  /* ── GitHub Sync (Sprint 7) ───────────────────────────────── */

  /** Envia um ZIP do browser e extrai na pasta Projetos do servidor */
  upload: (formData) =>
    api('/projetos/upload', { method: 'POST', body: formData, headers: {} }),

  /**
   * Vincula um projeto local a um repositório GitHub.
   * O backend verifica se o repo existe antes de salvar.
   */
  vincular: (nome, owner, repo) =>
    api(`/projetos/${encodeURIComponent(nome)}/vincular`, {
      method: 'POST',
      body:   JSON.stringify({ owner, repo }),
    }),

  /**
   * Remove o vínculo entre o projeto local e o repositório GitHub.
   */
  desvincular: (nome) =>
    api(`/projetos/${encodeURIComponent(nome)}/vincular`, {
      method: 'POST',
      body:   JSON.stringify({ owner: null, repo: null }),
    }),

  /**
   * Retorna o status de sincronização do projeto com o GitHub:
   * { vinculado, owner, repo, statusSync, dataPushGitHub, dataLocalModificacao, ... }
   */
  syncStatus: (nome) =>
    api(`/projetos/${encodeURIComponent(nome)}/sync-status`),

  /**
   * Salva timestamp de última sincronização no MongoDB.
   * Deve ser chamado após um pull (salvar-projeto) bem-sucedido.
   */
  registrarSincronizacao: (nome) =>
    api(`/projetos/${encodeURIComponent(nome)}/registrar-sincronizacao`, {
      method: 'POST',
    }),
}
