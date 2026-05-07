# AL Sistemas — Análise de Melhorias: AdminDashboard

Documento gerado após revisão completa do `AdminDashboard.jsx` (Sprint 2–4).
Organizado por impacto e esforço de implementação.

---

## 🔴 Prioridade Alta — Impacto direto no uso diário

### 1. Botão de Refresh manual na Saúde do Sistema

**Problema:** O auto-refresh acontece a cada 30 segundos (`useSystemHealth`). O administrador não tem como forçar uma atualização imediata após resolver um incidente.

**Solução:** Adicionar um botão `⟳ Atualizar` que chama `health.atualizar()` (já exposto pelo hook). Incluir timestamp da última verificação.

```jsx
// No SectionHead da seção 1:
action={
  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
    <span style={{ fontSize:10, color:C.muted }}>
      atualizado {hora}
    </span>
    <button onClick={health.atualizar} style={{ ... }}>⟳</button>
    <Link to="/admin/infraestrutura">Ver infraestrutura →</Link>
  </div>
}
```

---

### 2. Estado de erro visível quando o Health Check falha

**Problema:** Se `/api/health` retornar erro (`health.erro !== null`), o dashboard exibe os chips todos vermelhos mas não explica o motivo. O administrador não sabe se é o servidor inteiro que caiu ou apenas um serviço.

**Solução:** Adicionar um banner de erro explícito acima dos chips quando `health.erro` estiver preenchido.

```jsx
{health.erro && (
  <div style={{ background:'#ef444418', border:'1px solid #ef444430',
    borderRadius:8, padding:'8px 14px', marginBottom:12,
    fontSize:12, color:'#ef4444' }}>
    ⚠ Falha ao comunicar com a API: {health.erro}
  </div>
)}
```

---

### 3. Indicador de tendência nos MetricCards (usuários / erros)

**Problema:** Os cards de métricas mostram valores absolutos mas não indicam se a situação está melhorando ou piorando em relação ao período anterior.

**Solução:** O `useUsersStats` e `useSystemLogs` podem expor um campo `tendencia` (comparando com a semana passada) para renderizar uma seta ↑↓ colorida no card.

**Backend necessário:** `GET /admin/usuarios/stats?comparar=7d` retornando `{ atual, anterior }`.

---

### 4. Paginação / virtualização nas listas de Erros e Audit Log

**Problema:** As listas mostram apenas 6 itens fixos com `slice(0,6)` e sem indicação visual de quantos existem ao total além dos exibidos.

**Solução:** Substituir o `slice` fixo por um contador clicável: *"Ver todos → (38 erros)"*. O link já existe, apenas o número total deveria aparecer no cabeçalho da seção, não escondido no botão de link.

---

## 🟡 Prioridade Média — Melhora a experiência sem quebrar nada

### 5. Card de Integrações Externas — detalhe do usuário GitHub

**Problema atual:** O chip do GitHub mostra "X req restantes" mas não exibe o usuário/organização autenticado, dificultando saber se o token correto está configurado.

**Solução:** Expor `health.github.login` (lido do `/rate_limit` response `{ rate, resources }` — o login vem do header `X-OAuth-Scopes` ou do endpoint `/user`) e exibi-lo como `detalhe` no `ServiceChip`.

**Já implementado parcialmente:** `githubClient.js` faz chamadas autenticadas; basta adicionar `/user` ao health check e retornar `login`.

---

### 6. Mini-gráfico de Latência API (sparkline)

**Problema:** A latência da API é mostrada como um número estático. Uma variação de 150ms→450ms seria invisível para o administrador que não abre a página com frequência.

**Solução:** Manter um histórico circular das últimas 10 medições de `api.latencia` em estado local no dashboard e renderizar um sparkline SVG simples (sem bibliotecas externas).

```js
// No componente:
const [latHistory, setLatHistory] = useState([])
useEffect(() => {
  if (!health.loading && health.api.latencia != null) {
    setLatHistory(h => [...h.slice(-9), health.api.latencia])
  }
}, [health.loading, health.api.latencia])
```

---

### 7. Skeleton loading nos cards (substituir "···")

**Problema:** Os valores "···" e "Carregando…" são funcionais mas pouco elegantes. Em conexões lentas, toda a seção aparece "vazia" por vários segundos.

**Solução:** Substituir `···` por componentes `SkeletonLine` com animação de shimmer. Não requer biblioteca — apenas CSS `@keyframes`:

```css
@keyframes shimmer {
  from { background-position: -200px 0; }
  to   { background-position: 200px 0; }
}
.skeleton {
  background: linear-gradient(90deg, var(--adm-surf2) 25%, var(--adm-border) 50%, var(--adm-surf2) 75%);
  background-size: 400px 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 4px;
}
```

---

### 8. Botão de silenciar alertas (snooze) na seção de Inteligência

**Problema:** Alertas críticos repetidos da seção 6 (IA) aparecem toda vez que o dashboard abre, mesmo que o administrador já esteja ciente.

**Solução:** Adicionar um botão `Silenciar por 24h` que armazena o ID do alerta em `localStorage` e suprime a exibição até expirar.

---

### 9. Filtro de período nas Métricas SaaS

**Problema:** Os 4 MetricCards (usuários, ativos, erros, perfis) mostram valores totais atemporais. Não é possível saber se 5 novos usuários se cadastraram hoje ou na semana passada.

**Solução:** Adicionar um seletor de período `[7d | 30d | Total]` no header da Seção 2 que passa o parâmetro `?periodo=7d` para as chamadas de `useUsersStats` e `useSystemLogs`.

---

## 🟢 Prioridade Baixa — Refinamento visual e UX

### 10. Ordenação das colunas na seção de Usuários

**Problema:** A lista de usuários é ordenada por `ultimo_login` (mais recente primeiro), o que é útil, mas não há indicação visual deste critério nem opção de reordenar por nome ou perfil.

**Solução:** Adicionar cabeçalho clicável `Nome ↑` / `Último acesso ↓` que alterna `sortKey` em estado local.

---

### 11. Módulo Portal (legado) colapsável

**Problema:** A seção "Módulo: Portal (legado)" ocupa espaço fixo mesmo que o sistema não use mais o portal. Aumenta o scroll desnecessariamente.

**Solução:** Tornar a seção expansível/colapsável com estado salvo em `localStorage`:

```jsx
const [portalAberto, setPortalAberto] = useState(
  () => localStorage.getItem('dashboard.portal.aberto') !== 'false'
)
```

---

### 12. Atalhos de teclado no Dashboard

**Problema:** Administradores power-users precisam navegar com mouse. Não há atalhos de teclado.

**Solução:** Adicionar `useEffect` com listeners:
- `R` → `health.atualizar()`
- `G` → navegar para `/admin/github`
- `U` → navegar para `/admin/usuarios`
- `E` → navegar para `/admin/erros`

---

### 13. Contador de notificações no título da aba (favicon badge)

**Problema:** Quando o administrador tem o painel em segundo plano, não sabe se novos erros apareceram.

**Solução:** Usar `document.title` dinamicamente:

```js
useEffect(() => {
  const n = logs.contagemErros.nao_lidos
  document.title = n > 0 ? `(${n}) AL Sistemas` : 'AL Sistemas'
}, [logs.contagemErros.nao_lidos])
```

---

## 📋 Resumo Executivo

| # | Melhoria | Esforço | Impacto |
|---|---|---|---|
| 1 | Refresh manual | Baixo | Alto |
| 2 | Banner de erro do health | Baixo | Alto |
| 3 | Tendência nas métricas | Alto (backend) | Alto |
| 4 | Total visível nos logs | Baixo | Médio |
| 5 | Login GitHub no chip | Médio | Médio |
| 6 | Sparkline de latência | Médio | Médio |
| 7 | Skeleton loading | Médio | Médio |
| 8 | Snooze de alertas | Baixo | Médio |
| 9 | Filtro de período | Alto | Médio |
| 10 | Ordenação de usuários | Baixo | Baixo |
| 11 | Portal colapsável | Baixo | Baixo |
| 12 | Atalhos de teclado | Baixo | Baixo |
| 13 | Título da aba dinâmico | Baixo | Baixo |

**Recomendação de sprint:**
- **Agora (baixo esforço/alto impacto):** #1, #2, #4, #8, #13
- **Próximo sprint:** #5, #6, #7, #11, #12
- **Sprint futuro (requer backend):** #3, #9
