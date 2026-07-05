// Motor de Automações — camada declarativa (sem execução real ainda).
// Base para conectar ao backend quando o Lovable Cloud for ativado.

export type AutomationTrigger =
  | "lead.created"
  | "lead.stage_changed"
  | "lead.stuck"
  | "deal.won"
  | "deal.lost"
  | "expense.created"
  | "invoice.overdue"
  | "contract.renewal_soon"
  | "task.overdue";

export type AutomationAction =
  | "alert"
  | "reminder"
  | "task.create"
  | "client.create"
  | "project.create"
  | "checklist.create"
  | "invoice.create"
  | "onboarding.start"
  | "dashboard.highlight"
  | "dre.update"
  | "cashflow.update"
  | "forecast.update"
  | "ia.notify"
  | "ia.reanalyze";

export interface AutomationRule {
  id: string;
  name: string;
  when: AutomationTrigger;
  condition?: string;
  do: AutomationAction[];
  active: boolean;
  category: "Comercial" | "Operacional" | "Financeiro" | "IA";
  runs: number;
}

export const automationRules: AutomationRule[] = [
  {
    id: "ar-1",
    name: "Lead parado por 3 dias",
    when: "lead.stuck",
    condition: "sem interação há 3 dias",
    do: ["alert", "reminder", "ia.notify"],
    active: true,
    category: "Comercial",
    runs: 12,
  },
  {
    id: "ar-2",
    name: "Venda fechada → operação completa",
    when: "deal.won",
    do: ["client.create", "project.create", "checklist.create", "invoice.create", "onboarding.start"],
    active: true,
    category: "Operacional",
    runs: 8,
  },
  {
    id: "ar-3",
    name: "Nova despesa cadastrada",
    when: "expense.created",
    do: ["dre.update", "cashflow.update", "forecast.update", "ia.reanalyze"],
    active: true,
    category: "Financeiro",
    runs: 47,
  },
  {
    id: "ar-4",
    name: "Pagamento vencido",
    when: "invoice.overdue",
    do: ["alert", "dashboard.highlight", "task.create"],
    active: true,
    category: "Financeiro",
    runs: 3,
  },
  {
    id: "ar-5",
    name: "Contrato vence em 30 dias",
    when: "contract.renewal_soon",
    condition: "renovação em ≤ 30 dias",
    do: ["task.create", "reminder", "ia.notify"],
    active: true,
    category: "Comercial",
    runs: 5,
  },
  {
    id: "ar-6",
    name: "Novo lead → follow-up 24h",
    when: "lead.created",
    do: ["task.create", "reminder"],
    active: true,
    category: "Comercial",
    runs: 47,
  },
];

export const actionLabels: Record<AutomationAction, string> = {
  alert: "Criar alerta",
  reminder: "Criar lembrete",
  "task.create": "Criar tarefa",
  "client.create": "Criar cliente",
  "project.create": "Criar projeto",
  "checklist.create": "Criar checklist",
  "invoice.create": "Criar cobrança",
  "onboarding.start": "Iniciar onboarding",
  "dashboard.highlight": "Destacar no dashboard",
  "dre.update": "Atualizar DRE",
  "cashflow.update": "Atualizar fluxo de caixa",
  "forecast.update": "Atualizar previsões",
  "ia.notify": "Notificar IA",
  "ia.reanalyze": "Reanalisar IA",
};

export const triggerLabels: Record<AutomationTrigger, string> = {
  "lead.created": "Lead criado",
  "lead.stage_changed": "Lead mudou de etapa",
  "lead.stuck": "Lead parado",
  "deal.won": "Venda fechada",
  "deal.lost": "Venda perdida",
  "expense.created": "Nova despesa",
  "invoice.overdue": "Pagamento vencido",
  "contract.renewal_soon": "Contrato próximo de vencer",
  "task.overdue": "Tarefa atrasada",
};
