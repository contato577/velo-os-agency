import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "./supabase";
import { playNewLead } from "./sound";
import {
  leads as seedLeads,
  stageLabels,
  tasks as seedTasks,
  clients as seedClients,
  financeEntries as seedExpenses,
  projects as seedProjects,
  agendaEvents as seedAgenda,
  type Lead,
  type Task,
  type Client,
  type ClientComentario,
  type FinanceEntry,
  type Project,
  type LeadStage,
  type DocItem,
  type RecurringConfirmation,
  type SystemNotification,
} from "./mock-data";
import { serviceTemplates as seedTemplates, type ServiceTemplate } from "./service-templates";
import { gerarInsights, type Insight } from "./ai-engine";

export interface MetasMensais {
  metaComercial: number;
}

export interface QualidadeItem {
  id: string;
  titulo: string;
  descricao: string;
}

export const qualidadePadrao: QualidadeItem[] = [
  { id: "q-clientes-ativos", titulo: "Clientes ativos", descricao: "Manter 100% clientes na base" },
  {
    id: "q-relatorios",
    titulo: "Relatórios semanais",
    descricao: "Entregar 100% relatórios semanais",
  },
  {
    id: "q-entregas",
    titulo: "Entregas de serviços",
    descricao: "Entregar 100% serviços no prazo",
  },
];

export interface PontoControle {
  id: string;
  mes: string; // YYYY-MM
  ano: number;
  criadoEm: string;
  /** Análise do mês anterior */
  analiseAnterior: string;
  funcionou: string;
  naoFuncionou: string;
  /** Planejamento do mês */
  objetivos: string;
  metaComercial: number;
  novosClientesDesejados: number;
  servicosEntregar: number;
  taxaProspeccaoReuniao: number;
  taxaReuniaoFechamento: number;
  qualidade: QualidadeItem[];
  prioridades: string;
  proximosPassos: string;
}

const PC_STORAGE_KEY = "veloce.pontos-controle.v1";

function pontoControleToDb(p: PontoControle) {
  return {
    id: p.id,
    mes: p.mes,
    ano: p.ano,
    criado_em: p.criadoEm,
    analise_anterior: p.analiseAnterior,
    funcionou: p.funcionou,
    nao_funcionou: p.naoFuncionou,
    objetivos: p.objetivos,
    meta_comercial: p.metaComercial,
    novos_clientes_desejados: p.novosClientesDesejados,
    servicos_entregar: p.servicosEntregar,
    taxa_prospeccao_reuniao: p.taxaProspeccaoReuniao,
    taxa_reuniao_fechamento: p.taxaReuniaoFechamento,
    qualidade: p.qualidade,
    prioridades: p.prioridades,
    proximos_passos: p.proximosPassos,
  };
}

function pontoControleFromDb(row: Record<string, unknown>): PontoControle {
  return {
    id: row.id as string,
    mes: row.mes as string,
    ano: row.ano as number,
    criadoEm: row.criado_em as string,
    analiseAnterior: (row.analise_anterior as string) ?? "",
    funcionou: (row.funcionou as string) ?? "",
    naoFuncionou: (row.nao_funcionou as string) ?? "",
    objetivos: (row.objetivos as string) ?? "",
    metaComercial: (row.meta_comercial as number) ?? 0,
    novosClientesDesejados: (row.novos_clientes_desejados as number) ?? 0,
    servicosEntregar: (row.servicos_entregar as number) ?? 0,
    taxaProspeccaoReuniao: (row.taxa_prospeccao_reuniao as number) ?? 0,
    taxaReuniaoFechamento: (row.taxa_reuniao_fechamento as number) ?? 0,
    qualidade: (row.qualidade as QualidadeItem[]) ?? [],
    prioridades: (row.prioridades as string) ?? "",
    proximosPassos: (row.proximos_passos as string) ?? "",
  };
}

function addMonths(base: Date, months: number) {
  const d = new Date(base.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

export function mesAtualISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMesLabel(mes: string) {
  const [y, m] = mes.split("-");
  const nomes = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${nomes[Number(m) - 1] ?? m} ${y}`;
}

// ─── Conversão banco (snake_case) ↔ sistema (camelCase) — Leads e Clientes ────
// A partir daqui, Leads e Clientes são salvos de verdade no Supabase. Projetos,
// Tarefas, Checklist e Financeiro ainda continuam locais por enquanto (próxima
// etapa) — é assim de propósito, pra testarmos uma parte por vez.

function leadFromDb(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    name: row.name as string,
    company: row.company as string,
    phone: (row.phone as string) ?? "",
    instagram: (row.instagram as string) ?? undefined,
    site: (row.site as string) ?? undefined,
    city: (row.city as string) ?? "",
    origin: (row.origin as Lead["origin"]) ?? "Site",
    owner: row.owner as string,
    stage: row.stage as LeadStage,
    potencial: (row.potencial as Lead["potencial"]) ?? "medio",
    value: Number(row.value ?? 0),
    createdAt: row.created_at as string,
    lastActivity: row.last_activity as string,
    tags: (row.tags as string[]) ?? [],
    motivoPerda: (row.motivo_perda as string) ?? undefined,
  };
}

function leadToDb(lead: Lead) {
  return {
    id: lead.id,
    name: lead.name,
    company: lead.company,
    phone: lead.phone,
    instagram: lead.instagram,
    site: lead.site,
    city: lead.city,
    origin: lead.origin,
    owner: lead.owner,
    stage: lead.stage,
    potencial: lead.potencial,
    value: lead.value,
    tags: lead.tags ?? [],
    created_at: lead.createdAt,
    last_activity: lead.lastActivity,
    motivo_perda: lead.motivoPerda,
  };
}

function clientFromDb(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    name: row.name as string,
    company: row.company as string,
    email: (row.email as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    plan: row.plan as Client["plan"],
    plano: (row.plano as string) ?? undefined,
    monthlyValue: Number(row.monthly_value ?? 0),
    paymentDay: Number(row.payment_day ?? 5),
    renewalDate: row.renewal_date as string,
    contratoMeses: (row.contrato_meses as number) ?? undefined,
    owner: row.owner as string,
    status: row.status as Client["status"],
    since: row.since as string,
    canceledAt: (row.canceled_at as string) ?? undefined,
    services: (row.services as string[]) ?? [],
    prazoJornadaDias: (row.prazo_jornada_dias as number) ?? undefined,
    dataInicioJornada: (row.data_inicio_jornada as string) ?? undefined,
    dataPrevistaFimOnboarding: (row.data_prevista_fim_onboarding as string) ?? undefined,
    etapaJornada: (row.etapa_jornada as string) ?? undefined,
    contratoArquivo: (row.contrato_arquivo as Client["contratoArquivo"]) ?? undefined,
    // timeline e comentários ainda são só locais nesta etapa — ficam sem persistir
    // ao recarregar a página até migrarmos essas 2 tabelas (client_timeline, client_comments).
    timeline: [],
    comentarios: [],
  };
}

function clientToDb(client: Client) {
  return {
    id: client.id,
    name: client.name,
    company: client.company,
    email: client.email,
    phone: client.phone,
    plan: client.plan,
    plano: client.plano,
    monthly_value: client.monthlyValue,
    payment_day: client.paymentDay,
    renewal_date: client.renewalDate,
    contrato_meses: client.contratoMeses ?? 12,
    owner: client.owner,
    status: client.status,
    since: client.since,
    canceled_at: client.canceledAt,
    services: client.services,
    prazo_jornada_dias: client.prazoJornadaDias,
    data_inicio_jornada: client.dataInicioJornada,
    data_prevista_fim_onboarding: client.dataPrevistaFimOnboarding,
    etapa_jornada: client.etapaJornada,
    contrato_arquivo: client.contratoArquivo,
  };
}

// ─── Conversão banco ↔ sistema — Projetos, Checklist, Tarefas, Financeiro ────
function projectFromDb(row: Record<string, unknown>): Project {
  const checklistRows = (row.checklist_items as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    clientName: (row.client_name as string) ?? "",
    name: row.name as string,
    type: row.type as Project["type"],
    status: row.status as Project["status"],
    fase: row.fase as Project["fase"],
    progress: 0,
    deadline: (row.deadline as string) ?? "",
    owner: row.owner as string,
    checklist: checklistRows
      .sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0))
      .map((c) => ({ id: c.id as string, text: c.text as string, done: Boolean(c.done) })),
  };
}

function projectToDb(project: Project) {
  return {
    id: project.id,
    client_id: project.clientId,
    name: project.name,
    type: project.type,
    status: project.status,
    fase: project.fase,
    deadline: project.deadline || null,
    owner: project.owner,
  };
}

function taskFromDb(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    owner: row.owner as string,
    priority: row.priority as Task["priority"],
    status: row.status as Task["status"],
    dueDate: row.due_date as string,
    clientId: (row.client_id as string) ?? undefined,
    projectId: (row.project_id as string) ?? undefined,
    leadId: (row.lead_id as string) ?? undefined,
    labels: (row.labels as string[]) ?? [],
  };
}

function taskToDb(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    owner: task.owner,
    priority: task.priority,
    status: task.status,
    due_date: task.dueDate,
    client_id: task.clientId ?? null,
    project_id: task.projectId ?? null,
    lead_id: task.leadId ?? null,
    labels: task.labels ?? [],
  };
}

function expenseFromDb(row: Record<string, unknown>): FinanceEntry {
  return {
    id: row.id as string,
    date: row.date as string,
    description: (row.description as string) ?? "",
    category: (row.category as string) ?? "",
    costCenter: row.cost_center as FinanceEntry["costCenter"],
    type: row.type as FinanceEntry["type"],
    amount: Number(row.amount ?? 0),
    client: (row.client_name as string) ?? undefined,
    recurring: Boolean(row.recurring),
  };
}

function expenseToDb(entry: FinanceEntry) {
  return {
    id: entry.id,
    date: entry.date,
    description: entry.description,
    category: entry.category,
    cost_center: entry.costCenter,
    type: entry.type,
    amount: entry.amount,
    client_name: entry.client,
    recurring: entry.recurring ?? false,
  };
}

function docFromDb(row: Record<string, unknown>): DocItem {
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    title: row.title as string,
    category: row.category as DocItem["category"],
    type: row.type as DocItem["type"],
    url: (row.url as string) ?? undefined,
    storagePath: (row.storage_path as string) ?? undefined,
    size: (row.size as string) ?? undefined,
    addedBy: (row.added_by as string) ?? "—",
    addedAt: (row.added_at as string) ?? new Date().toISOString().slice(0, 10),
  };
}

function docToDb(doc: DocItem) {
  return {
    id: doc.id,
    client_id: doc.clientId,
    title: doc.title,
    category: doc.category,
    type: doc.type,
    url: doc.url ?? null,
    storage_path: doc.storagePath ?? null,
    size: doc.size ?? null,
    added_by: doc.addedBy,
    added_at: doc.addedAt,
  };
}

function confirmFromDb(row: Record<string, unknown>): RecurringConfirmation {
  return {
    id: row.id as string,
    entryId: row.entry_id as string,
    mes: row.mes as string,
    status: row.status as RecurringConfirmation["status"],
    confirmedAt: (row.confirmed_at as string) ?? new Date().toISOString(),
  };
}

function confirmToDb(c: RecurringConfirmation) {
  return {
    id: c.id,
    entry_id: c.entryId,
    mes: c.mes,
    status: c.status,
    confirmed_at: c.confirmedAt,
  };
}

interface DataStoreContextValue {
  leads: Lead[];
  teamMembers: string[];
  tasks: Task[];
  clients: Client[];
  expenses: FinanceEntry[];
  projects: Project[];
  insights: Insight[];
  metasMensais: MetasMensais;
  pontosControle: PontoControle[];
  pontoControleAtual: PontoControle | null;
  salvarPontoControle: (pc: Omit<PontoControle, "id" | "criadoEm" | "ano">) => PontoControle;
  updateMetas: (partial: Partial<MetasMensais>) => void;

  addLead: (
    partial: Omit<Lead, "id" | "createdAt" | "lastActivity"> & { stage?: LeadStage },
  ) => Lead;
  updateLeadStage: (id: string, stage: LeadStage, motivoPerda?: string) => void;
  updateLeadValue: (id: string, value: number) => void;
  deleteLead: (id: string) => void;
  addTask: (partial: Omit<Task, "id">) => Task;
  updateTask: (id: string, partial: Partial<Omit<Task, "id">>) => void;
  deleteTask: (id: string) => void;
  addExpense: (partial: Omit<FinanceEntry, "id">) => FinanceEntry;
  deleteExpense: (id: string) => void;
  toggleTaskDone: (taskId: string) => void;
  updateClientStatus: (clientId: string, status: Client["status"]) => void;
  deleteClient: (clientId: string) => void;
  updateClientInfo: (
    clientId: string,
    partial: Partial<Pick<Client, "name" | "company" | "email" | "phone" | "contratoArquivo">>,
  ) => void;
  addClientManual: (
    partial: Pick<Client, "name" | "company" | "owner" | "plan" | "monthlyValue" | "services"> &
      Partial<Client> & { dataCobranca?: string },
  ) => Client;
  addComentario: (clientId: string, texto: string, autor: string) => void;
  removeComentario: (clientId: string, comentarioId: string) => void;
  addTimelineEntry: (clientId: string, text: string, user?: string) => void;
  criarClienteDeVenda: (
    lead: Lead,
    servicos: string[],
    plano?: string,
    contratoMeses?: number,
  ) => Client;
  serviceTemplates: ServiceTemplate[];
  updateServiceTemplate: (id: string, partial: Partial<Omit<ServiceTemplate, "id">>) => void;
  toggleChecklistItem: (projectId: string, itemId: string) => void;

  clientDocuments: DocItem[];
  addClientDocumentFile: (
    clientId: string,
    category: DocItem["category"],
    file: File,
  ) => Promise<void>;
  addClientDocumentLink: (
    clientId: string,
    category: DocItem["category"],
    title: string,
    url: string,
  ) => void;
  deleteClientDocument: (id: string) => void;
  getClientDocumentUrl: (storagePath: string) => Promise<string | null>;

  recurringConfirmations: RecurringConfirmation[];
  confirmRecurring: (entryId: string, mes: string, status: RecurringConfirmation["status"]) => void;

  systemNotifications: SystemNotification[];

  logoUrl: string | null;
  updateLogo: (file: File) => Promise<void>;
}

const DataStoreContext = createContext<DataStoreContextValue | null>(null);

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [expenses, setExpenses] = useState<FinanceEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>(seedTemplates);
  const [pontosControle, setPontosControle] = useState<PontoControle[]>([]);
  const [clientDocuments, setClientDocuments] = useState<DocItem[]>([]);
  const [recurringConfirmations, setRecurringConfirmations] = useState<RecurringConfirmation[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [metasFallback, setMetasFallback] = useState<MetasMensais>({
    metaComercial: 50000,
  });

  // Busca leads e clientes reais do Supabase ao abrir o sistema. Se der erro
  // (sem internet, sessão expirada etc.), NUNCA mais mascaramos isso com
  // dados de demonstração — isso só confundia, fazendo parecer que o sistema
  // estava "conectado" quando na verdade estava mostrando números fictícios.
  // Agora avisamos de verdade, com botão de tentar de novo.
  const carregarLeads = () => {
    supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar leads do Supabase:", error.message);
          toast.error("Não foi possível carregar os leads.", {
            description: "Verifique sua conexão e tente de novo.",
            action: { label: "Tentar de novo", onClick: carregarLeads },
          });
          return;
        }
        setLeads((data ?? []).map(leadFromDb));
      });
  };

  const carregarClientes = () => {
    supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar clientes do Supabase:", error.message);
          toast.error("Não foi possível carregar os clientes.", {
            description: "Verifique sua conexão e tente de novo.",
            action: { label: "Tentar de novo", onClick: carregarClientes },
          });
          return;
        }
        setClients((data ?? []).map(clientFromDb));
      });
  };

  const carregarProjetos = () => {
    supabase
      .from("projects")
      .select("*, checklist_items(*)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar projetos do Supabase:", error.message);
          toast.error("Não foi possível carregar os projetos/operação.", {
            description: "Verifique sua conexão e tente de novo.",
            action: { label: "Tentar de novo", onClick: carregarProjetos },
          });
          return;
        }
        setProjects((data ?? []).map(projectFromDb));
      });
  };

  const carregarTarefas = () => {
    supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar tarefas do Supabase:", error.message);
          toast.error("Não foi possível carregar as tarefas.", {
            description: "Verifique sua conexão e tente de novo.",
            action: { label: "Tentar de novo", onClick: carregarTarefas },
          });
          return;
        }
        setTasks((data ?? []).map(taskFromDb));
      });
  };

  const carregarFinanceiro = () => {
    supabase
      .from("finance_entries")
      .select("*")
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar financeiro do Supabase:", error.message);
          toast.error("Não foi possível carregar o financeiro.", {
            description: "Verifique sua conexão e tente de novo.",
            action: { label: "Tentar de novo", onClick: carregarFinanceiro },
          });
          return;
        }
        setExpenses((data ?? []).map(expenseFromDb));
      });
  };

  const carregarPontosControle = () => {
    supabase
      .from("pontos_controle")
      .select("*")
      .order("mes", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar Ponto de Controle do Supabase:", error.message);
          toast.error("Não foi possível carregar o Ponto de Controle.", {
            description: "Verifique sua conexão e tente de novo.",
            action: { label: "Tentar de novo", onClick: carregarPontosControle },
          });
          return;
        }
        setPontosControle((data ?? []).map(pontoControleFromDb));
      });
  };

  useEffect(() => {
    carregarLeads();
    carregarClientes();
    carregarProjetos();
    carregarTarefas();
    carregarFinanceiro();
    carregarPontosControle();

    // Logo do sistema — se alguém já subiu uma personalizada, usa ela;
    // senão fica com o logo padrão do Veloce.
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "logo_url")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar logo do Supabase:", error.message);
          return;
        }
        if (data?.value) setLogoUrl(data.value as string);
      });

    // Time real — antes os formulários usavam uma lista fixa de 4 nomes fictícios
    // pra "Responsável". Agora busca quem realmente tem conta no sistema.
    supabase
      .from("profiles")
      .select("name")
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar equipe do Supabase:", error.message);
          return;
        }
        setTeamMembers((data ?? []).map((p) => p.name as string).filter(Boolean));
      });

    // Documentos dos clientes — antes ficavam só na memória da tela e sumiam ao recarregar.
    supabase
      .from("client_documents")
      .select("*")
      .order("added_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar documentos do Supabase:", error.message);
          return;
        }
        setClientDocuments((data ?? []).map(docFromDb));
      });

    // Histórico/timeline dos clientes — antes também era só local, some ao recarregar.
    supabase
      .from("client_timeline")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar histórico do Supabase:", error.message);
          return;
        }
        const porCliente: Record<
          string,
          { id: string; time: string; user: string; text: string }[]
        > = {};
        (data ?? []).forEach((row) => {
          const cid = row.client_id as string;
          const item = {
            id: row.id as string,
            time: new Date(row.created_at as string).toLocaleString("pt-BR"),
            user: (row.user_name as string) ?? "Sistema",
            text: row.text as string,
          };
          porCliente[cid] = porCliente[cid] ? [...porCliente[cid], item] : [item];
        });
        setClients((prev) =>
          prev.map((c) => (porCliente[c.id] ? { ...c, timeline: porCliente[c.id] } : c)),
        );
      });

    // Confirmações de lançamentos recorrentes (mensalidades que já foram confirmadas mês a mês).
    supabase
      .from("recurring_confirmations")
      .select("*")
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar confirmações recorrentes do Supabase:", error.message);
          return;
        }
        setRecurringConfirmations((data ?? []).map(confirmFromDb));
      });

    // Notificações persistentes (ex: "lead novo chegou") — ficam guardadas mesmo
    // que ninguém estivesse com o sistema aberto no momento em que aconteceram.
    supabase
      .from("system_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar notificações do Supabase:", error.message);
          return;
        }
        setSystemNotifications(
          (data ?? []).map((row) => ({
            id: row.id as string,
            title: row.title as string,
            description: row.description as string,
            to: row.to_path as string,
            search: (row.search as Record<string, string>) ?? undefined,
            createdAt: row.created_at as string,
          })),
        );
      });
  }, []);

  // Escuta em tempo real a tabela "leads" no Supabase. Isso é o que faz um
  // lead que chega de fora (ex: formulário do Instagram/TikTok via N8N)
  // aparecer na hora no quadro do Comercial, com som e aviso na tela — sem
  // precisar dar F5. Leads criados pela própria tela (addLead) já entram
  // direto no estado, então aqui a gente ignora o eco do que a gente mesmo inseriu.
  useEffect(() => {
    const channel = supabase
      .channel("leads-tempo-real")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload) => {
        const leadNovo = leadFromDb(payload.new as Record<string, unknown>);
        setLeads((prev) => {
          if (prev.some((l) => l.id === leadNovo.id)) return prev;
          playNewLead();
          toast.success(`🎯 Novo lead: ${leadNovo.name}`, {
            description: `${leadNovo.company || "Sem empresa"} · ${leadNovo.city || "-"} · via ${leadNovo.origin}`,
            duration: 8000,
          });
          return [leadNovo, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Escuta em tempo real a tabela "system_notifications". Quem grava essas
  // notificações é o próprio N8N (roda o tempo todo, sem depender de alguém
  // estar com o sistema aberto) — aqui a gente só reflete na tela assim que
  // uma notificação nova é gravada, pra quem já estiver com o sistema aberto
  // ver aparecer no sininho na hora, sem precisar recarregar.
  useEffect(() => {
    const channel = supabase
      .channel("notificacoes-tempo-real")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_notifications" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const notif: SystemNotification = {
            id: row.id as string,
            title: row.title as string,
            description: (row.description as string) ?? "",
            to: row.to_path as string,
            search: (row.search as Record<string, string>) ?? undefined,
            createdAt: row.created_at as string,
          };
          setSystemNotifications((prev) =>
            prev.some((n) => n.id === notif.id) ? prev : [notif, ...prev],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Escuta em tempo real a tabela "tasks". Antes, uma tarefa criada/movida/
  // concluída em um aparelho só aparecia nos outros depois de recarregar a
  // página inteira — agora reflete na hora em qualquer tela aberta (Operação,
  // Minha Semana, Cliente > Operação).
  useEffect(() => {
    const channel = supabase
      .channel("tarefas-tempo-real")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const idRemovido = (payload.old as Record<string, unknown>).id as string;
          setTasks((prev) => prev.filter((t) => t.id !== idRemovido));
          return;
        }
        const tarefa = taskFromDb(payload.new as Record<string, unknown>);
        setTasks((prev) =>
          prev.some((t) => t.id === tarefa.id)
            ? prev.map((t) => (t.id === tarefa.id ? tarefa : t))
            : [tarefa, ...prev],
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Escuta em tempo real a tabela "projects". Sem isso, "Projetos em
  // produção" e o quadro de Operação só atualizavam depois de recarregar a
  // página inteira. Obs: o evento em tempo real não traz o checklist junto
  // (isso vive em outra tabela), então preservamos o checklist que já
  // estava carregado localmente ao mesclar a atualização.
  useEffect(() => {
    const channel = supabase
      .channel("projetos-tempo-real")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const idRemovido = (payload.old as Record<string, unknown>).id as string;
          setProjects((prev) => prev.filter((p) => p.id !== idRemovido));
          return;
        }
        const projetoAtualizado = projectFromDb(payload.new as Record<string, unknown>);
        setProjects((prev) => {
          const existente = prev.find((p) => p.id === projetoAtualizado.id);
          const mesclado = existente
            ? { ...projetoAtualizado, checklist: existente.checklist }
            : projetoAtualizado;
          return existente
            ? prev.map((p) => (p.id === mesclado.id ? mesclado : p))
            : [mesclado, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const mesAtual = mesAtualISO();
  const pontoControleAtual = useMemo(
    () => pontosControle.find((p) => p.mes === mesAtual) ?? null,
    [pontosControle, mesAtual],
  );

  const metasMensais: MetasMensais = pontoControleAtual
    ? { metaComercial: pontoControleAtual.metaComercial }
    : metasFallback;

  const updateMetas: DataStoreContextValue["updateMetas"] = (partial) => {
    setMetasFallback((prev) => ({ ...prev, ...partial }));
  };

  const salvarPontoControle: DataStoreContextValue["salvarPontoControle"] = (input) => {
    const registro: PontoControle = {
      ...input,
      id: `pc-${input.mes}`,
      ano: Number(input.mes.slice(0, 4)),
      criadoEm: new Date().toISOString(),
    };
    setPontosControle((prev) => {
      const existente = prev.find((p) => p.mes === input.mes);
      const registroFinal = existente ? { ...registro, criadoEm: existente.criadoEm } : registro;
      const next = existente
        ? prev.map((p) => (p.mes === input.mes ? registroFinal : p))
        : [registroFinal, ...prev];
      const sorted = [...next].sort((a, b) => b.mes.localeCompare(a.mes));
      supabase
        .from("pontos_controle")
        .upsert(pontoControleToDb(registroFinal), { onConflict: "mes" })
        .then(({ error }) => {
          if (error) {
            console.error("Erro ao salvar Ponto de Controle no Supabase:", error.message);
            toast.error("Não foi possível salvar o Ponto de Controle no banco.", {
              description: error.message,
              duration: 15000,
            });
          }
        });
      return sorted;
    });
    return registro;
  };

  // Antes esses 3 números vinham fixos do mock (nunca mudavam, mesmo com
  // vendas novas de verdade) — o que fazia a Central de IA gerar alertas de
  // "meta" sempre iguais, sem relação com a operação real. Agora calculam
  // de dados reais: vendas fechadas neste mês + a meta que você configurou.
  const mesCorrente = mesAtualISO();
  const leadsFechadosMes = leads.filter(
    (l) => l.stage === "fechado" && l.lastActivity.startsWith(mesCorrente),
  );
  const vendasMesReal = leadsFechadosMes.reduce((s, l) => s + l.value, 0);
  const ticketMedioReal = leadsFechadosMes.length > 0 ? vendasMesReal / leadsFechadosMes.length : 0;

  const insights = useMemo(
    () =>
      gerarInsights({
        leads,
        tasks,
        clients,
        expenses,
        agenda: seedAgenda,
        kpis: {
          vendasMes: vendasMesReal,
          metaMes: metasMensais.metaComercial,
          ticketMedio: ticketMedioReal,
        },
      }),
    [leads, tasks, clients, expenses, vendasMesReal, metasMensais.metaComercial, ticketMedioReal],
  );

  const addLead: DataStoreContextValue["addLead"] = (partial) => {
    const now = new Date().toISOString();
    const { stage, ...rest } = partial;
    const lead: Lead = {
      id: crypto.randomUUID(),
      createdAt: now,
      lastActivity: now,
      stage: stage ?? "novo",
      ...rest,
    } as Lead;
    setLeads((prev) => [lead, ...prev]);

    // Salva no Supabase em segundo plano — a tela já mostra o lead na hora,
    // sem esperar a resposta do banco (mais rápido pra quem está usando).
    supabase
      .from("leads")
      .insert(leadToDb(lead))
      .then(({ error }) => {
        if (error) console.error("Erro ao salvar lead no Supabase:", error.message);
      });

    // Auto: follow-up task in 24h
    const due = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    setTasks((prev) => [
      {
        id: `t-auto-${Date.now()}`,
        title: `Follow-up: ${lead.name}`,
        owner: lead.owner,
        priority: "alta",
        status: "hoje",
        dueDate: due,
        labels: ["Follow-up", "Auto"],
      },
      ...prev,
    ]);
    return lead;
  };

  const updateLeadStage: DataStoreContextValue["updateLeadStage"] = (id, stage, motivoPerda) => {
    const targetLead = leads.find((l) => l.id === id);
    const now = new Date().toISOString();

    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, stage, lastActivity: now, motivoPerda: motivoPerda ?? l.motivoPerda }
          : l,
      ),
    );

    supabase
      .from("leads")
      .update({ stage, last_activity: now, ...(motivoPerda ? { motivo_perda: motivoPerda } : {}) })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Erro ao atualizar estágio do lead no Supabase:", error.message);
      });

    if (targetLead && targetLead.stage !== stage) {
      const stageTaskTitles: Partial<
        Record<LeadStage, { title: string; priority: Task["priority"] }>
      > = {
        contato: { title: `Contato inicial com ${targetLead.name}`, priority: "alta" },
        diagnostico: { title: `Realizar diagnóstico de ${targetLead.name}`, priority: "alta" },
        reuniao: { title: `Preparar reunião com ${targetLead.name}`, priority: "urgente" },
        proposta: {
          title: `Fazer follow-up da proposta com ${targetLead.name}`,
          priority: "urgente",
        },
        negociacao: { title: `Acompanhar negociação com ${targetLead.name}`, priority: "urgente" },
      };

      const taskConfig = stageTaskTitles[stage];
      if (taskConfig) {
        const amanha = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
        setTasks((prevTasks) => {
          const hasDuplicate = prevTasks.some(
            (t) =>
              t.leadId === id &&
              (t.title === taskConfig.title || (t.labels && t.labels.includes(stageLabels[stage]))),
          );
          if (hasDuplicate) return prevTasks;

          const newTask: Task = {
            id: `t-auto-stage-${Date.now()}`,
            title: taskConfig.title,
            owner: targetLead.owner,
            priority: taskConfig.priority,
            status: "hoje",
            dueDate: amanha,
            leadId: id,
            labels: ["CRM", stageLabels[stage]],
          };
          return [newTask, ...prevTasks];
        });
      }
    }
  };

  const updateLeadValue: DataStoreContextValue["updateLeadValue"] = (id, value) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, value } : l)));
    supabase
      .from("leads")
      .update({ value })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Erro ao atualizar valor do lead no Supabase:", error.message);
      });
  };

  const deleteLead: DataStoreContextValue["deleteLead"] = (id) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    // Remove também tarefas soltas que ficaram ligadas a esse lead, pra não
    // sobrar tarefa "órfã" apontando pra um lead que não existe mais.
    setTasks((prev) => prev.filter((t) => t.leadId !== id));
    supabase
      .from("leads")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Erro ao excluir lead no Supabase:", error.message);
      });
  };

  const addTask: DataStoreContextValue["addTask"] = (partial) => {
    const task: Task = { id: crypto.randomUUID(), ...partial };
    setTasks((prev) => [task, ...prev]);
    supabase
      .from("tasks")
      .insert(taskToDb(task))
      .then(({ error }) => {
        if (error) console.error("Erro ao salvar tarefa no Supabase:", error.message);
      });

    // Criar uma tarefa pra um projeto também conta como "começou a trabalhar" —
    // se o projeto ainda estava em Briefing, passa pra Produção sozinho.
    if (task.projectId) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === task.projectId && p.status === "briefing" ? { ...p, status: "producao" } : p,
        ),
      );
      supabase
        .from("projects")
        .update({ status: "producao" })
        .eq("id", task.projectId)
        .eq("status", "briefing")
        .then(({ error }) => {
          if (error)
            console.error("Erro ao atualizar status do projeto no Supabase:", error.message);
        });
    }

    return task;
  };

  const updateTask: DataStoreContextValue["updateTask"] = (id, partial) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...partial } : t)));
    const dbPartial: Record<string, unknown> = {};
    if ("title" in partial) dbPartial.title = partial.title;
    if ("description" in partial) dbPartial.description = partial.description;
    if ("owner" in partial) dbPartial.owner = partial.owner;
    if ("priority" in partial) dbPartial.priority = partial.priority;
    if ("status" in partial) dbPartial.status = partial.status;
    if ("dueDate" in partial) dbPartial.due_date = partial.dueDate;
    if ("clientId" in partial) dbPartial.client_id = partial.clientId;
    if ("projectId" in partial) dbPartial.project_id = partial.projectId;
    if ("leadId" in partial) dbPartial.lead_id = partial.leadId;
    if ("labels" in partial) dbPartial.labels = partial.labels;
    supabase
      .from("tasks")
      .update(dbPartial)
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Erro ao atualizar tarefa no Supabase:", error.message);
      });
  };

  const deleteTask: DataStoreContextValue["deleteTask"] = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Erro ao excluir tarefa no Supabase:", error.message);
      });
  };

  const addExpense: DataStoreContextValue["addExpense"] = (partial) => {
    const entry: FinanceEntry = { id: crypto.randomUUID(), ...partial };
    setExpenses((prev) => [entry, ...prev]);
    supabase
      .from("finance_entries")
      .insert(expenseToDb(entry))
      .then(({ error }) => {
        if (error)
          console.error("Erro ao salvar lançamento financeiro no Supabase:", error.message);
      });
    return entry;
  };

  const deleteExpense: DataStoreContextValue["deleteExpense"] = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    // Se o lançamento excluído tiver alguma confirmação recorrente associada, some com elas junto,
    // pra não deixar confirmação "órfã" apontando pra um lançamento que não existe mais.
    setRecurringConfirmations((prev) => prev.filter((c) => c.entryId !== id));
    supabase
      .from("finance_entries")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error)
          console.error("Erro ao excluir lançamento financeiro no Supabase:", error.message);
      });
    supabase
      .from("recurring_confirmations")
      .delete()
      .eq("entry_id", id)
      .then(({ error }) => {
        if (error)
          console.error("Erro ao excluir confirmações associadas no Supabase:", error.message);
      });
  };

  const confirmRecurring: DataStoreContextValue["confirmRecurring"] = (entryId, mes, status) => {
    const nova: RecurringConfirmation = {
      id: crypto.randomUUID(),
      entryId,
      mes,
      status,
      confirmedAt: new Date().toISOString(),
    };
    setRecurringConfirmations((prev) => [
      ...prev.filter((c) => !(c.entryId === entryId && c.mes === mes)),
      nova,
    ]);
    supabase
      .from("recurring_confirmations")
      .upsert(confirmToDb(nova), { onConflict: "entry_id,mes" })
      .then(({ error }) => {
        if (error)
          console.error("Erro ao salvar confirmação recorrente no Supabase:", error.message);
      });
  };

  const toggleTaskDone: DataStoreContextValue["toggleTaskDone"] = (taskId) => {
    let novoStatus: Task["status"] = "hoje";
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        novoStatus = t.status === "concluida" ? "hoje" : "concluida";
        return { ...t, status: novoStatus };
      }),
    );
    supabase
      .from("tasks")
      .update({ status: novoStatus })
      .eq("id", taskId)
      .then(({ error }) => {
        if (error) console.error("Erro ao atualizar status da tarefa no Supabase:", error.message);
      });
  };

  const updateClientStatus: DataStoreContextValue["updateClientStatus"] = (clientId, status) => {
    const hoje = new Date().toISOString().slice(0, 10);
    let canceledAtValue: string | undefined;
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;
        canceledAtValue =
          status === "cancelado" ? hoje : status === "ativo" ? undefined : c.canceledAt;
        return { ...c, status, canceledAt: canceledAtValue };
      }),
    );

    supabase
      .from("clients")
      .update({ status, canceled_at: canceledAtValue ?? null })
      .eq("id", clientId)
      .then(({ error }) => {
        if (error) console.error("Erro ao atualizar status do cliente no Supabase:", error.message);
      });
  };

  const deleteClient: DataStoreContextValue["deleteClient"] = (clientId) => {
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    supabase
      .from("clients")
      .delete()
      .eq("id", clientId)
      .then(({ error }) => {
        if (error) console.error("Erro ao remover cliente no Supabase:", error.message);
      });
  };

  const updateClientInfo: DataStoreContextValue["updateClientInfo"] = (clientId, partial) => {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, ...partial } : c)));
    const { contratoArquivo, ...resto } = partial;
    const dbPartial: Record<string, unknown> = { ...resto };
    if ("contratoArquivo" in partial) dbPartial.contrato_arquivo = contratoArquivo;
    supabase
      .from("clients")
      .update(dbPartial)
      .eq("id", clientId)
      .then(({ error }) => {
        if (error) console.error("Erro ao atualizar dados do cliente no Supabase:", error.message);
      });
  };

  // Cadastro manual de cliente — pra quando o cliente entra sem passar pelo
  // funil comercial (ex: indicação direta, migração de outra ferramenta).
  const addClientManual: DataStoreContextValue["addClientManual"] = (partial) => {
    const hoje = new Date();
    const clientId = crypto.randomUUID();
    const dataInicioJornada = hoje.toISOString().slice(0, 10);

    // A data de cobrança define o "dia do mês" em que esse cliente é cobrado
    // de verdade — útil pra cadastrar um cliente que já existia antes do
    // sistema (ex: já paga todo dia 13). Se não escolher nada, usa hoje.
    const dataCobranca = partial.dataCobranca || dataInicioJornada;

    const servicos = partial.services ?? [];
    const matchedTemplates = servicos
      .map((s) => serviceTemplates.find((t) => t.name === s || t.id === s))
      .filter((t): t is ServiceTemplate => Boolean(t));
    const prazoJornadaDias =
      matchedTemplates.length > 0
        ? Math.max(...matchedTemplates.map((t) => t.defaultDeadlineDays))
        : 15;
    const dataPrevistaFimOnboarding = new Date(
      hoje.getTime() + prazoJornadaDias * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .slice(0, 10);
    const etapaJornada = matchedTemplates[0]?.stages?.[0] ?? "Briefing";

    const { dataCobranca: _omit, ...clientFields } = partial;
    const timelineEntry = {
      id: `tl-${Date.now()}`,
      time: "Agora",
      user: "Sistema",
      text: "Cliente cadastrado manualmente",
    };
    const newClient: Client = {
      id: clientId,
      status: "onboarding",
      since: dataCobranca,
      renewalDate:
        partial.renewalDate ??
        addMonths(new Date(`${dataCobranca}T00:00:00`), partial.contratoMeses ?? 12)
          .toISOString()
          .slice(0, 10),
      contratoMeses: partial.contratoMeses ?? 12,
      paymentDay: partial.paymentDay ?? Number(dataCobranca.slice(8, 10)),
      prazoJornadaDias,
      dataInicioJornada,
      dataPrevistaFimOnboarding,
      etapaJornada,
      timeline: [timelineEntry],
      comentarios: [],
      ...clientFields,
    };

    // Monta o projeto (com checklist do template do serviço) — igual ao que
    // já acontece quando o cliente vem de uma venda fechada pelo CRM. Antes,
    // cadastrar por aqui deixava a aba Operação do cliente completamente vazia.
    // Diferente da venda pelo CRM, aqui NÃO cria tarefas de onboarding — só o
    // checklist mesmo, por decisão de fluxo (cliente cadastrado manualmente
    // já costuma ter a implementação avançada ou até concluída de fato).
    const newProjects: Project[] = [];
    servicos.forEach((s) => {
      const tpl = serviceTemplates.find((t) => t.name === s || t.id === s);
      const deadlineDays = tpl?.defaultDeadlineDays ?? 15;
      const projDeadline = new Date(hoje.getTime() + deadlineDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const projId = crypto.randomUUID();

      let type: Project["type"] = "Tráfego";
      const sLower = s.toLowerCase();
      if (sLower.includes("landing")) type = "Landing Page";
      else if (sLower.includes("site")) type = "Site";
      else if (sLower.includes("consultoria")) type = "Consultoria";
      else if (sLower.includes("criativos")) type = "Criativos";
      else if (sLower.includes("automação") || sLower.includes("automacao")) type = "Automação";

      newProjects.push({
        id: projId,
        clientId,
        clientName: newClient.company,
        name: `${s} — ${newClient.company}`,
        type,
        status: "briefing",
        fase: "implementacao",
        progress: 0,
        deadline: projDeadline,
        owner: newClient.owner,
        checklist: tpl?.checklist
          ? tpl.checklist.map((item) => ({ id: crypto.randomUUID(), text: item, done: false }))
          : [],
      });
    });

    // A ideia é que cadastrar o cliente aqui já seja suficiente pra contar no
    // financeiro — sem precisar passar por uma "venda" separada no CRM. Data
    // usada é a de cobrança escolhida (ou hoje, se não escolher nada).
    const newFinanceEntry: FinanceEntry = {
      id: crypto.randomUUID(),
      date: dataCobranca,
      description: `Mensalidade — ${newClient.company}`,
      category: "Mensalidade",
      costCenter: "Receita",
      type: "entrada",
      amount: newClient.monthlyValue,
      client: newClient.company,
      recurring: true,
    };

    // Reflete tudo na tela na hora.
    setClients((prev) => [newClient, ...prev]);
    if (newProjects.length > 0) setProjects((prev) => [...newProjects, ...prev]);
    setExpenses((prev) => [newFinanceEntry, ...prev]);

    // Salva no Supabase em SEQUÊNCIA (cliente → timeline/projetos → checklist/
    // cobrança) — nunca em paralelo. Checklist depende do projeto já existir,
    // e o projeto depende do cliente já existir; mandar tudo "ao mesmo tempo"
    // fazia o banco rejeitar em silêncio quando a ordem de chegada não
    // batia, e os dados sumiam ao recarregar a página.
    supabase
      .from("clients")
      .insert(clientToDb(newClient))
      .then(({ error: clientError }) => {
        if (clientError) {
          console.error(
            "Erro ao salvar cliente (cadastro manual) no Supabase:",
            clientError.message,
          );
          toast.error(`Cliente "${newClient.company}" não foi salvo no banco.`, {
            description: clientError.message,
            duration: 20000,
          });
          return;
        }

        supabase
          .from("client_timeline")
          .insert({
            id: timelineEntry.id,
            client_id: clientId,
            user_name: "Sistema",
            text: timelineEntry.text,
            created_at: hoje.toISOString(),
          })
          .then(({ error: timelineError }) => {
            if (timelineError) {
              console.error(
                "Erro ao salvar histórico do cliente no Supabase:",
                timelineError.message,
              );
              toast.error("Histórico inicial do cliente não foi salvo.", {
                description: timelineError.message,
                duration: 15000,
              });
            }
          });

        if (newProjects.length > 0) {
          supabase
            .from("projects")
            .insert(newProjects.map(projectToDb))
            .then(({ error: projectsError }) => {
              if (projectsError) {
                console.error("Erro ao salvar projetos no Supabase:", projectsError.message);
                toast.error("O projeto de implementação não foi salvo.", {
                  description: projectsError.message,
                  duration: 20000,
                });
                return;
              }

              const allChecklistItems = newProjects.flatMap((p) =>
                (p.checklist ?? []).map((item, i) => ({
                  id: item.id,
                  project_id: p.id,
                  text: item.text,
                  done: item.done,
                  ordem: i,
                })),
              );
              if (allChecklistItems.length > 0) {
                supabase
                  .from("checklist_items")
                  .insert(allChecklistItems)
                  .then(({ error: checklistError }) => {
                    if (checklistError) {
                      console.error(
                        "Erro ao salvar checklist no Supabase:",
                        checklistError.message,
                      );
                      toast.error("O checklist do projeto não foi salvo.", {
                        description: checklistError.message,
                        duration: 20000,
                      });
                    }
                  });
              }
            });
        }

        supabase
          .from("finance_entries")
          .insert(expenseToDb(newFinanceEntry))
          .then(({ error: financeError }) => {
            if (financeError) {
              console.error("Erro ao salvar cobrança inicial no Supabase:", financeError.message);
              toast.error("A cobrança inicial não foi salva no financeiro.", {
                description: financeError.message,
                duration: 20000,
              });
            }
          });
      });

    return newClient;
  };

  const addComentario: DataStoreContextValue["addComentario"] = (clientId, texto, autor) => {
    const comentario: ClientComentario = {
      id: `cm-${Date.now()}`,
      texto,
      autor,
      data: new Date().toISOString(),
    };
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId ? { ...c, comentarios: [comentario, ...(c.comentarios ?? [])] } : c,
      ),
    );
  };

  const removeComentario: DataStoreContextValue["removeComentario"] = (clientId, comentarioId) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, comentarios: (c.comentarios ?? []).filter((cm) => cm.id !== comentarioId) }
          : c,
      ),
    );
  };

  // Registra um evento na timeline do cliente (ex: "Contrato assinado", "Documento
  // anexado", "Implementação concluída"...) e salva de verdade no Supabase, pra
  // não sumir mais ao recarregar a página.
  const addTimelineEntry: DataStoreContextValue["addTimelineEntry"] = (
    clientId,
    text,
    user = "Sistema",
  ) => {
    const id = crypto.randomUUID();
    const agora = new Date();
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? {
              ...c,
              timeline: [
                { id, time: agora.toLocaleString("pt-BR"), user, text },
                ...(c.timeline ?? []),
              ],
            }
          : c,
      ),
    );
    supabase
      .from("client_timeline")
      .insert({ id, client_id: clientId, user_name: user, text, created_at: agora.toISOString() })
      .then(({ error }) => {
        if (error) console.error("Erro ao salvar histórico do cliente no Supabase:", error.message);
      });
  };

  // Envia o arquivo de verdade pro Supabase Storage (bucket "documentos-clientes")
  // e só depois salva a referência (nome, categoria, link) na tabela — antes o
  // arquivo em si nunca era enviado a lugar nenhum, só o nome ficava na memória
  // da tela, por isso nunca dava pra abrir/baixar depois.
  const addClientDocumentFile: DataStoreContextValue["addClientDocumentFile"] = async (
    clientId,
    category,
    file,
  ) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString().slice(0, 10);
    const path = `${clientId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("documentos-clientes")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      console.error("Erro ao enviar arquivo para o Supabase Storage:", uploadError.message);
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage.from("documentos-clientes").getPublicUrl(path);

    const doc: DocItem = {
      id,
      clientId,
      title: file.name,
      category,
      type: "file",
      url: publicUrlData.publicUrl,
      storagePath: path,
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      addedBy: "Você",
      addedAt: now,
    };

    setClientDocuments((prev) => [doc, ...prev]);
    supabase
      .from("client_documents")
      .insert(docToDb(doc))
      .then(({ error }) => {
        if (error) console.error("Erro ao salvar documento no Supabase:", error.message);
      });
    addTimelineEntry(clientId, `Documento adicionado: ${file.name}`, "Você");
  };

  const addClientDocumentLink: DataStoreContextValue["addClientDocumentLink"] = (
    clientId,
    category,
    title,
    url,
  ) => {
    const doc: DocItem = {
      id: crypto.randomUUID(),
      clientId,
      title,
      category,
      type: "link",
      url,
      addedBy: "Você",
      addedAt: new Date().toISOString().slice(0, 10),
    };
    setClientDocuments((prev) => [doc, ...prev]);
    supabase
      .from("client_documents")
      .insert(docToDb(doc))
      .then(({ error }) => {
        if (error) console.error("Erro ao salvar link no Supabase:", error.message);
      });
    addTimelineEntry(clientId, `Link adicionado: ${title}`, "Você");
  };

  const deleteClientDocument: DataStoreContextValue["deleteClientDocument"] = (id) => {
    const doc = clientDocuments.find((d) => d.id === id);
    setClientDocuments((prev) => prev.filter((d) => d.id !== id));
    supabase
      .from("client_documents")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Erro ao excluir documento no Supabase:", error.message);
      });
    if (doc?.storagePath) {
      supabase.storage
        .from("documentos-clientes")
        .remove([doc.storagePath])
        .then(({ error }) => {
          if (error) console.error("Erro ao excluir arquivo do Storage:", error.message);
        });
    }
  };

  // Gera um link temporário (expira em 2 minutos) pra ver/baixar o
  // documento — só funciona pra quem está logado no sistema. Diferente de
  // um link fixo, esse não pode ser copiado e reaberto depois por qualquer
  // pessoa que não tenha acesso ao sistema.
  const getClientDocumentUrl: DataStoreContextValue["getClientDocumentUrl"] = async (
    storagePath,
  ) => {
    const { data, error } = await supabase.storage
      .from("documentos-clientes")
      .createSignedUrl(storagePath, 120);
    if (error) {
      console.error("Erro ao gerar link do documento:", error.message);
      toast.error("Não foi possível abrir o documento.");
      return null;
    }
    return data?.signedUrl ?? null;
  };

  // Sobe uma logo nova pro bucket público de identidade visual e salva o
  // link nas configurações do sistema — fica valendo pra todo mundo que
  // usa o sistema, em qualquer aparelho, a partir daí.
  const updateLogo: DataStoreContextValue["updateLogo"] = async (file) => {
    const path = `logo-${Date.now()}.${file.name.split(".").pop() ?? "png"}`;
    const { error: uploadError } = await supabase.storage
      .from("identidade-visual")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      console.error("Erro ao enviar logo para o Supabase Storage:", uploadError.message);
      toast.error("Não foi possível enviar a logo.", { description: uploadError.message });
      throw uploadError;
    }
    const { data } = supabase.storage.from("identidade-visual").getPublicUrl(path);
    const url = data.publicUrl;
    setLogoUrl(url);
    const { error: saveError } = await supabase
      .from("app_settings")
      .upsert({ key: "logo_url", value: url }, { onConflict: "key" });
    if (saveError) {
      console.error("Erro ao salvar logo no Supabase:", saveError.message);
      toast.error("A logo foi enviada, mas não salvou a preferência.", {
        description: saveError.message,
      });
    }
  };

  const updateServiceTemplate: DataStoreContextValue["updateServiceTemplate"] = (id, partial) => {
    setServiceTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...partial } : t)));
  };

  const criarClienteDeVenda = (
    lead: Lead,
    servicos: string[],
    plano?: string,
    contratoMeses = 12,
  ): Client => {
    const hoje = new Date();
    const dataInicioJornada = hoje.toISOString().slice(0, 10);

    // 2. MAIOR defaultDeadlineDays entre todos os serviços vendidos (service-templates.ts)
    const matchedTemplates = servicos
      .map((s) => serviceTemplates.find((t) => t.name === s || t.id === s))
      .filter((t): t is ServiceTemplate => Boolean(t));

    const prazoJornadaDias =
      matchedTemplates.length > 0
        ? Math.max(...matchedTemplates.map((t) => t.defaultDeadlineDays))
        : 15;

    // 3. Define dataInicioJornada (hoje) e dataPrevistaFimOnboarding (hoje + prazoJornadaDias)
    const fimDate = new Date(hoje.getTime() + prazoJornadaDias * 24 * 60 * 60 * 1000);
    const dataPrevistaFimOnboarding = fimDate.toISOString().slice(0, 10);

    // 4. Define etapaJornada inicial como o primeiro item do array stages do primeiro template vendido
    const etapaJornada = matchedTemplates[0]?.stages[0] ?? "Briefing";

    const plan: Client["plan"] =
      lead.value >= 15000
        ? "Enterprise"
        : lead.value >= 10000
          ? "Scale"
          : lead.value >= 5000
            ? "Growth"
            : "Starter";

    // 7. Registra a primeira entrada da timeline do cliente
    const timelineEntry = {
      id: `tl-${Date.now()}`,
      time: "Agora",
      user: lead.owner || "Sistema",
      text: `Cliente criado a partir da venda fechada no CRM (${servicos.join(", ")})`,
    };

    // 1. Cria um novo Client a partir dos dados do lead, status "onboarding"
    const clientId = crypto.randomUUID();
    const newClient: Client = {
      id: clientId,
      name: lead.name,
      company: lead.company,
      plan,
      plano,
      monthlyValue: lead.value,
      paymentDay: 5,
      renewalDate: addMonths(hoje, contratoMeses).toISOString().slice(0, 10),
      contratoMeses,
      owner: lead.owner,
      status: "onboarding",
      since: dataInicioJornada,
      services: servicos,
      prazoJornadaDias,
      dataInicioJornada,
      dataPrevistaFimOnboarding,
      etapaJornada,
      timeline: [timelineEntry],
    };

    // 5. Para cada serviço, cria um Projeto vinculado ao cliente, aplicando checklist e tarefas
    const newProjects: Project[] = [];
    const newTasks: Task[] = [];

    servicos.forEach((s, idx) => {
      const tpl = serviceTemplates.find((t) => t.name === s || t.id === s);
      const deadlineDays = tpl?.defaultDeadlineDays ?? 15;
      const projDeadline = new Date(hoje.getTime() + deadlineDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const projId = crypto.randomUUID();

      let type: Project["type"] = "Tráfego";
      const sLower = s.toLowerCase();
      if (sLower.includes("landing")) type = "Landing Page";
      else if (sLower.includes("site")) type = "Site";
      else if (sLower.includes("consultoria")) type = "Consultoria";
      else if (sLower.includes("criativos")) type = "Criativos";
      else if (sLower.includes("automação") || sLower.includes("automacao")) type = "Automação";

      newProjects.push({
        id: projId,
        clientId: newClient.id,
        clientName: newClient.company,
        name: `${s} — ${newClient.company}`,
        type,
        status: "briefing",
        fase: "implementacao",
        progress: 0,
        deadline: projDeadline,
        owner: lead.owner,
        checklist: tpl?.checklist
          ? tpl.checklist.map((item) => ({ id: crypto.randomUUID(), text: item, done: false }))
          : [],
      });

      if (tpl?.tasks) {
        tpl.tasks.forEach((t) => {
          const taskDue = new Date(hoje.getTime() + t.dueOffsetDays * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
          newTasks.push({
            id: crypto.randomUUID(),
            title: `${t.title} (${newClient.company})`,
            owner: lead.owner,
            priority: t.priority,
            status: "hoje",
            dueDate: taskDue,
            clientId: newClient.id,
            projectId: projId,
            labels: ["Onboarding", s],
          });
        });
      }
    });

    // 6. Cria o primeiro registro de cobrança (mensalidade) — contabilizado
    // HOJE, no dia real em que o contrato foi assinado/pago. Sendo
    // "recurring: true", o DRE já repete esse valor automaticamente todo mês
    // seguinte (contanto que o cliente continue ativo e a cobrança daquele
    // mês seja confirmada).
    const dataAssinatura = hoje.toISOString().slice(0, 10);
    const newFinanceEntry: FinanceEntry = {
      id: crypto.randomUUID(),
      date: dataAssinatura,
      description: `Mensalidade — ${lead.company}`,
      category: "Mensalidade",
      costCenter: "Receita",
      type: "entrada",
      amount: lead.value,
      client: lead.company,
      recurring: true,
    };

    // Atualiza o estado global — a tela já reflete tudo na hora, mesmo antes
    // de qualquer resposta do Supabase.
    setClients((prev) => [newClient, ...prev]);
    if (newProjects.length > 0) setProjects((prev) => [...newProjects, ...prev]);
    if (newTasks.length > 0) setTasks((prev) => [...newTasks, ...prev]);
    setExpenses((prev) => [newFinanceEntry, ...prev]);

    // Salva no Supabase em SEQUÊNCIA, não em paralelo: cliente primeiro, e só
    // depois dele existir de verdade no banco (dentro do .then()) é que
    // projetos/checklist/tarefas são enviados — essas duas últimas tabelas
    // têm referência obrigatória a projeto/cliente já existente, então
    // mandar tudo "ao mesmo tempo" fazia o banco rejeitar em silêncio quando
    // a ordem de chegada não batia (era isso que fazia checklist e tarefa
    // "sumirem" ao recarregar a página).
    supabase
      .from("clients")
      .insert(clientToDb(newClient))
      .then(({ error: clientError }) => {
        if (clientError) {
          console.error("Erro ao salvar cliente no Supabase:", clientError.message);
          return;
        }

        supabase
          .from("client_timeline")
          .insert({
            id: timelineEntry.id,
            client_id: clientId,
            user_name: timelineEntry.user,
            text: timelineEntry.text,
            created_at: hoje.toISOString(),
          })
          .then(({ error: timelineError }) => {
            if (timelineError)
              console.error(
                "Erro ao salvar histórico inicial do cliente no Supabase:",
                timelineError.message,
              );
          });

        if (newProjects.length > 0) {
          supabase
            .from("projects")
            .insert(newProjects.map(projectToDb))
            .then(({ error: projectsError }) => {
              if (projectsError) {
                console.error("Erro ao salvar projetos no Supabase:", projectsError.message);
                return;
              }

              const allChecklistItems = newProjects.flatMap((p) =>
                (p.checklist ?? []).map((item, i) => ({
                  id: item.id,
                  project_id: p.id,
                  text: item.text,
                  done: item.done,
                  ordem: i,
                })),
              );
              if (allChecklistItems.length > 0) {
                supabase
                  .from("checklist_items")
                  .insert(allChecklistItems)
                  .then(({ error: checklistError }) => {
                    if (checklistError)
                      console.error(
                        "Erro ao salvar checklist no Supabase:",
                        checklistError.message,
                      );
                  });
              }

              if (newTasks.length > 0) {
                supabase
                  .from("tasks")
                  .insert(newTasks.map(taskToDb))
                  .then(({ error: tasksError }) => {
                    if (tasksError)
                      console.error(
                        "Erro ao salvar tarefas de onboarding no Supabase:",
                        tasksError.message,
                      );
                  });
              }
            });
        }

        supabase
          .from("finance_entries")
          .insert(expenseToDb(newFinanceEntry))
          .then(({ error: financeError }) => {
            if (financeError)
              console.error("Erro ao salvar cobrança inicial no Supabase:", financeError.message);
          });
      });

    // 8. Retorna o cliente criado
    return newClient;
  };

  const toggleChecklistItem = (projectId: string, itemId: string) => {
    // 1. Inverte o done do item e captura o clientId do projeto
    let affectedClientId: string | null = null;
    let novosProjetosOperacao: Project[] = [];
    const itemAtual = projects
      .find((p) => p.id === projectId)
      ?.checklist?.find((i) => i.id === itemId);
    const novoDone = !(itemAtual?.done ?? false);

    supabase
      .from("checklist_items")
      .update({ done: novoDone })
      .eq("id", itemId)
      .then(({ error }) => {
        if (error) console.error("Erro ao atualizar checklist no Supabase:", error.message);
      });

    setProjects((prevProjects) => {
      let updated = prevProjects.map((p) => {
        if (p.id !== projectId) return p;
        affectedClientId = p.clientId;
        return {
          ...p,
          checklist: (p.checklist ?? []).map((item) =>
            item.id === itemId ? { ...item, done: !item.done } : item,
          ),
        };
      });

      // Fluxo automático do projeto, pra não precisar mover manualmente:
      // começou a trabalhar (algum item do checklist marcado) → Produção.
      // Terminou o checklist inteiro → Entrega. Isso mantém o quadro de
      // Operação organizado sozinho, sem projeto finalizado poluindo Produção.
      const projetoTocado = updated.find((p) => p.id === projectId);
      if (projetoTocado && projetoTocado.fase === "implementacao") {
        const checklist = projetoTocado.checklist ?? [];
        const algumFeito = checklist.some((i) => i.done);
        const tudoFeito = checklist.length > 0 && checklist.every((i) => i.done);
        let novoStatus: Project["status"] | null = null;
        if (tudoFeito && projetoTocado.status !== "entregue") novoStatus = "entregue";
        else if (algumFeito && projetoTocado.status === "briefing") novoStatus = "producao";
        else if (!algumFeito && projetoTocado.status !== "briefing") novoStatus = "briefing";

        if (novoStatus) {
          updated = updated.map((p) => (p.id === projectId ? { ...p, status: novoStatus! } : p));
          supabase
            .from("projects")
            .update({ status: novoStatus })
            .eq("id", projectId)
            .then(({ error }) => {
              if (error)
                console.error("Erro ao atualizar status do projeto no Supabase:", error.message);
            });
        }
      }

      // 2. Verifica se todos os projetos de IMPLEMENTAÇÃO do cliente estão com checklist 100%.
      // Projetos de Gestão do Cliente não entram nessa conta — eles não têm "fim".
      // Importante: considera TODOS os projetos de implementação, incluindo o que acabou
      // de ser marcado "Entregue" agora mesmo (linha acima) — antes, um projeto recém
      // entregue já saía da lista de checagem, e o cliente nunca era ativado sozinho.
      if (!affectedClientId) return updated;
      const clienteAtual = clients.find((c) => c.id === affectedClientId);
      const implementacoes = updated.filter(
        (p) => p.clientId === affectedClientId && p.fase === "implementacao",
      );
      const allDone =
        clienteAtual?.status !== "ativo" &&
        implementacoes.length > 0 &&
        implementacoes.every((p) => (p.checklist ?? []).every((item) => item.done));
      const aindaNaoEntregues = implementacoes;

      if (allDone) {
        // 3. Fecha a implementação (Onboarding = Implementação, um conceito só) e cria,
        // automaticamente, um Projeto de Gestão do Cliente para cada serviço entregue —
        // sem prazo fixo, é o que existe enquanto o cliente estiver ativo.
        // Sem geração automática de tarefas: o planejamento da semana é manual, feito
        // pelo operador na própria tela do cliente — evita poluir Minha Semana com
        // tarefas que nem sempre precisam acontecer naquela semana.
        const hoje = new Date();
        const hojeISO = hoje.toISOString().slice(0, 10);
        const renewal = clients.find((c) => c.id === affectedClientId)?.renewalDate ?? hojeISO;
        novosProjetosOperacao = aindaNaoEntregues.map((p) => ({
          id: crypto.randomUUID(),
          clientId: p.clientId,
          clientName: p.clientName,
          name: `Gestão do Cliente — ${p.type} — ${p.clientName}`,
          type: p.type,
          status: "producao" as const,
          fase: "operacao_continua" as const,
          progress: 0,
          deadline: renewal,
          owner: p.owner,
        }));

        // Salva os projetos de Gestão do Cliente + marca os de implementação como entregues no Supabase
        supabase
          .from("projects")
          .insert(novosProjetosOperacao.map(projectToDb))
          .then(({ error }) => {
            if (error)
              console.error(
                "Erro ao salvar projeto de Gestão do Cliente no Supabase:",
                error.message,
              );
          });
        supabase
          .from("projects")
          .update({ status: "entregue" })
          .in(
            "id",
            aindaNaoEntregues.map((p) => p.id),
          )
          .then(({ error }) => {
            if (error)
              console.error("Erro ao marcar projeto como entregue no Supabase:", error.message);
          });

        updated = updated.map((p) =>
          aindaNaoEntregues.some((ie) => ie.id === p.id)
            ? { ...p, status: "entregue" as const }
            : p,
        );

        supabase
          .from("clients")
          .update({ status: "ativo" })
          .eq("id", affectedClientId)
          .then(({ error }) => {
            if (error)
              console.error("Erro ao atualizar status do cliente no Supabase:", error.message);
          });

        setClients((prevClients) => {
          const timelineId = `tl-${Date.now()}`;
          supabase
            .from("client_timeline")
            .insert({
              id: timelineId,
              client_id: affectedClientId,
              user_name: "Sistema",
              text: "Implementação concluída — cliente entrou na Gestão do Cliente",
              created_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error)
                console.error("Erro ao salvar histórico do cliente no Supabase:", error.message);
            });
          return prevClients.map((c) =>
            c.id === affectedClientId
              ? {
                  ...c,
                  status: "ativo" as const,
                  timeline: [
                    {
                      id: timelineId,
                      time: "Agora",
                      user: "Sistema",
                      text: "Implementação concluída — cliente entrou na Gestão do Cliente",
                    },
                    ...(c.timeline ?? []),
                  ],
                }
              : c,
          );
        });
      }

      return allDone ? [...updated, ...novosProjetosOperacao] : updated;
    });
  };

  return (
    <DataStoreContext.Provider
      value={{
        leads,
        teamMembers,
        tasks,
        clients,
        expenses,
        projects,
        insights,
        metasMensais,
        pontosControle,
        pontoControleAtual,
        salvarPontoControle,
        updateMetas,

        addLead,
        updateLeadStage,
        updateLeadValue,
        deleteLead,
        addTask,
        updateTask,
        deleteTask,
        addExpense,
        deleteExpense,
        toggleTaskDone,
        updateClientStatus,
        deleteClient,
        updateClientInfo,
        addClientManual,
        addComentario,
        removeComentario,
        addTimelineEntry,
        criarClienteDeVenda,
        serviceTemplates,
        updateServiceTemplate,
        toggleChecklistItem,

        clientDocuments,
        addClientDocumentFile,
        addClientDocumentLink,
        deleteClientDocument,
        getClientDocumentUrl,

        recurringConfirmations,
        confirmRecurring,

        systemNotifications,

        logoUrl,
        updateLogo,
      }}
    >
      {children}
    </DataStoreContext.Provider>
  );
}

export function useDataStore() {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error("useDataStore must be used within DataStoreProvider");
  return ctx;
}
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "./supabase";
import { playNewLead } from "./sound";
import {
  leads as seedLeads,
  stageLabels,
  tasks as seedTasks,
  clients as seedClients,
  financeEntries as seedExpenses,
  projects as seedProjects,
  agendaEvents as seedAgenda,
  type Lead,
  type Task,
  type Client,
  type ClientComentario,
  type FinanceEntry,
  type Project,
  type LeadStage,
  type DocItem,
  type RecurringConfirmation,
  type SystemNotification,
} from "./mock-data";
import { serviceTemplates as seedTemplates, type ServiceTemplate } from "./service-templates";
import { gerarInsights, type Insight } from "./ai-engine";

export interface MetasMensais {
  metaComercial: number;
}

export interface QualidadeItem {
  id: string;
  titulo: string;
  descricao: string;
}

export const qualidadePadrao: QualidadeItem[] = [
  { id: "q-clientes-ativos", titulo: "Clientes ativos", descricao: "Manter 100% clientes na base" },
  {
    id: "q-relatorios",
    titulo: "Relatórios semanais",
    descricao: "Entregar 100% relatórios semanais",
  },
  {
    id: "q-entregas",
    titulo: "Entregas de serviços",
    descricao: "Entregar 100% serviços no prazo",
  },
];

export interface PontoControle {
  id: string;
  mes: string; // YYYY-MM
  ano: number;
  criadoEm: string;
  /** Análise do mês anterior */
  analiseAnterior: string;
  funcionou: string;
  naoFuncionou: string;
  /** Planejamento do mês */
  objetivos: string;
  metaComercial: number;
  novosClientesDesejados: number;
  servicosEntregar: number;
  taxaProspeccaoReuniao: number;
  taxaReuniaoFechamento: number;
  qualidade: QualidadeItem[];
  prioridades: string;
  proximosPassos: string;
}

const PC_STORAGE_KEY = "veloce.pontos-controle.v1";

function pontoControleToDb(p: PontoControle) {
  return {
    id: p.id,
    mes: p.mes,
    ano: p.ano,
    criado_em: p.criadoEm,
    analise_anterior: p.analiseAnterior,
    funcionou: p.funcionou,
    nao_funcionou: p.naoFuncionou,
    objetivos: p.objetivos,
    meta_comercial: p.metaComercial,
    novos_clientes_desejados: p.novosClientesDesejados,
    servicos_entregar: p.servicosEntregar,
    taxa_prospeccao_reuniao: p.taxaProspeccaoReuniao,
    taxa_reuniao_fechamento: p.taxaReuniaoFechamento,
    qualidade: p.qualidade,
    prioridades: p.prioridades,
    proximos_passos: p.proximosPassos,
  };
}

function pontoControleFromDb(row: Record<string, unknown>): PontoControle {
  return {
    id: row.id as string,
    mes: row.mes as string,
    ano: row.ano as number,
    criadoEm: row.criado_em as string,
    analiseAnterior: (row.analise_anterior as string) ?? "",
    funcionou: (row.funcionou as string) ?? "",
    naoFuncionou: (row.nao_funcionou as string) ?? "",
    objetivos: (row.objetivos as string) ?? "",
    metaComercial: (row.meta_comercial as number) ?? 0,
    novosClientesDesejados: (row.novos_clientes_desejados as number) ?? 0,
    servicosEntregar: (row.servicos_entregar as number) ?? 0,
    taxaProspeccaoReuniao: (row.taxa_prospeccao_reuniao as number) ?? 0,
    taxaReuniaoFechamento: (row.taxa_reuniao_fechamento as number) ?? 0,
    qualidade: (row.qualidade as QualidadeItem[]) ?? [],
    prioridades: (row.prioridades as string) ?? "",
    proximosPassos: (row.proximos_passos as string) ?? "",
  };
}

function addMonths(base: Date, months: number) {
  const d = new Date(base.getTime());
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d;
}

function addDays(base: Date, days: number) {
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

export function mesAtualISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMesLabel(mes: string) {
  const [y, m] = mes.split("-");
  const nomes = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return `${nomes[Number(m) - 1] ?? m} ${y}`;
}

// ─── Conversão banco (snake_case) ↔ sistema (camelCase) — Leads e Clientes ────
// A partir daqui, Leads e Clientes são salvos de verdade no Supabase. Projetos,
// Tarefas, Checklist e Financeiro ainda continuam locais por enquanto (próxima
// etapa) — é assim de propósito, pra testarmos uma parte por vez.

function leadFromDb(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    name: row.name as string,
    company: row.company as string,
    phone: (row.phone as string) ?? "",
    instagram: (row.instagram as string) ?? undefined,
    site: (row.site as string) ?? undefined,
    city: (row.city as string) ?? "",
    origin: (row.origin as Lead["origin"]) ?? "Site",
    owner: row.owner as string,
    stage: row.stage as LeadStage,
    potencial: (row.potencial as Lead["potencial"]) ?? "medio",
    value: Number(row.value ?? 0),
    createdAt: row.created_at as string,
    lastActivity: row.last_activity as string,
    tags: (row.tags as string[]) ?? [],
    motivoPerda: (row.motivo_perda as string) ?? undefined,
  };
}

function leadToDb(lead: Lead) {
  return {
    id: lead.id,
    name: lead.name,
    company: lead.company,
    phone: lead.phone,
    instagram: lead.instagram,
    site: lead.site,
    city: lead.city,
    origin: lead.origin,
    owner: lead.owner,
    stage: lead.stage,
    potencial: lead.potencial,
    value: lead.value,
    tags: lead.tags ?? [],
    created_at: lead.createdAt,
    last_activity: lead.lastActivity,
    motivo_perda: lead.motivoPerda,
  };
}

function clientFromDb(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    name: row.name as string,
    company: row.company as string,
    email: (row.email as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    plan: row.plan as Client["plan"],
    plano: (row.plano as string) ?? undefined,
    monthlyValue: Number(row.monthly_value ?? 0),
    paymentDay: Number(row.payment_day ?? 5),
    renewalDate: row.renewal_date as string,
    contratoMeses: (row.contrato_meses as number) ?? undefined,
    owner: row.owner as string,
    status: row.status as Client["status"],
    since: row.since as string,
    canceledAt: (row.canceled_at as string) ?? undefined,
    services: (row.services as string[]) ?? [],
    prazoJornadaDias: (row.prazo_jornada_dias as number) ?? undefined,
    dataInicioJornada: (row.data_inicio_jornada as string) ?? undefined,
    dataPrevistaFimOnboarding: (row.data_prevista_fim_onboarding as string) ?? undefined,
    etapaJornada: (row.etapa_jornada as string) ?? undefined,
    contratoArquivo: (row.contrato_arquivo as Client["contratoArquivo"]) ?? undefined,
    // timeline e comentários ainda são só locais nesta etapa — ficam sem persistir
    // ao recarregar a página até migrarmos essas 2 tabelas (client_timeline, client_comments).
    timeline: [],
    comentarios: [],
  };
}

function clientToDb(client: Client) {
  return {
    id: client.id,
    name: client.name,
    company: client.company,
    email: client.email,
    phone: client.phone,
    plan: client.plan,
    plano: client.plano,
    monthly_value: client.monthlyValue,
    payment_day: client.paymentDay,
    renewal_date: client.renewalDate,
    contrato_meses: client.contratoMeses ?? 12,
    owner: client.owner,
    status: client.status,
    since: client.since,
    canceled_at: client.canceledAt,
    services: client.services,
    prazo_jornada_dias: client.prazoJornadaDias,
    data_inicio_jornada: client.dataInicioJornada,
    data_prevista_fim_onboarding: client.dataPrevistaFimOnboarding,
    etapa_jornada: client.etapaJornada,
    contrato_arquivo: client.contratoArquivo,
  };
}

// ─── Conversão banco ↔ sistema — Projetos, Checklist, Tarefas, Financeiro ────
function projectFromDb(row: Record<string, unknown>): Project {
  const checklistRows = (row.checklist_items as Record<string, unknown>[] | undefined) ?? [];
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    clientName: (row.client_name as string) ?? "",
    name: row.name as string,
    type: row.type as Project["type"],
    status: row.status as Project["status"],
    fase: row.fase as Project["fase"],
    progress: 0,
    deadline: (row.deadline as string) ?? "",
    owner: row.owner as string,
    checklist: checklistRows
      .sort((a, b) => Number(a.ordem ?? 0) - Number(b.ordem ?? 0))
      .map((c) => ({ id: c.id as string, text: c.text as string, done: Boolean(c.done) })),
  };
}

function projectToDb(project: Project) {
  return {
    id: project.id,
    client_id: project.clientId,
    name: project.name,
    type: project.type,
    status: project.status,
    fase: project.fase,
    deadline: project.deadline || null,
    owner: project.owner,
  };
}

function taskFromDb(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? undefined,
    owner: row.owner as string,
    priority: row.priority as Task["priority"],
    status: row.status as Task["status"],
    dueDate: row.due_date as string,
    clientId: (row.client_id as string) ?? undefined,
    projectId: (row.project_id as string) ?? undefined,
    leadId: (row.lead_id as string) ?? undefined,
    labels: (row.labels as string[]) ?? [],
  };
}

function taskToDb(task: Task) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    owner: task.owner,
    priority: task.priority,
    status: task.status,
    due_date: task.dueDate,
    client_id: task.clientId ?? null,
    project_id: task.projectId ?? null,
    lead_id: task.leadId ?? null,
    labels: task.labels ?? [],
  };
}

function expenseFromDb(row: Record<string, unknown>): FinanceEntry {
  return {
    id: row.id as string,
    date: row.date as string,
    description: (row.description as string) ?? "",
    category: (row.category as string) ?? "",
    costCenter: row.cost_center as FinanceEntry["costCenter"],
    type: row.type as FinanceEntry["type"],
    amount: Number(row.amount ?? 0),
    client: (row.client_name as string) ?? undefined,
    recurring: Boolean(row.recurring),
  };
}

function expenseToDb(entry: FinanceEntry) {
  return {
    id: entry.id,
    date: entry.date,
    description: entry.description,
    category: entry.category,
    cost_center: entry.costCenter,
    type: entry.type,
    amount: entry.amount,
    client_name: entry.client,
    recurring: entry.recurring ?? false,
  };
}

function docFromDb(row: Record<string, unknown>): DocItem {
  return {
    id: row.id as string,
    clientId: row.client_id as string,
    title: row.title as string,
    category: row.category as DocItem["category"],
    type: row.type as DocItem["type"],
    url: (row.url as string) ?? undefined,
    storagePath: (row.storage_path as string) ?? undefined,
    size: (row.size as string) ?? undefined,
    addedBy: (row.added_by as string) ?? "—",
    addedAt: (row.added_at as string) ?? new Date().toISOString().slice(0, 10),
  };
}

function docToDb(doc: DocItem) {
  return {
    id: doc.id,
    client_id: doc.clientId,
    title: doc.title,
    category: doc.category,
    type: doc.type,
    url: doc.url ?? null,
    storage_path: doc.storagePath ?? null,
    size: doc.size ?? null,
    added_by: doc.addedBy,
    added_at: doc.addedAt,
  };
}

function confirmFromDb(row: Record<string, unknown>): RecurringConfirmation {
  return {
    id: row.id as string,
    entryId: row.entry_id as string,
    mes: row.mes as string,
    status: row.status as RecurringConfirmation["status"],
    confirmedAt: (row.confirmed_at as string) ?? new Date().toISOString(),
  };
}

function confirmToDb(c: RecurringConfirmation) {
  return {
    id: c.id,
    entry_id: c.entryId,
    mes: c.mes,
    status: c.status,
    confirmed_at: c.confirmedAt,
  };
}

interface DataStoreContextValue {
  leads: Lead[];
  teamMembers: string[];
  tasks: Task[];
  clients: Client[];
  expenses: FinanceEntry[];
  projects: Project[];
  insights: Insight[];
  metasMensais: MetasMensais;
  pontosControle: PontoControle[];
  pontoControleAtual: PontoControle | null;
  salvarPontoControle: (pc: Omit<PontoControle, "id" | "criadoEm" | "ano">) => PontoControle;
  updateMetas: (partial: Partial<MetasMensais>) => void;

  addLead: (
    partial: Omit<Lead, "id" | "createdAt" | "lastActivity"> & { stage?: LeadStage },
  ) => Lead;
  updateLeadStage: (id: string, stage: LeadStage, motivoPerda?: string) => void;
  updateLeadValue: (id: string, value: number) => void;
  deleteLead: (id: string) => void;
  addTask: (partial: Omit<Task, "id">) => Task;
  updateTask: (id: string, partial: Partial<Omit<Task, "id">>) => void;
  deleteTask: (id: string) => void;
  addExpense: (partial: Omit<FinanceEntry, "id">) => FinanceEntry;
  deleteExpense: (id: string) => void;
  toggleTaskDone: (taskId: string) => void;
  updateClientStatus: (clientId: string, status: Client["status"]) => void;
  deleteClient: (clientId: string) => void;
  updateClientInfo: (
    clientId: string,
    partial: Partial<Pick<Client, "name" | "company" | "email" | "phone" | "contratoArquivo">>,
  ) => void;
  addClientManual: (
    partial: Pick<Client, "name" | "company" | "owner" | "plan" | "monthlyValue" | "services"> &
      Partial<Client> & { dataCobranca?: string },
  ) => Client;
  addComentario: (clientId: string, texto: string, autor: string) => void;
  removeComentario: (clientId: string, comentarioId: string) => void;
  addTimelineEntry: (clientId: string, text: string, user?: string) => void;
  criarClienteDeVenda: (
    lead: Lead,
    servicos: string[],
    plano?: string,
    contratoMeses?: number,
  ) => Client;
  serviceTemplates: ServiceTemplate[];
  updateServiceTemplate: (id: string, partial: Partial<Omit<ServiceTemplate, "id">>) => void;
  toggleChecklistItem: (projectId: string, itemId: string) => void;

  clientDocuments: DocItem[];
  addClientDocumentFile: (
    clientId: string,
    category: DocItem["category"],
    file: File,
  ) => Promise<void>;
  addClientDocumentLink: (
    clientId: string,
    category: DocItem["category"],
    title: string,
    url: string,
  ) => void;
  deleteClientDocument: (id: string) => void;
  getClientDocumentUrl: (storagePath: string) => Promise<string | null>;

  recurringConfirmations: RecurringConfirmation[];
  confirmRecurring: (entryId: string, mes: string, status: RecurringConfirmation["status"]) => void;

  systemNotifications: SystemNotification[];

  logoUrl: string | null;
  updateLogo: (file: File) => Promise<void>;
}

const DataStoreContext = createContext<DataStoreContextValue | null>(null);

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [expenses, setExpenses] = useState<FinanceEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>(seedTemplates);
  const [pontosControle, setPontosControle] = useState<PontoControle[]>([]);
  const [clientDocuments, setClientDocuments] = useState<DocItem[]>([]);
  const [recurringConfirmations, setRecurringConfirmations] = useState<RecurringConfirmation[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([]);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [metasFallback, setMetasFallback] = useState<MetasMensais>({
    metaComercial: 50000,
  });

  // Busca leads e clientes reais do Supabase ao abrir o sistema. Se der erro
  // (sem internet, sessão expirada etc.), NUNCA mais mascaramos isso com
  // dados de demonstração — isso só confundia, fazendo parecer que o sistema
  // estava "conectado" quando na verdade estava mostrando números fictícios.
  // Agora avisamos de verdade, com botão de tentar de novo.
  const carregarLeads = () => {
    supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar leads do Supabase:", error.message);
          toast.error("Não foi possível carregar os leads.", {
            description: "Verifique sua conexão e tente de novo.",
            action: { label: "Tentar de novo", onClick: carregarLeads },
          });
          return;
        }
        setLeads((data ?? []).map(leadFromDb));
      });
  };

  const carregarClientes = () => {
    supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar clientes do Supabase:", error.message);
          toast.error("Não foi possível carregar os clientes.", {
            description: "Verifique sua conexão e tente de novo.",
            action: { label: "Tentar de novo", onClick: carregarClientes },
          });
          return;
        }
        setClients((data ?? []).map(clientFromDb));
      });
  };

  const carregarProjetos = () => {
    supabase
      .from("projects")
      .select("*, checklist_items(*)")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar projetos do Supabase:", error.message);
          toast.error("Não foi possível carregar os projetos/operação.", {
            description: "Verifique sua conexão e tente de novo.",
            action: { label: "Tentar de novo", onClick: carregarProjetos },
          });
          return;
        }
        setProjects((data ?? []).map(projectFromDb));
      });
  };

  const carregarTarefas = () => {
    supabase
      .from("tasks")
      .select("*")
      .order("due_date", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar tarefas do Supabase:", error.message);
          toast.error("Não foi possível carregar as tarefas.", {
            description: "Verifique sua conexão e tente de novo.",
            action: { label: "Tentar de novo", onClick: carregarTarefas },
          });
          return;
        }
        setTasks((data ?? []).map(taskFromDb));
      });
  };

  const carregarFinanceiro = () => {
    supabase
      .from("finance_entries")
      .select("*")
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar financeiro do Supabase:", error.message);
          toast.error("Não foi possível carregar o financeiro.", {
            description: "Verifique sua conexão e tente de novo.",
            action: { label: "Tentar de novo", onClick: carregarFinanceiro },
          });
          return;
        }
        setExpenses((data ?? []).map(expenseFromDb));
      });
  };

  const carregarPontosControle = () => {
    supabase
      .from("pontos_controle")
      .select("*")
      .order("mes", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar Ponto de Controle do Supabase:", error.message);
          toast.error("Não foi possível carregar o Ponto de Controle.", {
            description: "Verifique sua conexão e tente de novo.",
            action: { label: "Tentar de novo", onClick: carregarPontosControle },
          });
          return;
        }
        setPontosControle((data ?? []).map(pontoControleFromDb));
      });
  };

  useEffect(() => {
    carregarLeads();
    carregarClientes();
    carregarProjetos();
    carregarTarefas();
    carregarFinanceiro();
    carregarPontosControle();

    // Logo do sistema — se alguém já subiu uma personalizada, usa ela;
    // senão fica com o logo padrão do Veloce.
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "logo_url")
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar logo do Supabase:", error.message);
          return;
        }
        if (data?.value) setLogoUrl(data.value as string);
      });

    // Time real — antes os formulários usavam uma lista fixa de 4 nomes fictícios
    // pra "Responsável". Agora busca quem realmente tem conta no sistema.
    supabase
      .from("profiles")
      .select("name")
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar equipe do Supabase:", error.message);
          return;
        }
        setTeamMembers((data ?? []).map((p) => p.name as string).filter(Boolean));
      });

    // Documentos dos clientes — antes ficavam só na memória da tela e sumiam ao recarregar.
    supabase
      .from("client_documents")
      .select("*")
      .order("added_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar documentos do Supabase:", error.message);
          return;
        }
        setClientDocuments((data ?? []).map(docFromDb));
      });

    // Histórico/timeline dos clientes — antes também era só local, some ao recarregar.
    supabase
      .from("client_timeline")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar histórico do Supabase:", error.message);
          return;
        }
        const porCliente: Record<
          string,
          { id: string; time: string; user: string; text: string }[]
        > = {};
        (data ?? []).forEach((row) => {
          const cid = row.client_id as string;
          const item = {
            id: row.id as string,
            time: new Date(row.created_at as string).toLocaleString("pt-BR"),
            user: (row.user_name as string) ?? "Sistema",
            text: row.text as string,
          };
          porCliente[cid] = porCliente[cid] ? [...porCliente[cid], item] : [item];
        });
        setClients((prev) =>
          prev.map((c) => (porCliente[c.id] ? { ...c, timeline: porCliente[c.id] } : c)),
        );
      });

    // Confirmações de lançamentos recorrentes (mensalidades que já foram confirmadas mês a mês).
    supabase
      .from("recurring_confirmations")
      .select("*")
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar confirmações recorrentes do Supabase:", error.message);
          return;
        }
        setRecurringConfirmations((data ?? []).map(confirmFromDb));
      });

    // Notificações persistentes (ex: "lead novo chegou") — ficam guardadas mesmo
    // que ninguém estivesse com o sistema aberto no momento em que aconteceram.
    supabase
      .from("system_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar notificações do Supabase:", error.message);
          return;
        }
        setSystemNotifications(
          (data ?? []).map((row) => ({
            id: row.id as string,
            title: row.title as string,
            description: row.description as string,
            to: row.to_path as string,
            search: (row.search as Record<string, string>) ?? undefined,
            createdAt: row.created_at as string,
          })),
        );
      });
  }, []);

  // Escuta em tempo real a tabela "leads" no Supabase. Isso é o que faz um
  // lead que chega de fora (ex: formulário do Instagram/TikTok via N8N)
  // aparecer na hora no quadro do Comercial, com som e aviso na tela — sem
  // precisar dar F5. Leads criados pela própria tela (addLead) já entram
  // direto no estado, então aqui a gente ignora o eco do que a gente mesmo inseriu.
  useEffect(() => {
    const channel = supabase
      .channel("leads-tempo-real")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload) => {
        const leadNovo = leadFromDb(payload.new as Record<string, unknown>);
        setLeads((prev) => {
          if (prev.some((l) => l.id === leadNovo.id)) return prev;
          playNewLead();
          toast.success(`🎯 Novo lead: ${leadNovo.name}`, {
            description: `${leadNovo.company || "Sem empresa"} · ${leadNovo.city || "-"} · via ${leadNovo.origin}`,
            duration: 8000,
          });
          return [leadNovo, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Escuta em tempo real a tabela "system_notifications". Quem grava essas
  // notificações é o próprio N8N (roda o tempo todo, sem depender de alguém
  // estar com o sistema aberto) — aqui a gente só reflete na tela assim que
  // uma notificação nova é gravada, pra quem já estiver com o sistema aberto
  // ver aparecer no sininho na hora, sem precisar recarregar.
  useEffect(() => {
    const channel = supabase
      .channel("notificacoes-tempo-real")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "system_notifications" },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          const notif: SystemNotification = {
            id: row.id as string,
            title: row.title as string,
            description: (row.description as string) ?? "",
            to: row.to_path as string,
            search: (row.search as Record<string, string>) ?? undefined,
            createdAt: row.created_at as string,
          };
          setSystemNotifications((prev) =>
            prev.some((n) => n.id === notif.id) ? prev : [notif, ...prev],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Escuta em tempo real a tabela "tasks". Antes, uma tarefa criada/movida/
  // concluída em um aparelho só aparecia nos outros depois de recarregar a
  // página inteira — agora reflete na hora em qualquer tela aberta (Operação,
  // Minha Semana, Cliente > Operação).
  useEffect(() => {
    const channel = supabase
      .channel("tarefas-tempo-real")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const idRemovido = (payload.old as Record<string, unknown>).id as string;
          setTasks((prev) => prev.filter((t) => t.id !== idRemovido));
          return;
        }
        const tarefa = taskFromDb(payload.new as Record<string, unknown>);
        setTasks((prev) =>
          prev.some((t) => t.id === tarefa.id)
            ? prev.map((t) => (t.id === tarefa.id ? tarefa : t))
            : [tarefa, ...prev],
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Escuta em tempo real a tabela "projects". Sem isso, "Projetos em
  // produção" e o quadro de Operação só atualizavam depois de recarregar a
  // página inteira. Obs: o evento em tempo real não traz o checklist junto
  // (isso vive em outra tabela), então preservamos o checklist que já
  // estava carregado localmente ao mesclar a atualização.
  useEffect(() => {
    const channel = supabase
      .channel("projetos-tempo-real")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const idRemovido = (payload.old as Record<string, unknown>).id as string;
          setProjects((prev) => prev.filter((p) => p.id !== idRemovido));
          return;
        }
        const projetoAtualizado = projectFromDb(payload.new as Record<string, unknown>);
        setProjects((prev) => {
          const existente = prev.find((p) => p.id === projetoAtualizado.id);
          const mesclado = existente
            ? { ...projetoAtualizado, checklist: existente.checklist }
            : projetoAtualizado;
          return existente
            ? prev.map((p) => (p.id === mesclado.id ? mesclado : p))
            : [mesclado, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const mesAtual = mesAtualISO();
  const pontoControleAtual = useMemo(
    () => pontosControle.find((p) => p.mes === mesAtual) ?? null,
    [pontosControle, mesAtual],
  );

  const metasMensais: MetasMensais = pontoControleAtual
    ? { metaComercial: pontoControleAtual.metaComercial }
    : metasFallback;

  const updateMetas: DataStoreContextValue["updateMetas"] = (partial) => {
    setMetasFallback((prev) => ({ ...prev, ...partial }));
  };

  const salvarPontoControle: DataStoreContextValue["salvarPontoControle"] = (input) => {
    const registro: PontoControle = {
      ...input,
      id: `pc-${input.mes}`,
      ano: Number(input.mes.slice(0, 4)),
      criadoEm: new Date().toISOString(),
    };
    setPontosControle((prev) => {
      const existente = prev.find((p) => p.mes === input.mes);
      const registroFinal = existente ? { ...registro, criadoEm: existente.criadoEm } : registro;
      const next = existente
        ? prev.map((p) => (p.mes === input.mes ? registroFinal : p))
        : [registroFinal, ...prev];
      const sorted = [...next].sort((a, b) => b.mes.localeCompare(a.mes));
      supabase
        .from("pontos_controle")
        .upsert(pontoControleToDb(registroFinal), { onConflict: "mes" })
        .then(({ error }) => {
          if (error) {
            console.error("Erro ao salvar Ponto de Controle no Supabase:", error.message);
            toast.error("Não foi possível salvar o Ponto de Controle no banco.", {
              description: error.message,
              duration: 15000,
            });
          }
        });
      return sorted;
    });
    return registro;
  };

  // Antes esses 3 números vinham fixos do mock (nunca mudavam, mesmo com
  // vendas novas de verdade) — o que fazia a Central de IA gerar alertas de
  // "meta" sempre iguais, sem relação com a operação real. Agora calculam
  // de dados reais: vendas fechadas neste mês + a meta que você configurou.
  const mesCorrente = mesAtualISO();
  const leadsFechadosMes = leads.filter(
    (l) => l.stage === "fechado" && l.lastActivity.startsWith(mesCorrente),
  );
  const vendasMesReal = leadsFechadosMes.reduce((s, l) => s + l.value, 0);
  const ticketMedioReal = leadsFechadosMes.length > 0 ? vendasMesReal / leadsFechadosMes.length : 0;

  const insights = useMemo(
    () =>
      gerarInsights({
        leads,
        tasks,
        clients,
        expenses,
        agenda: seedAgenda,
        kpis: {
          vendasMes: vendasMesReal,
          metaMes: metasMensais.metaComercial,
          ticketMedio: ticketMedioReal,
        },
      }),
    [leads, tasks, clients, expenses, vendasMesReal, metasMensais.metaComercial, ticketMedioReal],
  );

  const addLead: DataStoreContextValue["addLead"] = (partial) => {
    const now = new Date().toISOString();
    const { stage, ...rest } = partial;
    const lead: Lead = {
      id: crypto.randomUUID(),
      createdAt: now,
      lastActivity: now,
      stage: stage ?? "novo",
      ...rest,
    } as Lead;
    setLeads((prev) => [lead, ...prev]);

    // Salva no Supabase em segundo plano — a tela já mostra o lead na hora,
    // sem esperar a resposta do banco (mais rápido pra quem está usando).
    supabase
      .from("leads")
      .insert(leadToDb(lead))
      .then(({ error }) => {
        if (error) console.error("Erro ao salvar lead no Supabase:", error.message);
      });

    // Auto: follow-up task in 24h
    const due = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
    setTasks((prev) => [
      {
        id: `t-auto-${Date.now()}`,
        title: `Follow-up: ${lead.name}`,
        owner: lead.owner,
        priority: "alta",
        status: "hoje",
        dueDate: due,
        labels: ["Follow-up", "Auto"],
      },
      ...prev,
    ]);
    return lead;
  };

  const updateLeadStage: DataStoreContextValue["updateLeadStage"] = (id, stage, motivoPerda) => {
    const targetLead = leads.find((l) => l.id === id);
    const now = new Date().toISOString();

    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, stage, lastActivity: now, motivoPerda: motivoPerda ?? l.motivoPerda }
          : l,
      ),
    );

    supabase
      .from("leads")
      .update({ stage, last_activity: now, ...(motivoPerda ? { motivo_perda: motivoPerda } : {}) })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Erro ao atualizar estágio do lead no Supabase:", error.message);
      });

    if (targetLead && targetLead.stage !== stage) {
      const stageTaskTitles: Partial<
        Record<LeadStage, { title: string; priority: Task["priority"] }>
      > = {
        contato: { title: `Contato inicial com ${targetLead.name}`, priority: "alta" },
        diagnostico: { title: `Realizar diagnóstico de ${targetLead.name}`, priority: "alta" },
        reuniao: { title: `Preparar reunião com ${targetLead.name}`, priority: "urgente" },
        proposta: {
          title: `Fazer follow-up da proposta com ${targetLead.name}`,
          priority: "urgente",
        },
        negociacao: { title: `Acompanhar negociação com ${targetLead.name}`, priority: "urgente" },
      };

      const taskConfig = stageTaskTitles[stage];
      if (taskConfig) {
        const amanha = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
        setTasks((prevTasks) => {
          const hasDuplicate = prevTasks.some(
            (t) =>
              t.leadId === id &&
              (t.title === taskConfig.title || (t.labels && t.labels.includes(stageLabels[stage]))),
          );
          if (hasDuplicate) return prevTasks;

          const newTask: Task = {
            id: `t-auto-stage-${Date.now()}`,
            title: taskConfig.title,
            owner: targetLead.owner,
            priority: taskConfig.priority,
            status: "hoje",
            dueDate: amanha,
            leadId: id,
            labels: ["CRM", stageLabels[stage]],
          };
          return [newTask, ...prevTasks];
        });
      }
    }
  };

  const updateLeadValue: DataStoreContextValue["updateLeadValue"] = (id, value) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, value } : l)));
    supabase
      .from("leads")
      .update({ value })
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Erro ao atualizar valor do lead no Supabase:", error.message);
      });
  };

  const deleteLead: DataStoreContextValue["deleteLead"] = (id) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    // Remove também tarefas soltas que ficaram ligadas a esse lead, pra não
    // sobrar tarefa "órfã" apontando pra um lead que não existe mais.
    setTasks((prev) => prev.filter((t) => t.leadId !== id));
    supabase
      .from("leads")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Erro ao excluir lead no Supabase:", error.message);
      });
  };

  const addTask: DataStoreContextValue["addTask"] = (partial) => {
    const task: Task = { id: crypto.randomUUID(), ...partial };
    setTasks((prev) => [task, ...prev]);
    supabase
      .from("tasks")
      .insert(taskToDb(task))
      .then(({ error }) => {
        if (error) console.error("Erro ao salvar tarefa no Supabase:", error.message);
      });

    // Criar uma tarefa pra um projeto também conta como "começou a trabalhar" —
    // se o projeto ainda estava em Briefing, passa pra Produção sozinho.
    if (task.projectId) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === task.projectId && p.status === "briefing" ? { ...p, status: "producao" } : p,
        ),
      );
      supabase
        .from("projects")
        .update({ status: "producao" })
        .eq("id", task.projectId)
        .eq("status", "briefing")
        .then(({ error }) => {
          if (error)
            console.error("Erro ao atualizar status do projeto no Supabase:", error.message);
        });
    }

    return task;
  };

  const updateTask: DataStoreContextValue["updateTask"] = (id, partial) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...partial } : t)));
    const dbPartial: Record<string, unknown> = {};
    if ("title" in partial) dbPartial.title = partial.title;
    if ("description" in partial) dbPartial.description = partial.description;
    if ("owner" in partial) dbPartial.owner = partial.owner;
    if ("priority" in partial) dbPartial.priority = partial.priority;
    if ("status" in partial) dbPartial.status = partial.status;
    if ("dueDate" in partial) dbPartial.due_date = partial.dueDate;
    if ("clientId" in partial) dbPartial.client_id = partial.clientId;
    if ("projectId" in partial) dbPartial.project_id = partial.projectId;
    if ("leadId" in partial) dbPartial.lead_id = partial.leadId;
    if ("labels" in partial) dbPartial.labels = partial.labels;
    supabase
      .from("tasks")
      .update(dbPartial)
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Erro ao atualizar tarefa no Supabase:", error.message);
      });
  };

  const deleteTask: DataStoreContextValue["deleteTask"] = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    supabase
      .from("tasks")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Erro ao excluir tarefa no Supabase:", error.message);
      });
  };

  const addExpense: DataStoreContextValue["addExpense"] = (partial) => {
    const entry: FinanceEntry = { id: crypto.randomUUID(), ...partial };
    setExpenses((prev) => [entry, ...prev]);
    supabase
      .from("finance_entries")
      .insert(expenseToDb(entry))
      .then(({ error }) => {
        if (error)
          console.error("Erro ao salvar lançamento financeiro no Supabase:", error.message);
      });
    return entry;
  };

  const deleteExpense: DataStoreContextValue["deleteExpense"] = (id) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    // Se o lançamento excluído tiver alguma confirmação recorrente associada, some com elas junto,
    // pra não deixar confirmação "órfã" apontando pra um lançamento que não existe mais.
    setRecurringConfirmations((prev) => prev.filter((c) => c.entryId !== id));
    supabase
      .from("finance_entries")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error)
          console.error("Erro ao excluir lançamento financeiro no Supabase:", error.message);
      });
    supabase
      .from("recurring_confirmations")
      .delete()
      .eq("entry_id", id)
      .then(({ error }) => {
        if (error)
          console.error("Erro ao excluir confirmações associadas no Supabase:", error.message);
      });
  };

  const confirmRecurring: DataStoreContextValue["confirmRecurring"] = (entryId, mes, status) => {
    const nova: RecurringConfirmation = {
      id: crypto.randomUUID(),
      entryId,
      mes,
      status,
      confirmedAt: new Date().toISOString(),
    };
    setRecurringConfirmations((prev) => [
      ...prev.filter((c) => !(c.entryId === entryId && c.mes === mes)),
      nova,
    ]);
    supabase
      .from("recurring_confirmations")
      .upsert(confirmToDb(nova), { onConflict: "entry_id,mes" })
      .then(({ error }) => {
        if (error)
          console.error("Erro ao salvar confirmação recorrente no Supabase:", error.message);
      });
  };

  const toggleTaskDone: DataStoreContextValue["toggleTaskDone"] = (taskId) => {
    let novoStatus: Task["status"] = "hoje";
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        novoStatus = t.status === "concluida" ? "hoje" : "concluida";
        return { ...t, status: novoStatus };
      }),
    );
    supabase
      .from("tasks")
      .update({ status: novoStatus })
      .eq("id", taskId)
      .then(({ error }) => {
        if (error) console.error("Erro ao atualizar status da tarefa no Supabase:", error.message);
      });
  };

  const updateClientStatus: DataStoreContextValue["updateClientStatus"] = (clientId, status) => {
    const hoje = new Date().toISOString().slice(0, 10);
    let canceledAtValue: string | undefined;
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;
        canceledAtValue =
          status === "cancelado" ? hoje : status === "ativo" ? undefined : c.canceledAt;
        return { ...c, status, canceledAt: canceledAtValue };
      }),
    );

    supabase
      .from("clients")
      .update({ status, canceled_at: canceledAtValue ?? null })
      .eq("id", clientId)
      .then(({ error }) => {
        if (error) console.error("Erro ao atualizar status do cliente no Supabase:", error.message);
      });
  };

  const deleteClient: DataStoreContextValue["deleteClient"] = (clientId) => {
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    supabase
      .from("clients")
      .delete()
      .eq("id", clientId)
      .then(({ error }) => {
        if (error) console.error("Erro ao remover cliente no Supabase:", error.message);
      });
  };

  const updateClientInfo: DataStoreContextValue["updateClientInfo"] = (clientId, partial) => {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, ...partial } : c)));
    const { contratoArquivo, ...resto } = partial;
    const dbPartial: Record<string, unknown> = { ...resto };
    if ("contratoArquivo" in partial) dbPartial.contrato_arquivo = contratoArquivo;
    supabase
      .from("clients")
      .update(dbPartial)
      .eq("id", clientId)
      .then(({ error }) => {
        if (error) console.error("Erro ao atualizar dados do cliente no Supabase:", error.message);
      });
  };

  // Cadastro manual de cliente — pra quando o cliente entra sem passar pelo
  // funil comercial (ex: indicação direta, migração de outra ferramenta).
  const addClientManual: DataStoreContextValue["addClientManual"] = (partial) => {
    const hoje = new Date();
    const clientId = crypto.randomUUID();
    const dataInicioJornada = hoje.toISOString().slice(0, 10);

    // A data de cobrança define o "dia do mês" em que esse cliente é cobrado
    // de verdade — útil pra cadastrar um cliente que já existia antes do
    // sistema (ex: já paga todo dia 13). Se não escolher nada, usa hoje.
    const dataCobranca = partial.dataCobranca || dataInicioJornada;

    const servicos = partial.services ?? [];
    const matchedTemplates = servicos
      .map((s) => serviceTemplates.find((t) => t.name === s || t.id === s))
      .filter((t): t is ServiceTemplate => Boolean(t));
    const prazoJornadaDias =
      matchedTemplates.length > 0
        ? Math.max(...matchedTemplates.map((t) => t.defaultDeadlineDays))
        : 15;
    const dataPrevistaFimOnboarding = new Date(
      hoje.getTime() + prazoJornadaDias * 24 * 60 * 60 * 1000,
    )
      .toISOString()
      .slice(0, 10);
    const etapaJornada = matchedTemplates[0]?.stages?.[0] ?? "Briefing";

    const { dataCobranca: _omit, ...clientFields } = partial;
    const timelineEntry = {
      id: `tl-${Date.now()}`,
      time: "Agora",
      user: "Sistema",
      text: "Cliente cadastrado manualmente",
    };
    const newClient: Client = {
      id: clientId,
      status: "onboarding",
      since: dataCobranca,
      renewalDate:
        partial.renewalDate ??
        addMonths(new Date(`${dataCobranca}T00:00:00`), partial.contratoMeses ?? 12)
          .toISOString()
          .slice(0, 10),
      contratoMeses: partial.contratoMeses ?? 12,
      paymentDay: partial.paymentDay ?? Number(dataCobranca.slice(8, 10)),
      prazoJornadaDias,
      dataInicioJornada,
      dataPrevistaFimOnboarding,
      etapaJornada,
      timeline: [timelineEntry],
      comentarios: [],
      ...clientFields,
    };

    // Monta o projeto (com checklist do template do serviço) — igual ao que
    // já acontece quando o cliente vem de uma venda fechada pelo CRM. Antes,
    // cadastrar por aqui deixava a aba Operação do cliente completamente vazia.
    // Diferente da venda pelo CRM, aqui NÃO cria tarefas de onboarding — só o
    // checklist mesmo, por decisão de fluxo (cliente cadastrado manualmente
    // já costuma ter a implementação avançada ou até concluída de fato).
    const newProjects: Project[] = [];
    servicos.forEach((s) => {
      const tpl = serviceTemplates.find((t) => t.name === s || t.id === s);
      const deadlineDays = tpl?.defaultDeadlineDays ?? 15;
      const projDeadline = new Date(hoje.getTime() + deadlineDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const projId = crypto.randomUUID();

      let type: Project["type"] = "Tráfego";
      const sLower = s.toLowerCase();
      if (sLower.includes("landing")) type = "Landing Page";
      else if (sLower.includes("site")) type = "Site";
      else if (sLower.includes("consultoria")) type = "Consultoria";
      else if (sLower.includes("criativos")) type = "Criativos";
      else if (sLower.includes("automação") || sLower.includes("automacao")) type = "Automação";

      newProjects.push({
        id: projId,
        clientId,
        clientName: newClient.company,
        name: `${s} — ${newClient.company}`,
        type,
        status: "briefing",
        fase: "implementacao",
        progress: 0,
        deadline: projDeadline,
        owner: newClient.owner,
        checklist: tpl?.checklist
          ? tpl.checklist.map((item) => ({ id: crypto.randomUUID(), text: item, done: false }))
          : [],
      });
    });

    // A ideia é que cadastrar o cliente aqui já seja suficiente pra contar no
    // financeiro — sem precisar passar por uma "venda" separada no CRM. Data
    // usada é a de cobrança escolhida (ou hoje, se não escolher nada).
    const newFinanceEntry: FinanceEntry = {
      id: crypto.randomUUID(),
      date: dataCobranca,
      description: `Mensalidade — ${newClient.company}`,
      category: "Mensalidade",
      costCenter: "Receita",
      type: "entrada",
      amount: newClient.monthlyValue,
      client: newClient.company,
      recurring: true,
    };

    // Reflete tudo na tela na hora.
    setClients((prev) => [newClient, ...prev]);
    if (newProjects.length > 0) setProjects((prev) => [...newProjects, ...prev]);
    setExpenses((prev) => [newFinanceEntry, ...prev]);

    // Salva no Supabase em SEQUÊNCIA (cliente → timeline/projetos → checklist/
    // cobrança) — nunca em paralelo. Checklist depende do projeto já existir,
    // e o projeto depende do cliente já existir; mandar tudo "ao mesmo tempo"
    // fazia o banco rejeitar em silêncio quando a ordem de chegada não
    // batia, e os dados sumiam ao recarregar a página.
    supabase
      .from("clients")
      .insert(clientToDb(newClient))
      .then(({ error: clientError }) => {
        if (clientError) {
          console.error(
            "Erro ao salvar cliente (cadastro manual) no Supabase:",
            clientError.message,
          );
          toast.error(`Cliente "${newClient.company}" não foi salvo no banco.`, {
            description: clientError.message,
            duration: 20000,
          });
          return;
        }

        supabase
          .from("client_timeline")
          .insert({
            id: timelineEntry.id,
            client_id: clientId,
            user_name: "Sistema",
            text: timelineEntry.text,
            created_at: hoje.toISOString(),
          })
          .then(({ error: timelineError }) => {
            if (timelineError) {
              console.error(
                "Erro ao salvar histórico do cliente no Supabase:",
                timelineError.message,
              );
              toast.error("Histórico inicial do cliente não foi salvo.", {
                description: timelineError.message,
                duration: 15000,
              });
            }
          });

        if (newProjects.length > 0) {
          supabase
            .from("projects")
            .insert(newProjects.map(projectToDb))
            .then(({ error: projectsError }) => {
              if (projectsError) {
                console.error("Erro ao salvar projetos no Supabase:", projectsError.message);
                toast.error("O projeto de implementação não foi salvo.", {
                  description: projectsError.message,
                  duration: 20000,
                });
                return;
              }

              const allChecklistItems = newProjects.flatMap((p) =>
                (p.checklist ?? []).map((item, i) => ({
                  id: item.id,
                  project_id: p.id,
                  text: item.text,
                  done: item.done,
                  ordem: i,
                })),
              );
              if (allChecklistItems.length > 0) {
                supabase
                  .from("checklist_items")
                  .insert(allChecklistItems)
                  .then(({ error: checklistError }) => {
                    if (checklistError) {
                      console.error(
                        "Erro ao salvar checklist no Supabase:",
                        checklistError.message,
                      );
                      toast.error("O checklist do projeto não foi salvo.", {
                        description: checklistError.message,
                        duration: 20000,
                      });
                    }
                  });
              }
            });
        }

        supabase
          .from("finance_entries")
          .insert(expenseToDb(newFinanceEntry))
          .then(({ error: financeError }) => {
            if (financeError) {
              console.error("Erro ao salvar cobrança inicial no Supabase:", financeError.message);
              toast.error("A cobrança inicial não foi salva no financeiro.", {
                description: financeError.message,
                duration: 20000,
              });
            }
          });
      });

    return newClient;
  };

  const addComentario: DataStoreContextValue["addComentario"] = (clientId, texto, autor) => {
    const comentario: ClientComentario = {
      id: `cm-${Date.now()}`,
      texto,
      autor,
      data: new Date().toISOString(),
    };
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId ? { ...c, comentarios: [comentario, ...(c.comentarios ?? [])] } : c,
      ),
    );
  };

  const removeComentario: DataStoreContextValue["removeComentario"] = (clientId, comentarioId) => {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, comentarios: (c.comentarios ?? []).filter((cm) => cm.id !== comentarioId) }
          : c,
      ),
    );
  };

  // Registra um evento na timeline do cliente (ex: "Contrato assinado", "Documento
  // anexado", "Implementação concluída"...) e salva de verdade no Supabase, pra
  // não sumir mais ao recarregar a página.
  const addTimelineEntry: DataStoreContextValue["addTimelineEntry"] = (
    clientId,
    text,
    user = "Sistema",
  ) => {
    const id = crypto.randomUUID();
    const agora = new Date();
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? {
              ...c,
              timeline: [
                { id, time: agora.toLocaleString("pt-BR"), user, text },
                ...(c.timeline ?? []),
              ],
            }
          : c,
      ),
    );
    supabase
      .from("client_timeline")
      .insert({ id, client_id: clientId, user_name: user, text, created_at: agora.toISOString() })
      .then(({ error }) => {
        if (error) console.error("Erro ao salvar histórico do cliente no Supabase:", error.message);
      });
  };

  // Envia o arquivo de verdade pro Supabase Storage (bucket "documentos-clientes")
  // e só depois salva a referência (nome, categoria, link) na tabela — antes o
  // arquivo em si nunca era enviado a lugar nenhum, só o nome ficava na memória
  // da tela, por isso nunca dava pra abrir/baixar depois.
  const addClientDocumentFile: DataStoreContextValue["addClientDocumentFile"] = async (
    clientId,
    category,
    file,
  ) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString().slice(0, 10);
    const path = `${clientId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("documentos-clientes")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      console.error("Erro ao enviar arquivo para o Supabase Storage:", uploadError.message);
      throw uploadError;
    }

    const { data: publicUrlData } = supabase.storage.from("documentos-clientes").getPublicUrl(path);

    const doc: DocItem = {
      id,
      clientId,
      title: file.name,
      category,
      type: "file",
      url: publicUrlData.publicUrl,
      storagePath: path,
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      addedBy: "Você",
      addedAt: now,
    };

    setClientDocuments((prev) => [doc, ...prev]);
    supabase
      .from("client_documents")
      .insert(docToDb(doc))
      .then(({ error }) => {
        if (error) console.error("Erro ao salvar documento no Supabase:", error.message);
      });
    addTimelineEntry(clientId, `Documento adicionado: ${file.name}`, "Você");
  };

  const addClientDocumentLink: DataStoreContextValue["addClientDocumentLink"] = (
    clientId,
    category,
    title,
    url,
  ) => {
    const doc: DocItem = {
      id: crypto.randomUUID(),
      clientId,
      title,
      category,
      type: "link",
      url,
      addedBy: "Você",
      addedAt: new Date().toISOString().slice(0, 10),
    };
    setClientDocuments((prev) => [doc, ...prev]);
    supabase
      .from("client_documents")
      .insert(docToDb(doc))
      .then(({ error }) => {
        if (error) console.error("Erro ao salvar link no Supabase:", error.message);
      });
    addTimelineEntry(clientId, `Link adicionado: ${title}`, "Você");
  };

  const deleteClientDocument: DataStoreContextValue["deleteClientDocument"] = (id) => {
    const doc = clientDocuments.find((d) => d.id === id);
    setClientDocuments((prev) => prev.filter((d) => d.id !== id));
    supabase
      .from("client_documents")
      .delete()
      .eq("id", id)
      .then(({ error }) => {
        if (error) console.error("Erro ao excluir documento no Supabase:", error.message);
      });
    if (doc?.storagePath) {
      supabase.storage
        .from("documentos-clientes")
        .remove([doc.storagePath])
        .then(({ error }) => {
          if (error) console.error("Erro ao excluir arquivo do Storage:", error.message);
        });
    }
  };

  // Gera um link temporário (expira em 2 minutos) pra ver/baixar o
  // documento — só funciona pra quem está logado no sistema. Diferente de
  // um link fixo, esse não pode ser copiado e reaberto depois por qualquer
  // pessoa que não tenha acesso ao sistema.
  const getClientDocumentUrl: DataStoreContextValue["getClientDocumentUrl"] = async (
    storagePath,
  ) => {
    const { data, error } = await supabase.storage
      .from("documentos-clientes")
      .createSignedUrl(storagePath, 120);
    if (error) {
      console.error("Erro ao gerar link do documento:", error.message);
      toast.error("Não foi possível abrir o documento.");
      return null;
    }
    return data?.signedUrl ?? null;
  };

  // Sobe uma logo nova pro bucket público de identidade visual e salva o
  // link nas configurações do sistema — fica valendo pra todo mundo que
  // usa o sistema, em qualquer aparelho, a partir daí.
  const updateLogo: DataStoreContextValue["updateLogo"] = async (file) => {
    const path = `logo-${Date.now()}.${file.name.split(".").pop() ?? "png"}`;
    const { error: uploadError } = await supabase.storage
      .from("identidade-visual")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      console.error("Erro ao enviar logo para o Supabase Storage:", uploadError.message);
      toast.error("Não foi possível enviar a logo.", { description: uploadError.message });
      throw uploadError;
    }
    const { data } = supabase.storage.from("identidade-visual").getPublicUrl(path);
    const url = data.publicUrl;
    setLogoUrl(url);
    const { error: saveError } = await supabase
      .from("app_settings")
      .upsert({ key: "logo_url", value: url }, { onConflict: "key" });
    if (saveError) {
      console.error("Erro ao salvar logo no Supabase:", saveError.message);
      toast.error("A logo foi enviada, mas não salvou a preferência.", {
        description: saveError.message,
      });
    }
  };

  const updateServiceTemplate: DataStoreContextValue["updateServiceTemplate"] = (id, partial) => {
    setServiceTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, ...partial } : t)));
  };

  const criarClienteDeVenda = (
    lead: Lead,
    servicos: string[],
    plano?: string,
    contratoMeses = 12,
  ): Client => {
    const hoje = new Date();
    const dataInicioJornada = hoje.toISOString().slice(0, 10);

    // 2. MAIOR defaultDeadlineDays entre todos os serviços vendidos (service-templates.ts)
    const matchedTemplates = servicos
      .map((s) => serviceTemplates.find((t) => t.name === s || t.id === s))
      .filter((t): t is ServiceTemplate => Boolean(t));

    const prazoJornadaDias =
      matchedTemplates.length > 0
        ? Math.max(...matchedTemplates.map((t) => t.defaultDeadlineDays))
        : 15;

    // 3. Define dataInicioJornada (hoje) e dataPrevistaFimOnboarding (hoje + prazoJornadaDias)
    const fimDate = new Date(hoje.getTime() + prazoJornadaDias * 24 * 60 * 60 * 1000);
    const dataPrevistaFimOnboarding = fimDate.toISOString().slice(0, 10);

    // 4. Define etapaJornada inicial como o primeiro item do array stages do primeiro template vendido
    const etapaJornada = matchedTemplates[0]?.stages[0] ?? "Briefing";

    const plan: Client["plan"] =
      lead.value >= 15000
        ? "Enterprise"
        : lead.value >= 10000
          ? "Scale"
          : lead.value >= 5000
            ? "Growth"
            : "Starter";

    // 7. Registra a primeira entrada da timeline do cliente
    const timelineEntry = {
      id: `tl-${Date.now()}`,
      time: "Agora",
      user: lead.owner || "Sistema",
      text: `Cliente criado a partir da venda fechada no CRM (${servicos.join(", ")})`,
    };

    // 1. Cria um novo Client a partir dos dados do lead, status "onboarding"
    const clientId = crypto.randomUUID();
    const newClient: Client = {
      id: clientId,
      name: lead.name,
      company: lead.company,
      plan,
      plano,
      monthlyValue: lead.value,
      paymentDay: 5,
      renewalDate: addMonths(hoje, contratoMeses).toISOString().slice(0, 10),
      contratoMeses,
      owner: lead.owner,
      status: "onboarding",
      since: dataInicioJornada,
      services: servicos,
      prazoJornadaDias,
      dataInicioJornada,
      dataPrevistaFimOnboarding,
      etapaJornada,
      timeline: [timelineEntry],
    };

    // 5. Para cada serviço, cria um Projeto vinculado ao cliente, aplicando checklist e tarefas
    const newProjects: Project[] = [];
    const newTasks: Task[] = [];

    servicos.forEach((s, idx) => {
      const tpl = serviceTemplates.find((t) => t.name === s || t.id === s);
      const deadlineDays = tpl?.defaultDeadlineDays ?? 15;
      const projDeadline = new Date(hoje.getTime() + deadlineDays * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const projId = crypto.randomUUID();

      let type: Project["type"] = "Tráfego";
      const sLower = s.toLowerCase();
      if (sLower.includes("landing")) type = "Landing Page";
      else if (sLower.includes("site")) type = "Site";
      else if (sLower.includes("consultoria")) type = "Consultoria";
      else if (sLower.includes("criativos")) type = "Criativos";
      else if (sLower.includes("automação") || sLower.includes("automacao")) type = "Automação";

      newProjects.push({
        id: projId,
        clientId: newClient.id,
        clientName: newClient.company,
        name: `${s} — ${newClient.company}`,
        type,
        status: "briefing",
        fase: "implementacao",
        progress: 0,
        deadline: projDeadline,
        owner: lead.owner,
        checklist: tpl?.checklist
          ? tpl.checklist.map((item) => ({ id: crypto.randomUUID(), text: item, done: false }))
          : [],
      });

      if (tpl?.tasks) {
        tpl.tasks.forEach((t) => {
          const taskDue = new Date(hoje.getTime() + t.dueOffsetDays * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
          newTasks.push({
            id: crypto.randomUUID(),
            title: `${t.title} (${newClient.company})`,
            owner: lead.owner,
            priority: t.priority,
            status: "hoje",
            dueDate: taskDue,
            clientId: newClient.id,
            projectId: projId,
            labels: ["Onboarding", s],
          });
        });
      }
    });

    // 6. Cria o primeiro registro de cobrança (mensalidade) — contabilizado
    // HOJE, no dia real em que o contrato foi assinado/pago. Sendo
    // "recurring: true", o DRE já repete esse valor automaticamente todo mês
    // seguinte (contanto que o cliente continue ativo e a cobrança daquele
    // mês seja confirmada).
    const dataAssinatura = hoje.toISOString().slice(0, 10);
    const newFinanceEntry: FinanceEntry = {
      id: crypto.randomUUID(),
      date: dataAssinatura,
      description: `Mensalidade — ${lead.company}`,
      category: "Mensalidade",
      costCenter: "Receita",
      type: "entrada",
      amount: lead.value,
      client: lead.company,
      recurring: true,
    };

    // Atualiza o estado global — a tela já reflete tudo na hora, mesmo antes
    // de qualquer resposta do Supabase.
    setClients((prev) => [newClient, ...prev]);
    if (newProjects.length > 0) setProjects((prev) => [...newProjects, ...prev]);
    if (newTasks.length > 0) setTasks((prev) => [...newTasks, ...prev]);
    setExpenses((prev) => [newFinanceEntry, ...prev]);

    // Salva no Supabase em SEQUÊNCIA, não em paralelo: cliente primeiro, e só
    // depois dele existir de verdade no banco (dentro do .then()) é que
    // projetos/checklist/tarefas são enviados — essas duas últimas tabelas
    // têm referência obrigatória a projeto/cliente já existente, então
    // mandar tudo "ao mesmo tempo" fazia o banco rejeitar em silêncio quando
    // a ordem de chegada não batia (era isso que fazia checklist e tarefa
    // "sumirem" ao recarregar a página).
    supabase
      .from("clients")
      .insert(clientToDb(newClient))
      .then(({ error: clientError }) => {
        if (clientError) {
          console.error("Erro ao salvar cliente no Supabase:", clientError.message);
          return;
        }

        supabase
          .from("client_timeline")
          .insert({
            id: timelineEntry.id,
            client_id: clientId,
            user_name: timelineEntry.user,
            text: timelineEntry.text,
            created_at: hoje.toISOString(),
          })
          .then(({ error: timelineError }) => {
            if (timelineError)
              console.error(
                "Erro ao salvar histórico inicial do cliente no Supabase:",
                timelineError.message,
              );
          });

        if (newProjects.length > 0) {
          supabase
            .from("projects")
            .insert(newProjects.map(projectToDb))
            .then(({ error: projectsError }) => {
              if (projectsError) {
                console.error("Erro ao salvar projetos no Supabase:", projectsError.message);
                return;
              }

              const allChecklistItems = newProjects.flatMap((p) =>
                (p.checklist ?? []).map((item, i) => ({
                  id: item.id,
                  project_id: p.id,
                  text: item.text,
                  done: item.done,
                  ordem: i,
                })),
              );
              if (allChecklistItems.length > 0) {
                supabase
                  .from("checklist_items")
                  .insert(allChecklistItems)
                  .then(({ error: checklistError }) => {
                    if (checklistError)
                      console.error(
                        "Erro ao salvar checklist no Supabase:",
                        checklistError.message,
                      );
                  });
              }

              if (newTasks.length > 0) {
                supabase
                  .from("tasks")
                  .insert(newTasks.map(taskToDb))
                  .then(({ error: tasksError }) => {
                    if (tasksError)
                      console.error(
                        "Erro ao salvar tarefas de onboarding no Supabase:",
                        tasksError.message,
                      );
                  });
              }
            });
        }

        supabase
          .from("finance_entries")
          .insert(expenseToDb(newFinanceEntry))
          .then(({ error: financeError }) => {
            if (financeError)
              console.error("Erro ao salvar cobrança inicial no Supabase:", financeError.message);
          });
      });

    // 8. Retorna o cliente criado
    return newClient;
  };

  const toggleChecklistItem = (projectId: string, itemId: string) => {
    // 1. Inverte o done do item e captura o clientId do projeto
    let affectedClientId: string | null = null;
    let novosProjetosOperacao: Project[] = [];
    const itemAtual = projects
      .find((p) => p.id === projectId)
      ?.checklist?.find((i) => i.id === itemId);
    const novoDone = !(itemAtual?.done ?? false);

    supabase
      .from("checklist_items")
      .update({ done: novoDone })
      .eq("id", itemId)
      .then(({ error }) => {
        if (error) console.error("Erro ao atualizar checklist no Supabase:", error.message);
      });

    setProjects((prevProjects) => {
      let updated = prevProjects.map((p) => {
        if (p.id !== projectId) return p;
        affectedClientId = p.clientId;
        return {
          ...p,
          checklist: (p.checklist ?? []).map((item) =>
            item.id === itemId ? { ...item, done: !item.done } : item,
          ),
        };
      });

      // Fluxo automático do projeto, pra não precisar mover manualmente:
      // começou a trabalhar (algum item do checklist marcado) → Produção.
      // Terminou o checklist inteiro → Entrega. Isso mantém o quadro de
      // Operação organizado sozinho, sem projeto finalizado poluindo Produção.
      const projetoTocado = updated.find((p) => p.id === projectId);
      if (projetoTocado && projetoTocado.fase === "implementacao") {
        const checklist = projetoTocado.checklist ?? [];
        const algumFeito = checklist.some((i) => i.done);
        const tudoFeito = checklist.length > 0 && checklist.every((i) => i.done);
        let novoStatus: Project["status"] | null = null;
        if (tudoFeito && projetoTocado.status !== "entregue") novoStatus = "entregue";
        else if (algumFeito && projetoTocado.status === "briefing") novoStatus = "producao";
        else if (!algumFeito && projetoTocado.status !== "briefing") novoStatus = "briefing";

        if (novoStatus) {
          updated = updated.map((p) => (p.id === projectId ? { ...p, status: novoStatus! } : p));
          supabase
            .from("projects")
            .update({ status: novoStatus })
            .eq("id", projectId)
            .then(({ error }) => {
              if (error)
                console.error("Erro ao atualizar status do projeto no Supabase:", error.message);
            });
        }
      }

      // 2. Verifica se todos os projetos de IMPLEMENTAÇÃO do cliente estão com checklist 100%.
      // Projetos de Gestão do Cliente não entram nessa conta — eles não têm "fim".
      // Importante: considera TODOS os projetos de implementação, incluindo o que acabou
      // de ser marcado "Entregue" agora mesmo (linha acima) — antes, um projeto recém
      // entregue já saía da lista de checagem, e o cliente nunca era ativado sozinho.
      if (!affectedClientId) return updated;
      const clienteAtual = clients.find((c) => c.id === affectedClientId);
      const implementacoes = updated.filter(
        (p) => p.clientId === affectedClientId && p.fase === "implementacao",
      );
      const allDone =
        clienteAtual?.status !== "ativo" &&
        implementacoes.length > 0 &&
        implementacoes.every((p) => (p.checklist ?? []).every((item) => item.done));
      const aindaNaoEntregues = implementacoes;

      if (allDone) {
        // 3. Fecha a implementação (Onboarding = Implementação, um conceito só) e cria,
        // automaticamente, um Projeto de Gestão do Cliente para cada serviço entregue —
        // sem prazo fixo, é o que existe enquanto o cliente estiver ativo.
        // Sem geração automática de tarefas: o planejamento da semana é manual, feito
        // pelo operador na própria tela do cliente — evita poluir Minha Semana com
        // tarefas que nem sempre precisam acontecer naquela semana.
        const hoje = new Date();
        const hojeISO = hoje.toISOString().slice(0, 10);
        const renewal = clients.find((c) => c.id === affectedClientId)?.renewalDate ?? hojeISO;
        novosProjetosOperacao = aindaNaoEntregues.map((p) => ({
          id: crypto.randomUUID(),
          clientId: p.clientId,
          clientName: p.clientName,
          name: `Gestão do Cliente — ${p.type} — ${p.clientName}`,
          type: p.type,
          status: "producao" as const,
          fase: "operacao_continua" as const,
          progress: 0,
          deadline: renewal,
          owner: p.owner,
        }));

        // Salva os projetos de Gestão do Cliente + marca os de implementação como entregues no Supabase
        supabase
          .from("projects")
          .insert(novosProjetosOperacao.map(projectToDb))
          .then(({ error }) => {
            if (error)
              console.error(
                "Erro ao salvar projeto de Gestão do Cliente no Supabase:",
                error.message,
              );
          });
        supabase
          .from("projects")
          .update({ status: "entregue" })
          .in(
            "id",
            aindaNaoEntregues.map((p) => p.id),
          )
          .then(({ error }) => {
            if (error)
              console.error("Erro ao marcar projeto como entregue no Supabase:", error.message);
          });

        updated = updated.map((p) =>
          aindaNaoEntregues.some((ie) => ie.id === p.id)
            ? { ...p, status: "entregue" as const }
            : p,
        );

        supabase
          .from("clients")
          .update({ status: "ativo" })
          .eq("id", affectedClientId)
          .then(({ error }) => {
            if (error)
              console.error("Erro ao atualizar status do cliente no Supabase:", error.message);
          });

        setClients((prevClients) => {
          const timelineId = `tl-${Date.now()}`;
          supabase
            .from("client_timeline")
            .insert({
              id: timelineId,
              client_id: affectedClientId,
              user_name: "Sistema",
              text: "Implementação concluída — cliente entrou na Gestão do Cliente",
              created_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error)
                console.error("Erro ao salvar histórico do cliente no Supabase:", error.message);
            });
          return prevClients.map((c) =>
            c.id === affectedClientId
              ? {
                  ...c,
                  status: "ativo" as const,
                  timeline: [
                    {
                      id: timelineId,
                      time: "Agora",
                      user: "Sistema",
                      text: "Implementação concluída — cliente entrou na Gestão do Cliente",
                    },
                    ...(c.timeline ?? []),
                  ],
                }
              : c,
          );
        });
      }

      return allDone ? [...updated, ...novosProjetosOperacao] : updated;
    });
  };

  return (
    <DataStoreContext.Provider
      value={{
        leads,
        teamMembers,
        tasks,
        clients,
        expenses,
        projects,
        insights,
        metasMensais,
        pontosControle,
        pontoControleAtual,
        salvarPontoControle,
        updateMetas,

        addLead,
        updateLeadStage,
        updateLeadValue,
        deleteLead,
        addTask,
        updateTask,
        deleteTask,
        addExpense,
        deleteExpense,
        toggleTaskDone,
        updateClientStatus,
        deleteClient,
        updateClientInfo,
        addClientManual,
        addComentario,
        removeComentario,
        addTimelineEntry,
        criarClienteDeVenda,
        serviceTemplates,
        updateServiceTemplate,
        toggleChecklistItem,

        clientDocuments,
        addClientDocumentFile,
        addClientDocumentLink,
        deleteClientDocument,
        getClientDocumentUrl,

        recurringConfirmations,
        confirmRecurring,

        systemNotifications,

        logoUrl,
        updateLogo,
      }}
    >
      {children}
    </DataStoreContext.Provider>
  );
}

export function useDataStore() {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error("useDataStore must be used within DataStoreProvider");
  return ctx;
}
