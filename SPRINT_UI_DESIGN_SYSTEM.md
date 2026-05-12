# SPRINT_UI_DESIGN_SYSTEM.md
> AL Sistemas — Sprint: Padronização Visual / Design System Global
> Gerado em: 2026-05-10

---

## 1. Diagnóstico Atual

### 1.1 Resumo Executivo

O frontend do AL Sistemas possui **27 páginas admin** e uma base CSS (`admin.css`) com design tokens via CSS variables, mas a adoção desses tokens é irregular. A maioria das páginas ignora o sistema centralizado e replica estilos inline de forma autônoma, resultando em uma interface fragmentada onde **cada tela parece um produto diferente**.

---

### 1.2 Métricas de Inconsistência (levantamento estático)

| Métrica | Valor | Interpretação |
|---|---|---|
| Uso de `style={{...}}` em páginas admin | **1.835 ocorrências** | 77% das definições de estilo são inline |
| Uso de `className=` em páginas admin | **552 ocorrências** | Apenas 23% usam classes CSS |
| Páginas que importam `tokens.js` | **8 de 27** | 70% das páginas ignoram os tokens |
| Valores distintos de `borderRadius` | **12 valores** (2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 20) | Nenhuma escala definida |
| Valores distintos de `fontSize` | **15 valores** (9 a 40px) | Sem escala tipográfica |
| Cores hex hardcoded em JSX | **30+ valores únicos** | Bypass total do sistema de temas |
| Componentes com nome duplicado | **6 grupos** | Btn, Card, Badge, SectionTitle, ServiceChip, AlertBox |

---

### 1.3 Inconsistências Identificadas por Categoria

#### 🎨 Cores — Bypass do Sistema de Temas

As cores deveriam vir exclusivamente de CSS variables (`var(--adm-*)`), mas foram encontradas em JSX inline:

```
#22c55e  (23×) — deveria ser T.greenSolid
#ef4444  (13×) — deveria ser T.red / var(--adm-red)
#3b82f6  (9×)  — deveria ser T.blue / var(--adm-blue)
#8b5cf6  (5×)  — deveria ser T.purple
#f59e0b  (5×)  — deveria ser T.amber / var(--adm-amber)
#6b7c4e  (6×)  — deveria ser T.accent / var(--adm-accent)
```

**Impacto:** Trocar o tema (de Claro para Escuro, por exemplo) não afeta esses elementos — eles ficam com cores erradas em todos os temas que não sejam o claro.

---

#### 📐 Espaçamento — Sem Escala

Padding, margin e gap usam valores arbitrários sem sistema:

```
gap: 0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20  (15 valores)
padding: 14px, 16px, 18px, 20px, 30px  (5 valores para a mesma função)
borderRadius: 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 20  (12 valores)
```

**Impacto:** Widgets visualmente semelhantes têm tamanhos ligeiramente diferentes, criando "desconforto visual" difícil de verbalizar.

---

#### 🔤 Tipografia — Sem Escala

```
fontSize: 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 32, 40px
```

A escala ideal seria 5–6 tamanhos bem definidos (10, 11, 12, 13, 15, 18, 20, 28).

---

#### 🧩 Componentes Duplicados

| Componente | Implementações encontradas | Arquivos |
|---|---|---|
| **Botão** | `adm-btn` (CSS) + `Btn` (InfraBase) + `btnSty()` (AdminSetup) + inline | 4 |
| **Card** | `adm-card` (CSS) + `PageCard` (InfraBase) + `card()` (AdminSetup) + inline | 4 |
| **Badge** | `.adm-badge-*` (CSS) + `Badge` (InfraBase) + `TipoBadge`/`StatusBadge` (AdminErros) + inline | 4 |
| **Título de seção** | `SectionHead` (Dashboard) + `SectionTitle` (InfraBase) + inline em cada página | 6+ |
| **Chip de serviço** | `ServiceChip` (Dashboard) + padrões similares (Infra) | 2 |
| **Alert/InfoBox** | `infoBox()` (AdminSetup) + inline em cada página | 8+ |

---

#### 📑 Abas — Duas Implementações Paralelas

- **Correto:** `<div className="adm-tabs"><button className="adm-tab-btn active">` — usa o CSS do design system
- **Incorreto:** Abas construídas com `style={{ background: aba === id ? '#...' : 'transparent' }}` inline — ignora o sistema

Páginas afetadas pelo padrão incorreto: `AdminRssImport`, `AdminNoticias` (parcial), `AdminUsuarios`.

---

#### 📦 Modais — Construção Inline Repetida

Vários módulos constroem modais com `position: fixed` e estilos inline replicados. Não existe um componente `Modal` centralizado (o `ConfirmModal.jsx` existente só serve para confirmações destrutivas).

---

#### 🏝️ AdminSetup — Completamente Isolado

`AdminSetup.jsx` define localmente:
- `card()` → objeto de estilo JS
- `btnSty()` → objeto de estilo JS com variantes
- `infoBox()` → objeto de estilo JS
- `wrap`, `secTitle`, `divider`, `inputSty` → objetos de estilo locais

**Nenhum desses objetos** usa `tokens.js` ou as classes do `admin.css`. A página funciona de forma totalmente isolada do sistema de design.

---

#### ⚠️ Páginas Sem Tokens (70%)

```
AdminArquivos, AdminBackup, AdminCategorias, AdminConfiguracoes,
AdminErros, AdminEventos, AdminFontes, AdminInfraestrutura,
AdminLayout, AdminModulos, AdminMongoDB, AdminNewsletter,
AdminNoticiaForm, AdminOnibus, AdminRssImport, AdminSetup,
AdminSistema, AdminTemas, AdminUsuarios
```

---

## 2. Proposta de Padronização

### 2.1 Arquitetura do Design System

```
frontend/src/
├── themes/
│   ├── tokens.js          ← FONTE ÚNICA DE VERDADE (expandido)
│   ├── dark.js
│   ├── light.js
│   ├── ocean.js
│   ├── rose.js
│   └── index.js
├── styles/
│   ├── admin.css          ← CSS base existente (mantido)
│   └── ds-extensions.css  ← NOVO: extensões e correções do DS
└── components/admin/ui/
    ├── DS.jsx             ← NOVO: componentes reutilizáveis
    └── AdminIcon.jsx      ← existente
```

---

### 2.2 tokens.js — Tokens Expandidos

O `tokens.js` existente foi expandido com:

#### Cores de Estado Completas
```js
// Antes: apenas cores sólidas
red: 'var(--adm-red, #dc2626)'

// Depois: tokens completos por variante
red:        'var(--adm-red,    #dc2626)',
redBg:      'rgba(220,38,38,.10)',
redBorder:  'rgba(220,38,38,.20)',
```

#### Escala de Espaçamento (`SPACE`)
```js
export const SPACE = { xs:4, sm:6, md:8, lg:12, xl:16, xl2:20, xl3:24, xl4:32, xl5:48 }
```

#### Escala de Border-Radius (`RADIUS`)
```js
export const RADIUS = { xs:4, sm:6, md:8, lg:10, xl:12, xl2:14, pill:20, full:9999 }
```

#### Escala Tipográfica (`FONT`)
```js
export const FONT = { xs:10, sm:11, base:12, md:13, lg:15, xl:18, page:20, stat:28 }
```

#### Funções Helper
```js
badgeStyle(variant)   // → objeto de estilo para badge
alertBoxStyle(variant) // → objeto de estilo para alert/infobox
cardStyle(opts)        // → objeto de estilo para card
```

---

### 2.3 DS.jsx — Componentes Reutilizáveis

Todos os primitivos duplicados são consolidados em um único arquivo:

| Componente | Substitui |
|---|---|
| `DSPageHeader` | `.adm-page-header` inline, cabeçalhos manuais |
| `DSCard` + `DSCard.Section` | `adm-card`, `PageCard` (InfraBase), `card()` (Setup) |
| `DSSectionTitle` | `SectionHead` (Dashboard), `SectionTitle` (InfraBase), títulos inline |
| `DSTabs` + `DSTab` | Abas inline com style condicional |
| `DSBtn` | `adm-btn` CSS inline, `Btn` (InfraBase), `btnSty()` (Setup) |
| `DSField` + `DSInput` | Campos e labels construídos manualmente em cada página |
| `DSToggle` | `.adm-toggle` com `style` inline |
| `DSBadge` | `TipoBadge`, `StatusBadge` (AdminErros), `Badge` (InfraBase), `.adm-badge-*` |
| `DSAlert` | `infoBox()` (Setup), alertas inline em 8+ páginas |
| `DSEmptyState` | `.adm-empty` com conteúdo inline |
| `DSLoadingRow` | `<tr>` de loading construído manualmente |
| `DSTableHeader` | `.adm-table-header` inline |
| `DSTable` | `.adm-table` + scroll wrapper |
| `DSModal` | Modais com `position:fixed` inline em cada página |
| `DSStatCard` | `MetricCard` (Dashboard), `.adm-stat-card` |
| `DSServiceChip` | `ServiceChip` (Dashboard), padrões similares em Infra |

---

### 2.4 ds-extensions.css — Extensões CSS

Complementa o `admin.css` com:
- Escala de espaçamento como CSS custom properties (`--ds-space-*`)
- Escala de border-radius (`--ds-radius-*`)
- Escala tipográfica (`--ds-font-*`)
- Variantes de badge faltantes (`.adm-badge-purple`, `.adm-badge-orange`, `.adm-badge-green`)
- Classes de modal (`.ds-modal-overlay`, `.ds-modal`, `.ds-modal-header`, etc.)
- Classes de alert (`.ds-alert`, `.ds-alert-info`, `.ds-alert-warn`, `.ds-alert-danger`, `.ds-alert-success`)
- Utilitários de layout (`.ds-flex`, `.ds-gap-*`, `.ds-truncate`, etc.)
- Divider semântico (`.ds-divider`)
- Acessibilidade: foco visível para navegação por teclado
- Print: oculta elementos de navegação ao imprimir

---

## 3. Etapas de Implementação

### 🟢 Fase 1 — Fundação (1–2 dias, zero breaking changes)

**Objetivo:** Adicionar os arquivos do design system sem tocar em nenhuma página existente.

```
1. Substituir frontend/src/themes/tokens.js pelo arquivo expandido
2. Adicionar frontend/src/components/admin/ui/DS.jsx
3. Adicionar frontend/src/styles/ds-extensions.css
4. Em main.jsx, adicionar import './styles/ds-extensions.css' após admin.css
```

**Resultado:** O sistema existente continua funcionando. Os novos componentes ficam disponíveis para adoção gradual.

---

### 🟡 Fase 2 — Migração das Páginas Críticas (3–5 dias)

Migrar as páginas com maior volume de inconsistências. Prioridade por impacto:

#### 2.1 AdminSetup.jsx (isolado, alta prioridade)
- Substituir `card()`, `btnSty()`, `infoBox()` por `DSCard`, `DSBtn`, `DSAlert`
- Importar `T` de `tokens.js`
- Adicionar `import '../../themes/tokens'` no topo

#### 2.2 AdminErros.jsx
- Substituir `TipoBadge`/`StatusBadge` por `<DSBadge variant="red">` etc.
- Substituir abas inline por `<DSTabs>/<DSTab>`
- Substituir tabela por `<DSTable>`

#### 2.3 AdminDashboard.jsx
- Substituir `MetricCard` por `<DSStatCard>`
- Substituir `ServiceChip` por `<DSServiceChip>`
- Substituir `SectionHead` por `<DSSectionTitle>`

#### 2.4 AdminGitHub.jsx (251 inline styles — maior infrator)
- Extrair componentes internos repetidos para usar DS
- Migrar cores hardcoded para tokens

#### 2.5 AdminRssImport.jsx + AdminNoticias.jsx
- Migrar abas para `<DSTabs>/<DSTab>`

---

### 🔵 Fase 3 — Migração das Páginas Restantes (5–8 dias)

Para cada página da lista de "Páginas Sem Tokens":

```
1. Adicionar import { T } from '../../themes/tokens'
2. Substituir cores hex hardcoded por T.red, T.blue, etc.
3. Substituir padding/gap arbitrários por SPACE.md, SPACE.xl, etc.
4. Substituir borderRadius arbitrários por RADIUS.sm, RADIUS.lg, etc.
5. Substituir fontSize arbitrários por FONT.base, FONT.md, etc.
```

**Roteiro de arquivo por arquivo:**

| Arquivo | Esforço | Prioridade |
|---|---|---|
| AdminBackup.jsx | Baixo | Alta |
| AdminUsuarios.jsx | Médio | Alta |
| AdminNoticias.jsx | Médio | Alta |
| AdminModulos.jsx | Alto | Média |
| AdminNoticiaForm.jsx | Médio | Alta |
| AdminEventos.jsx | Médio | Média |
| AdminProjetos.jsx | Médio | Média |
| AdminArquivos.jsx | Baixo | Média |
| AdminCategorias.jsx | Baixo | Baixa |
| AdminFontes.jsx | Baixo | Baixa |
| AdminOnibus.jsx | Baixo | Baixa |
| AdminSEO.jsx | Baixo | Baixa |
| AdminNewsletter.jsx | Baixo | Baixa |
| AdminInfraestrutura.jsx | Baixo | Baixa |

---

### 🔴 Fase 4 — Limpeza e Consolidação (2–3 dias)

1. **Remover componentes duplicados** após todas as páginas migrarem:
   - `InfraBase.jsx`: remover `PageCard`, `Btn`, `Badge` (manter utilidades de formatação)
   - Eliminar `card()`, `btnSty()`, `infoBox()` do AdminSetup
   - Eliminar `TipoBadge`, `StatusBadge`, `MetricCard`, `SectionHead`, `ServiceChip` locais

2. **Auditoria final de estilos inline:**
   ```bash
   grep -r "style={{" src/pages/admin/ | wc -l
   # Meta: < 200 (hoje: 1.835)
   ```

3. **Verificar adoção dos tokens:**
   ```bash
   grep -rL "from '.*tokens'" src/pages/admin/*.jsx
   # Meta: lista vazia (todos importam tokens)
   ```

---

## 4. Componentes Afetados

### 4.1 Mapa de Impacto Total

```
frontend/src/
├── themes/tokens.js                    ← MODIFICADO (expandido)
├── styles/ds-extensions.css            ← NOVO
├── components/admin/ui/
│   ├── DS.jsx                          ← NOVO
│   └── InfraBase.jsx                   ← SIMPLIFICADO (Fase 4)
└── pages/admin/
    ├── AdminAIAssistant.jsx            ← Fase 3 (baixo esforço)
    ├── AdminArquivos.jsx               ← Fase 3
    ├── AdminBackup.jsx                 ← Fase 2
    ├── AdminCategorias.jsx             ← Fase 3
    ├── AdminDashboard.jsx              ← Fase 2
    ├── AdminErros.jsx                  ← Fase 2
    ├── AdminEventos.jsx                ← Fase 3
    ├── AdminFontes.jsx                 ← Fase 3
    ├── AdminGitHub.jsx                 ← Fase 2 (alto esforço)
    ├── AdminInfraestrutura.jsx         ← Fase 3
    ├── AdminLayout.jsx                 ← Fase 3
    ├── AdminModulos.jsx                ← Fase 3
    ├── AdminMongo.jsx                  ← Fase 2
    ├── AdminNewsletter.jsx             ← Fase 3
    ├── AdminNoticiaForm.jsx            ← Fase 3
    ├── AdminNoticias.jsx               ← Fase 2
    ├── AdminOnibus.jsx                 ← Fase 3
    ├── AdminProjetos.jsx               ← Fase 3
    ├── AdminRssImport.jsx              ← Fase 2
    ├── AdminSEO.jsx                    ← Fase 3
    ├── AdminSetup.jsx                  ← Fase 2 (isolado, alta prioridade)
    ├── AdminTemas.jsx                  ← Fase 3
    ├── AdminUsuarios.jsx               ← Fase 2
    └── ProjetoSyncModal.jsx            ← Fase 3
```

---

## 5. Regras de Uso — Guia do Desenvolvedor

### 5.1 Import Obrigatório em Novos Componentes

```js
// Sempre importe o objeto T para cores
import { T, SPACE, RADIUS, FONT } from '../../themes/tokens'

// Para componentes UI
import { DSCard, DSBtn, DSBadge, DSAlert, DSModal } from '../ui/DS'
```

### 5.2 Cores — Nunca Hardcode

```jsx
// ❌ ERRADO
<span style={{ color: '#22c55e' }}>Publicado</span>
<div style={{ background: '#ef4444' }}>Erro</div>

// ✅ CORRETO
<span style={{ color: T.greenSolid }}>Publicado</span>
<div style={{ background: T.red }}>Erro</div>

// ✅ MELHOR — usa o componente semântico
<DSBadge variant="green">Publicado</DSBadge>
<DSBadge variant="red">Erro</DSBadge>
```

### 5.3 Espaçamento — Sempre da Escala

```jsx
// ❌ ERRADO
<div style={{ padding: '18px', gap: 9, marginBottom: 22 }}>

// ✅ CORRETO
<div style={{ padding: SPACE.xl, gap: SPACE.md, marginBottom: SPACE.xl2 }}>
```

### 5.4 Border-Radius — Sempre da Escala

```jsx
// ❌ ERRADO
<div style={{ borderRadius: 7 }}>
<span style={{ borderRadius: 20 }}>

// ✅ CORRETO
<div style={{ borderRadius: RADIUS.sm }}>   // 6px — botão
<span style={{ borderRadius: RADIUS.pill }}> // 20px — pílula
```

### 5.5 Tipografia — Sempre da Escala

```jsx
// ❌ ERRADO
<span style={{ fontSize: 9 }}>tiny</span>
<h2 style={{ fontSize: 15 }}>título</h2>

// ✅ CORRETO
<span style={{ fontSize: FONT.xs }}>tiny</span>   // 10px mínimo
<h2 style={{ fontSize: FONT.lg }}>título</h2>     // 15px
```

### 5.6 Badges — Use DSBadge

```jsx
// ❌ ERRADO — cada página define seu próprio
function TipoBadge({ tipo }) { /* ... */ }
function StatusBadge({ status }) { /* ... */ }

// ✅ CORRETO
import { DSBadge } from '../ui/DS'

<DSBadge variant="red">Render</DSBadge>
<DSBadge variant="amber">Investigando</DSBadge>
<DSBadge variant="green">Resolvido</DSBadge>
<DSBadge variant="gray">Ignorado</DSBadge>
```

### 5.7 Alertas — Use DSAlert

```jsx
// ❌ ERRADO
<div style={{ display:'flex', background:'rgba(59,130,246,.1)', border:'1px solid rgba(59,130,246,.2)', ... }}>

// ✅ CORRETO
import { DSAlert } from '../ui/DS'

<DSAlert variant="blue" icon={<InfoIcon />}>
  Serão criados automaticamente os perfis Superadmin, Jornalista e Usuário.
</DSAlert>
```

### 5.8 Abas — Use DSTabs/DSTab

```jsx
// ❌ ERRADO
<div style={{ display:'flex', background:'...', borderRadius:8, ... }}>
  <button style={{ background: aba === 'x' ? '#6b7c4e' : 'transparent', ... }}>

// ✅ CORRETO
import { DSTabs, DSTab } from '../ui/DS'

<DSTabs>
  <DSTab id="noticias" ativo={aba} onClick={setAba}>Notícias</DSTab>
  <DSTab id="categorias" ativo={aba} onClick={setAba}>Categorias</DSTab>
</DSTabs>
```

### 5.9 Modais — Use DSModal

```jsx
// ❌ ERRADO
{aberto && (
  <div style={{ position:'fixed', inset:0, zIndex:500, background:'rgba(0,0,0,.5)', ... }}>
    <div style={{ background:T.surface, borderRadius:12, ... }}>

// ✅ CORRETO
import { DSModal, DSBtn } from '../ui/DS'

<DSModal
  open={aberto}
  onClose={() => setAberto(false)}
  title="Confirmar exclusão"
  footer={
    <>
      <DSBtn variant="danger" onClick={confirmar}>Excluir</DSBtn>
      <DSBtn onClick={() => setAberto(false)}>Cancelar</DSBtn>
    </>
  }
>
  <p>Tem certeza que deseja excluir este item?</p>
</DSModal>
```

---

## 6. Benefícios Esperados

### 6.1 Consistência Visual
- Todos os módulos compartilharão a mesma linguagem visual
- Troca de tema (Claro/Escuro/Ocean/Rose) funcionará em 100% dos elementos
- Espaçamentos e tipografia seguirão escalas harmônicas

### 6.2 Velocidade de Desenvolvimento
- Novos módulos não precisam "inventar" estilos — apenas compõem primitivos
- Redução estimada de 40–60% no código de estilo por nova página
- Onboarding de novos devs facilitado: uma única fonte de verdade

### 6.3 Manutenibilidade
- Alterar o tamanho de um card ou a cor de um badge: 1 local, não 27
- Bugs visuais corrigidos globalmente
- Menor risco de regressão visual em mudanças de tema

### 6.4 Métricas Esperadas Pós-Sprint

| Métrica | Antes | Meta pós-sprint |
|---|---|---|
| Inline style usages | 1.835 | < 200 |
| Páginas sem tokens.js | 19/27 | 0/27 |
| Valores distintos de borderRadius | 12 | 5 (escala RADIUS) |
| Valores distintos de fontSize | 15 | 8 (escala FONT) |
| Cores hex hardcoded | 30+ | 0 |
| Componentes duplicados | 6 grupos | 0 |

---

## 7. Melhorias Futuras

### 7.1 Storybook / Catálogo de Componentes
Criar um catálogo visual em `/admin/design-system` (página interna) mostrando todos os primitivos do DS com suas variantes. Útil para QA visual e onboarding.

### 7.2 Lint Rules (ESLint Custom)
Criar uma regra ESLint que alerte quando um hex color é usado diretamente em `style={{}}` — forçando o uso dos tokens.

```js
// eslint-plugin-alsistemas/no-hardcoded-colors.js
// Alerta: use T.red ao invés de '#ef4444'
```

### 7.3 Testes de Regressão Visual
Integrar Playwright ou Storybook com snapshot tests para garantir que mudanças de tema não quebrem componentes.

### 7.4 Tokens CSS Unificados
Mover os tokens do JS para CSS custom properties também, permitindo que CSS puro (sem JS) acesse os mesmos valores:

```css
.admin-shell {
  --ds-color-red:   var(--adm-red, #dc2626);
  --ds-color-amber: var(--adm-amber, #d97706);
  /* ... */
}
```

### 7.5 Dark Mode Automático (prefers-color-scheme)
Com o design system consolidado, é possível detectar a preferência do sistema operacional e aplicar automaticamente o tema escuro sem intervenção do usuário.

### 7.6 Documentação Gerada Automaticamente
Adicionar JSDoc completo a todos os componentes do DS.jsx e gerar documentação automática com TypeDoc ou similar.

### 7.7 Internacionalização (i18n)
O DS.jsx já está preparado para i18n (todos os textos vêm de props, não estão hardcoded nos componentes). Basta adicionar um contexto de tradução.

---

## Apêndice A — Checklist de Migração por Arquivo

Use este checklist ao migrar cada página:

```
[ ] Importar { T, SPACE, RADIUS, FONT } de tokens.js
[ ] Substituir todos os hex hardcoded por tokens T.*
[ ] Substituir padding/gap/margin arbitrários por SPACE.*
[ ] Substituir borderRadius arbitrários por RADIUS.*
[ ] Substituir fontSize arbitrários por FONT.*
[ ] Substituir badge inline por <DSBadge variant="...">
[ ] Substituir alert/infobox inline por <DSAlert variant="...">
[ ] Substituir abas inline por <DSTabs>/<DSTab>
[ ] Substituir modal inline por <DSModal>
[ ] Substituir card inline por <DSCard>
[ ] Substituir seção título inline por <DSSectionTitle>
[ ] Substituir botões inline por <DSBtn>
[ ] Remover componentes locais duplicados após migração
[ ] Rodar: grep "style={{" arquivo.jsx | wc -l  (meta < 10)
```

---

## Apêndice B — Compatibilidade com Código Legado

O alias `T as C` é mantido indefinidamente:
```js
// Ambas as formas funcionam
import { T }    from '../../themes/tokens'  // preferido
import { T as C } from '../../themes/tokens'  // legado
```

O objeto `T` é um superset do `C` anterior — toda propriedade existente em `C` está em `T` com o mesmo nome. Nenhum código existente quebra.

---

*Documento gerado por análise estática automatizada + revisão de código.*
*Próxima revisão sugerida: ao final de cada fase de implementação.*
