import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search, Filter, Calendar, ChevronRight, BarChart3 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { clients, formatBRL } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes · Veloce Performance OS" },
      { name: "description", content: "Carteira de clientes ativos, contratos e renovações." },
    ],
  }),
  component: Clientes,
});

const statusColor = {
  ativo: "bg-success/15 text-success",
  onboarding: "bg-info/15 text-info",
  pausado: "bg-warning/15 text-warning",
  cancelado: "bg-destructive/15 text-destructive",
};

function Clientes() {
  const mrr = clients.filter((c) => c.status === "ativo").reduce((s, c) => s + c.monthlyValue, 0);

  return (
    <AppShell title="Clientes" subtitle="Carteira ativa">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Clientes" subtitle={`${clients.length} clientes · MRR ${formatBRL(mrr)}`}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Buscar cliente…" className="h-8 w-52 rounded-md border bg-surface pl-7 pr-2 text-xs focus:border-primary/60 focus:outline-none" />
          </div>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-surface px-2.5 text-xs font-medium hover:bg-accent">
            <Filter className="h-3.5 w-3.5" /> Filtrar
          </button>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Novo Cliente
          </button>
        </PageHeader>

        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-surface/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium">Plano</th>
                <th className="px-4 py-2.5 font-medium">Mensalidade</th>
                <th className="px-4 py-2.5 font-medium">Serviços</th>
                <th className="px-4 py-2.5 font-medium">Renovação</th>
                <th className="px-4 py-2.5 font-medium">Responsável</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="group border-b transition-colors last:border-b-0 hover:bg-surface/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/40 text-[10px] font-semibold text-primary-foreground">
                        {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium">{c.company}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{c.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium">{c.plan}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-primary">{formatBRL(c.monthlyValue)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.services.slice(0, 2).map((s) => (
                        <span key={s} className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground">{s}</span>
                      ))}
                      {c.services.length > 2 && (
                        <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground">+{c.services.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(c.renewalDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">{c.owner}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", statusColor[c.status])}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
