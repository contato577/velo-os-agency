import { createFileRoute } from "@tanstack/react-router";
import { Plus, Zap, ArrowRight } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { automations } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/automacoes")({
  head: () => ({
    meta: [
      { title: "Automações · Veloce Performance OS" },
      { name: "description", content: "Criador visual de automações e regras de negócio." },
    ],
  }),
  component: Automacoes,
});

function Automacoes() {
  return (
    <AppShell title="Automações" subtitle="Regras SE → ENTÃO">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Automações" subtitle={`${automations.filter((a) => a.active).length} ativas · ${automations.reduce((s, a) => s + a.runs, 0)} execuções`}>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Nova Automação
          </button>
        </PageHeader>

        <div className="grid grid-cols-1 gap-3">
          {automations.map((a) => (
            <div key={a.id} className={cn("group rounded-lg border bg-card p-4 transition-colors hover:border-primary/40", !a.active && "opacity-60")}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Zap className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-[14px] font-medium">{a.name}</div>
                    <span className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                      a.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                    )}>
                      {a.active ? "Ativa" : "Pausada"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded bg-info/15 px-1.5 py-0.5 font-medium text-info">SE</span>
                    <span className="text-muted-foreground">{a.trigger}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 font-medium text-primary">ENTÃO</span>
                    <span className="text-muted-foreground">{a.action}</span>
                  </div>
                </div>
                <div className="hidden text-right md:block">
                  <div className="font-mono text-lg font-semibold">{a.runs}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">execuções</div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input type="checkbox" defaultChecked={a.active} className="peer sr-only" />
                  <div className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary" />
                  <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-4" />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border border-dashed p-8 text-center">
          <Zap className="mx-auto mb-2 h-6 w-6 text-primary" />
          <h3 className="text-sm font-semibold">Construtor visual em breve</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Editor drag-and-drop para criar automações complexas conectando gatilhos, condições e ações.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
