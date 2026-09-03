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
import { formatBRL, agendaEvents } from "@/lib/mock-data";
import { useDataStore } from "@/lib/data-store";
import { sortByPriority } from "@/lib/ai-engine";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · Veloce" },
      {
        name: "description",
        content: "Como está sua agência hoje: pulso da operação em tempo real.",
      },
    ],
  }),
  component: Dashboard,
});

type PulseTone = "primary" | "warning" | "info" | "destructive" | "success";

function Dashboard() {
  const { leads, tasks, clients, insights, metasMensais, pontoControleAtual } = useDataStore();
  const leadsNovos = leads.filter((l) => l.stage === "novo").length;
  const leadsAguardando = leads.filter((l) => l.stage === "contato").length;
  // Antes vinha de um número fixo no mock (sempre "7", nunca mudava). Agora
  // conta de verdade: leads em estágio inicial parados há mais de 48h —
  // mesma regra que a Central de IA usa pra gerar o alerta de follow-up.
  const followupsPendentes = leads.filter(
    (l) =>
      ["novo", "contato"].includes(l.stage) &&
      Date.now() - new Date(l.lastActivity).getTime() > 48 * 3600000,
  ).length;
  const hoje = new Date();
  const hojeISO = hoje.toISOString().slice(0, 10);
  const diaAtual = hoje.getDate();
  const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const reunioesHoje = agendaEvents.filter(
    (e) => e.date === hojeISO && e.type === "reuniao",
  ).length;
  const tarefasAtrasadas = tasks.filter(
    (t) => t.status !== "concluida" && new Date(t.dueDate) < new Date(hojeISO),
  ).length;
  const cobrancasPendentes = clients.filter(
    (c) => c.status === "ativo" && c.paymentDay <= diaAtual,
  ).length;

  const fechados = leads.filter((l) => l.stage === "fechado");
  const vendasMes = fechados.length;
  const receita = fechados.reduce((s, l) => s + l.value, 0);
  const meta = metasMensais.metaComercial;
  const diasRestantes = Math.max(0, diasNoMes - diaAtual);
  const ritmoDia = diaAtual > 0 ? receita / diaAtual : 0;
  const projecao = Math.round(ritmoDia * diasNoMes);
  const pct = meta > 0 ? Math.min(100, (receita / meta) * 100) : 0;
  const noRitmo = projecao >= meta;
  const gap = Math.max(0, meta - receita);
  const ticketMedioFechados = fechados.length > 0 ? receita / fechados.length : 0;
  // Sem venda fechada ainda no mês, o ticket médio caía pra 0 — e como
  // "contratos necessários → reuniões → prospecções" é tudo calculado em
  // cima dele, ficava tudo travado em zero até a primeira venda do mês.
  // Agora usa uma estimativa em cascata: venda real do mês → meta ÷
  // clientes desejados (que você já configura no Ponto de Controle) →
  // ticket médio dos clientes ativos hoje → só então 0, se não tiver nada.
  const clientesAtivos = clients.filter((c) => c.status === "ativo");
  const ticketMedioClientesAtivos =
    clientesAtivos.length > 0
      ? clientesAtivos.reduce((s, c) => s + c.monthlyValue, 0) / clientesAtivos.length
      : 0;
  const ticketMedio =
    ticketMedioFechados ||
    (pontoControleAtual?.novosClientesDesejados
      ? meta / pontoControleAtual.novosClientesDesejados
      : 0) ||
    ticketMedioClientesAtivos;
  const contratosNecessarios = ticketMedio > 0 ? Math.max(0, Math.ceil(gap / ticketMedio)) : 0;
  const taxaReuniaoFech = pontoControleAtual?.taxaReuniaoFechamento || 30;
  const taxaProspReuniao = pontoControleAtual?.taxaProspeccaoReuniao || 20;
  const reunioesNecessarias =
    taxaReuniaoFech > 0 ? Math.ceil(contratosNecessarios / (taxaReuniaoFech / 100)) : 0;
  const prospeccoesNecessarias =
    taxaProspReuniao > 0 ? Math.ceil(reunioesNecessarias / (taxaProspReuniao / 100)) : 0;

  const pulse: {
    label: string;
    value: number | string;
    icon: typeof Sparkles;
    tone: PulseTone;
    to: string;
  }[] = [
    { label: "Leads novos", value: leadsNovos, icon: Sparkles, tone: "primary", to: "/comercial" },
    {
      label: "Aguardando contato",
      value: leadsAguardando,
      icon: Users2,
      tone: "info",
      to: "/comercial",
    },
    {
      label: "Follow-ups pendentes",
      value: followupsPendentes,
      icon: Clock4,
      tone: "warning",
      to: "/comercial",
    },
    {
      label: "Reuniões hoje",
      value: reunioesHoje,
      icon: Calendar,
      tone: "primary",
      to: "/operacao",
    },
    {
      label: "Tarefas atrasadas",
      value: tarefasAtrasadas,
      icon: AlertTriangle,
      tone: "destructive",
      to: "/operacao",
    },
    {
      label: "Cobranças pendentes",
      value: cobrancasPendentes,
      icon: Wallet,
      tone: "warning",
      to: "/dre",
    },
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
        <PageHeader
          title="Bom dia, Rafael"
          subtitle="Aqui está o pulso da operação — atualizado agora."
        >
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
          <MetaCard
            vendas={vendasMes}
            meta={meta}
            receita={receita}
            projecao={projecao}
            pct={pct}
            noRitmo={noRitmo}
            diasRestantes={diasRestantes}
          />
          <IAExecutivaCard
            meta={meta}
            projecao={projecao}
            noRitmo={noRitmo}
            diasRestantes={diasRestantes}
            taxaReuniaoFech={taxaReuniaoFech}
            taxaProspReuniao={taxaProspReuniao}
            prospeccoes={prospeccoesNecessarias}
            reunioes={reunioesNecessarias}
            fechamentos={contratosNecessarios}
          />
        </div>

        {/* Próximas ações + Hoje */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Próximas ações</h3>
                <p className="text-[11px] text-muted-foreground">Priorizadas pela IA para hoje</p>
              </div>
              <Link
                to="/central-ia"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="space-y-1">
              {proximasAcoes.map((a) => (
                <li key={a.id}>
                  <Link
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    to={a.to as any}
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
                <p className="text-[11px] text-muted-foreground">
                  {new Date(hojeISO + "T00:00:00").toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                  {" · "}
                  {agendaEvents.filter((e) => e.date === hojeISO).length} compromissos
                </p>
              </div>
              <Link
                to="/operacao"
                search={{ tab: "agenda" }}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                Abrir agenda <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="space-y-1">
              {agendaEvents
                .filter((e) => e.date === hojeISO)
                .map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-2.5 rounded-md border bg-surface px-2.5 py-2"
                  >
                    <span className="font-mono text-[11px] text-primary">{e.time}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px]">{e.title}</span>
                    {e.with && (
                      <span className="hidden text-[10px] text-muted-foreground sm:inline">
                        com {e.with}
                      </span>
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
                    <span className="text-[10px] text-muted-foreground">
                      {t.owner.split(" ")[0]}
                    </span>
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      className="group relative overflow-hidden rounded-lg border bg-card p-4 transition-all hover:border-primary/40 hover:bg-surface/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 font-mono text-[24px] font-semibold tracking-tight">{value}</div>
        </div>
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            toneMap[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

function MetaCard({
  vendas,
  meta,
  receita,
  projecao,
  pct,
  noRitmo,
  diasRestantes,
}: {
  vendas: number;
  meta: number;
  receita: number;
  projecao: number;
  pct: number;
  noRitmo: boolean;
  diasRestantes: number;
}) {
  const { pontoControleAtual } = useDataStore();

  return (
    <div className="rounded-xl border bg-card p-5 lg:col-span-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-deep/15">
              <Target className="h-3.5 w-3.5 text-brand-deep" />
            </div>
            <h3 className="text-sm font-semibold tracking-tight">Meta do mês</h3>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {pontoControleAtual
              ? "Meta do Ponto de Controle"
              : "Meta padrão — defina no Ponto de Controle"}{" "}
            · {diasRestantes} dias restantes
          </p>
        </div>
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 font-mono text-[11px]",
            noRitmo
              ? "border-success/40 bg-success/10 text-success"
              : "border-warning/40 bg-warning/10 text-warning",
          )}
        >
          {pct.toFixed(0)}% da meta
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-[11px]">
        <div className="rounded-md bg-surface/60 px-2.5 py-2">
          <div className="text-muted-foreground">Meta</div>
          <div className="font-mono text-[15px] font-semibold">{formatBRL(meta)}</div>
        </div>
        <div className="rounded-md bg-surface/60 px-2.5 py-2">
          <div className="text-muted-foreground">Receita atual</div>
          <div className="font-mono text-[15px] font-semibold text-primary">
            {formatBRL(receita)}
          </div>
        </div>
        <div className="rounded-md bg-surface/60 px-2.5 py-2">
          <div className="text-muted-foreground">Receita prevista</div>
          <div
            className={cn(
              "font-mono text-[15px] font-semibold",
              noRitmo ? "text-success" : "text-warning",
            )}
          >
            {formatBRL(projecao)}
          </div>
        </div>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{vendas} contratos fechados no mês</span>
      </div>
    </div>
  );
}

function IAExecutivaCard({
  meta,
  projecao,
  noRitmo,
  diasRestantes,
  taxaReuniaoFech,
  taxaProspReuniao,
  prospeccoes,
  reunioes,
  fechamentos,
}: {
  meta: number;
  projecao: number;
  noRitmo: boolean;
  diasRestantes: number;
  taxaReuniaoFech: number;
  taxaProspReuniao: number;
  prospeccoes: number;
  reunioes: number;
  fechamentos: number;
}) {
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
              Para bater {formatBRL(meta)}, faltam {diasRestantes} dias.{" "}
              <span className={cn(noRitmo ? "text-success" : "text-warning")}>
                Ritmo atual projeta {formatBRL(projecao)}.
              </span>
            </h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted-foreground">
              Com {taxaProspReuniao}% de agendamento e {taxaReuniaoFech}% de fechamento (do seu
              Ponto de Controle), recomendo executar hoje:
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Recommendation label="Prospecções" value={prospeccoes} />
          <Recommendation label="Reuniões" value={reunioes} />
          <Recommendation label="Fechamentos" value={fechamentos} highlight />
        </div>
      </div>
    </div>
  );
}

function Recommendation({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-surface/60 p-2.5",
        highlight && "border-primary/40 bg-primary/10",
      )}
    >
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono text-xl font-semibold", highlight && "text-primary")}>
        {value}
      </div>
    </div>
  );
}
