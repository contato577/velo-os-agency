import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Brain, ArrowRight, Plus, X } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { clients, financeEntries, formatBRL, monthlyRevenue } from "@/lib/mock-data";
import { useDataStore } from "@/lib/data-store";
import { LancamentoForm } from "@/components/lancamento-form";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dre")({
  head: () => ({
    meta: [
      { title: "DRE Inteligente · Veloce" },
      { name: "description", content: "DRE gerencial automático com indicadores, comparativos e insights de IA." },
    ],
  }),
  component: DRE,
});

function DRE() {
  const [openNew, setOpenNew] = useState(false);
  const july = financeEntries.filter((f) => f.date.startsWith("2026-07"));
  const receitas = {
    Mensalidades: july.filter((f) => f.category === "Mensalidade").reduce((s, f) => s + f.amount, 0),
    Projetos: july.filter((f) => f.category === "Projeto").reduce((s, f) => s + f.amount, 0),
    Consultorias: 0,
    "Serviços Extras": 0,
  };
  const receitaBruta = Object.values(receitas).reduce((a, b) => a + b, 0);
  const receitaRecorrente = receitas.Mensalidades;
  const receitaExtra = receitaBruta - receitaRecorrente;

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

  // Mês anterior (mockado a partir de monthlyRevenue)
  const receitaAnterior = monthlyRevenue[monthlyRevenue.length - 2]?.receita ?? 48500;
  const margemAnterior = 22.4;
  const lucroAnterior = 12600;

  // Comparativos
  const deltaReceita = ((receitaBruta - receitaAnterior) / receitaAnterior) * 100;
  const deltaMargem = margem - margemAnterior;
  const deltaLucro = ((lucroLiquido - lucroAnterior) / lucroAnterior) * 100;

  const indicators = [
    { label: "Receita Bruta", value: receitaBruta, tone: "primary" as const, delta: deltaReceita },
    { label: "Receita Recorrente (MRR)", value: receitaRecorrente, tone: "primary" as const },
    { label: "Receita Extraordinária", value: receitaExtra, tone: "info" as const },
    { label: "Custo Operacional", value: custoOperacional, tone: "warning" as const },
    { label: "Lucro Bruto", value: lucroBruto, tone: "success" as const },
    { label: "Lucro Líquido", value: lucroLiquido, tone: "success" as const, delta: deltaLucro },
    { label: "Margem Líquida", value: margem, isPct: true, tone: "success" as const, delta: deltaMargem, deltaIsAbs: true },
    { label: "EBITDA", value: ebitda, tone: "info" as const },
  ];

  const toneClass = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
  };

  // Top despesas
  const topDespesas = Object.entries(despesas)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Top clientes por receita
  const topClientes = [...clients]
    .filter((c) => c.status === "ativo")
    .sort((a, b) => b.monthlyValue - a.monthlyValue)
    .slice(0, 10);

  // Fluxo de caixa projetado (próximos 6 meses)
  const fluxoProjetado = [
    { mes: "Jul", entrada: receitaBruta, saida: totalDespesas, saldo: receitaBruta - totalDespesas },
    { mes: "Ago", entrada: 54000, saida: 36000, saldo: 18000 },
    { mes: "Set", entrada: 58500, saida: 37500, saldo: 21000 },
    { mes: "Out", entrada: 62000, saida: 38200, saldo: 23800 },
    { mes: "Nov", entrada: 66500, saida: 39800, saldo: 26700 },
    { mes: "Dez", entrada: 72000, saida: 42500, saldo: 29500 },
  ];

  // Margem histórica por mês
  const margemHistorica = monthlyRevenue.map((m, i) => ({
    month: m.month,
    margem: 18 + Math.sin(i) * 3 + i * 0.6,
  }));

  const insights = [
    { title: "Receita recorrente cresceu", text: "O lucro aumentou porque o MRR cresceu 8% e diluiu o custo fixo.", tone: "success" as const },
    { title: "Ferramentas puxam a estrutura", text: "As despesas com ferramentas representam ~4% do faturamento. Consolide licenças para reduzir custo.", tone: "warning" as const },
    { title: "Oportunidade em administrativo", text: "Custos administrativos podem cair até 12% renegociando fornecedores recorrentes.", tone: "info" as const },
    { title: "Lucro acima da média", text: `Seu lucro líquido de ${formatBRL(lucroLiquido)} está acima da média dos últimos 6 meses.`, tone: "success" as const },
  ];

  return (
    <AppShell title="DRE Inteligente" subtitle="Análise gerencial automática">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="DRE · Julho 2026" subtitle="Calculado automaticamente a partir do financeiro">
          <button
            onClick={() => setOpenNew(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Novo Lançamento
          </button>
          <Link
            to="/central-ia"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 text-xs font-medium text-primary hover:bg-primary/20"
          >
            <Brain className="h-3.5 w-3.5" /> Central de IA
          </Link>
        </PageHeader>

        {openNew && <NovoLancamentoDialog onClose={() => setOpenNew(false)} />}

        {/* Indicadores */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {indicators.map((i) => (
            <div key={i.label} className="rounded-lg border bg-card p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{i.label}</div>
              <div className={cn("mt-2 font-mono text-[15px] font-semibold tracking-tight", toneClass[i.tone])}>
                {i.isPct ? `${i.value.toFixed(1)}%` : formatBRL(i.value)}
              </div>
              {i.delta !== undefined && (
                <div className={cn("mt-1 flex items-center gap-0.5 text-[10px] font-medium", i.delta >= 0 ? "text-success" : "text-destructive")}>
                  {i.delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {i.deltaIsAbs ? `${i.delta >= 0 ? "+" : ""}${i.delta.toFixed(1)}pp` : `${i.delta >= 0 ? "+" : ""}${i.delta.toFixed(1)}%`} vs mês ant.
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Insights IA */}
        <div className="mt-6 overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-elegant">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/20 ring-1 ring-primary/30">
              <Brain className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Insights da IA</h3>
              <p className="text-[11px] text-muted-foreground">Explicação em linguagem simples dos números do DRE</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {insights.map((ins) => (
              <div key={ins.title} className="rounded-lg border bg-card/60 p-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      ins.tone === "success" && "bg-success",
                      ins.tone === "warning" && "bg-warning",
                      ins.tone === "info" && "bg-info",
                    )}
                  />
                  <span className="text-[12px] font-semibold">{ins.title}</span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{ins.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Receitas e Despesas */}
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

        {/* Comparativos: mês anterior + anual */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Evolução anual</h3>
                <p className="text-[11px] text-muted-foreground">Receita e meta nos últimos 7 meses</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                <TrendingUp className="h-3 w-3" /> +{deltaReceita.toFixed(1)}% MoM
              </div>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.010 155)" />
                  <XAxis dataKey="month" stroke="oklch(0.68 0.02 155)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.68 0.02 155)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip contentStyle={{ background: "oklch(0.14 0.008 155)", border: "1px solid oklch(0.22 0.010 155)", borderRadius: 8, fontSize: 12 }} formatter={(v: unknown) => formatBRL(Number(v))} />
                  <Bar dataKey="receita" fill="oklch(0.72 0.19 155)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="meta" fill="oklch(0.35 0.03 155)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold tracking-tight">Margem por mês</h3>
              <p className="text-[11px] text-muted-foreground">Margem líquida (%) — evolução</p>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={margemHistorica}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.010 155)" />
                  <XAxis dataKey="month" stroke="oklch(0.68 0.02 155)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.68 0.02 155)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip contentStyle={{ background: "oklch(0.14 0.008 155)", border: "1px solid oklch(0.22 0.010 155)", borderRadius: 8, fontSize: 12 }} formatter={(v: unknown) => `${Number(v).toFixed(1)}%`} />
                  <Line type="monotone" dataKey="margem" stroke="oklch(0.72 0.19 155)" strokeWidth={2} dot={{ r: 3, fill: "oklch(0.72 0.19 155)" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Fluxo de caixa projetado */}
        <div className="mt-4 rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Fluxo de caixa projetado</h3>
              <p className="text-[11px] text-muted-foreground">Próximos 6 meses — entradas × saídas × saldo</p>
            </div>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-mono text-primary">
              Saldo final: {formatBRL(fluxoProjetado.reduce((s, f) => s + f.saldo, 0))}
            </span>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fluxoProjetado}>
                <defs>
                  <linearGradient id="g-saldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.010 155)" />
                <XAxis dataKey="mes" stroke="oklch(0.68 0.02 155)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.02 155)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "oklch(0.14 0.008 155)", border: "1px solid oklch(0.22 0.010 155)", borderRadius: 8, fontSize: 12 }} formatter={(v: unknown) => formatBRL(Number(v))} />
                <Area type="monotone" dataKey="entrada" stroke="oklch(0.72 0.19 155)" fill="url(#g-saldo)" strokeWidth={2} />
                <Area type="monotone" dataKey="saida" stroke="oklch(0.65 0.20 25)" fill="transparent" strokeWidth={2} />
                <Area type="monotone" dataKey="saldo" stroke="oklch(0.75 0.15 220)" strokeDasharray="4 4" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 10 despesas / clientes */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">Top 10 despesas</h3>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Julho</span>
            </div>
            <div className="space-y-2">
              {topDespesas.map(([nome, valor], i) => {
                const pct = (valor / totalDespesas) * 100;
                return (
                  <div key={nome}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-2">
                        <span className="w-4 text-right font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                        <span>{nome}</span>
                      </span>
                      <span className="font-mono text-destructive">{formatBRL(valor)}</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded bg-surface">
                      <div className="h-full bg-destructive/60" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">Top 10 clientes por receita</h3>
              <Link to="/clientes" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {topClientes.map((c, i) => {
                const pct = (c.monthlyValue / topClientes[0].monthlyValue) * 100;
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-2">
                        <span className="w-4 text-right font-mono text-[10px] text-muted-foreground">{i + 1}</span>
                        <span className="truncate">{c.company}</span>
                      </span>
                      <span className="font-mono text-primary">{formatBRL(c.monthlyValue)}</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded bg-surface">
                      <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Indicadores financeiros */}
        <div className="mt-4 rounded-lg border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold tracking-tight">Indicadores financeiros</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <FinIndicator label="LTV médio" value={formatBRL(48500)} />
            <FinIndicator label="CAC" value={formatBRL(2100)} />
            <FinIndicator label="LTV/CAC" value="23x" tone="success" />
            <FinIndicator label="Churn mensal" value="2.1%" tone="warning" />
            <FinIndicator label="Burn multiple" value="0.4x" tone="success" />
            <FinIndicator label="Runway" value="18 meses" tone="success" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function FinIndicator({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "warning" }) {
  const toneClass = { default: "text-foreground", success: "text-success", warning: "text-warning" }[tone];
  return (
    <div className="rounded-lg border bg-surface/40 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono text-lg font-semibold tracking-tight", toneClass)}>{value}</div>
    </div>
  );
}

function NovoLancamentoDialog({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border bg-card shadow-elegant">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Novo lançamento</h3>
            <p className="text-[11px] text-muted-foreground">Registre uma entrada ou saída — a IA usa isso para análises.</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); onClose(); }}
          className="max-h-[70vh] space-y-3 overflow-y-auto p-4"
        >
          <FormField label="Descrição">
            <input required placeholder="Ex: Mensalidade Pereira Ortopedia" className={inputCls} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Categoria">
              <select className={inputCls}>
                <option>Mensalidade</option>
                <option>Projeto</option>
                <option>Software</option>
                <option>Folha</option>
                <option>Imposto</option>
                <option>Anúncios</option>
                <option>Outro</option>
              </select>
            </FormField>
            <FormField label="Fornecedor / Cliente">
              <input placeholder="Nome" className={inputCls} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Valor (R$)">
              <input type="number" min="0" step="0.01" required placeholder="0,00" className={inputCls} />
            </FormField>
            <FormField label="Data">
              <input type="date" required className={inputCls} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Forma de pagamento">
              <select className={inputCls}>
                <option>PIX</option>
                <option>Boleto</option>
                <option>Cartão de crédito</option>
                <option>Transferência</option>
                <option>Dinheiro</option>
              </select>
            </FormField>
            <FormField label="Recorrente?">
              <select className={inputCls}>
                <option>Não</option>
                <option>Mensal</option>
                <option>Trimestral</option>
                <option>Anual</option>
              </select>
            </FormField>
          </div>
          <FormField label="Observações">
            <textarea rows={2} className={inputCls} placeholder="Notas internas…" />
          </FormField>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-3 text-[12px] text-muted-foreground hover:bg-accent">
            <Paperclip className="h-3.5 w-3.5" />
            <span>Anexar comprovante (opcional)</span>
            <input type="file" className="hidden" />
          </label>
          <div className="flex items-center justify-end gap-2 border-t pt-3">
            <button type="button" onClick={onClose} className="rounded-md border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent">
              Cancelar
            </button>
            <button type="submit" className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              Salvar lançamento
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

const inputCls = "w-full rounded-md border bg-background px-3 py-1.5 text-[13px] focus:border-primary/60 focus:outline-none";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}
