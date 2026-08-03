import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, ArrowDownRight, TrendingUp, Brain, ArrowRight, Plus, X, Repeat } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { formatBRL, type FinanceEntry } from "@/lib/mock-data";
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

const NOMES_MES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const NOMES_MES_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function mesISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ultimosMeses(qtd: number): string[] {
  const hoje = new Date();
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (qtd - 1 - i), 1);
    return mesISO(d);
  });
}

function labelMes(mes: string) {
  return NOMES_MES[Number(mes.split("-")[1]) - 1] ?? mes;
}

/**
 * Retorna os lançamentos que impactam o mês informado.
 * Lançamentos recorrentes contam em TODOS os meses a partir do mês de criação.
 */
function lancamentosDoMes(entries: FinanceEntry[], mes: string): FinanceEntry[] {
  return entries.filter((e) => {
    const mesEntrada = e.date.slice(0, 7);
    if (mesEntrada === mes) return true;
    return Boolean(e.recurring) && mesEntrada < mes;
  });
}

function DRE() {
  const { insights: aiInsights, expenses, clients, metasMensais } = useDataStore();
  const [openNew, setOpenNew] = useState(false);

  const hoje = new Date();
  const mesAtual = mesISO(hoje);
  const mesAnterior = mesISO(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));
  const tituloMes = `${NOMES_MES_FULL[hoje.getMonth()]} ${hoje.getFullYear()}`;

  const doMes = useMemo(() => lancamentosDoMes(expenses, mesAtual), [expenses, mesAtual]);
  const doMesAnterior = useMemo(() => lancamentosDoMes(expenses, mesAnterior), [expenses, mesAnterior]);

  const somaCategoria = (entries: FinanceEntry[], categoria: string) =>
    entries.filter((f) => f.type === "entrada" && f.category === categoria).reduce((s, f) => s + f.amount, 0);
  const somaCentro = (entries: FinanceEntry[], centro: string) =>
    entries.filter((f) => f.type === "saida" && f.costCenter === centro).reduce((s, f) => s + f.amount, 0);

  const receitas = {
    Mensalidades: somaCategoria(doMes, "Mensalidade"),
    Projetos: somaCategoria(doMes, "Projeto"),
    Consultorias: somaCategoria(doMes, "Consultoria"),
    "Serviços Extras": doMes
      .filter((f) => f.type === "entrada" && !["Mensalidade", "Projeto", "Consultoria"].includes(f.category))
      .reduce((s, f) => s + f.amount, 0),
  };
  const receitaBruta = Object.values(receitas).reduce((a, b) => a + b, 0);
  const receitaRecorrente = doMes
    .filter((f) => f.type === "entrada" && f.recurring)
    .reduce((s, f) => s + f.amount, 0);
  const receitaExtra = receitaBruta - receitaRecorrente;

  const centrosDespesa = ["Marketing", "Ferramentas", "Equipe", "Impostos", "Operacional", "Administrativo", "Investimentos"];
  const despesas = centrosDespesa.reduce<Record<string, number>>((acc, centro) => {
    acc[centro] = somaCentro(doMes, centro);
    return acc;
  }, {});
  const outrasDespesas = doMes
    .filter((f) => f.type === "saida" && !centrosDespesa.includes(f.costCenter))
    .reduce((s, f) => s + f.amount, 0);
  if (outrasDespesas > 0) despesas["Outros"] = outrasDespesas;

  const totalDespesas = Object.values(despesas).reduce((a, b) => a + b, 0);
  const impostos = despesas["Impostos"] ?? 0;
  const receitaLiquida = receitaBruta - impostos;
  const custoOperacional = totalDespesas - impostos;
  const lucroBruto = receitaLiquida - (despesas["Marketing"] ?? 0) - (despesas["Ferramentas"] ?? 0);
  const lucroLiquido = receitaLiquida - custoOperacional;
  const margem = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;
  const ebitda = lucroLiquido + impostos;

  // Mês anterior — calculado com os lançamentos reais (recorrentes incluídos)
  const receitaAnterior = doMesAnterior.filter((f) => f.type === "entrada").reduce((s, f) => s + f.amount, 0);
  const despesaAnterior = doMesAnterior.filter((f) => f.type === "saida").reduce((s, f) => s + f.amount, 0);
  const lucroAnterior = receitaAnterior - despesaAnterior;
  const margemAnterior = receitaAnterior > 0 ? (lucroAnterior / receitaAnterior) * 100 : 0;

  const pct = (atual: number, anterior: number) => (anterior > 0 ? ((atual - anterior) / anterior) * 100 : 0);
  const deltaReceita = pct(receitaBruta, receitaAnterior);
  const deltaMargem = margem - margemAnterior;
  const deltaLucro = pct(lucroLiquido, lucroAnterior);

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

  // Série mensal real (últimos 7 meses) — receita, despesa, margem
  const serieMensal = useMemo(() => {
    return ultimosMeses(7).map((mes) => {
      const entries = lancamentosDoMes(expenses, mes);
      const receita = entries.filter((f) => f.type === "entrada").reduce((s, f) => s + f.amount, 0);
      const despesa = entries.filter((f) => f.type === "saida").reduce((s, f) => s + f.amount, 0);
      const lucro = receita - despesa;
      return {
        mes,
        month: labelMes(mes),
        receita,
        despesa,
        meta: metasMensais.metaComercial,
        margem: receita > 0 ? (lucro / receita) * 100 : 0,
      };
    });
  }, [expenses, metasMensais.metaComercial]);

  const margemHistorica = serieMensal.map((m) => ({ month: m.month, margem: m.margem }));

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

  // Fluxo de caixa projetado — próximos 6 meses a partir dos recorrentes reais
  const fluxoProjetado = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
      const mes = mesISO(d);
      const entries = lancamentosDoMes(expenses, mes);
      const entrada = entries.filter((f) => f.type === "entrada").reduce((s, f) => s + f.amount, 0);
      const saida = entries.filter((f) => f.type === "saida").reduce((s, f) => s + f.amount, 0);
      return { mes: labelMes(mes), entrada, saida, saldo: entrada - saida };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses]);

  // Histórico completo de lançamentos (mais recente primeiro)
  const historico = useMemo(
    () => [...expenses].sort((a, b) => b.date.localeCompare(a.date)),
    [expenses],
  );

  // ── Churn, CAC e LTV — calculados com dados reais ──────────────────────
  const clientesAtivos = clients.filter((c) => c.status === "ativo" || c.status === "onboarding");
  const clientesCanceladosMes = clients.filter((c) => c.canceledAt?.startsWith(mesAtual));
  const baseInicioMes = clientesAtivos.length + clientesCanceladosMes.length;
  const churnMensal = baseInicioMes > 0 ? clientesCanceladosMes.length / baseInicioMes : null;

  const ticketMedio =
    clientesAtivos.length > 0
      ? clientesAtivos.reduce((s, c) => s + c.monthlyValue, 0) / clientesAtivos.length
      : 0;
  const ltv = churnMensal && churnMensal > 0 ? ticketMedio / churnMensal : null;

  const gastoMarketingMes = doMes
    .filter((e) => e.type === "saida" && e.costCenter === "Marketing")
    .reduce((s, e) => s + e.amount, 0);
  const novosClientesMes = clients.filter((c) => c.since.startsWith(mesAtual)).length;
  const cac = novosClientesMes > 0 ? gastoMarketingMes / novosClientesMes : null;

  const ltvCac = ltv && cac ? ltv / cac : null;

  const insights = useMemo(() => {
    const financeiros = aiInsights.filter((i) => i.area === "Financeiro");
    const complementos = [
      {
        id: "loc-1",
        titulo: "Receita recorrente",
        descricao: `${formatBRL(receitaRecorrente)} do faturamento do mês vem de lançamentos recorrentes — base previsível.`,
        prioridade: "baixa" as const,
      },
      {
        id: "loc-2",
        titulo: margem >= 0 ? "Margem positiva" : "Margem negativa",
        descricao: `Lucro líquido de ${formatBRL(lucroLiquido)} sobre ${formatBRL(receitaBruta)} de receita (${margem.toFixed(1)}% de margem).`,
        prioridade: margem >= 0 ? ("baixa" as const) : ("alta" as const),
      },
    ];
    return [...financeiros.map((i) => ({ id: i.id, titulo: i.titulo, descricao: i.descricao, prioridade: i.prioridade })), ...complementos];
  }, [aiInsights, lucroLiquido, margem, receitaBruta, receitaRecorrente]);


  return (
    <AppShell title="DRE Inteligente" subtitle="Análise gerencial automática">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title={`DRE · ${tituloMes}`} subtitle="Calculado automaticamente a partir dos lançamentos">
          <button
            onClick={() => setOpenNew(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Novo Lançamento
          </button>
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
              <div key={ins.id} className="rounded-lg border bg-card/60 p-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      ins.prioridade === "critica" && "bg-destructive",
                      ins.prioridade === "alta" && "bg-warning",
                      ins.prioridade === "media" && "bg-info",
                      ins.prioridade === "baixa" && "bg-success",
                    )}
                  />
                  <span className="text-[12px] font-semibold">{ins.titulo}</span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{ins.descricao}</p>
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
                <BarChart data={serieMensal}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.010 155)" />
                  <XAxis dataKey="month" stroke="oklch(0.68 0.02 155)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.68 0.02 155)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip contentStyle={{ background: "oklch(0.14 0.008 155)", border: "1px solid oklch(0.22 0.010 155)", borderRadius: 8, fontSize: 12 }} formatter={(v: unknown) => formatBRL(Number(v))} />
                  <Bar dataKey="receita" fill="oklch(0.66 0.15 150)" radius={[6, 6, 0, 0]} />
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
                  <Line type="monotone" dataKey="margem" stroke="oklch(0.66 0.15 150)" strokeWidth={2} dot={{ r: 3, fill: "oklch(0.66 0.15 150)" }} />
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
                    <stop offset="0%" stopColor="oklch(0.66 0.15 150)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.66 0.15 150)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.010 155)" />
                <XAxis dataKey="mes" stroke="oklch(0.68 0.02 155)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.02 155)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "oklch(0.14 0.008 155)", border: "1px solid oklch(0.22 0.010 155)", borderRadius: 8, fontSize: 12 }} formatter={(v: unknown) => formatBRL(Number(v))} />
                <Area type="monotone" dataKey="entrada" stroke="oklch(0.66 0.15 150)" fill="url(#g-saldo)" strokeWidth={2} />
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
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{tituloMes}</span>
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
            <FinIndicator label="LTV médio" value={ltv ? formatBRL(ltv) : "Sem dados"} />
            <FinIndicator label="CAC" value={cac ? formatBRL(cac) : "Sem dados"} />
            <FinIndicator label="LTV/CAC" value={ltvCac ? `${ltvCac.toFixed(1)}x` : "Sem dados"} tone={ltvCac && ltvCac >= 3 ? "success" : undefined} />
            <FinIndicator
              label="Churn mensal"
              value={churnMensal !== null ? `${(churnMensal * 100).toFixed(1)}%` : "Sem dados"}
              tone={churnMensal !== null && churnMensal > 0.05 ? "warning" : churnMensal !== null ? "success" : undefined}
            />
            <FinIndicator label="Burn multiple" value="0.4x" tone="success" />
            <FinIndicator label="Runway" value="18 meses" tone="success" />
          </div>
        </div>
        {/* Histórico completo de lançamentos */}
        <div className="mt-4 rounded-lg border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Histórico de lançamentos</h3>
              <p className="text-[11px] text-muted-foreground">
                Todas as entradas e saídas já registradas — mais recentes primeiro
              </p>
            </div>
            <span className="rounded bg-surface px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
              {historico.length} lançamento{historico.length === 1 ? "" : "s"}
            </span>
          </div>
          {historico.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">Nenhum lançamento registrado ainda.</p>
          ) : (
            <div className="max-h-[520px] space-y-1.5 overflow-y-auto pr-1">
              {historico.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-surface/40 px-3 py-2 text-[12px]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium">{e.description}</span>
                      {e.recurring && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                          <Repeat className="h-2.5 w-2.5" /> Recorrente
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {e.category} · {e.costCenter}
                      {e.client ? ` · ${e.client}` : ""}
                      {e.date ? ` · ${new Date(`${e.date}T00:00:00`).toLocaleDateString("pt-BR")}` : ""}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-mono",
                      e.type === "entrada" ? "text-success" : "text-destructive",
                    )}
                  >
                    {e.type === "entrada" ? "+" : "−"} {formatBRL(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
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
        <div className="max-h-[75vh] overflow-y-auto p-4">
          <LancamentoForm onCancel={onClose} />
        </div>
      </div>
    </>
  );
}
