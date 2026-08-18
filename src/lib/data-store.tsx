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

function loadPontos(): PontoControle[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PC_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PontoControle[]) : [];
  } catch {
    return [];
  }
}

function persistPontos(list: PontoControle[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PC_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
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

  recurringConfirmations: RecurringConfirmation[];
  confirmRecurring: (entryId: string, mes: string, status: RecurringConfirmation["status"]) => void;

  systemNotifications: SystemNotification[];
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
  const [pontosControle, setPontosControle] = useState<PontoControle[]>(() => loadPontos());
  const [clientDocuments, setClientDocuments] = useState<DocItem[]>([]);
  const [recurringConfirmations, setRecurringConfirmations] = useState<RecurringConfirmation[]>([]);
  const [systemNotifications, setSystemNotifications] = useState<SystemNotification[]>([]);
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

  useEffect(() => {
    carregarLeads();
    carregarClientes();
    carregarProjetos();
    carregarTarefas();
    carregarFinanceiro();

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
      const next = existente
        ? prev.map((p) => (p.mes === input.mes ? { ...registro, criadoEm: p.criadoEm } : p))
        : [registro, ...prev];
      const sorted = [...next].sort((a, b) => b.mes.localeCompare(a.mes));
      persistPontos(sorted);
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
    const etapaJornada = matchedTemplates[0]?.stages[0] ?? "Briefing";

    const { dataCobranca: _omit, ...clientFields } = partial;
    const newClient: Client = {
      id: clientId,
      status: "onboarding",
      since: dataInicioJornada,
      renewalDate:
        partial.renewalDate ??
        addMonths(hoje, partial.contratoMeses ?? 12)
          .toISOString()
          .slice(0, 10),
      contratoMeses: partial.contratoMeses ?? 12,
      paymentDay: partial.paymentDay ?? Number(dataCobranca.slice(8, 10)),
      prazoJornadaDias,
      dataInicioJornada,
      dataPrevistaFimOnboarding,
      etapaJornada,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          time: "Agora",
          user: "Sistema",
          text: "Cliente cadastrado manualmente",
        },
      ],
      comentarios: [],
      ...clientFields,
    };
    setClients((prev) => [newClient, ...prev]);
    supabase
      .from("clients")
      .insert(clientToDb(newClient))
      .then(({ error }) => {
        if (error)
          console.error("Erro ao salvar cliente (cadastro manual) no Supabase:", error.message);
      });
    supabase
      .from("client_timeline")
      .insert({
        id: newClient.timeline[0].id,
        client_id: clientId,
        user_name: "Sistema",
        text: "Cliente cadastrado manualmente",
        created_at: hoje.toISOString(),
      })
      .then(({ error }) => {
        if (error) console.error("Erro ao salvar histórico do cliente no Supabase:", error.message);
      });

    // Mesmo tratamento de quem vem de venda fechada: cria projeto (com
    // checklist do template do serviço) e tarefas de onboarding — sem isso,
    // a aba Operação do cliente ficava vazia pra quem era cadastrado por aqui.
    const newProjects: Project[] = [];
    const newTasks: Task[] = [];
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

      if (tpl?.tasks) {
        tpl.tasks.forEach((t) => {
          const taskDue = new Date(hoje.getTime() + t.dueOffsetDays * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
          newTasks.push({
            id: crypto.randomUUID(),
            title: `${t.title} (${newClient.company})`,
            owner: newClient.owner,
            priority: t.priority,
            status: "hoje",
            dueDate: taskDue,
            clientId,
            projectId: projId,
            labels: ["Onboarding", s],
          });
        });
      }
    });

    if (newProjects.length > 0) {
      setProjects((prev) => [...newProjects, ...prev]);
      supabase
        .from("projects")
        .insert(newProjects.map(projectToDb))
        .then(({ error }) => {
          if (error) console.error("Erro ao salvar projetos no Supabase:", error.message);
          newProjects.forEach((p) => {
            if (p.checklist.length === 0) return;
            supabase
              .from("checklist_items")
              .insert(
                p.checklist.map((item) => ({
                  id: item.id,
                  project_id: p.id,
                  text: item.text,
                  done: item.done,
                })),
              )
              .then(({ error: checklistError }) => {
                if (checklistError)
                  console.error("Erro ao salvar checklist no Supabase:", checklistError.message);
              });
          });
        });
    }
    if (newTasks.length > 0) {
      setTasks((prev) => [...newTasks, ...prev]);
      supabase
        .from("tasks")
        .insert(newTasks.map(taskToDb))
        .then(({ error }) => {
          if (error) console.error("Erro ao salvar tarefas no Supabase:", error.message);
        });
    }

    // A ideia é que cadastrar o cliente aqui já seja suficiente pra contar no
    // financeiro — sem precisar passar por uma "venda" separada no CRM.
    // Data usada é a de cobrança escolhida (ou hoje, se não escolher nada) —
    // sendo recorrente, o DRE já repete esse valor todo mês seguinte no
    // mesmo dia, contanto que a cobrança daquele mês seja confirmada.
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
    setExpenses((prev) => [newFinanceEntry, ...prev]);
    supabase
      .from("finance_entries")
      .insert(expenseToDb(newFinanceEntry))
      .then(({ error }) => {
        if (error) console.error("Erro ao salvar cobrança inicial no Supabase:", error.message);
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

    // Salva o cliente no Supabase em segundo plano (a tela já reflete na hora).
    // Projetos, checklist, tarefas e a cobrança inicial são salvos logo abaixo,
    // depois que o cliente e os projetos já têm um ID real pra referenciar.
    supabase
      .from("client_timeline")
      .insert({
        id: timelineEntry.id,
        client_id: clientId,
        user_name: timelineEntry.user,
        text: timelineEntry.text,
        created_at: hoje.toISOString(),
      })
      .then(({ error }) => {
        if (error)
          console.error("Erro ao salvar histórico inicial do cliente no Supabase:", error.message);
      });

    supabase
      .from("clients")
      .insert(clientToDb(newClient))
      .then(({ error }) => {
        if (error) console.error("Erro ao salvar cliente no Supabase:", error.message);
      });

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
    // HOJE, no dia real em que o contrato foi assinado/pago. Antes isso
    // aparecia 30 dias no futuro, o que fazia a mensalidade "sumir" do mês
    // em que o cliente realmente entrou. Sendo "recurring: true", o DRE já
    // repete esse valor automaticamente todo mês seguinte (contanto que o
    // cliente continue ativo e a cobrança daquele mês seja confirmada).
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

    // Atualiza o estado global
    setClients((prev) => [newClient, ...prev]);
    if (newProjects.length > 0) setProjects((prev) => [...newProjects, ...prev]);
    if (newTasks.length > 0) setTasks((prev) => [...newTasks, ...prev]);
    setExpenses((prev) => [newFinanceEntry, ...prev]);

    // Salva tudo no Supabase em segundo plano — projetos primeiro, depois o
    // checklist de cada um (precisa do project_id já existente), tarefas e
    // a cobrança inicial. Cada bloco é independente: se um falhar, os outros
    // continuam tentando salvar normalmente.
    if (newProjects.length > 0) {
      supabase
        .from("projects")
        .insert(newProjects.map(projectToDb))
        .then(({ error }) => {
          if (error) console.error("Erro ao salvar projetos no Supabase:", error.message);
        });

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
          .then(({ error }) => {
            if (error) console.error("Erro ao salvar checklist no Supabase:", error.message);
          });
      }
    }
    if (newTasks.length > 0) {
      supabase
        .from("tasks")
        .insert(newTasks.map(taskToDb))
        .then(({ error }) => {
          if (error)
            console.error("Erro ao salvar tarefas de onboarding no Supabase:", error.message);
        });
    }
    supabase
      .from("finance_entries")
      .insert(expenseToDb(newFinanceEntry))
      .then(({ error }) => {
        if (error) console.error("Erro ao salvar cobrança inicial no Supabase:", error.message);
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

      // 2. Verifica se todos os projetos de IMPLEMENTAÇÃO do cliente estão com checklist 100%.
      // Projetos de Gestão do Cliente não entram nessa conta — eles não têm "fim".
      if (!affectedClientId) return updated;
      const implementacoes = updated.filter(
        (p) => p.clientId === affectedClientId && p.fase === "implementacao",
      );
      const aindaNaoEntregues = implementacoes.filter((p) => p.status !== "entregue");
      const allDone =
        aindaNaoEntregues.length > 0 &&
        aindaNaoEntregues.every((p) => (p.checklist ?? []).every((item) => item.done));

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

        recurringConfirmations,
        confirmRecurring,

        systemNotifications,
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
