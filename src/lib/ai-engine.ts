// AI Engine — única fonte de verdade dos insights/diagnósticos do sistema.
// Consumido por Central de IA, Dashboard e DRE.

import type { Lead, Task, Client, FinanceEntry, AgendaEvent } from "./mock-data";

export type InsightArea =
  "Comercial" | "Financeiro" | "Operacional" | "Clientes" | "Agenda" | "Metas";

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

const HOJE = new Date();
const RENEWAL_ALERT_DAYS = 5; // dias de antecedência para alerta crítico de renovação
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
  const { leads, tasks, clients, kpis } = input;
  const insights: Insight[] = [];

  const leadsSemFollowup = leads.filter(
    (l) =>
      ["novo", "contato"].includes(l.stage) &&
      HOJE.getTime() - new Date(l.lastActivity).getTime() > 48 * 3600000,
  ).length;
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

  const propostasAbertas = leads.filter(
    (l) =>
      l.stage === "proposta" && HOJE.getTime() - new Date(l.lastActivity).getTime() > 5 * 86400000,
  ).length;
  if (propostasAbertas > 0) {
    insights.push({
      id: "d-propostas",
      area: "Comercial",
      titulo: `${propostasAbertas} propostas aguardando retorno`,
      descricao:
        "Propostas enviadas há mais de 5 dias sem resposta. Recomendo cadência de nutrição.",
      prioridade: "alta",
      impacto: "Ciclo de venda alongando 22%",
      acaoLabel: "Ver propostas",
      to: "/comercial",
    });
  }

  const tarefasAtrasadas = tasks.filter(
    (t) => t.status !== "concluida" && new Date(t.dueDate) < HOJE,
  ).length;
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

  const clientesVencendoLista = clients.filter((c) => {
    const d = new Date(c.renewalDate);
    const diff = (d.getTime() - HOJE.getTime()) / 86400000;
    return diff >= 0 && diff <= 30;
  });
  if (clientesVencendoLista.length > 0) {
    insights.push({
      id: "d-renovacoes",
      area: "Clientes",
      titulo: `${clientesVencendoLista.length} contratos vencendo em 30 dias`,
      descricao: "Prepare pauta de renovação, resultados alcançados e proposta de upsell.",
      prioridade: "media",
      impacto: `MRR em jogo: ${BRL(clientesVencendoLista.reduce((s, c) => s + c.monthlyValue, 0))}`,
      acaoLabel: "Abrir Clientes",
      to: "/clientes",
    });
  }

  const clientesOnboardingAtrasado = clients.filter(
    (c) =>
      c.status === "onboarding" &&
      c.dataPrevistaFimOnboarding &&
      new Date(c.dataPrevistaFimOnboarding) < HOJE,
  );
  clientesOnboardingAtrasado.forEach((c) => {
    const diasAtraso = Math.floor(
      (HOJE.getTime() - new Date(c.dataPrevistaFimOnboarding!).getTime()) / 86400000,
    );
    insights.push({
      id: `d-onboarding-atraso-${c.id}`,
      area: "Clientes",
      titulo: `Onboarding de ${c.company} atrasado`,
      descricao: `Previsão de conclusão era ${new Date(c.dataPrevistaFimOnboarding!).toLocaleDateString("pt-BR")}. Já são ${diasAtraso} dia(s) além do prazo.`,
      prioridade: "alta",
      impacto: `${diasAtraso} dia(s) de atraso`,
      acaoLabel: "Ver cliente",
      to: "/clientes",
    });
  });

  const clientesRenovacaoProxima = clients.filter((c) => {
    const d = new Date(c.renewalDate);
    const diff = (d.getTime() - HOJE.getTime()) / 86400000;
    return diff >= 0 && diff <= RENEWAL_ALERT_DAYS;
  });
  clientesRenovacaoProxima.forEach((c) => {
    const diasRestantes = Math.ceil(
      (new Date(c.renewalDate).getTime() - HOJE.getTime()) / 86400000,
    );
    insights.push({
      id: `d-renovacao-urgente-${c.id}`,
      area: "Clientes",
      titulo: `Renovação de ${c.company} em ${diasRestantes} dia(s)`,
      descricao:
        "Contrato vence em breve. Confirme a renovação ou agende uma conversa antes do vencimento.",
      prioridade: "critica",
      impacto: `MRR: ${BRL(c.monthlyValue)}`,
      acaoLabel: "Ver cliente",
      to: "/clientes",
    });
  });

  // Mensalidade — diferente da renovação de CONTRATO acima, isso é o dia do
  // mês em que o cliente paga. Avisa 5 dias antes de cada cobrança chegar,
  // pra não deixar cliente ativo passar batido sem confirmar/cobrar a tempo.
  const proximoVencimentoMensalidade = (paymentDay: number) => {
    const candidato = new Date(HOJE.getFullYear(), HOJE.getMonth(), paymentDay);
    if (candidato < HOJE) candidato.setMonth(candidato.getMonth() + 1);
    return candidato;
  };
  const clientesMensalidadeProxima = clients.filter((c) => {
    if (c.status !== "ativo" || !c.paymentDay) return false;
    const diff = (proximoVencimentoMensalidade(c.paymentDay).getTime() - HOJE.getTime()) / 86400000;
    return diff >= 0 && diff <= 5;
  });
  clientesMensalidadeProxima.forEach((c) => {
    const diasRestantes = Math.ceil(
      (proximoVencimentoMensalidade(c.paymentDay).getTime() - HOJE.getTime()) / 86400000,
    );
    insights.push({
      id: `d-mensalidade-${c.id}`,
      area: "Clientes",
      titulo:
        diasRestantes === 0
          ? `Mensalidade de ${c.company} vence hoje`
          : `Mensalidade de ${c.company} vence em ${diasRestantes} dia(s)`,
      descricao: "Confirme o recebimento assim que a cobrança acontecer, no DRE Inteligente.",
      prioridade: diasRestantes === 0 ? "critica" : "media",
      impacto: BRL(c.monthlyValue),
      acaoLabel: "Ver DRE",
      to: "/dre",
    });
  });

  const gapMeta = ((kpis.metaMes - kpis.vendasMes) / kpis.metaMes) * 100;
  if (gapMeta > 0) {
    insights.push({
      id: "d-meta",
      area: "Metas",
      titulo: `Você está ${gapMeta.toFixed(1)}% abaixo da meta`,
      descricao:
        "Faltam poucos dias para o fim do mês. Concentre esforços nas negociações quentes.",
      prioridade: gapMeta > 20 ? "alta" : "media",
      impacto: `Gap: ${BRL(kpis.metaMes - kpis.vendasMes)}`,
      acaoLabel: "Ver funil",
      to: "/comercial",
    });
  }

  // ── Margem e fluxo de caixa: calculados a partir dos lançamentos reais ──
  // (antes eram textos fixos; agora só aparecem quando há dado real que sustente a afirmação)
  const porMes = (mes: string) => {
    const doMes = input.expenses.filter((e) => e.date.startsWith(mes));
    const entradas = doMes.filter((e) => e.type === "entrada").reduce((s, e) => s + e.amount, 0);
    const saidas = doMes.filter((e) => e.type === "saida").reduce((s, e) => s + e.amount, 0);
    return { entradas, saidas, saldo: entradas - saidas, temDados: doMes.length > 0 };
  };
  // Prioriza o mês ATUAL do calendário (evita que uma cobrança futura, com data mais distante,
  // "sequestre" a análise pra um mês que ainda nem começou de verdade).
  const hojeMesISO = new Date().toISOString().slice(0, 7);
  const mesesComDados = [...new Set(input.expenses.map((e) => e.date.slice(0, 7)))].sort();
  const mesRef = mesesComDados.includes(hojeMesISO)
    ? hojeMesISO
    : mesesComDados[mesesComDados.length - 1];
  const mesRefIdx = mesRef ? mesesComDados.indexOf(mesRef) : -1;
  const mesAnteriorRef = mesRefIdx > 0 ? mesesComDados[mesRefIdx - 1] : null;

  if (mesRef) {
    const atual = porMes(mesRef);

    if (atual.saldo < 0) {
      insights.push({
        id: "d-fluxo",
        area: "Financeiro",
        titulo: "Fluxo de caixa negativo no mês",
        descricao: `As saídas (${BRL(atual.saidas)}) superaram as entradas (${BRL(atual.entradas)}) no mês. Antecipe cobranças ou revise despesas.`,
        prioridade: "critica",
        impacto: `Saldo do mês: ${BRL(atual.saldo)}`,
        acaoLabel: "Abrir DRE",
        to: "/dre",
      });
    }

    if (mesAnteriorRef) {
      const anterior = porMes(mesAnteriorRef);
      if (atual.entradas > 0 && anterior.entradas > 0) {
        const margemAtual = (atual.saldo / atual.entradas) * 100;
        const margemAnterior = (anterior.saldo / anterior.entradas) * 100;
        const delta = margemAtual - margemAnterior;
        if (delta < -0.5) {
          insights.push({
            id: "d-margem",
            area: "Financeiro",
            titulo: `Margem caiu ${Math.abs(delta).toFixed(1)}pp vs mês anterior`,
            descricao: `Margem líquida foi de ${margemAnterior.toFixed(1)}% para ${margemAtual.toFixed(1)}%. Revise despesas do período.`,
            prioridade: "media",
            impacto: `Margem atual: ${margemAtual.toFixed(1)}%`,
            acaoLabel: "Abrir DRE",
            to: "/dre",
          });
        }
      }
    }
  }

  // ── Conversão do funil: taxa real com base nos leads já decididos (fechado/perdido) ──
  const leadsDecididos = leads.filter((l) => l.stage === "fechado" || l.stage === "perdido");
  if (leadsDecididos.length >= 3) {
    const fechados = leadsDecididos.filter((l) => l.stage === "fechado").length;
    const taxaConversao = (fechados / leadsDecididos.length) * 100;
    insights.push({
      id: "d-conversao",
      area: "Comercial",
      titulo: `Taxa de conversão do funil: ${taxaConversao.toFixed(0)}%`,
      descricao: `${fechados} de ${leadsDecididos.length} leads decididos viraram cliente. ${taxaConversao < 30 ? "Vale revisar o script de diagnóstico e proposta." : "Ritmo saudável de fechamento."}`,
      prioridade: taxaConversao < 30 ? "media" : "baixa",
      impacto: `${fechados} fechamentos de ${leadsDecididos.length} decisões`,
      acaoLabel: "Abrir CRM",
      to: "/comercial",
    });
  }

  const clientePausado = clients.find((c) => c.status === "pausado");
  if (clientePausado) {
    insights.push({
      id: "d-churn",
      area: "Clientes",
      titulo: "1 cliente com risco de churn",
      descricao: `${clientePausado.company} está com status pausado. Recomendo reunião de saúde da conta.`,
      prioridade: "alta",
      impacto: `MRR: ${BRL(clientePausado.monthlyValue)}`,
      acaoLabel: "Ver cliente",
      to: "/clientes",
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
