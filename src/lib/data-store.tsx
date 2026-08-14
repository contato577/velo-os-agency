import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import {
  leads as seedLeads,
  stageLabels,
  tasks as seedTasks,
  clients as seedClients,
  financeEntries as seedExpenses,
  projects as seedProjects,
  agendaEvents as seedAgenda,
  dashboardKPIs,
  type Lead,
  type Task,
  type Client,
  type ClientComentario,
  type FinanceEntry,
  type Project,
  type LeadStage,
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

interface DataStoreContextValue {
  leads: Lead[];
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
  deleteLead: (id: string) => void;
  addTask: (partial: Omit<Task, "id">) => Task;
  updateTask: (id: string, partial: Partial<Omit<Task, "id">>) => void;
  deleteTask: (id: string) => void;
  addExpense: (partial: Omit<FinanceEntry, "id">) => FinanceEntry;
  toggleTaskDone: (taskId: string) => void;
  updateClientStatus: (clientId: string, status: Client["status"]) => void;
  deleteClient: (clientId: string) => void;
  updateClientInfo: (
    clientId: string,
    partial: Partial<Pick<Client, "name" | "company" | "email" | "phone" | "contratoArquivo">>,
  ) => void;
  addClientManual: (
    partial: Pick<Client, "name" | "company" | "owner" | "plan" | "monthlyValue" | "services"> &
      Partial<Client>,
  ) => Client;
  addComentario: (clientId: string, texto: string, autor: string) => void;
  removeComentario: (clientId: string, comentarioId: string) => void;
  criarClienteDeVenda: (
    lead: Lead,
    servicos: string[],
    plano?: string,
    contratoMeses?: number,
  ) => Client;
  serviceTemplates: ServiceTemplate[];
  updateServiceTemplate: (id: string, partial: Partial<Omit<ServiceTemplate, "id">>) => void;
  toggleChecklistItem: (projectId: string, itemId: string) => void;
}

const DataStoreContext = createContext<DataStoreContextValue | null>(null);

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [clients, setClients] = useState<Client[]>([]);
  const [expenses, setExpenses] = useState<FinanceEntry[]>(seedExpenses);
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>(seedTemplates);
  const [pontosControle, setPontosControle] = useState<PontoControle[]>(() => loadPontos());
  const [metasFallback, setMetasFallback] = useState<MetasMensais>({
    metaComercial: 50000,
  });

  // Busca leads e clientes reais do Supabase ao abrir o sistema.
  // Se der erro (sem internet, chave errada etc.), cai pros dados de exemplo,
  // pra tela nunca ficar em branco — e avisa no console pra facilitar o diagnóstico.
  useEffect(() => {
    supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar leads do Supabase:", error.message);
          setLeads(seedLeads);
          return;
        }
        setLeads((data ?? []).map(leadFromDb));
      });

    supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error("Erro ao carregar clientes do Supabase:", error.message);
          setClients(seedClients);
          return;
        }
        setClients((data ?? []).map(clientFromDb));
      });
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

  const insights = useMemo(
    () =>
      gerarInsights({
        leads,
        tasks,
        clients,
        expenses,
        agenda: seedAgenda,
        kpis: {
          vendasMes: dashboardKPIs.vendasMes,
          metaMes: dashboardKPIs.metaMes,
          ticketMedio: dashboardKPIs.ticketMedio,
        },
      }),
    [leads, tasks, clients, expenses],
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
    const task: Task = { id: `t-${Date.now()}`, ...partial };
    setTasks((prev) => [task, ...prev]);
    return task;
  };

  const updateTask: DataStoreContextValue["updateTask"] = (id, partial) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...partial } : t)));
  };

  const deleteTask: DataStoreContextValue["deleteTask"] = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const addExpense: DataStoreContextValue["addExpense"] = (partial) => {
    const entry: FinanceEntry = { id: `fe-${Date.now()}`, ...partial };
    setExpenses((prev) => [entry, ...prev]);
    return entry;
  };

  const toggleTaskDone: DataStoreContextValue["toggleTaskDone"] = (taskId) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: t.status === "concluida" ? "hoje" : "concluida" } : t,
      ),
    );
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
    const newClient: Client = {
      id: clientId,
      status: "onboarding",
      since: hoje.toISOString().slice(0, 10),
      renewalDate: addMonths(hoje, partial.contratoMeses ?? 12)
        .toISOString()
        .slice(0, 10),
      contratoMeses: partial.contratoMeses ?? 12,
      paymentDay: partial.paymentDay ?? 5,
      timeline: [
        {
          id: `tl-${Date.now()}`,
          time: "Agora",
          user: "Sistema",
          text: "Cliente cadastrado manualmente",
        },
      ],
      comentarios: [],
      ...partial,
    };
    setClients((prev) => [newClient, ...prev]);
    supabase
      .from("clients")
      .insert(clientToDb(newClient))
      .then(({ error }) => {
        if (error)
          console.error("Erro ao salvar cliente (cadastro manual) no Supabase:", error.message);
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
    // Projetos, checklist, tarefas e a cobrança inicial ainda são só locais por
    // enquanto — entram no banco na próxima etapa.
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
      const projId = `p-${Date.now()}-${idx}`;

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
          ? tpl.checklist.map((item, i) => ({ id: `chk-${projId}-${i}`, text: item, done: false }))
          : [],
      });

      if (tpl?.tasks) {
        tpl.tasks.forEach((t, taskIdx) => {
          const taskDue = new Date(hoje.getTime() + t.dueOffsetDays * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
          newTasks.push({
            id: `t-${Date.now()}-${idx}-${taskIdx}`,
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

    // 6. Cria o primeiro registro de cobrança (mensalidade), vencimento em 30 dias
    const vencimento30d = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const newFinanceEntry: FinanceEntry = {
      id: `f-${Date.now()}`,
      date: vencimento30d,
      description: `Primeira Mensalidade — ${lead.company}`,
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

    // 8. Retorna o cliente criado
    return newClient;
  };

  const toggleChecklistItem = (projectId: string, itemId: string) => {
    // 1. Inverte o done do item e captura o clientId do projeto
    let affectedClientId: string | null = null;
    let novosProjetosOperacao: Project[] = [];

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
        novosProjetosOperacao = aindaNaoEntregues.map((p, i) => ({
          id: `p-op-${Date.now()}-${i}`,
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

        updated = updated.map((p) =>
          aindaNaoEntregues.some((ie) => ie.id === p.id)
            ? { ...p, status: "entregue" as const }
            : p,
        );

        setClients((prevClients) => {
          const timelineId = `tl-${Date.now()}`;
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
        deleteLead,
        addTask,
        updateTask,
        deleteTask,
        addExpense,
        toggleTaskDone,
        updateClientStatus,
        deleteClient,
        updateClientInfo,
        addClientManual,
        addComentario,
        removeComentario,
        criarClienteDeVenda,
        serviceTemplates,
        updateServiceTemplate,
        toggleChecklistItem,
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
