// AI Engine — única fonte de verdade dos insights/diagnósticos do sistema.
// Consumido por Central de IA, Dashboard e DRE.

import type { Lead, Task, Client, FinanceEntry, AgendaEvent } from "./mock-data";

export type InsightArea =
  | "Comercial"
  | "Financeiro"
  | "Operacional"
  | "Clientes"
  | "Agenda"
  | "Metas";

export type InsightPriority = "critica" | "alta" | "media" | "baixa";

export interface Insight {
  id: string;
  area: InsightArea;
  titulo: string;
  descricao: string;
  prioridade: InsightPriority;
  impacto: string;
  acaoLabel: string;
  to: string;
  search?: Record<string, string>;
}

export const priorityRank: Record<InsightPriority, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baixa: 3,
};

export function sortByPriority(list: Insight[]): Insight[] {
  return [...list].sort((a, b) => priorityRank[a.prioridade] - priorityRank[b.prioridade]);
}

const HOJE = new Date("2026-07-03");
const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export interface AIInputs {
  leads: Lead[];
  tasks: Task[];
  clients: Client[];
  expenses: FinanceEntry[];
  agenda: AgendaEvent[];
  kpis: { vendasMes: number; metaMes: number; ticketMedio: number };
}

export function gerarInsights(input: AIInputs): Insight[] {
  const { leads, tasks, clients, agenda, kpis } = input;
  const insights: Insight[] = [];

  const leadsSemFollowup = leads.filter((l) => ["novo", "contato"].includes(l.stage)).length;
  if (leadsSemFollowup > 0) {
    insights.push({
      id: "d-leads-followup",
      area: "Comercial",
      titulo: `${leadsSemFollowup} leads sem follow-up`,
      descricao: "Leads em estágios iniciais parados há mais de 48h. Priorize contato ativo hoje.",
      prioridade: "alta",
      impacto: `Potencial em risco: ${BRL(leadsSemFollowup * 4500)}`,
      acaoLabel: "Abrir CRM",
      to: "/comercial",
    });
  }

  const propostasAbertas = leads.filter((l) => l.stage === "proposta").length;
  if (propostasAbertas > 0) {
    insights.push({
      id: "d-propostas",
      area: "Comercial",
      titulo: `${propostasAbertas} propostas aguardando retorno`,
      descricao: "Propostas enviadas há mais de 5 dias sem resposta. Recomendo cadência de nutrição.",
      prioridade: "alta",
      impacto: "Ciclo de venda alongando 22%",
      acaoLabel: "Ver propostas",
      to: "/comercial",
    });
  }

  const tarefasAtrasadas =
    tasks.filter((t) => t.status !== "concluida" && new Date(t.dueDate) < HOJE).length;
  if (tarefasAtrasadas > 0) {
    insights.push({
      id: "d-tarefas-atrasadas",
      area: "Operacional",
      titulo: `${tarefasAtrasadas} tarefas atrasadas`,
      descricao: "Tarefas críticas passaram do prazo. Isso afeta prazos com clientes ativos.",
      prioridade: "critica",
      impacto: "Risco de SLA em contas ativas",
      acaoLabel: "Resolver agora",
      to: "/operacao",
      search: { tab: "tarefas" },
    });
  }

  const clientesVencendo = clients.filter((c) => {
    const d = new Date(c.renewalDate);
    const diff = (d.getTime() - HOJE.getTime()) / 86400000;
    return diff >= 0 && diff <= 30;
  }).length;
  if (clientesVencendo > 0) {
    insights.push({
      id: "d-renovacoes",
      area: "Clientes",
      titulo: `${clientesVencendo} contratos vencendo em 30 dias`,
      descricao: "Prepare pauta de renovação, resultados alcançados e proposta de upsell.",
      prioridade: "media",
      impacto: `MRR em jogo: ${BRL(clientesVencendo * 6500)}`,
      acaoLabel: "Abrir Clientes",
      to: "/clientes",
    });
  }

  const gapMeta = ((kpis.metaMes - kpis.vendasMes) / kpis.metaMes) * 100;
  if (gapMeta > 0) {
    insights.push({
      id: "d-meta",
      area: "Metas",
      titulo: `Você está ${gapMeta.toFixed(1)}% abaixo da meta`,
      descricao: "Faltam poucos dias para o fim do mês. Concentre esforços nas negociações quentes.",
      prioridade: gapMeta > 20 ? "alta" : "media",
      impacto: `Gap: ${BRL(kpis.metaMes - kpis.vendasMes)}`,
      acaoLabel: "Ver funil",
      to: "/comercial",
    });
  }

  insights.push({
    id: "d-margem",
    area: "Financeiro",
    titulo: "Margem caiu 4% vs mês anterior",
    descricao:
      "Aumento das despesas com ferramentas explica boa parte da queda. Reavaliar contratos.",
    prioridade: "media",
    impacto: "Impacto estimado: R$ 2.4k",
    acaoLabel: "Abrir DRE",
    to: "/dre",
  });

  insights.push({
    id: "d-fluxo",
    area: "Financeiro",
    titulo: "Fluxo de caixa negativo em 8 dias",
    descricao: "Projeção indica saldo negativo caso 2 recebimentos atrasem. Antecipe cobranças.",
    prioridade: "critica",
    impacto: "Saldo projetado: -R$ 4.8k",
    acaoLabel: "Abrir DRE",
    to: "/dre",
  });

  insights.push({
    id: "d-conversao",
    area: "Comercial",
    titulo: "Conversão do funil caiu 6%",
    descricao: "Reunião → Proposta perdeu eficiência. Reveja o script de diagnóstico.",
    prioridade: "media",
    impacto: "Menos 2 fechamentos/mês",
    acaoLabel: "Abrir CRM",
    to: "/comercial",
  });

  const clientePausado = clients.find((c) => c.status === "pausado");
  if (clientePausado) {
    insights.push({
      id: "d-churn",
      area: "Clientes",
      titulo: "1 cliente com risco de churn",
      descricao: `${clientePausado.company} está pausado há 12 dias. Recomendo reunião de saúde da conta.`,
      prioridade: "alta",
      impacto: `MRR: ${BRL(clientePausado.monthlyValue)}`,
      acaoLabel: "Ver cliente",
      to: "/clientes",
    });
  }

  const compHoje = agenda.filter((e) => e.date === "2026-07-03").length;
  if (compHoje > 0) {
    insights.push({
      id: "d-agenda",
      area: "Agenda",
      titulo: `${compHoje} compromissos hoje`,
      descricao: "Reuniões e follow-ups agendados. Verifique preparação e materiais.",
      prioridade: "baixa",
      impacto: "Rotina do dia",
      acaoLabel: "Abrir Agenda",
      to: "/operacao",
      search: { tab: "agenda" },
    });
  }

  return insights;
}

export const priorityStyles: Record<
  InsightPriority,
  { chip: string; ring: string; label: string; border: string }
> = {
  critica: {
    chip: "bg-destructive/15 text-destructive",
    ring: "ring-2 ring-destructive/50",
    border: "border-destructive/40",
    label: "Crítica",
  },
  alta: {
    chip: "bg-warning/15 text-warning",
    ring: "ring-warning/30",
    border: "border-border",
    label: "Alta",
  },
  media: {
    chip: "bg-info/15 text-info",
    ring: "ring-info/30",
    border: "border-border",
    label: "Média",
  },
  baixa: {
    chip: "bg-muted text-muted-foreground",
    ring: "ring-border",
    border: "border-border",
    label: "Baixa",
  },
};
