# Refinamento Veloce — SaaS Premium

Vou refinar o sistema existente sem recriar telas, consolidando módulos e elevando a experiência ao nível Linear/Attio/Raycast. Mantenho arquitetura, componentes UI e paleta verde/preto.

## 1. Ajuste de marca
- Sidebar: remover "Performance OS" — deixar apenas **Veloce** (fonte refinada, tracking ajustado).
- Root head: atualizar title/description para "Veloce".

## 2. Nova estrutura de navegação (8 módulos)

```
Dashboard          → /
CRM                → /comercial  (renomear label "CRM Comercial" → "CRM")
Clientes           → /clientes
Operação           → /operacao   (consolida Projetos + Tarefas + Agenda)
Performance        → /performance (visão agregada; detalhe por cliente já existe)
DRE Inteligente    → /dre        (absorve Financeiro)
Central de IA      → /central-ia
Configurações      → /configuracoes
```

Rotas removidas do menu (mas mantidas por retrocompatibilidade, redirecionando para Operação/DRE): `/projetos`, `/tarefas`, `/agenda`, `/financeiro`, `/automacoes`, `/relatorios`.

## 3. Dashboard refinado
Responder "Como está minha agência hoje?" com **cards densos, sem gráficos pesados**:

- **Linha 1 — Pulso do dia**: Leads novos · Aguardando contato · Follow-ups pendentes · Reuniões hoje · Tarefas atrasadas · Cobranças pendentes.
- **Linha 2 — Meta do mês**: Card grande com Meta / Receita atual / Receita prevista / Dias restantes / barra de atingimento.
- **Linha 3 — IA Executiva (destaque)**: bloco premium (não chat) com projeção calculada dinamicamente:
  > "Para bater R$ 80.000, faltam 8 dias. Ritmo atual projeta R$ 71k. Recomendo: 45 prospecções · 18 reuniões · 8 propostas · 5 fechamentos."
  Botões: `Abrir CRM` · `Criar tarefas sugeridas`.
- **Linha 4 — Próximas ações**: lista compacta (top 5) com ação inline.

Remover: gráficos redundantes de conversão histórica e cards decorativos.

## 4. CRM
Adicionar campo **Potencial do Lead** (Alto/Médio/Baixo) — chip colorido na tabela + no modal do lead. Nenhuma outra mudança estrutural.

## 5. Clientes — detalhe com 5 abas
Consolidar página do cliente (`/clientes/$clientId`) em 5 abas via `Tabs` do shadcn:

1. **Geral** — dados, contato, plano, contrato, mensalidade, responsável.
2. **Performance** — cards de integração (Meta Ads, Google Ads, Analytics, GSC, Landing Pages) com status "Não conectado" + botão "Conectar Conta" + botão global "Exportar Relatório" (desabilitado com tooltip "em breve").
3. **Operação** — projetos, checklist, entregas, arquivos, responsáveis, comentários em uma única tela (layout de colunas).
4. **Financeiro** — mensalidade, pagamentos, histórico.
5. **Histórico** — timeline.

A rota atual `/clientes/$clientId/performance` vira uma aba dentro de `/clientes/$clientId`.

## 6. Operação (nova rota consolidada)
Tela única com 3 abas rápidas: **Projetos · Tarefas · Agenda** — reaproveita conteúdo das telas atuais em componentes reutilizáveis; sem duplicação.

## 7. DRE Inteligente
- Absorve conceito de Financeiro (menu Financeiro sai; DRE fica).
- Botão **Novo Lançamento** abre `Dialog` com formulário simples: descrição, categoria, fornecedor, valor, data, forma de pagamento, recorrente, observações, anexo.
- Substituir gráficos complexos por **cards de insight da IA** ("Ferramentas = 18% do faturamento", "Lucro +12% MoM", projeção de lucro).
- Manter apenas 1 gráfico de evolução mensal (essencial).

## 8. Central de IA
Refocar em "O que merece minha atenção hoje?":
- Lista priorizada de alertas: Leads esquecidos, Pagamentos vencidos, Clientes em risco, Tarefas/Projetos atrasados, Gap de meta, Fluxo de caixa.
- Cada alerta com botão de ação contextual (`Resolver agora`, `Abrir CRM`, `Cobrar cliente`, `Criar tarefa`).
- Remover previsões duplicadas do Dashboard; manter apenas resumo executivo diferente.

## 9. Automações (documentadas visualmente)
Card informativo em Central de IA descrevendo automações ativas quando venda = "Fechada": cria Cliente → Projeto → Checklist → Tarefas → Cobrança → Onboarding. Preparação visual apenas (sem backend).

## 10. Polimento visual (Linear/Attio-level)
- Tipografia: pesos e tracking ajustados nos títulos (font-feature-settings "cv11").
- Cards: bordas sutis, hover states com `bg-surface/60`, `transition-colors duration-150`.
- Espaçamento: padronizar `p-4`/`p-5` nos cards, `gap-3` entre grupos.
- Animações: fade+translate suave nas transições de aba (`@starting-style` já no styles.css).
- Ícones: consistência lucide, tamanho `h-4 w-4` no chrome, `h-3.5 w-3.5` em tabelas.

## Arquivos afetados (edição, não recriação)
- `src/components/app-shell.tsx` — nova nav (8 itens), remover "Performance OS".
- `src/routes/__root.tsx` — title/description.
- `src/routes/index.tsx` — dashboard refinado.
- `src/routes/comercial.tsx` — campo Potencial.
- `src/routes/clientes.$clientId.performance.tsx` → transformar em `clientes.$clientId.tsx` com 5 abas (mantém rota atual como redirect para a aba).
- `src/routes/operacao.tsx` (novo consolidador, reaproveita projetos/tarefas/agenda).
- `src/routes/dre.tsx` — botão Novo Lançamento + insights.
- `src/routes/central-ia.tsx` — refocar em alertas acionáveis.
- `src/lib/mock-data.ts` — adicionar `potencial` nos leads, lançamentos DRE.

Rotas legadas (`/projetos`, `/tarefas`, `/agenda`, `/financeiro`, `/automacoes`, `/relatorios`) permanecem acessíveis mas somem do menu.

Aprovar para eu executar?
