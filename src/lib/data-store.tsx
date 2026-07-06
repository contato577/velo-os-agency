import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  leads as seedLeads,
  tasks as seedTasks,
  clients as seedClients,
  financeEntries as seedExpenses,
  agendaEvents as seedAgenda,
  dashboardKPIs,
  type Lead,
  type Task,
  type Client,
  type FinanceEntry,
  type LeadStage,
} from "./mock-data";
import { gerarInsights, type Insight } from "./ai-engine";

interface DataStoreContextValue {
  leads: Lead[];
  tasks: Task[];
  clients: Client[];
  expenses: FinanceEntry[];
  insights: Insight[];
  addLead: (partial: Omit<Lead, "id" | "createdAt" | "lastActivity"> & { stage?: LeadStage }) => Lead;
  updateLeadStage: (id: string, stage: LeadStage) => void;
  addTask: (partial: Omit<Task, "id">) => Task;
}

const DataStoreContext = createContext<DataStoreContextValue | null>(null);

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>(seedLeads);
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [clients] = useState<Client[]>(seedClients);
  const [expenses] = useState<FinanceEntry[]>(seedExpenses);

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
    const lead: Lead = {
      id: `lead-${Date.now()}`,
      createdAt: now,
      lastActivity: now,
      stage: partial.stage ?? "novo",
      ...partial,
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

  return (
    <DataStoreContext.Provider
      value={{ leads, tasks, clients, expenses, insights, addLead, updateLeadStage, addTask }}
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
