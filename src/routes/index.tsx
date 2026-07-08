import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  Users2,
  Clock4,
  Calendar,
  CheckSquare,
  Target,
  Wallet,
  Brain,
  ArrowRight,
  Plus,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import {
  dashboardKPIs,
  formatBRL,
  agendaEvents,
} from "@/lib/mock-data";
import { useDataStore } from "@/lib/data-store";
import { sortByPriority } from "@/lib/ai-engine";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Veloce" },
      { name: "description", content: "Como está sua agência hoje: pulso da operação em tempo real." },
    ],
  }),
  component: Dashboard,
});

// ─── Contexto do dia (calculado dinamicamente) ────────────────────────────────
const META = dashboardKPIs.metaMes;
const RECEITA = dashboardKPIs.vendasMes;
const DIA_ATUAL = 20;
const DIAS_NO_MES = 31;
const DIAS_RESTANTES = DIAS_NO_MES - DIA_ATUAL;
const RITMO_DIA = RECEITA / DIA_ATUAL;
const PROJECAO = Math.round(RITMO_DIA * DIAS_NO_MES);
const GAP = Math.max(0, META - RECEITA);
const PCT = Math.min(100, (RECEITA / META) * 100);
const NO_RITMO = PROJECAO >= META;

// Taxa de conversão média (mock realista)
const TAXA_CONVERSAO = 0.18;
const TICKET_MEDIO = dashboardKPIs.ticketMedio;
const CONTRATOS_NECESSARIOS = Math.max(0, Math.ceil(GAP / TICKET_MEDIO));
const PROPOSTAS_NECESSARIAS = Math.ceil(CONTRATOS_NECESSARIOS / 0.6);
const REUNIOES_NECESSARIAS = Math.ceil(PROPOSTAS_NECESSARIAS / 0.45);
const PROSPECCOES_NECESSARIAS = Math.ceil(REUNIOES_NECESSARIAS / TAXA_CONVERSAO);

type PulseTone = "primary" | "warning" | "info" | "destructive" | "success";

function Dashboard() {
  const { leads, tasks, clients, insights } = useDataStore();
  const leadsNovos = leads.filter((l) => l.stage === "novo").length;
  const leadsAguardando = leads.filter((l) => l.stage === "contato").length;
  const followupsPendentes = dashboardKPIs.followupsPendentes;
  const reunioesHoje = agendaEvents.filter((e) => e.date === "2026-07-03" && e.type === "reuniao").length;
  const tarefasAtrasadas = tasks.filter(
    (t) => t.status !== "concluida" && new Date(t.dueDate) < new Date("2026-07-03"),
  ).length;
  const cobrancasPendentes = clients.filter((c) => c.status === "ativo" && c.paymentDay <= DIA_ATUAL).length;
  const vendasMes = leads.filter((l) => l.stage === "fechado").length;


  const pulse: { label: string; value: number | string; icon: typeof Sparkles; tone: PulseTone; to: string }[] = [
    { label: "Leads novos", value: leadsNovos, icon: Sparkles, tone: "primary", to: "/comercial" },
    { label: "Aguardando contato", value: leadsAguardando, icon: Users2, tone: "info", to: "/comercial" },
    { label: "Follow-ups pendentes", value: followupsPendentes, icon: Clock4, tone: "warning", to: "/comercial" },
    { label: "Reuniões hoje", value: reunioesHoje, icon: Calendar, tone: "primary", to: "/operacao" },
    { label: "Tarefas atrasadas", value: tarefasAtrasadas, icon: AlertTriangle, tone: "destructive", to: "/operacao" },
    { label: "Cobranças pendentes", value: cobrancasPendentes, icon: Wallet, tone: "warning", to: "/dre" },
  ];

  const proximasAcoes = sortByPriority(insights)
    .slice(0, 5)
    .map((i) => ({
      id: i.id,
      text: i.titulo,
      tone:
        i.prioridade === "critica"
          ? ("destructive" as const)
          : i.prioridade === "alta"
            ? ("warning" as const)
            : i.prioridade === "media"
              ? ("info" as const)
              : ("primary" as const),
      to: i.to,
    }));


  return (
    <AppShell title="Dashboard" subtitle="Como está sua agência hoje">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Bom dia, Rafael" subtitle="Aqui está o pulso da operação — atualizado agora.">
          <Link
            to="/comercial"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Novo Lead
          </Link>
        </PageHeader>

        {/* Pulso do dia */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {pulse.map((p) => (
            <PulseCard key={p.label} {...p} />
          ))}
        </div>

        {/* Meta + IA Executiva */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
          <MetaCard vendas={vendasMes} />
          <IAExecutivaCard />
        </div>

        {/* Próximas ações + Hoje */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Próximas ações</h3>
                <p className="text-[11px] text-muted-foreground">Priorizadas pela IA para hoje</p>
              </div>
              <Link to="/central-ia" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="space-y-1">
              {proximasAcoes.map((a) => (
                <li key={a.id}>
                  <Link
                    to={a.to as string}
                    className="flex items-center gap-2.5 rounded-md p-2 transition-colors hover:bg-accent"
                  >

                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        a.tone === "destructive" && "bg-destructive",
                        a.tone === "warning" && "bg-warning",
                        a.tone === "primary" && "bg-primary",
                        a.tone === "info" && "bg-info",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{a.text}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Agenda de hoje</h3>
                <p className="text-[11px] text-muted-foreground">03 jul 2026 · {agendaEvents.filter((e) => e.date === "2026-07-03").length} compromissos</p>
              </div>
              <Link to="/operacao" className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline">
                Abrir agenda <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="space-y-1">
              {agendaEvents
                .filter((e) => e.date === "2026-07-03")
                .map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-2.5 rounded-md border bg-surface px-2.5 py-2"
                  >
                    <span className="font-mono text-[11px] text-primary">{e.time}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px]">{e.title}</span>
                    {e.with && (
                      <span className="hidden text-[10px] text-muted-foreground sm:inline">com {e.with}</span>
                    )}
                  </li>
                ))}
              {tasks
                .filter((t) => t.status === "hoje")
                .slice(0, 3)
                .map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2.5 rounded-md border bg-surface px-2.5 py-2"
                  >
                    <CheckSquare className="h-3 w-3 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-[13px]">{t.title}</span>
                    <span className="text-[10px] text-muted-foreground">{t.owner.split(" ")[0]}</span>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function PulseCard({
  label,
  value,
  icon: Icon,
  tone,
  to,
}: {
  label: string;
  value: number | string;
  icon: typeof Sparkles;
  tone: PulseTone;
  to: string;
}) {
  const toneMap: Record<PulseTone, string> = {
    primary: "text-primary bg-primary/10",
    warning: "text-warning bg-warning/10",
    info: "text-info bg-info/10",
    destructive: "text-destructive bg-destructive/10",
    success: "text-success bg-success/10",
  };
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-lg border bg-card p-4 transition-all hover:border-primary/40 hover:bg-surface/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 font-mono text-[24px] font-semibold tracking-tight">{value}</div>
        </div>
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", toneMap[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

function MetaCard({ vendas }: { vendas: number }) {
  return (
    <div className="rounded-xl border bg-card p-5 lg:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
              <Target className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight">Meta do mês</h3>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Julho 2026 · {DIAS_RESTANTES} dias restantes
          </p>
        </div>
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 font-mono text-[11px]",
            NO_RITMO
              ? "border-success/40 bg-success/10 text-success"
              : "border-warning/40 bg-warning/10 text-warning",
          )}
        >
          {PCT.toFixed(0)}% da meta
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-md bg-surface/60 px-2.5 py-2">
          <div className="text-muted-foreground">Meta</div>
          <div className="font-mono text-[15px] font-semibold">{formatBRL(META)}</div>
        </div>
        <div className="rounded-md bg-surface/60 px-2.5 py-2">
          <div className="text-muted-foreground">Receita atual</div>
          <div className="font-mono text-[15px] font-semibold text-primary">{formatBRL(RECEITA)}</div>
        </div>
        <div className="rounded-md bg-surface/60 px-2.5 py-2">
          <div className="text-muted-foreground">Receita prevista</div>
          <div className={cn("font-mono text-[15px] font-semibold", NO_RITMO ? "text-success" : "text-warning")}>
            {formatBRL(PROJECAO)}
          </div>
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all"
          style={{ width: `${PCT}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{vendas} contratos fechados no mês</span>
        <span className="inline-flex items-center gap-1 text-success">
          <TrendingUp className="h-3 w-3" /> +12% MoM
        </span>
      </div>
    </div>
  );
}

function IAExecutivaCard() {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-elegant lg:col-span-3">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-primary/80">
              IA Executiva
            </div>
            <h3 className="mt-0.5 text-[15px] font-semibold leading-snug tracking-tight md:text-base">
              Para bater {formatBRL(META)}, faltam {DIAS_RESTANTES} dias.
              {" "}
              <span className={cn(NO_RITMO ? "text-success" : "text-warning")}>
                Ritmo atual projeta {formatBRL(PROJECAO)}.
              </span>
            </h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
              Com sua taxa de conversão média de {(TAXA_CONVERSAO * 100).toFixed(0)}%, recomendo executar hoje:
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          <Recommendation label="Prospecções" value={PROSPECCOES_NECESSARIAS} />
          <Recommendation label="Reuniões" value={REUNIOES_NECESSARIAS} />
          <Recommendation label="Propostas" value={PROPOSTAS_NECESSARIAS} />
          <Recommendation label="Fechamentos" value={CONTRATOS_NECESSARIOS} highlight />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            to="/comercial"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Abrir CRM <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            to="/central-ia"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
          >
            <Brain className="h-3 w-3" /> Ver plano completo
          </Link>
        </div>
      </div>
    </div>
  );
}

function Recommendation({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-md border bg-surface/60 p-2.5",
        highlight && "border-primary/40 bg-primary/10",
      )}
    >
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono text-xl font-semibold", highlight && "text-primary")}>{value}</div>
    </div>
  );
}
