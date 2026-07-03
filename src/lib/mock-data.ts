// Centralized mock data for the Veloce Performance OS.
// Structured to mirror a future Supabase schema (multi-tenant ready).

export type LeadStage =
  | "novo"
  | "contato"
  | "diagnostico"
  | "reuniao"
  | "proposta"
  | "negociacao"
  | "fechado"
  | "perdido";

export const stageLabels: Record<LeadStage, string> = {
  novo: "Lead Novo",
  contato: "Contato Realizado",
  diagnostico: "Diagnóstico",
  reuniao: "Reunião Agendada",
  proposta: "Proposta Enviada",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

export const stageOrder: LeadStage[] = [
  "novo",
  "contato",
  "diagnostico",
  "reuniao",
  "proposta",
  "negociacao",
  "fechado",
  "perdido",
];

export interface Lead {
  id: string;
  name: string;
  company: string;
  phone: string;
  instagram?: string;
  site?: string;
  city: string;
  origin: "Instagram" | "Indicação" | "Google Ads" | "LinkedIn" | "Site" | "Outbound";
  owner: string;
  stage: LeadStage;
  value: number;
  createdAt: string;
  lastActivity: string;
  tags?: string[];
}

const owners = ["Rafael Souza", "Camila Torres", "Bruno Lima", "Ana Prado"];
const cities = ["São Paulo", "Rio de Janeiro", "Curitiba", "Belo Horizonte", "Florianópolis", "Porto Alegre"];
const origins: Lead["origin"][] = ["Instagram", "Indicação", "Google Ads", "LinkedIn", "Site", "Outbound"];

const leadSeed: Array<[string, string, LeadStage, number]> = [
  ["Marina Costa", "Studio Marina Arquitetura", "novo", 3500],
  ["Diego Fernandes", "DF Odontologia", "novo", 2800],
  ["Larissa Melo", "Clínica Vitalis", "novo", 4200],
  ["Pedro Almeida", "Almeida Advogados", "contato", 5000],
  ["Juliana Santos", "Bella Estética", "contato", 3200],
  ["Rodrigo Alves", "RA Consultoria", "diagnostico", 6500],
  ["Fernanda Rocha", "Rocha Imóveis", "diagnostico", 8000],
  ["Marcelo Dias", "Dias & Cia Contabilidade", "reuniao", 4500],
  ["Patrícia Nunes", "Nunes Nutrição", "reuniao", 3000],
  ["Gustavo Ribeiro", "Ribeiro Motors", "proposta", 9500],
  ["Carolina Braga", "Braga Interiores", "proposta", 5500],
  ["Thiago Moreira", "TM Fitness", "negociacao", 7200],
  ["Isabela Gomes", "Gomes Cosméticos", "negociacao", 6800],
  ["André Pereira", "Pereira Ortopedia", "fechado", 8500],
  ["Vanessa Lopes", "Lopes Psicologia", "fechado", 3500],
  ["Ricardo Barros", "Barros Seguros", "fechado", 12000],
  ["Beatriz Cunha", "Cunha Pet Shop", "perdido", 2500],
  ["Leandro Faria", "Faria Construtora", "perdido", 15000],
];

export const leads: Lead[] = leadSeed.map(([name, company, stage, value], i) => ({
  id: `lead-${i + 1}`,
  name,
  company,
  phone: `+55 11 9${String(80000000 + i * 1234).slice(0, 8)}`,
  instagram: `@${company.toLowerCase().replace(/[^a-z]/g, "").slice(0, 14)}`,
  site: `${company.toLowerCase().replace(/[^a-z]/g, "").slice(0, 10)}.com.br`,
  city: cities[i % cities.length],
  origin: origins[i % origins.length],
  owner: owners[i % owners.length],
  stage,
  value,
  createdAt: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
  lastActivity: new Date(Date.now() - i * 3600000 * 5).toISOString(),
  tags: i % 3 === 0 ? ["Alta prioridade"] : i % 3 === 1 ? ["Recorrente"] : ["Frio"],
}));

export interface Client {
  id: string;
  name: string;
  company: string;
  plan: "Starter" | "Growth" | "Scale" | "Enterprise";
  monthlyValue: number;
  paymentDay: number;
  renewalDate: string;
  owner: string;
  status: "ativo" | "onboarding" | "pausado" | "cancelado";
  since: string;
  services: string[];
}

export const clients: Client[] = [
  { id: "c-1", name: "André Pereira", company: "Pereira Ortopedia", plan: "Growth", monthlyValue: 8500, paymentDay: 5, renewalDate: "2026-11-15", owner: "Rafael Souza", status: "ativo", since: "2025-01-15", services: ["Tráfego Pago", "Landing Page"] },
  { id: "c-2", name: "Vanessa Lopes", company: "Lopes Psicologia", plan: "Starter", monthlyValue: 3500, paymentDay: 10, renewalDate: "2026-08-01", owner: "Camila Torres", status: "ativo", since: "2025-04-01", services: ["Tráfego Pago"] },
  { id: "c-3", name: "Ricardo Barros", company: "Barros Seguros", plan: "Scale", monthlyValue: 12000, paymentDay: 15, renewalDate: "2027-02-20", owner: "Bruno Lima", status: "ativo", since: "2024-11-20", services: ["Tráfego Pago", "Automações", "Consultoria"] },
  { id: "c-4", name: "Helena Martins", company: "Martins Odontologia", plan: "Growth", monthlyValue: 7500, paymentDay: 20, renewalDate: "2026-09-10", owner: "Rafael Souza", status: "ativo", since: "2025-03-10", services: ["Tráfego Pago", "Geração de Demanda"] },
  { id: "c-5", name: "Otávio Freitas", company: "Freitas Advocacia", plan: "Enterprise", monthlyValue: 18500, paymentDay: 1, renewalDate: "2027-01-01", owner: "Ana Prado", status: "ativo", since: "2024-08-01", services: ["Tráfego Pago", "Consultoria", "Landing Page", "Automações"] },
  { id: "c-6", name: "Renata Cardoso", company: "Cardoso Estética", plan: "Starter", monthlyValue: 2900, paymentDay: 25, renewalDate: "2026-07-25", owner: "Camila Torres", status: "onboarding", since: "2026-06-25", services: ["Tráfego Pago"] },
  { id: "c-7", name: "Felipe Andrade", company: "Andrade Fitness", plan: "Growth", monthlyValue: 6800, paymentDay: 8, renewalDate: "2026-10-08", owner: "Bruno Lima", status: "ativo", since: "2025-05-08", services: ["Tráfego Pago", "Criativos"] },
  { id: "c-8", name: "Camila Reis", company: "Reis Nutrição", plan: "Starter", monthlyValue: 3200, paymentDay: 12, renewalDate: "2026-08-12", owner: "Ana Prado", status: "pausado", since: "2025-02-12", services: ["Consultoria"] },
];

export interface Project {
  id: string;
  clientId: string;
  clientName: string;
  name: string;
  type: "Tráfego" | "Landing Page" | "Site" | "Consultoria" | "Criativos" | "Automação";
  status: "briefing" | "producao" | "revisao" | "entregue";
  progress: number;
  deadline: string;
  owner: string;
}

export const projects: Project[] = [
  { id: "p-1", clientId: "c-1", clientName: "Pereira Ortopedia", name: "Campanha Meta Q3", type: "Tráfego", status: "producao", progress: 65, deadline: "2026-07-20", owner: "Rafael Souza" },
  { id: "p-2", clientId: "c-1", clientName: "Pereira Ortopedia", name: "LP Consulta Online", type: "Landing Page", status: "revisao", progress: 85, deadline: "2026-07-10", owner: "Camila Torres" },
  { id: "p-3", clientId: "c-3", clientName: "Barros Seguros", name: "Automação WhatsApp", type: "Automação", status: "producao", progress: 40, deadline: "2026-07-30", owner: "Bruno Lima" },
  { id: "p-4", clientId: "c-5", clientName: "Freitas Advocacia", name: "Consultoria Estratégica", type: "Consultoria", status: "producao", progress: 55, deadline: "2026-08-15", owner: "Ana Prado" },
  { id: "p-5", clientId: "c-5", clientName: "Freitas Advocacia", name: "Site Institucional", type: "Site", status: "briefing", progress: 15, deadline: "2026-09-01", owner: "Rafael Souza" },
  { id: "p-6", clientId: "c-4", clientName: "Martins Odontologia", name: "Criativos Julho", type: "Criativos", status: "entregue", progress: 100, deadline: "2026-07-01", owner: "Camila Torres" },
  { id: "p-7", clientId: "c-7", clientName: "Andrade Fitness", name: "Campanha Verão", type: "Tráfego", status: "producao", progress: 70, deadline: "2026-07-25", owner: "Bruno Lima" },
];

export interface Task {
  id: string;
  title: string;
  description?: string;
  owner: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  status: "backlog" | "hoje" | "andamento" | "concluida";
  dueDate: string;
  clientId?: string;
  projectId?: string;
  labels?: string[];
}

export const tasks: Task[] = [
  { id: "t-1", title: "Ligar para Marina Costa", owner: "Rafael Souza", priority: "alta", status: "hoje", dueDate: "2026-07-03", clientId: undefined, labels: ["Follow-up"] },
  { id: "t-2", title: "Enviar proposta Ribeiro Motors", owner: "Rafael Souza", priority: "urgente", status: "hoje", dueDate: "2026-07-03", labels: ["Proposta"] },
  { id: "t-3", title: "Revisar criativos Andrade Fitness", owner: "Camila Torres", priority: "media", status: "andamento", dueDate: "2026-07-04", clientId: "c-7", projectId: "p-7", labels: ["Criativos"] },
  { id: "t-4", title: "Reunião de kickoff Reis Nutrição", owner: "Ana Prado", priority: "alta", status: "hoje", dueDate: "2026-07-03", clientId: "c-6", labels: ["Reunião"] },
  { id: "t-5", title: "Configurar pixel LP Pereira", owner: "Bruno Lima", priority: "media", status: "andamento", dueDate: "2026-07-05", projectId: "p-2", labels: ["Técnico"] },
  { id: "t-6", title: "Relatório mensal Barros Seguros", owner: "Bruno Lima", priority: "alta", status: "backlog", dueDate: "2026-07-08", clientId: "c-3", labels: ["Relatório"] },
  { id: "t-7", title: "Cobrar retorno Fernanda Rocha", owner: "Camila Torres", priority: "media", status: "hoje", dueDate: "2026-07-03", labels: ["Follow-up"] },
  { id: "t-8", title: "Atualizar checklist Freitas", owner: "Ana Prado", priority: "baixa", status: "backlog", dueDate: "2026-07-10", clientId: "c-5", labels: ["Onboarding"] },
  { id: "t-9", title: "Publicar campanha Martins", owner: "Camila Torres", priority: "urgente", status: "concluida", dueDate: "2026-07-02", clientId: "c-4", labels: ["Tráfego"] },
];

export interface AgendaEvent {
  id: string;
  title: string;
  type: "reuniao" | "followup" | "pagamento" | "renovacao" | "tarefa";
  date: string;
  time: string;
  with?: string;
}

export const agendaEvents: AgendaEvent[] = [
  { id: "e-1", title: "Reunião kickoff Reis Nutrição", type: "reuniao", date: "2026-07-03", time: "10:00", with: "Camila Reis" },
  { id: "e-2", title: "Follow-up Ribeiro Motors", type: "followup", date: "2026-07-03", time: "14:00", with: "Gustavo Ribeiro" },
  { id: "e-3", title: "Pagamento Pereira Ortopedia", type: "pagamento", date: "2026-07-05" , time: "09:00"},
  { id: "e-4", title: "Renovação Vanessa Lopes", type: "renovacao", date: "2026-08-01", time: "—" },
  { id: "e-5", title: "Diagnóstico Fernanda Rocha", type: "reuniao", date: "2026-07-04", time: "16:30", with: "Fernanda Rocha" },
  { id: "e-6", title: "Follow-up Larissa Melo", type: "followup", date: "2026-07-04", time: "11:00", with: "Larissa Melo" },
  { id: "e-7", title: "Pagamento Barros Seguros", type: "pagamento", date: "2026-07-15", time: "09:00" },
];

export interface FinanceEntry {
  id: string;
  date: string;
  description: string;
  category: string;
  costCenter: "Marketing" | "Ferramentas" | "Equipe" | "Impostos" | "Operacional" | "Administrativo" | "Investimentos" | "Receita";
  type: "entrada" | "saida";
  amount: number;
  client?: string;
  recurring?: boolean;
}

export const financeEntries: FinanceEntry[] = [
  { id: "f-1", date: "2026-07-01", description: "Mensalidade Pereira Ortopedia", category: "Mensalidade", costCenter: "Receita", type: "entrada", amount: 8500, client: "Pereira Ortopedia", recurring: true },
  { id: "f-2", date: "2026-07-01", description: "Mensalidade Barros Seguros", category: "Mensalidade", costCenter: "Receita", type: "entrada", amount: 12000, client: "Barros Seguros", recurring: true },
  { id: "f-3", date: "2026-07-01", description: "Mensalidade Freitas Advocacia", category: "Mensalidade", costCenter: "Receita", type: "entrada", amount: 18500, client: "Freitas Advocacia", recurring: true },
  { id: "f-4", date: "2026-07-01", description: "Mensalidade Martins Odontologia", category: "Mensalidade", costCenter: "Receita", type: "entrada", amount: 7500, client: "Martins Odontologia", recurring: true },
  { id: "f-5", date: "2026-07-02", description: "Projeto LP Pereira", category: "Projeto", costCenter: "Receita", type: "entrada", amount: 4500, client: "Pereira Ortopedia" },
  { id: "f-6", date: "2026-07-02", description: "Salários Equipe", category: "Folha", costCenter: "Equipe", type: "saida", amount: 22000, recurring: true },
  { id: "f-7", date: "2026-07-03", description: "Meta Ads Manager Tools", category: "Software", costCenter: "Ferramentas", type: "saida", amount: 1200, recurring: true },
  { id: "f-8", date: "2026-07-03", description: "Google Workspace", category: "Software", costCenter: "Ferramentas", type: "saida", amount: 480, recurring: true },
  { id: "f-9", date: "2026-07-04", description: "Impostos Simples Nacional", category: "Imposto", costCenter: "Impostos", type: "saida", amount: 6800, recurring: true },
  { id: "f-10", date: "2026-07-05", description: "Marketing Institucional", category: "Anúncios", costCenter: "Marketing", type: "saida", amount: 3500 },
  { id: "f-11", date: "2026-06-01", description: "Receita Junho (consolidado)", category: "Mensalidade", costCenter: "Receita", type: "entrada", amount: 48500, recurring: true },
  { id: "f-12", date: "2026-05-01", description: "Receita Maio (consolidado)", category: "Mensalidade", costCenter: "Receita", type: "entrada", amount: 44200, recurring: true },
];

export const monthlyRevenue = [
  { month: "Jan", receita: 32000, meta: 35000 },
  { month: "Fev", receita: 35500, meta: 38000 },
  { month: "Mar", receita: 38200, meta: 40000 },
  { month: "Abr", receita: 41800, meta: 42000 },
  { month: "Mai", receita: 44200, meta: 45000 },
  { month: "Jun", receita: 48500, meta: 48000 },
  { month: "Jul", receita: 51000, meta: 55000 },
];

export const leadOrigins = [
  { origin: "Instagram", value: 34 },
  { origin: "Indicação", value: 22 },
  { origin: "Google Ads", value: 18 },
  { origin: "LinkedIn", value: 12 },
  { origin: "Site", value: 8 },
  { origin: "Outbound", value: 6 },
];

export const conversionByStage = stageOrder.slice(0, 7).map((s) => ({
  stage: stageLabels[s],
  count: leads.filter((l) => l.stage === s).length + Math.floor(Math.random() * 8) + 3,
}));

export const notifications = [
  { id: "n-1", title: "Follow-up atrasado", description: "Marina Costa não recebe contato há 3 dias", type: "warning" as const, time: "2h" },
  { id: "n-2", title: "Novo lead", description: "Larissa Melo — Clínica Vitalis (Instagram)", type: "info" as const, time: "4h" },
  { id: "n-3", title: "Pagamento próximo", description: "Pereira Ortopedia vence em 2 dias", type: "warning" as const, time: "6h" },
  { id: "n-4", title: "Contrato fechado", description: "Ricardo Barros — R$ 12.000/mês", type: "success" as const, time: "1d" },
  { id: "n-5", title: "Renovação próxima", description: "Vanessa Lopes renova em 30 dias", type: "info" as const, time: "1d" },
];

export const automations = [
  { id: "a-1", name: "Novo Lead → Tarefa de contato", trigger: "Lead criado", action: "Criar tarefa em 24h para responsável", active: true, runs: 47 },
  { id: "a-2", name: "Proposta enviada → Follow-up 3 dias", trigger: "Card movido para Proposta", action: "Agendar follow-up em 3 dias", active: true, runs: 23 },
  { id: "a-3", name: "Fechado → Onboarding", trigger: "Card movido para Fechado", action: "Criar cliente + checklist de implantação", active: true, runs: 8 },
  { id: "a-4", name: "Pagamento atrasado → Alerta", trigger: "Fatura vencida > 1 dia", action: "Notificar financeiro + WhatsApp cliente", active: true, runs: 3 },
  { id: "a-5", name: "Contrato vence em 30d → Renovação", trigger: "Data de renovação em 30 dias", action: "Criar tarefa para gestor + email cliente", active: false, runs: 12 },
];

// KPIs computed once for dashboard
export const dashboardKPIs = {
  vendasMes: 51000,
  metaMes: 55000,
  contratosFechados: 3,
  ticketMedio: 8000,
  leadsNovos: leads.filter((l) => l.stage === "novo").length,
  leadsNegociacao: leads.filter((l) => ["contato", "diagnostico", "reuniao", "proposta", "negociacao"].includes(l.stage)).length,
  followupsPendentes: 7,
  clientesAtivos: clients.filter((c) => c.status === "ativo").length,
  receitaRecorrente: clients.filter((c) => c.status === "ativo").reduce((s, c) => s + c.monthlyValue, 0),
  fluxoCaixa: financeEntries.filter((f) => f.date.startsWith("2026-07")).reduce((s, f) => s + (f.type === "entrada" ? f.amount : -f.amount), 0),
};

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
