# Plano de execução — 5 Fases

Trabalho grande com dependências entre fases. Vou executar de ponta a ponta em uma única rodada, respeitando a ordem lógica (fundação antes, UI/tema depois, fluxos por cima). Estimativa: ~25 arquivos alterados/criados.

---

## FASE 1 — Fundação técnica

**1.1 CRM — botões vivos**
- `comercial.tsx`: "+ Novo Lead" e "+ Adicionar lead" abrem o mesmo `LeadForm` de `quick-actions.tsx`. Extrair `LeadForm` como componente reutilizável exportado. Ao abrir a partir de uma coluna, passar `defaultStage`.
- Input "Filtrar leads…" → estado local, filtra `leads` por nome/empresa case-insensitive.
- Botão "Filtrar" → `Popover` com dois grupos: Potencial (checkbox alto/médio/baixo) e Responsável (lista dos owners únicos). Aplicado em combinação com a busca.

**1.2 Lançamento financeiro unificado**
- Novo `src/components/lancamento-form.tsx` com toggle Entrada/Saída (dois botões, não select), categorias dinâmicas conforme o tipo, campos na ordem pedida, botão Salvar desabilitado enquanto tipo não escolhido.
- Substituir `DespesaForm` em `quick-actions.tsx` e `NovoLancamentoDialog` em `dre.tsx` por este componente. Remover código antigo.

**1.3 Rotas órfãs**
- Deletar: `agenda.tsx`, `automacoes.tsx`, `financeiro.tsx`, `performance.tsx`, `projetos.tsx`, `relatorios.tsx`, `tarefas.tsx`.
- Central de IA: atualizar `to` dos diagnósticos:
  - tarefas/agenda → `/operacao` (via `search: { tab: "tarefas" | "agenda" }`, com `operacao.tsx` lendo `useSearch` para abrir a aba certa)
  - financeiro → `/dre`
- `rg` para varrer o `src/` e limpar quaisquer resíduos.

**1.4 Checklist do cliente vem do template**
- Em `mock-data.ts`, adicionar campo `services: string[]` (ids dos templates) em `Client`. Popular clientes existentes.
- Em `clientes.$clientId.tsx` `TabOperacao`, montar checklist agrupado por serviço lendo `serviceTemplates` filtrados por `client.services`. Subtítulo por serviço.

**1.5 Central de IA — ordenar por prioridade**
- Ordem fixa: Crítica > Alta > Média > Baixa (dentro da mesma, ordem original preservada).
- Itens críticos ganham `ring-2 ring-destructive/50` e borda mais forte.

**1.6 ⚠️ IA centralizada (`src/lib/ai-engine.ts`)**
- Nova função `gerarInsights({ leads, tasks, clients, expenses, kpis, agenda })` retorna `Insight[]` com `{ id, area: "Comercial"|"Financeiro"|"Operacional"|"Clientes"|"Agenda", titulo, descricao, prioridade, impacto, acaoLabel, to, search? }`.
- Move a lógica de cálculo hoje espalhada em `central-ia.tsx` para dentro dessa função.
- `central-ia.tsx`: consome `gerarInsights()`, só exibe/ordena/filtra.
- `index.tsx` (Dashboard, card "IA Executiva"): consome `gerarInsights()`, mostra o insight de maior prioridade + resumo executivo específico (meta) mantido.
- `dre.tsx` (Insights): consome `gerarInsights()` filtrando `area === "Financeiro"`.

**1.7 Nova Tarefa — vínculo automático**
- `TarefaForm` recebe `defaultContext?: { type: "client"|"project", id, label }`.
- Quando presente: campo aparece travado (read-only chip) e sem busca. Sem contexto → busca livre como hoje.
- Nos pontos internos (dentro de `clientes.$clientId.tsx` etc), passar o contexto ao abrir.

---

## FASE 2 — Sistema visual

**2.1 Hierarquia de cor**
- `src/styles.css`: manter `--primary` no verde vibrante atual; adicionar `--brand-deep: oklch(0.42 0.14 155)` e classe utilitária `bg-brand-deep`/`text-brand-deep` via `@theme`.
- Auditar componentes e reduzir uso decorativo de `primary` (badges neutros de status → `muted`/`border`; ícones informativos → `text-foreground/70`). Reservar verde para: ações primárias, "Alto potencial"/"Crítico", valores financeiros de destaque, item ativo do menu, cards de MRR/Meta.
- Aplicar `brand-deep` em: card Alto Potencial (CRM), indicador ativo do sidebar, card MRR/Meta do Dashboard.

**2.2 Tema claro/escuro**
- `styles.css`: mover paleta atual para `.dark`, criar `:root` claro com hue 155 recalibrado (lightness/chroma para funcionar em fundo claro).
- Novo `src/lib/theme.tsx` com `ThemeProvider` + `useTheme()`, persiste em `localStorage["veloce-theme"]`, aplica classe `dark` no `<html>`. Default: escuro.
- `__root.tsx`: envolver com `ThemeProvider`. `app-shell.tsx`: remover classe `dark` fixa.
- `configuracoes.tsx`: card "Aparência" expande e mostra seletor Claro/Escuro funcional.

---

## FASE 3 — Comercial → Operacional

**3.1 ⚠️ Nova Venda como único fechamento**
- Instalar `@dnd-kit/core` + `@dnd-kit/sortable`.
- Kanban do CRM vira drag-and-drop. Ao soltar em "Fechado": abre `VendaForm` pré-preenchido, card fica em "otimista" na origem; on confirm → move para Fechado + dispara cadeia (client/project/checklist/invoice via automation-engine). On cancel → volta.
- Serviços marcados no `VendaForm` (multi-select de `serviceTemplates`) definem quais templates aplicar ao cliente criado (conecta com 1.4).

**3.2 Cor por estágio no Kanban**
- `LeadCard` ganha `border-l-4` na cor de `stageColors[stage]`. `transition-colors duration-500`. Após mudança de estágio, `ring-2 ring-<stageColor>/40` por 1.5s (efeito discreto via estado local `justMovedId`).

**3.3 Estado global de leads (memória)**
- Novo `src/lib/data-store.tsx` — `DataStoreProvider` com `leads`, `tasks`, `clients`, `expenses` em `useState`, ações `addLead`, `addTask`, etc. Inicializa com mocks atuais.
- `LeadForm.onSubmit` → `addLead()` real: adiciona à store, cria timeline inicial "Lead criado via [origem]", cria tarefa de follow-up +24h, atualiza contadores/insights.
- Dashboard e Central de IA leem da store, recalculam via `gerarInsights()`.
- Nota discreta no rodapé do CRM: "Dados mantidos durante a sessão. Persistência real será ativada com o banco de dados."

---

## FASE 4 — Cliente: Performance, Documentos

**4.1 Aba Performance nova**
- Novo `src/lib/client-report.ts`:
  - Tipo `IntegracaoAds` com campos opcionais (investimento, cliques, cpl, ctr, roas, impressoes).
  - `gerarResumoCliente(client, periodo)` retorna texto em linguagem simples via template local.
- Instalar `jspdf`. Botão "Exportar PDF" → gera PDF cliente-side. Botão "Enviar por WhatsApp" → `wa.me/<phone>?text=<encoded>` em nova aba.
- Cards de integração (Meta, Google Ads, Analytics, Search Console, Landing Pages): trocar "Conectar Conta" por badge "Disponível em breve" + explicação.

**4.2 Aba Documentos**
- Nova aba no `Tabs` de `clientes.$clientId.tsx` entre Financeiro e Histórico.
- Categorias colapsáveis: Atas, Relatórios, Estratégia, Contratos, Outros.
- Cada uma: botão "Adicionar arquivo" (input file, guarda só nome/tamanho em memória) e "Adicionar link" (título + URL).
- Item mostra: nome, categoria, quem adicionou (usuário mock), data, ícone (file vs link).
- Busca global no topo filtra todas as categorias.

---

## FASE 5 — Configurações

**5.1 Reagrupar em 4 seções**
- "Minha conta" (Perfil, Segurança) / "Workspace" (Workspace, Usuários, Aparência) / "Operação" (Templates, Automações) / "Sistema" (Notificações, Integrações).
- Título uppercase pequeno + gap maior entre seções que entre cards do mesmo grupo.

**5.2 Automações visíveis**
- Card "Automações" vira expansível (`Collapsible`) listando `automationRules` com nome, gatilho (`triggerLabels`), ações (`actionLabels`), categoria, contador, `Switch` de ativo/inativo (estado local).
- Agrupado por categoria (Comercial, Operacional, Financeiro, IA).

---

## Fora de escopo (confirmado)
- OAuth real Meta/Google Ads
- Backend/persistência real
- API WhatsApp Business
- Upload real de arquivos (só nome/link em memória)

## Ordem de execução
1. Deletar rotas órfãs
2. `ai-engine.ts` + `data-store.tsx` + `lancamento-form.tsx` (fundações)
3. `theme.tsx` + `styles.css` (tema)
4. Refactor de `comercial.tsx`, `dre.tsx`, `central-ia.tsx`, `index.tsx`, `clientes.$clientId.tsx`, `configuracoes.tsx`, `operacao.tsx`, `app-shell.tsx`, `quick-actions.tsx`
5. `bun add jspdf @dnd-kit/core @dnd-kit/sortable` e integração
6. Verificar build
