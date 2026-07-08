## Plano — Polimento final e verificação

As Fases 1–5 do plano original já foram implementadas. Antes de encerrar, proponho uma rodada curta de **verificação + polimento** para garantir que tudo funciona ponta-a-ponta e que as pontas soltas do plano original ficam fechadas.

### 1. Verificação de build e navegação
- Rodar build para confirmar que não há import quebrado após a remoção das 7 rotas órfãs.
- Varrer `src/` com `rg` procurando referências residuais a `/agenda`, `/financeiro`, `/tarefas`, `/automacoes`, `/projetos`, `/performance`, `/relatorios` e ajustar para `/operacao` ou `/dre`.

### 2. Dashboard consumindo `ai-engine`
- `src/routes/index.tsx` ainda calcula meta/projeção com constantes locais. Trocar o card "IA Executiva" e "Próximas ações" para consumir `gerarInsights()` do `ai-engine.ts` (igual Central de IA e DRE já fazem), mantendo o layout atual.
- Card "Meta do mês" segue com cálculo local (é resumo executivo específico, não insight).

### 3. Data-store realmente conectado
- Confirmar que `DataStoreProvider` está montado no `__root.tsx` e que `comercial.tsx` / dashboard leem da store (não dos mocks estáticos). Ajustar onde ainda estiver lendo mock direto.
- Nota discreta no rodapé do CRM: "Dados mantidos durante a sessão."

### 4. Tarefa com contexto travado
- `TarefaForm` (dentro de `quick-actions.tsx` ou onde estiver) aceita `defaultContext?: { type, id, label }`. Quando presente, o campo cliente/projeto vira chip read-only. Aplicar nos pontos de abertura dentro de `clientes.$clientId.tsx`.

### 5. Kanban — feedback visual pós-drop
- `LeadCard` já tem `border-l-4` por estágio. Adicionar `ring-2 ring-<cor>/40` por 1.5s após movimentação (estado local `justMovedId`) para reforçar a mudança.

### 6. Central de IA — destaque crítico
- Insights com `prioridade === "Crítica"` recebem `ring-2 ring-destructive/50` (se ainda não estiver).

### Fora de escopo (mantido)
- OAuth Meta/Google, backend real, WhatsApp Business API, upload real de arquivo.

### Ordem
1. Verificar build + varrer rotas mortas
2. Refatorar `index.tsx` para usar `ai-engine`
3. Conectar dashboard/CRM ao `data-store`
4. Ajustar `TarefaForm` com `defaultContext`
5. Polimento visual Kanban + Central de IA
6. Build final

Estimativa: ~6 arquivos tocados, nenhuma nova dependência.
