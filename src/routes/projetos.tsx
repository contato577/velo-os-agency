import { createFileRoute } from "@tanstack/react-router";
import { Plus, Calendar, Users, MoreHorizontal } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { projects } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projetos")({
  head: () => ({
    meta: [
      { title: "Projetos · Veloce" },
      { name: "description", content: "Projetos ativos por cliente com status e progresso." },
    ],
  }),
  component: Projetos,
});

const statusMeta = {
  briefing: { label: "Briefing", color: "bg-info/15 text-info" },
  producao: { label: "Em produção", color: "bg-warning/15 text-warning" },
  revisao: { label: "Em revisão", color: "bg-primary/15 text-primary" },
  entregue: { label: "Entregue", color: "bg-success/15 text-success" },
};

function Projetos() {
  const groups = ["briefing", "producao", "revisao", "entregue"] as const;

  return (
    <AppShell title="Projetos" subtitle="Entregas por cliente">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Projetos" subtitle={`${projects.length} projetos ativos`}>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Novo Projeto
          </button>
        </PageHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {groups.map((g) => {
            const items = projects.filter((p) => p.status === g);
            return (
              <div key={g} className="rounded-lg border bg-surface/40">
                <div className="flex items-center justify-between border-b px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", statusMeta[g].color)}>
                      {statusMeta[g].label}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{items.length}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 p-2">
                  {items.map((p) => (
                    <div key={p.id} className="rounded-md border bg-card p-3 transition-colors hover:border-primary/40">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium">{p.name}</div>
                          <div className="truncate text-[11px] text-muted-foreground">{p.clientName}</div>
                        </div>
                        <MoreHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </div>
                      <span className="inline-block rounded bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground">{p.type}</span>

                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Progresso</span>
                          <span className="font-mono">{p.progress}%</span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-surface">
                          <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70" style={{ width: `${p.progress}%` }} />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(p.deadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {p.owner.split(" ")[0]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
