# SPRINT_FASE2_CONCLUIDA.md
> AL Sistemas — Relatório da Fase 2 + Plano da Fase 3
> Data: 2026-05-10

---

## ✅ O Que Foi Feito (Fase 1 + Fase 2)

### Fase 1 — Fundação (entregue na sessão anterior)

| Arquivo | Status |
|---|---|
| `themes/tokens.js` | ✅ Expandido com `SPACE`, `RADIUS`, `FONT`, helpers `badgeStyle()`, `alertBoxStyle()`, `cardStyle()` |
| `components/admin/ui/DS.jsx` | ✅ 16 componentes reutilizáveis criados |
| `styles/ds-extensions.css` | ✅ Escalas CSS, variantes de badge, modal, alert, utilitários, print, a11y |

### Fase 2 — Migração das Páginas Críticas (entregue agora)

| Arquivo | Inline Styles Antes | Inline Styles Depois | Redução | Principais Mudanças |
|---|---|---|---|---|
| `SetupForms.jsx` | 89 | 24 | **73%** | `card()`, `btnSty()`, `infoBox()` → `cardStyle()`, `alertBoxStyle()` + tokens |
| `AdminDashboard.jsx` | 135 | 99 | **27%** | `MetricCard` → `DSStatCard`, `ServiceChip` → `DSServiceChip`, `SectionHead` → `DSSectionTitle`, badges → `DSBadge` |
| `AdminErros.jsx` | 95 | 90 | **5%** | `TipoBadge`/`StatusBadge` → `DSBadge`, `StatsBar` → `DSBadge`, `BulkToolbar` → `T.blue`, SPACE/RADIUS/FONT em toda a página |
| `AdminBackup.jsx` | 56 | 51 | **9%** | `ModalConfirm` local → `DSModal`, badge "IMPORTADO" → `DSBadge variant="purple"`, alert amarelo → `DSAlert variant="amber"` |
| `AdminUsuarios.jsx` | 79 | 67 | **15%** | 3 modais inline → `DSModal`, `Badge` local → `DSBadge`, status ativo/inativo → `DSBadge`, `T.*` em toda a página |
| `AdminRssImport.jsx` | 105 | 71 | **32%** | `ModalFonte` inline → `DSModal`, banner → `DSAlert`, badges PADRÃO/INATIVA/AUTO → `DSBadge`, confirmação excluir → `DSBtn` |

**Total Fase 2: 559 → 402 inline styles — redução de 28% nas 6 páginas críticas.**

---

### Hex Hardcoded Eliminados nas Páginas Migradas

```
#ef4444 → C.red / DSBadge variant="red"
#22c55e → C.greenSolid / DSBadge variant="green"
#3b82f6 → C.blue
#f97316 → C.orange
#d97706 / #f59e0b → C.amber
rgba(220,38,38,.1) → C.redBg
rgba(220,38,38,.2) → C.redBorder
rgba(34,197,94,.1) → C.greenBg
rgba(34,197,94,.2) → C.greenBorder
```

### Hex Remanescentes Intencionais

Foram mantidos em dois contextos específicos:

- **`AdminErros` — stack trace viewer**: `#fca5a5`, `#fcd34d`, `#86efac` são cores de sintaxe sobre fundo escuro fixo (`rgba(239,68,68,.05)`). Não devem ser tokenizadas pois são independentes de tema.
- **`AdminUsuarios` — cor dinâmica de perfil**: `#6366f1` é o fallback quando um perfil não tem cor definida pelo usuário. É um valor de dado, não de design.

---

## 🔵 Fase 3 — Próximo Sprint

### Objetivo

Migrar as **19 páginas restantes** que ainda não importam `tokens.js`. Prioridade definida por volume de inline styles e visibilidade no sistema.

### Roteiro de Migração

#### Grupo A — Alto Impacto (fazer primeiro)

| Arquivo | Inline Styles | Principais Problemas | Esforço |
|---|---|---|---|
| `AdminGitHub.jsx` | ~251 | Mais de 250 inline styles — o maior infrator do sistema. Cards locais, badges inline, modais inline, cores hex por todo o arquivo | Alto |
| `AdminNoticias.jsx` | ~180 | Abas `abaAtiva` com `style={{}}` condicional, `SectionTitle` local, badges de categoria inline, modal de filtro inline | Médio |
| `AdminNoticiaForm.jsx` | ~120 | Form complexo com labels e inputs sem `DSField`/`DSInput`, alertas de validação inline | Médio |
| `AdminModulos.jsx` | ~110 | Cards de módulo inline, switch/toggle sem `DSToggle`, seções sem `DSSectionTitle` | Médio |

#### Grupo B — Médio Impacto

| Arquivo | Inline Styles | Principais Problemas | Esforço |
|---|---|---|---|
| `AdminProjetos.jsx` | ~90 | Cards de projeto inline, badges de status, modal de detalhes inline | Médio |
| `AdminEventos.jsx` | ~85 | Cards de evento, form inline sem `DSField`, datas sem formatação padronizada | Baixo |
| `AdminInfraestrutura.jsx` | ~70 | Chips de serviço inline (tem `ServiceChip` paralelo ao `DSServiceChip`) | Baixo |
| `AdminMongoDB.jsx` | ~65 | Tabelas de coleções, badges de status de operação, alertas inline | Baixo |
| `AdminSistema.jsx` | ~60 | Cards de info do sistema, alertas de saúde inline | Baixo |

#### Grupo C — Baixo Impacto (cleanup)

| Arquivo | Inline Styles | Ação |
|---|---|---|
| `AdminArquivos.jsx` | ~45 | Tokens + `DSTable` + `DSBadge` |
| `AdminCategorias.jsx` | ~40 | Tokens + `DSTable` + `DSModal` |
| `AdminFontes.jsx` | ~38 | Tokens + `DSTable` |
| `AdminOnibus.jsx` | ~35 | Tokens + `DSTable` |
| `AdminNewsletter.jsx` | ~30 | Tokens + `DSAlert` + `DSBadge` |
| `AdminSEO.jsx` | ~28 | Tokens + formulário `DSField`/`DSInput` |
| `AdminTemas.jsx` | ~25 | Tokens (já parcialmente usa tokens de cor) |
| `AdminLayout.jsx` | ~20 | Tokens |
| `AdminAIAssistant.jsx` | ~15 | Tokens + `DSBadge` |
| `ProjetoSyncModal.jsx` | ~12 | `DSModal` + tokens |

---

### Checklist de Migração por Arquivo

Para cada arquivo do Grupo A/B, executar nesta ordem:

```
[ ] 1. Adicionar: import { T, SPACE, RADIUS, FONT } from '../../themes/tokens'
[ ] 2. Adicionar: import { DS* } from '../../components/admin/ui/DS'
[ ] 3. Substituir cores hex hardcoded por T.*
[ ] 4. Substituir padding/gap/margin arbitrários por SPACE.*
[ ] 5. Substituir borderRadius por RADIUS.*
[ ] 6. Substituir fontSize por FONT.*
[ ] 7. Substituir badges inline por <DSBadge variant="...">
[ ] 8. Substituir alertas/infoboxes inline por <DSAlert variant="...">
[ ] 9. Substituir modais position:fixed inline por <DSModal>
[ ] 10. Substituir abas com style condicional por <DSTabs>/<DSTab>
[ ] 11. Verificar: grep "style={{" arquivo.jsx | wc -l  (meta por arquivo: < 15)
[ ] 12. Verificar: grep "'#[a-fA-F0-9]'" arquivo.jsx (meta: 0 exceto casos intencionais)
```

---

### Metas da Fase 3

| Métrica | Fase 1+2 (atual) | Meta Fase 3 |
|---|---|---|
| Páginas sem tokens.js | 19/27 | **0/27** |
| Inline styles totais (27 páginas) | ~1.433 | **< 300** |
| Hex hardcoded em JSX | ~21 remanescentes | **0** (exceto intencionais) |
| Modais inline (position:fixed) | ~12 restantes | **0** |
| Abas com style condicional | ~3 restantes | **0** |
| Componentes duplicados ativos | 4 grupos | **1** (cor dinâmica de perfil — intencional) |

---

### Ação de Limpeza (Fase 4 — após Fase 3 completa)

Após todas as páginas migrarem, remover os componentes locais que foram substituídos:

```
InfraBase.jsx     → remover: PageCard, Btn, Badge
                     manter: funções de formatação (fmtBytes, fmtData, etc.)
AdminDashboard.jsx → removidos: MetricCard, ServiceChip, SectionHead (já feito neste sprint)
AdminErros.jsx     → removidos: TipoBadge, StatusBadge (já feito neste sprint)
AdminBackup.jsx    → removido: ModalConfirm local (já feito neste sprint)
AdminUsuarios.jsx  → removido: Badge local (já feito neste sprint)
```

---

## Como Integrar os Arquivos Deste Sprint

### 1. Copiar os arquivos novos/modificados

```
sprint/
├── frontend/src/
│   ├── themes/tokens.js                         → substituir
│   ├── styles/ds-extensions.css                 → adicionar (novo)
│   ├── components/admin/
│   │   ├── ui/DS.jsx                            → adicionar (novo)
│   │   └── setup/SetupForms.jsx                 → substituir
│   └── pages/admin/
│       ├── AdminDashboard.jsx                   → substituir
│       ├── AdminErros.jsx                       → substituir
│       ├── AdminBackup.jsx                      → substituir
│       ├── AdminUsuarios.jsx                    → substituir
│       └── AdminRssImport.jsx                   → substituir
```

### 2. Registrar o CSS de extensões em main.jsx

```jsx
import './styles/admin.css'
import './styles/ds-extensions.css'   // ← adicionar esta linha
```

### 3. Testar as páginas migradas

Verificar visualmente após deploy:
- `AdminDashboard` — stats cards, chips de saúde, seções com título
- `AdminErros` — badges de tipo/status, bulk toolbar, stack trace
- `AdminBackup` — modais de confirmação, badge IMPORTADO, alert amarelo
- `AdminUsuarios` — modais de usuário e perfil, badges de status
- `AdminRssImport` — modal de fonte, alert azul, badges de card

### 4. Smoke test de tema

Trocar para o tema Escuro (ou Ocean) e verificar se as 5 páginas migradas respondem corretamente. Qualquer elemento que não mudar de cor indica um hex hardcoded que escapou.

---

*Próxima sessão: iniciar com AdminGitHub.jsx (maior infrator — 251 inline styles).*
