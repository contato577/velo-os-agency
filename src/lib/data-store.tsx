import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  leads as seedLeads,
  tasks as seedTasks,
  clients as seedClients,
  financeEntries as seedExpenses,
  projects as seedProjects,
  agendaEvents as seedAgenda,
  dashboardKPIs,
  type Lead,
  type Task,
  type Client,
  type FinanceEntry,
  type Project,
  type LeadStage,
} from "./mock-data";
import { serviceTemplates, type ServiceTemplate } from "./service-templates";
import { gerarInsights, type Insight } from "./ai-engine";

interface DataStoreContextValue {
  leads: Lead[];
  tasks: Task[];
  clients: Client[];
  expenses: FinanceEntry[];
  projects: Project[];
  insights: Insight[];
  addLead: (partial: Omit<Lead, "id" | "createdAt" | "lastActivity"> & { stage?: LeadStage }) => Lead;
  updateLeadStage: (id: string, stage: LeadStage) => void;
  addTask: (partial: Omit<Task, "id">) => Task;
  criarClienteDeVenda: (lead: Lead, servicos: string[]) => Client;
  toggleChecklistItem: (projectId: string, itemId: string) => void;
}

const DataStoreContext = createContext<DataStoreContextValue | null>(null);

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(seedLeads);
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [clients, setClients] = useState<Client[]>(seedClients);
  const [expenses, setExpenses] = useState<FinanceEntry[]>(seedExpenses);
  const [projects, setProjects] = useState<Project[]>(seedProjects);

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
    setLeads((prev) =>
      prev.map((l) => (l.id === id ? { ...l, stage, lastActivity: new Date().toISOString() } : l)),
    );
  };

  const addTask: DataStoreContextValue["addTask"] = (partial) => {
    const task: Task = { id: `t-${Date.now()}`, ...partial };
    setTasks((prev) => [task, ...prev]);
    return task;
  };

  const criarClienteDeVenda = (lead: Lead, servicos: string[]): Client => {
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
      monthlyValue: lead.value,
      paymentDay: 5,
      renewalDate: new Date(hoje.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
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
        addLead,
        updateLeadStage,
        addTask,
        criarClienteDeVenda,
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
