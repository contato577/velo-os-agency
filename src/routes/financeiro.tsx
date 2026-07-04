import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Plus } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { financeEntries, formatBRL } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro · Veloce" },
      { name: "description", content: "Entradas, saídas, fluxo de caixa e recorrências." },
    ],
  }),
  component: Financeiro,
});

function Financeiro() {
  const july = financeEntries.filter((f) => f.date.startsWith("2026-07"));
  const entradas = july.filter((f) => f.type === "entrada").reduce((s, f) => s + f.amount, 0);
  const saidas = july.filter((f) => f.type === "saida").reduce((s, f) => s + f.amount, 0);
  const saldo = entradas - saidas;

  const summary = [
    { label: "Entradas do mês", value: formatBRL(entradas), color: "text-success", icon: ArrowUpRight },
    { label: "Saídas do mês", value: formatBRL(saidas), color: "text-destructive", icon: ArrowDownRight },
    { label: "Saldo", value: formatBRL(saldo), color: "text-primary" },
    { label: "Recorrentes", value: july.filter((f) => f.recurring).length, color: "text-foreground" },
  ];

  return (
    <AppShell title="Financeiro" subtitle="Controle de caixa">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Financeiro" subtitle="Julho 2026">
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-surface px-2.5 text-xs font-medium hover:bg-accent">
            Exportar
          </button>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Nova Entrada
          </button>
        </PageHeader>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summary.map((s) => (
            <div key={s.label} className="rounded-lg border bg-card p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className={cn("mt-2 font-mono text-xl font-semibold", s.color)}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border bg-card">
          <div className="border-b bg-surface/50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Lançamentos
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-medium">Data</th>
                <th className="px-4 py-2 font-medium">Descrição</th>
                <th className="px-4 py-2 font-medium">Categoria</th>
                <th className="px-4 py-2 font-medium">Centro de Custo</th>
                <th className="px-4 py-2 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {july.map((f) => (
                <tr key={f.id} className="border-b transition-colors last:border-b-0 hover:bg-surface/40">
                  <td className="px-4 py-2.5 font-mono text-[12px] text-muted-foreground">
                    {new Date(f.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </td>
                  <td className="px-4 py-2.5 text-[13px]">
                    <div className="flex items-center gap-1.5">
                      {f.recurring && <span className="rounded bg-info/15 px-1 py-0.5 text-[9px] font-medium text-info">REC</span>}
                      {f.description}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{f.category}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] text-muted-foreground">{f.costCenter}</span>
                  </td>
                  <td className={cn("px-4 py-2.5 text-right font-mono text-[13px] font-semibold", f.type === "entrada" ? "text-success" : "text-destructive")}>
                    {f.type === "entrada" ? "+" : "−"} {formatBRL(f.amount)}
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
