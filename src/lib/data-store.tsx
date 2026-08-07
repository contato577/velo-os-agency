import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
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
  { id: "q-relatorios", titulo: "Relatórios semanais", descricao: "Entregar 100% relatórios semanais" },
  { id: "q-entregas", titulo: "Entregas de serviços", descricao: "Entregar 100% serviços no prazo" },
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

export function mesAtualISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMesLabel(mes: string) {
  const [y, m] = mes.split("-");
  const nomes = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
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

  addLead: (partial: Omit<Lead, "id" | "createdAt" | "lastActivity"> & { stage?: LeadStage }) => Lead;
  updateLeadStage: (id: string, stage: LeadStage) => void;
  addTask: (partial: Omit<Task, "id">) => Task;
  updateTask: (id: string, partial: Partial<Omit<Task, "id">>) => void;
  deleteTask: (id: string) => void;
  addExpense: (partial: Omit<FinanceEntry, "id">) => FinanceEntry;
  toggleTaskDone: (taskId: string) => void;
  updateClientStatus: (clientId: string, status: Client["status"]) => void;
  updateClientInfo: (clientId: string, partial: Partial<Pick<Client, "name" | "company" | "email" | "phone" | "contratoArquivo">>) => void;
  addComentario: (clientId: string, texto: string, autor: string) => void;
  removeComentario: (clientId: string, comentarioId: string) => void;
  criarClienteDeVenda: (lead: Lead, servicos: string[], plano?: string, contratoMeses?: number) => Client;
  serviceTemplates: ServiceTemplate[];
  updateServiceTemplate: (id: string, partial: Partial<Omit<ServiceTemplate, "id">>) => void;
  toggleChecklistItem: (projectId: string, itemId: string) => void;
}

const DataStoreContext = createContext<DataStoreContextValue | null>(null);

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(seedLeads);
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [clients, setClients] = useState<Client[]>(seedClients);
  const [expenses, setExpenses] = useState<FinanceEntry[]>(seedExpenses);
  const [projects, setProjects] = useState<Project[]>(seedProjects);
  const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>(seedTemplates);
  const [pontosControle, setPontosControle] = useState<PontoControle[]>(() => loadPontos());
  const [metasFallback, setMetasFallback] = useState<MetasMensais>({
    metaComercial: 50000,
  });

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
      id: `lead-${Date.now()}`,
      createdAt: now,
      lastActivity: now,
      stage: stage ?? "novo",
      ...rest,
    } as Lead;
    setLeads((prev) => [lead, ...prev]);

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

  const updateLeadStage: DataStoreContextValue["updateLeadStage"] = (id, stage) => {
    const targetLead = leads.find((l) => l.id === id);

    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, stage, lastActivity: new Date().toISOString() } : l)),
    );

    if (targetLead && targetLead.stage !== stage) {
      const stageTaskTitles: Partial<Record<LeadStage, { title: string; priority: Task["priority"] }>> = {
        contato: { title: `Contato inicial com ${targetLead.name}`, priority: "alta" },
        diagnostico: { title: `Realizar diagnóstico de ${targetLead.name}`, priority: "alta" },
        reuniao: { title: `Preparar reunião com ${targetLead.name}`, priority: "urgente" },
        proposta: { title: `Fazer follow-up da proposta com ${targetLead.name}`, priority: "urgente" },
        negociacao: { title: `Acompanhar negociação com ${targetLead.name}`, priority: "urgente" },
      };

      const taskConfig = stageTaskTitles[stage];
      if (taskConfig) {
        const amanha = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
        setTasks((prevTasks) => {
          const hasDuplicate = prevTasks.some(
            (t) => t.leadId === id && (t.title === taskConfig.title || (t.labels && t.labels.includes(stageLabels[stage]))),
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
      prev.map((t) => (t.id === taskId ? { ...t, status: t.status === "concluida" ? "hoje" : "concluida" } : t)),
    );
  };

  const updateClientStatus: DataStoreContextValue["updateClientStatus"] = (clientId, status) => {
    const hoje = new Date().toISOString().slice(0, 10);
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, status, canceledAt: status === "cancelado" ? hoje : status === "ativo" ? undefined : c.canceledAt }
          : c,
      ),
    );
  };

  const updateClientInfo: DataStoreContextValue["updateClientInfo"] = (clientId, partial) => {
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, ...partial } : c)),
    );
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
        c.id === clientId
          ? { ...c, comentarios: [comentario, ...(c.comentarios ?? [])] }
          : c,
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

  const criarClienteDeVenda = (lead: Lead, servicos: string[], plano?: string, contratoMeses = 12): Client => {
    const hoje = new Date();
    const dataInicioJornada = hoje.toISOString().slice(0, 10);

    // 2. MAIOR defaultDeadlineDays entre todos os serviços vendidos (service-templates.ts)
    const matchedTemplates = servicos
      .map((s) => serviceTemplates.find((t) => t.name === s || t.id === s))
      .filter((t): t is ServiceTemplate => Boolean(t));

    const prazoJornadaDias = matchedTemplates.length > 0
      ? Math.max(...matchedTemplates.map((t) => t.defaultDeadlineDays))
      : 15;

    // 3. Define dataInicioJornada (hoje) e dataPrevistaFimOnboarding (hoje + prazoJornadaDias)
    const fimDate = new Date(hoje.getTime() + prazoJornadaDias * 24 * 60 * 60 * 1000);
    const dataPrevistaFimOnboarding = fimDate.toISOString().slice(0, 10);

    // 4. Define etapaJornada inicial como o primeiro item do array stages do primeiro template vendido
    const etapaJornada = matchedTemplates[0]?.stages[0] ?? "Briefing";

    const plan: Client["plan"] =
      lead.value >= 15000 ? "Enterprise" : lead.value >= 10000 ? "Scale" : lead.value >= 5000 ? "Growth" : "Starter";

    // 7. Registra a primeira entrada da timeline do cliente
    const timelineEntry = {
      id: `tl-${Date.now()}`,
      time: "Agora",
      user: lead.owner || "Sistema",
      text: `Cliente criado a partir da venda fechada no CRM (${servicos.join(", ")})`,
    };

    // 1. Cria um novo Client a partir dos dados do lead, status "onboarding"
    const clientId = `c-${Date.now()}`;
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
      const projDeadline = new Date(hoje.getTime() + deadlineDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
        progress: 0,
        deadline: projDeadline,
        owner: lead.owner,
        checklist: tpl?.checklist ? tpl.checklist.map((item, i) => ({ id: `chk-${projId}-${i}`, text: item, done: false })) : [],
      });

      if (tpl?.tasks) {
        tpl.tasks.forEach((t, taskIdx) => {
          const taskDue = new Date(hoje.getTime() + t.dueOffsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
    const vencimento30d = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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

    setProjects((prevProjects) => {
      const updated = prevProjects.map((p) => {
        if (p.id !== projectId) return p;
        affectedClientId = p.clientId;
        return {
          ...p,
          checklist: (p.checklist ?? []).map((item) =>
            item.id === itemId ? { ...item, done: !item.done } : item,
          ),
        };
      });

      // 2. Verifica se todos os itens de TODOS os projetos do cliente estão done
      if (!affectedClientId) return updated;
      const clientProjects = updated.filter((p) => p.clientId === affectedClientId);
      const allDone =
        clientProjects.length > 0 &&
        clientProjects.every((p) => (p.checklist ?? []).every((item) => item.done));

      if (allDone) {
        // 3. Avança a etapa da jornada do cliente
        setClients((prevClients) =>
          prevClients.map((c) => {
            if (c.id !== affectedClientId) return c;

            const matchedTemplate = (c.services ?? [])
              .map((s) => serviceTemplates.find((t) => t.name === s || t.id === s))
              .find(Boolean);
            const stages: string[] = matchedTemplate?.stages ?? [];
            const currentIdx = stages.indexOf(c.etapaJornada ?? "");
            const isLast = currentIdx >= stages.length - 1 || currentIdx === -1;

            const timelineId = `tl-${Date.now()}`;

            if (isLast) {
              return {
                ...c,
                status: "ativo" as const,
                timeline: [
                  { id: timelineId, time: "Agora", user: "Sistema", text: "Jornada de onboarding concluída — cliente ativo" },
                  ...(c.timeline ?? []),
                ],
              };
            }

            const nextStage = stages[currentIdx + 1];
            return {
              ...c,
              etapaJornada: nextStage,
              timeline: [
                {
                  id: timelineId,
                  time: "Agora",
                  user: "Sistema",
                  text: `Etapa concluída: ${c.etapaJornada} → ${nextStage}`,
                },
                ...(c.timeline ?? []),
              ],
            };
          }),
        );
      }

      return updated;
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
        addTask,
        updateTask,
        deleteTask,
        addExpense,
        toggleTaskDone,
        updateClientStatus,
        updateClientInfo,
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
