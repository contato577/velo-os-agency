import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Sparkles } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { financeEntries, formatBRL, monthlyRevenue } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dre")({
  head: () => ({
    meta: [
      { title: "DRE Inteligente · Veloce Performance OS" },
      { name: "description", content: "DRE gerencial automático com indicadores e comparativos." },
    ],
  }),
  component: DRE,
});

function DRE() {
  const july = financeEntries.filter((f) => f.date.startsWith("2026-07"));
  const receitas = {
    Mensalidades: july.filter((f) => f.category === "Mensalidade").reduce((s, f) => s + f.amount, 0),
    Projetos: july.filter((f) => f.category === "Projeto").reduce((s, f) => s + f.amount, 0),
    Consultorias: 0,
    "Serviços Extras": 0,
  };
  const receitaBruta = Object.values(receitas).reduce((a, b) => a + b, 0);

  const despesas = {
    Marketing: july.filter((f) => f.costCenter === "Marketing").reduce((s, f) => s + f.amount, 0),
    Ferramentas: july.filter((f) => f.costCenter === "Ferramentas").reduce((s, f) => s + f.amount, 0),
    Equipe: july.filter((f) => f.costCenter === "Equipe").reduce((s, f) => s + f.amount, 0),
    Impostos: july.filter((f) => f.costCenter === "Impostos").reduce((s, f) => s + f.amount, 0),
    Operacional: 0,
    Administrativo: 0,
    Investimentos: 0,
  };
  const totalDespesas = Object.values(despesas).reduce((a, b) => a + b, 0);
  const impostos = despesas.Impostos;
  const receitaLiquida = receitaBruta - impostos;
  const custoOperacional = totalDespesas - impostos;
  const lucroBruto = receitaLiquida - despesas.Marketing - despesas.Ferramentas;
  const lucroLiquido = receitaLiquida - custoOperacional;
  const margem = (lucroLiquido / receitaBruta) * 100;
  const ebitda = lucroLiquido + impostos;

  const indicators = [
    { label: "Receita Bruta", value: receitaBruta, tone: "primary" as const },
    { label: "Receita Líquida", value: receitaLiquida, tone: "primary" as const },
    { label: "Custo Operacional", value: custoOperacional, tone: "warning" as const },
    { label: "Lucro Bruto", value: lucroBruto, tone: "success" as const },
    { label: "Lucro Líquido", value: lucroLiquido, tone: "success" as const },
    { label: "Margem Líquida", value: margem, isPct: true, tone: "success" as const },
    { label: "EBITDA", value: ebitda, tone: "info" as const },
  ];

  const toneClass = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
  };

  return (
    <AppShell title="DRE Inteligente" subtitle="Análise gerencial automática">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="DRE · Julho 2026" subtitle="Calculado automaticamente a partir do financeiro">
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-surface px-2.5 text-xs font-medium hover:bg-accent">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Análise IA
          </button>
        </PageHeader>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {indicators.map((i) => (
            <div key={i.label} className="rounded-lg border bg-card p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{i.label}</div>
              <div className={cn("mt-2 font-mono text-lg font-semibold tracking-tight", toneClass[i.tone])}>
                {i.isPct ? `${i.value.toFixed(1)}%` : formatBRL(i.value)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-4 text-sm font-semibold tracking-tight">Receitas</h3>
            <div className="space-y-2">
              {Object.entries(receitas).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b py-2 last:border-b-0">
                  <span className="text-[13px]">{k}</span>
                  <span className="font-mono text-[13px] font-medium text-success">{formatBRL(v)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t-2 pt-2">
                <span className="text-[13px] font-semibold">Total</span>
                <span className="font-mono text-[14px] font-semibold text-success">{formatBRL(receitaBruta)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-4 text-sm font-semibold tracking-tight">Despesas</h3>
            <div className="space-y-2">
              {Object.entries(despesas).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between border-b py-2 last:border-b-0">
                  <span className="text-[13px]">{k}</span>
                  <span className="font-mono text-[13px] font-medium text-destructive">{formatBRL(v)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t-2 pt-2">
                <span className="text-[13px] font-semibold">Total</span>
                <span className="font-mono text-[14px] font-semibold text-destructive">{formatBRL(totalDespesas)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border bg-card p-4">
          <h3 className="mb-4 text-sm font-semibold tracking-tight">Comparativo entre meses</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.010 155)" />
                <XAxis dataKey="month" stroke="oklch(0.68 0.02 155)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.02 155)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "oklch(0.14 0.008 155)", border: "1px solid oklch(0.22 0.010 155)", borderRadius: 8, fontSize: 12 }} formatter={(v: unknown) => formatBRL(Number(v))} />
                <Bar dataKey="receita" fill="oklch(0.72 0.19 155)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
