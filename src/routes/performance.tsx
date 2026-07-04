import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Plug, TrendingUp } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { clients, formatBRL } from "@/lib/mock-data";

export const Route = createFileRoute("/performance")({
  head: () => ({
    meta: [
      { title: "Performance · Veloce" },
      { name: "description", content: "Visão consolidada de performance por cliente e integrações." },
    ],
  }),
  component: Performance,
});

function Performance() {
  const ativos = clients.filter((c) => c.status === "ativo");
  return (
    <AppShell title="Performance" subtitle="Resultados agregados">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Performance" subtitle="Escolha um cliente para ver seus indicadores e integrações." />

        <div className="mb-6 rounded-xl border border-dashed bg-surface/30 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Plug className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-medium">Preparado para Meta Ads, Google Ads, GA4, GSC e Landing Pages</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                As integrações são configuradas por cliente. Abra um cliente para conectar as contas.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {ativos.map((c) => (
            <Link
              key={c.id}
              to="/clientes/$clientId"
              params={{ clientId: c.id }}
              className="group flex items-center justify-between rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-surface/40"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate text-[14px] font-semibold">{c.company}</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {c.plan} · {formatBRL(c.monthlyValue)}/mês · {c.services.length} serviços
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
