import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, List, LayoutGrid, Calendar, Flag } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { tasks, type Task } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tarefas")({
  head: () => ({
    meta: [
      { title: "Tarefas · Veloce" },
      { name: "description", content: "Tarefas do dia com múltiplas visualizações." },
    ],
  }),
  component: Tarefas,
});

const priorityColor = {
  urgente: "text-destructive",
  alta: "text-warning",
  media: "text-info",
  baixa: "text-muted-foreground",
};

const statusLabel: Record<Task["status"], string> = {
  backlog: "Backlog",
  hoje: "Hoje",
  andamento: "Em andamento",
  concluida: "Concluída",
};

function Tarefas() {
  const [view, setView] = useState<"lista" | "kanban">("lista");

  return (
    <AppShell title="Tarefas do dia" subtitle={`${tasks.filter((t) => t.status !== "concluida").length} pendentes`}>
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Tarefas" subtitle="Gerencie o dia da equipe">
          <div className="flex rounded-md border bg-surface p-0.5">
            <button
              onClick={() => setView("lista")}
              className={cn("flex items-center gap-1 rounded px-2 py-1 text-[11px]", view === "lista" ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              <List className="h-3 w-3" /> Lista
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn("flex items-center gap-1 rounded px-2 py-1 text-[11px]", view === "kanban" ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              <LayoutGrid className="h-3 w-3" /> Kanban
            </button>
          </div>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Nova Tarefa
          </button>
        </PageHeader>

        {view === "lista" ? (
          <div className="overflow-hidden rounded-lg border bg-card">
            {(["hoje", "andamento", "backlog", "concluida"] as const).map((s) => {
              const items = tasks.filter((t) => t.status === s);
              if (items.length === 0) return null;
              return (
                <div key={s}>
                  <div className="border-b bg-surface/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {statusLabel[s]} · {items.length}
                  </div>
                  {items.map((t) => (
                    <div key={t.id} className="group flex items-center gap-3 border-b px-4 py-2.5 transition-colors last:border-b-0 hover:bg-surface/40">
                      <input type="checkbox" defaultChecked={t.status === "concluida"} className="h-3.5 w-3.5 rounded border-border" />
                      <Flag className={cn("h-3 w-3 shrink-0", priorityColor[t.priority])} />
                      <span className={cn("min-w-0 flex-1 truncate text-[13px]", t.status === "concluida" && "text-muted-foreground line-through")}>
                        {t.title}
                      </span>
                      <div className="hidden gap-1 md:flex">
                        {t.labels?.map((l) => (
                          <span key={l} className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground">{l}</span>
                        ))}
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(t.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/40 text-[9px] font-semibold text-primary-foreground">
                        {t.owner.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {(["backlog", "hoje", "andamento", "concluida"] as const).map((s) => {
              const items = tasks.filter((t) => t.status === s);
              return (
                <div key={s} className="rounded-lg border bg-surface/40">
                  <div className="flex items-center justify-between border-b px-3 py-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wider">{statusLabel[s]}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="flex flex-col gap-2 p-2">
                    {items.map((t) => (
                      <div key={t.id} className="rounded-md border bg-card p-2.5">
                        <div className="mb-1.5 flex items-center gap-2">
                          <Flag className={cn("h-3 w-3", priorityColor[t.priority])} />
                          <span className="text-[12px] font-medium">{t.title}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{new Date(t.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                          <span>{t.owner.split(" ")[0]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
