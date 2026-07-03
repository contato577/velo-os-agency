import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  TrendingUp,
  Target,
  FileCheck,
  Receipt,
  Sparkles,
  Users2,
  Clock4,
  UserCheck,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import {
  dashboardKPIs,
  formatBRL,
  monthlyRevenue,
  leadOrigins,
  conversionByStage,
  tasks,
  agendaEvents,
} from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Veloce Performance OS" },
      { name: "description", content: "Visão geral da operação: vendas, leads, receita e agenda." },
    ],
  }),
  component: Dashboard,
});

const kpis = [
  { label: "Vendas do mês", value: formatBRL(dashboardKPIs.vendasMes), delta: 12.4, trend: "up", icon: TrendingUp, sub: `Meta: ${formatBRL(dashboardKPIs.metaMes)}` },
  { label: "Contratos fechados", value: dashboardKPIs.contratosFechados, delta: 50, trend: "up", icon: FileCheck, sub: "vs mês anterior" },
  { label: "Ticket médio", value: formatBRL(dashboardKPIs.ticketMedio), delta: 8.1, trend: "up", icon: Receipt, sub: "últimos 30 dias" },
  { label: "Leads novos", value: dashboardKPIs.leadsNovos, delta: 22, trend: "up", icon: Sparkles, sub: "esta semana" },
  { label: "Em negociação", value: dashboardKPIs.leadsNegociacao, delta: -4, trend: "down", icon: Users2, sub: "no funil" },
  { label: "Follow-ups pendentes", value: dashboardKPIs.followupsPendentes, delta: 0, trend: "flat", icon: Clock4, sub: "vencendo hoje" },
  { label: "Clientes ativos", value: dashboardKPIs.clientesAtivos, delta: 6.7, trend: "up", icon: UserCheck, sub: "carteira atual" },
  { label: "Receita recorrente", value: formatBRL(dashboardKPIs.receitaRecorrente), delta: 14.2, trend: "up", icon: Wallet, sub: "MRR" },
];

const CHART_COLORS = ["#34d399", "#10b981", "#a7f3d0", "#059669", "#6ee7b7", "#065f46"];
const PRIMARY = "oklch(0.72 0.19 155)";
const GRID = "oklch(0.22 0.010 155)";
const AXIS = "oklch(0.68 0.02 155)";
const TOOLTIP_BG = "oklch(0.14 0.008 155)";

// Projeção de meta comercial — atualizada por dia
const META_MENSAL = 55000;
const HOJE_DIA = 20; // dia 20 do mês corrente
const DIAS_NO_MES = 31;
const DIAS_RESTANTES = DIAS_NO_MES - HOJE_DIA;
const REALIZADO_ATUAL = 51000;
const PCT_ATINGIMENTO = (REALIZADO_ATUAL / META_MENSAL) * 100;
const RITMO_DIARIO = REALIZADO_ATUAL / HOJE_DIA;
const PROJECAO_FIM_MES = RITMO_DIARIO * DIAS_NO_MES;

const projectionData = Array.from({ length: DIAS_NO_MES }, (_, i) => {
  const dia = i + 1;
  const metaIdeal = (META_MENSAL / DIAS_NO_MES) * dia;
  const isPast = dia <= HOJE_DIA;
  // curva de realizado com pequena variação para parecer real
  const realizado = isPast
    ? Math.round(RITMO_DIARIO * dia * (0.9 + Math.sin(dia / 3) * 0.08))
    : null;
  const projecao = !isPast ? Math.round(RITMO_DIARIO * dia) : dia === HOJE_DIA ? REALIZADO_ATUAL : null;
  return {
    dia: `${dia.toString().padStart(2, "0")}`,
    meta: Math.round(metaIdeal),
    realizado,
    projecao,
  };
});

function ProjectionCard() {
  const noRitmo = PROJECAO_FIM_MES >= META_MENSAL;
  const gapProjecao = PROJECAO_FIM_MES - META_MENSAL;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">Projeção de meta comercial</h3>
          <p className="text-[11px] text-muted-foreground">
            Atualizado automaticamente conforme o mês avança
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-md border bg-surface px-2.5 py-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Atingimento</div>
            <div className="font-mono text-sm font-semibold text-primary">
              {PCT_ATINGIMENTO.toFixed(1)}%
            </div>
          </div>
          <div className="rounded-md border bg-surface px-2.5 py-1.5">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Dias restantes</div>
            <div className="font-mono text-sm font-semibold">{DIAS_RESTANTES}</div>
          </div>
          <div
            className={cn(
              "rounded-md border px-2.5 py-1.5",
              noRitmo ? "border-success/40 bg-success/10" : "border-warning/40 bg-warning/10",
            )}
          >
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Projeção fim do mês</div>
            <div className={cn("font-mono text-sm font-semibold", noRitmo ? "text-success" : "text-warning")}>
              {formatBRL(Math.round(PROJECAO_FIM_MES))}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-md bg-surface/60 px-2 py-1.5">
          <div className="text-muted-foreground">Realizado</div>
          <div className="font-mono font-medium">{formatBRL(REALIZADO_ATUAL)}</div>
        </div>
        <div className="rounded-md bg-surface/60 px-2 py-1.5">
          <div className="text-muted-foreground">Meta</div>
          <div className="font-mono font-medium">{formatBRL(META_MENSAL)}</div>
        </div>
        <div className="rounded-md bg-surface/60 px-2 py-1.5">
          <div className="text-muted-foreground">Falta p/ meta</div>
          <div className="font-mono font-medium">
            {formatBRL(Math.max(0, META_MENSAL - REALIZADO_ATUAL))}
          </div>
        </div>
      </div>

      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all"
          style={{ width: `${Math.min(100, PCT_ATINGIMENTO)}%` }}
        />
      </div>

      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={projectionData}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis dataKey="dia" stroke={AXIS} fontSize={10} tickLine={false} axisLine={false} interval={2} />
            <YAxis stroke={AXIS} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
            <Tooltip
              contentStyle={{ background: TOOLTIP_BG, border: `1px solid ${GRID}`, borderRadius: 8, fontSize: 12 }}
              formatter={(v: unknown, name) => [v == null ? "—" : formatBRL(Number(v)), name]}
              labelFormatter={(l) => `Dia ${l}`}
            />
            <Line type="monotone" dataKey="meta" name="Meta ideal" stroke="#6b7280" strokeDasharray="5 4" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="realizado" name="Realizado" stroke={PRIMARY} strokeWidth={2.5} dot={{ r: 2.5, fill: PRIMARY }} />
            <Line type="monotone" dataKey="projecao" name="Projeção" stroke={PRIMARY} strokeDasharray="3 3" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-0.5 w-3 bg-primary" />Realizado</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-3 border-t border-dashed border-primary" />Projeção</span>
        <span className="flex items-center gap-1"><span className="h-0.5 w-3 border-t border-dashed border-muted-foreground" />Meta ideal</span>
        {!noRitmo && (
          <span className="ml-auto text-warning">
            Ritmo abaixo do necessário — falta {formatBRL(Math.abs(gapProjecao))} para bater a meta
          </span>
        )}
      </div>
    </div>
  );
}

function KpiCard({ k }: { k: (typeof kpis)[number] }) {
  const Icon = k.icon;
  const positive = k.trend === "up";
  const neutral = k.trend === "flat";
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{k.label}</div>
          <div className="mt-2 truncate text-[22px] font-semibold tracking-tight">{k.value}</div>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-[11px]">
        {!neutral && (
          <span
            className={cn(
              "flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono font-medium",
              positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(k.delta)}%
          </span>
        )}
        <span className="text-muted-foreground">{k.sub}</span>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function Dashboard() {
  const todayTasks = tasks.filter((t) => t.status === "hoje").slice(0, 5);
  const todayEvents = agendaEvents.filter((e) => e.date === "2026-07-03");

  return (
    <AppShell title="Dashboard" subtitle="Visão geral da operação">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Bom dia, Rafael" subtitle="Aqui está o resumo da sua operação hoje.">
          <button className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Novo Lead
          </button>
        </PageHeader>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {kpis.map((k) => (
            <KpiCard key={k.label} k={k} />
          ))}
        </div>

        {/* Charts */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard title="Receita mensal" subtitle="Receita realizada vs. meta">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.014 265)" />
                    <XAxis dataKey="month" stroke="oklch(0.68 0.02 265)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="oklch(0.68 0.02 265)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip contentStyle={{ background: "oklch(0.21 0.014 265)", border: "1px solid oklch(0.28 0.014 265)", borderRadius: 8, fontSize: 12 }} formatter={(v: unknown) => formatBRL(Number(v))} />
                    <Line type="monotone" dataKey="meta" stroke="oklch(0.55 0.02 265)" strokeDasharray="4 4" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="receita" stroke="oklch(0.72 0.18 265)" strokeWidth={2.5} dot={{ r: 3, fill: "oklch(0.72 0.18 265)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <ChartCard title="Origem dos leads" subtitle="Últimos 30 dias">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={leadOrigins} dataKey="value" nameKey="origin" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {leadOrigins.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="oklch(0.19 0.013 265)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "oklch(0.21 0.014 265)", border: "1px solid oklch(0.28 0.014 265)", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {leadOrigins.map((o, i) => (
                <div key={o.origin} className="flex items-center gap-1.5 text-[11px]">
                  <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="truncate text-muted-foreground">{o.origin}</span>
                  <span className="ml-auto font-mono text-foreground">{o.value}%</span>
                </div>
              ))}
            </div>
          </ChartCard>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartCard title="Funil de vendas" subtitle="Conversão por etapa">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conversionByStage} layout="vertical" margin={{ left: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.014 265)" horizontal={false} />
                    <XAxis type="number" stroke="oklch(0.68 0.02 265)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis dataKey="stage" type="category" stroke="oklch(0.68 0.02 265)" fontSize={11} tickLine={false} axisLine={false} width={130} />
                    <Tooltip contentStyle={{ background: "oklch(0.21 0.014 265)", border: "1px solid oklch(0.28 0.014 265)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="count" fill="oklch(0.72 0.18 265)" radius={[0, 4, 4, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Today */}
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">Hoje</h3>
              <span className="text-[11px] text-muted-foreground">03 jul 2026</span>
            </div>
            <div className="mb-3">
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Tarefas</div>
              <div className="flex flex-col gap-1">
                {todayTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-md border bg-surface px-2 py-1.5">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        t.priority === "urgente" && "bg-destructive",
                        t.priority === "alta" && "bg-warning",
                        t.priority === "media" && "bg-info",
                        t.priority === "baixa" && "bg-muted-foreground",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-[12px]">{t.title}</span>
                    <span className="text-[10px] text-muted-foreground">{t.owner.split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Agenda</div>
              <div className="flex flex-col gap-1">
                {todayEvents.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 rounded-md border bg-surface px-2 py-1.5">
                    <span className="font-mono text-[11px] text-primary">{e.time}</span>
                    <span className="min-w-0 flex-1 truncate text-[12px]">{e.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
