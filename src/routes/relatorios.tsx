import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader } from "@/components/app-shell";
import { formatBRL, clients, leads } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios · Veloce Performance OS" },
      { name: "description", content: "Indicadores comerciais, LTV, CAC, ROI e desempenho da equipe." },
    ],
  }),
  component: Relatorios,
});

function Relatorios() {
  const fechados = leads.filter((l) => l.stage === "fechado").length;
  const total = leads.length;
  const taxa = ((fechados / total) * 100).toFixed(1);
  const mrr = clients.filter((c) => c.status === "ativo").reduce((s, c) => s + c.monthlyValue, 0);
  const ltv = mrr / clients.filter((c) => c.status === "ativo").length * 18; // média 18 meses

  const kpis = [
    { label: "Taxa de Conversão", value: `${taxa}%`, sub: `${fechados} de ${total} leads`, tone: "success" },
    { label: "Tempo médio p/ fechar", value: "18 dias", sub: "últimos 90 dias", tone: "primary" },
    { label: "LTV médio", value: formatBRL(ltv), sub: "vida útil ~18 meses", tone: "success" },
    { label: "CAC", value: formatBRL(1250), sub: "custo por aquisição", tone: "warning" },
    { label: "ROI", value: "6.8x", sub: "LTV / CAC", tone: "success" },
    { label: "Churn", value: "2.1%", sub: "últimos 30 dias", tone: "info" },
    { label: "Receita Recorrente", value: formatBRL(mrr), sub: "MRR atual", tone: "primary" },
    { label: "Cancelamentos", value: "1", sub: "este mês", tone: "warning" },
  ];

  const toneClass = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
  } as const;

  const ranking = [
    { name: "Rafael Souza", closed: 4, revenue: 34500, conversion: 42 },
    { name: "Ana Prado", closed: 3, revenue: 28000, conversion: 38 },
    { name: "Bruno Lima", closed: 2, revenue: 18500, conversion: 31 },
    { name: "Camila Torres", closed: 2, revenue: 12800, conversion: 28 },
  ];

  return (
    <AppShell title="Relatórios" subtitle="Indicadores da operação">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Relatórios" subtitle="Julho 2026 · consolidado" />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="rounded-lg border bg-card p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className={cn("mt-2 font-mono text-xl font-semibold", toneClass[k.tone as keyof typeof toneClass])}>{k.value}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">{k.sub}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-lg border bg-card">
          <div className="border-b bg-surface/50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Ranking Comercial
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Vendedor</th>
                <th className="px-4 py-2 font-medium">Fechados</th>
                <th className="px-4 py-2 font-medium">Receita</th>
                <th className="px-4 py-2 font-medium">Conversão</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={r.name} className="border-b last:border-b-0 hover:bg-surface/40">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/40 text-[9px] font-semibold text-primary-foreground">
                        {r.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <span className="text-[13px] font-medium">{r.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px]">{r.closed}</td>
                  <td className="px-4 py-3 font-mono text-[13px] text-primary">{formatBRL(r.revenue)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-24 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${r.conversion}%` }} />
                      </div>
                      <span className="font-mono text-[11px] text-muted-foreground">{r.conversion}%</span>
                    </div>
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
