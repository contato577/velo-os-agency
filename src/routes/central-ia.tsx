import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Users2,
  Wallet,
  Target,
  Calendar,
  CheckSquare,
  ArrowRight,
  Brain,
  Zap,
  ClipboardList,
  BadgeCheck,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
} from "recharts";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { dashboardKPIs, formatBRL, leads, tasks, clients, agendaEvents, monthlyRevenue } from "@/lib/mock-data";
import { automationRules, actionLabels, triggerLabels } from "@/lib/automation-engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/central-ia")({
  head: () => ({
    meta: [
      { title: "Central de IA · Veloce" },
      { name: "description", content: "Diretor executivo em IA: diagnósticos, recomendações e previsão do mês." },
    ],
  }),
  component: CentralIA,
});

type Priority = "critica" | "alta" | "media" | "baixa";
type Area = "Comercial" | "Financeiro" | "Operacional" | "Clientes" | "Tarefas" | "DRE" | "Agenda" | "Metas";

interface Diagnostic {
  id: string;
  area: Area;
  title: string;
  description: string;
  priority: Priority;
  impact: string;
  icon: typeof AlertTriangle;
  actionLabel: string;
  to: string;
}

const priorityStyles: Record<Priority, { chip: string; ring: string; label: string }> = {
  critica: { chip: "bg-destructive/15 text-destructive", ring: "ring-destructive/30", label: "Crítica" },
  alta: { chip: "bg-warning/15 text-warning", ring: "ring-warning/30", label: "Alta" },
  media: { chip: "bg-info/15 text-info", ring: "ring-info/30", label: "Média" },
  baixa: { chip: "bg-muted text-muted-foreground", ring: "ring-border", label: "Baixa" },
};

function CentralIA() {
  // Compute diagnostics dynamically from mock data
  const leadsSemFollowup = leads.filter((l) => ["novo", "contato"].includes(l.stage)).length;
  const propostasAbertas = leads.filter((l) => l.stage === "proposta").length;
  const tarefasAtrasadas = tasks.filter((t) => t.status !== "concluida" && new Date(t.dueDate) < new Date("2026-07-03")).length + 3;
  const clientesVencendo = clients.filter((c) => {
    const d = new Date(c.renewalDate);
    const hoje = new Date("2026-07-03");
    const diff = (d.getTime() - hoje.getTime()) / 86400000;
    return diff >= 0 && diff <= 30;
  }).length;
  const meta = dashboardKPIs.metaMes;
  const receita = dashboardKPIs.vendasMes;
  const gapMeta = ((meta - receita) / meta) * 100;

  const diagnostics: Diagnostic[] = [
    {
      id: "d1",
      area: "Comercial",
      title: `${leadsSemFollowup} leads sem follow-up`,
      description: "Leads em estágios iniciais parados há mais de 48h. Priorize contato ativo hoje.",
      priority: "alta",
      impact: `Potencial em risco: ${formatBRL(leadsSemFollowup * 4500)}`,
      icon: Users2,
      actionLabel: "Abrir CRM",
      to: "/comercial",
    },
    {
      id: "d2",
      area: "Comercial",
      title: `${propostasAbertas} propostas aguardando retorno`,
      description: "Propostas enviadas há mais de 5 dias sem resposta. Recomendo cadência de nutrição.",
      priority: "alta",
      impact: "Ciclo de venda alongando 22%",
      icon: ClipboardList,
      actionLabel: "Ver propostas",
      to: "/comercial",
    },
    {
      id: "d3",
      area: "Tarefas",
      title: `${tarefasAtrasadas} tarefas atrasadas`,
      description: "Tarefas críticas passaram do prazo. Isso afeta prazos com clientes ativos.",
      priority: "critica",
      impact: "Risco de SLA em 2 contas",
      icon: CheckSquare,
      actionLabel: "Resolver agora",
      to: "/tarefas",
    },
    {
      id: "d4",
      area: "Clientes",
      title: `${clientesVencendo} contratos vencendo em 30 dias`,
      description: "Prepare pauta de renovação, resultados alcançados e proposta de upsell.",
      priority: "media",
      impact: `MRR em jogo: ${formatBRL(clientesVencendo * 6500)}`,
      icon: BadgeCheck,
      actionLabel: "Abrir Clientes",
      to: "/clientes",
    },
    {
      id: "d5",
      area: "Metas",
      title: `Você está ${gapMeta.toFixed(1)}% abaixo da meta`,
      description: "Faltam poucos dias para o fim do mês. Concentre esforços nas negociações quentes.",
      priority: "alta",
      impact: `Gap: ${formatBRL(meta - receita)}`,
      icon: Target,
      actionLabel: "Ver funil",
      to: "/comercial",
    },
    {
      id: "d6",
      area: "DRE",
      title: "Margem caiu 4% vs mês anterior",
      description: "Aumento das despesas com ferramentas explica boa parte da queda. Reavaliar contratos.",
      priority: "media",
      impact: "Impacto estimado: R$ 2.4k",
      icon: TrendingDown,
      actionLabel: "Abrir DRE",
      to: "/dre",
    },
    {
      id: "d7",
      area: "Financeiro",
      title: "Fluxo de caixa negativo em 8 dias",
      description: "Projeção indica saldo negativo caso 2 recebimentos atrasem. Antecipe cobranças.",
      priority: "critica",
      impact: "Saldo projetado: -R$ 4.8k",
      icon: Wallet,
      actionLabel: "Abrir Financeiro",
      to: "/financeiro",
    },
    {
      id: "d8",
      area: "Comercial",
      title: "Conversão do funil caiu 6%",
      description: "Reunião → Proposta perdeu eficiência. Reveja o script de diagnóstico.",
      priority: "media",
      impact: "Menos 2 fechamentos/mês",
      icon: TrendingDown,
      actionLabel: "Abrir CRM",
      to: "/comercial",
    },
    {
      id: "d9",
      area: "Clientes",
      title: "1 cliente com risco de churn",
      description: "Reis Nutrição está pausado há 12 dias. Recomendo reunião de saúde da conta.",
      priority: "alta",
      impact: `MRR: ${formatBRL(3200)}`,
      icon: AlertTriangle,
      actionLabel: "Ver cliente",
      to: "/clientes",
    },
    {
      id: "d10",
      area: "Agenda",
      title: `${agendaEvents.filter((e) => e.date === "2026-07-03").length} compromissos hoje`,
      description: "Reuniões e follow-ups agendados. Verifique preparação e materiais.",
      priority: "baixa",
      impact: "Rotina do dia",
      icon: Calendar,
      actionLabel: "Abrir Agenda",
      to: "/agenda",
    },
  ];

  const [filter, setFilter] = useState<Area | "Todas">("Todas");
  const filtered = filter === "Todas" ? diagnostics : diagnostics.filter((d) => d.area === filter);

  const areas: (Area | "Todas")[] = ["Todas", "Comercial", "Financeiro", "Operacional", "Clientes", "Tarefas", "DRE", "Agenda", "Metas"];

  // Recomendações
  const [recs, setRecs] = useState([
    { id: "r1", text: "Cobrar Empresa Alpha — fatura em atraso há 3 dias", done: false },
    { id: "r2", text: "Agendar reunião com Cliente Beta — renovação em 20 dias", done: false },
    { id: "r3", text: "Entrar em contato com Lead Gamma — proposta parada", done: true },
    { id: "r4", text: "Antecipar pagamento do fornecedor Delta — desconto 3%", done: false },
    { id: "r5", text: "Revisar criativos Andrade Fitness — CTR abaixo da média", done: false },
    { id: "r6", text: "Ativar automação de renovação para contratos < 30d", done: false },
  ]);

  // Previsão do mês
  const previsao = useMemo(() => {
    const diaAtual = 3;
    const diasNoMes = 31;
    const diasRestantes = diasNoMes - diaAtual;
    const ritmoDiario = receita / diaAtual;
    const projecao = Math.round(ritmoDiario * diasNoMes);
    const falta = Math.max(0, meta - receita);
    const ticketMedio = dashboardKPIs.ticketMedio;
    const contratosNecessarios = Math.ceil(falta / ticketMedio);
    const probabilidade = Math.min(100, Math.max(0, Math.round((projecao / meta) * 100)));

    const forecastData = Array.from({ length: diasNoMes }, (_, i) => {
      const day = i + 1;
      const realizado = day <= diaAtual ? Math.round((receita / diaAtual) * day) : null;
      const projetado = Math.round(ritmoDiario * day);
      const metaLinha = Math.round((meta / diasNoMes) * day);
      return { day: `${day}`, realizado, projetado, meta: metaLinha };
    });

    return { diasRestantes, projecao, falta, contratosNecessarios, probabilidade, forecastData };
  }, [receita, meta]);

  return (
    <AppShell title="Central de IA" subtitle="Diretor executivo em IA da Veloce">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Central de IA" subtitle="Diagnóstico automático da sua operação — atualizado agora">
          <div className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            IA analisando em tempo real
          </div>
        </PageHeader>

        {/* Hero: IA summary */}
        <div className="mb-6 overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-elegant">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-widest text-primary/80">Resumo executivo</div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight md:text-xl">
                Sua operação está saudável, mas com {" "}
                <span className="text-warning">{diagnostics.filter((d) => d.priority === "critica").length} pontos críticos</span>{" "}
                e uma projeção {previsao.probabilidade >= 100 ? "acima" : "abaixo"} da meta.
              </h2>
              <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
                A IA identificou {diagnostics.length} diagnósticos e {recs.filter((r) => !r.done).length} ações recomendadas para hoje.
                Focando nos itens críticos, o impacto estimado é de +{formatBRL(previsao.falta)} até o fim do mês.
              </p>
            </div>
            <div className="hidden shrink-0 flex-col items-end gap-1 md:flex">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Confiança IA</div>
              <div className="font-mono text-2xl font-semibold text-primary">92%</div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {areas.map((a) => (
            <button
              key={a}
              onClick={() => setFilter(a)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                filter === a
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "bg-surface text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {a}
            </button>
          ))}
        </div>

        {/* Diagnósticos grid */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => {
            const Icon = d.icon;
            const ps = priorityStyles[d.priority];
            return (
              <div
                key={d.id}
                className={cn(
                  "group relative flex flex-col rounded-lg border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-elegant hover:ring-1",
                  ps.ring,
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", ps.chip)}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{d.area}</span>
                  </div>
                  <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", ps.chip)}>
                    {ps.label}
                  </span>
                </div>
                <h3 className="text-[14px] font-semibold leading-snug tracking-tight">{d.title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{d.description}</p>
                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="text-[11px] font-mono text-muted-foreground">{d.impact}</span>
                  <Link
                    to={d.to}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
                  >
                    {d.actionLabel} <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Recomendações + Previsão */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
          {/* Recomendações */}
          <div className="rounded-xl border bg-card p-4 lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
                <Zap className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Hoje recomendamos</h3>
                <p className="text-[11px] text-muted-foreground">
                  {recs.filter((r) => !r.done).length} de {recs.length} pendentes
                </p>
              </div>
            </div>
            <ul className="space-y-1">
              {recs.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() =>
                      setRecs((prev) => prev.map((x) => (x.id === r.id ? { ...x, done: !x.done } : x)))
                    }
                    className="flex w-full items-start gap-2.5 rounded-md p-2 text-left transition-colors hover:bg-accent"
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                        r.done ? "border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {r.done && <CheckSquare className="h-2.5 w-2.5" />}
                    </span>
                    <span
                      className={cn(
                        "text-[13px] leading-relaxed",
                        r.done && "text-muted-foreground line-through",
                      )}
                    >
                      {r.text}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Previsão do mês */}
          <div className="rounded-xl border bg-card p-4 lg:col-span-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">Previsão do mês</h3>
                  <p className="text-[11px] text-muted-foreground">Cálculo automático baseado no ritmo atual</p>
                </div>
              </div>
              <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">
                Julho 2026
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              <MiniStat label="Meta" value={formatBRL(meta)} />
              <MiniStat label="Receita atual" value={formatBRL(receita)} tone="primary" />
              <MiniStat label="Falta" value={formatBRL(previsao.falta)} tone="warning" />
              <MiniStat label="Contratos p/ meta" value={String(previsao.contratosNecessarios)} />
              <MiniStat label="Projeção fim mês" value={formatBRL(previsao.projecao)} tone={previsao.projecao >= meta ? "success" : "warning"} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={previsao.forecastData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="g-real" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0.5} />
                          <stop offset="100%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.010 155)" />
                      <XAxis dataKey="day" stroke="oklch(0.68 0.02 155)" fontSize={10} tickLine={false} axisLine={false} interval={4} />
                      <YAxis stroke="oklch(0.68 0.02 155)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip
                        contentStyle={{ background: "oklch(0.14 0.008 155)", border: "1px solid oklch(0.22 0.010 155)", borderRadius: 8, fontSize: 11 }}
                        formatter={(v: unknown) => (v == null ? "—" : formatBRL(Number(v)))}
                      />
                      <Area type="monotone" dataKey="meta" stroke="oklch(0.55 0.02 155)" strokeDasharray="4 4" fill="transparent" />
                      <Area type="monotone" dataKey="projetado" stroke="oklch(0.72 0.19 155 / 0.5)" strokeDasharray="2 3" fill="transparent" />
                      <Area type="monotone" dataKey="realizado" stroke="oklch(0.72 0.19 155)" strokeWidth={2} fill="url(#g-real)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-lg border bg-surface/40 p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Probabilidade</div>
                <div className="h-[120px] w-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ v: previsao.probabilidade }]} startAngle={90} endAngle={-270}>
                      <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                      <RadialBar dataKey="v" cornerRadius={10} fill="oklch(0.72 0.19 155)" background={{ fill: "oklch(0.22 0.010 155)" }} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                </div>
                <div className="-mt-[85px] font-mono text-2xl font-semibold text-primary">{previsao.probabilidade}%</div>
                <div className="mt-8 text-center text-[11px] text-muted-foreground">
                  de atingir a meta<br />em {previsao.diasRestantes} dias
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "primary" | "warning" | "success" }) {
  const toneClass = {
    default: "text-foreground",
    primary: "text-primary",
    warning: "text-warning",
    success: "text-success",
  }[tone];
  return (
    <div className="rounded-lg border bg-surface/40 p-2.5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono text-[15px] font-semibold tracking-tight", toneClass)}>{value}</div>
    </div>
  );
}
