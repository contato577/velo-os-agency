import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Plus,
  FolderKanban,
  CheckSquare,
  Calendar as CalendarIcon,
  Users,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  Flame,
  ArrowRight,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { projects, tasks, agendaEvents } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operacao")({
  head: () => ({
    meta: [
      { title: "Operação · Veloce" },
      { name: "description", content: "Central de operação: projetos, tarefas e agenda em um só lugar." },
    ],
  }),
  component: Operacao,
});

type Tab = "projetos" | "tarefas" | "agenda";

const HOJE = "2026-07-03";

const projStatus = {
  briefing: { label: "Briefing", color: "bg-info/15 text-info" },
  producao: { label: "Em produção", color: "bg-warning/15 text-warning" },
  revisao: { label: "Em revisão", color: "bg-primary/15 text-primary" },
  entregue: { label: "Entregue", color: "bg-success/15 text-success" },
};

function Operacao() {
  const [tab, setTab] = useState<Tab>("projetos");

  const tarefasAtrasadas = tasks.filter(
    (t) => t.status !== "concluida" && new Date(t.dueDate) < new Date(HOJE),
  );
  const tarefasHoje = tasks.filter((t) => t.status === "hoje" || t.dueDate === HOJE);
  const projetosAtrasados = projects.filter(
    (p) => p.status !== "entregue" && new Date(p.deadline) < new Date("2026-07-15"),
  );
  const reunioesHoje = agendaEvents.filter((e) => e.date === HOJE && e.type === "reuniao");

  const tabsList: { key: Tab; label: string; icon: typeof FolderKanban; count: number }[] = [
    { key: "projetos", label: "Projetos", icon: FolderKanban, count: projects.length },
    { key: "tarefas", label: "Tarefas", icon: CheckSquare, count: tasks.filter((t) => t.status !== "concluida").length },
    { key: "agenda", label: "Agenda", icon: CalendarIcon, count: agendaEvents.length },
  ];

  return (
    <AppShell title="Operação" subtitle="Projetos, tarefas e agenda">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Operação" subtitle="Toda a execução da agência em um só lugar">
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Novo
          </button>
        </PageHeader>

        {/* Pulso operacional */}
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          <PulseTile
            label="Tarefas atrasadas"
            value={tarefasAtrasadas.length}
            tone="destructive"
            icon={AlertTriangle}
            hint="Resolver hoje"
            onClick={() => setTab("tarefas")}
          />
          <PulseTile
            label="Para hoje"
            value={tarefasHoje.length}
            tone="warning"
            icon={Clock}
            hint="Foco do dia"
            onClick={() => setTab("tarefas")}
          />
          <PulseTile
            label="Projetos em produção"
            value={projects.filter((p) => p.status === "producao").length}
            tone="primary"
            icon={Flame}
            hint={`${projetosAtrasados.length} com risco de atraso`}
            onClick={() => setTab("projetos")}
          />
          <PulseTile
            label="Reuniões hoje"
            value={reunioesHoje.length}
            tone="info"
            icon={CalendarIcon}
            hint="Não esqueça de preparar"
            onClick={() => setTab("agenda")}
          />
        </div>

        <div className="mb-5 flex items-center gap-1 border-b">
          {tabsList.map((t) => {
            const Icon = t.icon;
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                  active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {t.label}
                <span className="rounded bg-accent px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">{t.count}</span>
              </button>
            );
          })}
        </div>

        {tab === "projetos" && <ProjetosPanel />}
        {tab === "tarefas" && <TarefasPanel />}
        {tab === "agenda" && <AgendaPanel />}
      </div>
    </AppShell>
  );
}

type PulseTone = "primary" | "warning" | "info" | "destructive" | "success";

function PulseTile({
  label,
  value,
  tone,
  icon: Icon,
  hint,
  onClick,
}: {
  label: string;
  value: number | string;
  tone: PulseTone;
  icon: typeof AlertTriangle;
  hint?: string;
  onClick?: () => void;
}) {
  const toneMap: Record<PulseTone, string> = {
    primary: "text-primary bg-primary/10",
    warning: "text-warning bg-warning/10",
    info: "text-info bg-info/10",
    destructive: "text-destructive bg-destructive/10",
    success: "text-success bg-success/10",
  };
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-lg border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-surface/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 font-mono text-[22px] font-semibold tracking-tight">{value}</div>
          {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", toneMap[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <ArrowRight className="absolute right-3 bottom-3 h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

// keep Link import for future actions
void Link;

function ProjetosPanel() {
  const groups = ["briefing", "producao", "revisao", "entregue"] as const;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {groups.map((g) => {
        const list = projects.filter((p) => p.status === g);
        return (
          <div key={g} className="rounded-xl border bg-surface/40 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", projStatus[g].color)}>
                  {projStatus[g].label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{list.length}</span>
              </div>
              <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              {list.map((p) => (
                <div key={p.id} className="rounded-md border bg-card p-3">
                  <div className="text-[13px] font-medium">{p.name}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{p.clientName}</div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-2.5 w-2.5" /> {p.owner.split(" ")[0]}
                    </span>
                    <span className="font-mono text-primary">{p.progress}%</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded bg-surface">
                    <div className="h-full rounded bg-primary" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TarefasPanel() {
  const byStatus = ["hoje", "andamento", "backlog", "concluida"] as const;
  const label = { hoje: "Hoje", andamento: "Em andamento", backlog: "Backlog", concluida: "Concluídas" };
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {byStatus.map((s) => {
        const list = tasks.filter((t) => t.status === s);
        return (
          <div key={s} className="rounded-xl border bg-surface/40 p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider">{label[s]}</span>
              <span className="font-mono text-[10px] text-muted-foreground">{list.length}</span>
            </div>
            <div className="space-y-2">
              {list.map((t) => (
                <div key={t.id} className="rounded-md border bg-card p-2.5">
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                        t.priority === "urgente" && "bg-destructive",
                        t.priority === "alta" && "bg-warning",
                        t.priority === "media" && "bg-info",
                        t.priority === "baixa" && "bg-muted-foreground",
                      )}
                    />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium">{t.title}</div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">{t.owner.split(" ")[0]} · {new Date(t.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgendaPanel() {
  const grouped = agendaEvents.reduce<Record<string, typeof agendaEvents>>((acc, e) => {
    (acc[e.date] ||= []).push(e);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort();
  return (
    <div className="space-y-4">
      {dates.map((d) => (
        <div key={d} className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">
              {new Date(d).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
            </h3>
            <span className="text-[11px] text-muted-foreground">{grouped[d].length} compromissos</span>
          </div>
          <ul className="space-y-1">
            {grouped[d].map((e) => (
              <li key={e.id} className="flex items-center gap-3 rounded-md border bg-surface/50 px-3 py-2">
                <span className="font-mono text-[12px] text-primary">{e.time}</span>
                <span className="min-w-0 flex-1 truncate text-[13px]">{e.title}</span>
                {e.with && <span className="text-[10px] text-muted-foreground">com {e.with}</span>}
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                    e.type === "reuniao" && "bg-primary/15 text-primary",
                    e.type === "followup" && "bg-info/15 text-info",
                    e.type === "pagamento" && "bg-warning/15 text-warning",
                    e.type === "renovacao" && "bg-success/15 text-success",
                    e.type === "tarefa" && "bg-muted text-muted-foreground",
                  )}
                >
                  {e.type}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
