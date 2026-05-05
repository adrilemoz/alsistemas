/**
 * permissions.js — Constantes de negócio relacionadas ao sistema de permissões.
 *
 * Extraído de AdminUsuarios.jsx para centralizar a definição em um único lugar
 * e permitir reuso em outros contextos (ex: AdminSetup, testes).
 *
 * Uso:
 *   import { GRUPOS_PERMISSOES } from '../utils/permissions'
 */

export const GRUPOS_PERMISSOES = [
  { grupo: 'Notícias', perms: [
    { id: 'noticias.ver',     label: 'Ver notícias' },
    { id: 'noticias.criar',   label: 'Criar notícias' },
    { id: 'noticias.editar',  label: 'Editar notícias' },
    { id: 'noticias.excluir', label: 'Excluir notícias' },
  ]},
  { grupo: 'Conteúdo', perms: [
    { id: 'categorias.gerenciar', label: 'Categorias' },
    { id: 'fontes.gerenciar',     label: 'Fontes' },
    { id: 'extras.gerenciar',     label: 'Eventos & Ônibus' },
    { id: 'modulos.gerenciar',    label: 'Módulos da Home' },
    { id: 'newsletter.gerenciar', label: 'Newsletter' },
  ]},
  { grupo: 'Sistema', perms: [
    { id: 'configuracoes.gerenciar', label: 'SEO & Configurações' },
    { id: 'erros.ver',               label: 'Ver Erros/Logs' },
    { id: 'erros.gerenciar',         label: 'Gerenciar Erros/Logs' },
    { id: 'backup.gerenciar',        label: 'Backup do banco' },
    { id: 'usuarios.gerenciar',      label: 'Usuários & Perfis' },
  ]},
]
