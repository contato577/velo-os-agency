import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  FolderKanban,
  CheckSquare,
  Calendar as CalendarIcon,
  Users,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  Flame,
  ArrowRight,
  Check,
  LayoutGrid,
  User,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { projects, agendaEvents } from "@/lib/mock-data";
import type { Task, Client, Lead } from "@/lib/mock-data";
import { useDataStore } from "@/lib/data-store";
import { NewTaskButton } from "@/components/quick-actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/operacao")({
  validateSearch: (s: Record<string, unknown>) => ({
    tab: (s.tab === "tarefas" || s.tab === "agenda" || s.tab === "projetos" ? s.tab : undefined) as
      | "tarefas"
      | "agenda"
      | "projetos"
      | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Operação · Veloce" },
      { name: "description", content: "Central de operação: projetos, tarefas e agenda em um só lugar." },
    ],
  }),
  component: Operacao,
});

type Tab = "projetos" | "tarefas" | "agenda";

const HOJE = new Date().toISOString().slice(0, 10);

const projStatus = {
  briefing: { label: "Briefing", color: "bg-info/15 text-info" },
  producao: { label: "Em produção", color: "bg-warning/15 text-warning" },
  revisao: { label: "Em revisão", color: "bg-primary/15 text-primary" },
  entregue: { label: "Entregue", color: "bg-success/15 text-success" },
};

function Operacao() {
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>(search.tab ?? "tarefas");
  const { tasks } = useDataStore();

  const tarefasAtrasadas = tasks.filter(
    (t) => t.status !== "concluida" && new Date(t.dueDate) < new Date(HOJE),
  );
  const tarefasHoje = tasks.filter((t) => t.status === "hoje" || t.dueDate === HOJE);
  const projetosAtrasados = projects.filter(
    (p) => p.status !== "entregue" && new Date(p.deadline) < new Date(HOJE),
  );
  const reunioesHoje = agendaEvents.filter((e) => e.date === HOJE && e.type === "reuniao");

  const tabsList: { key: Tab; label: string; icon: typeof FolderKanban; count: number }[] = [
    { key: "tarefas", label: "Minha Semana", icon: CheckSquare, count: tasks.filter((t) => t.status !== "concluida").length },
    { key: "projetos", label: "Projetos", icon: FolderKanban, count: projects.length },
    { key: "agenda", label: "Agenda", icon: CalendarIcon, count: agendaEvents.length },
  ];

  return (
    <AppShell title="Operação" subtitle="Projetos, tarefas e agenda">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Operação" subtitle="Toda a execução da agência em um só lugar">
          <NewTaskButton label="+ Nova tarefa" />
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

        {tab === "tarefas" && <SemanaPanel />}
        {tab === "projetos" && <ProjetosPanel />}
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
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[12px] text-warning">
        Essa aba ainda mostra dados de exemplo — os projetos criados de verdade (ao fechar venda no CRM) ainda não aparecem aqui. Em construção.
      </div>
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
    </div>
  );
}

function getWeekDays(hojeStr: string): string[] {
  const hoje = new Date(hojeStr + "T00:00:00");
  const dayOfWeek = hoje.getDay(); // 0 = domingo
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(hoje);
  monday.setDate(hoje.getDate() + diffToMonday);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

const weekdayLabels = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function taskLink(task: Task, clients: Client[], leads: Lead[]): { label: string; kind: "cliente" | "lead" | "geral" } {
  if (task.clientId) {
    const c = clients.find((c) => c.id === task.clientId);
    if (c) return { label: c.company, kind: "cliente" };
  }
  if (task.leadId) {
    const l = leads.find((l) => l.id === task.leadId);
    if (l) return { label: l.name, kind: "lead" };
  }
  return { label: "Geral", kind: "geral" };
}

function TaskCard({
  task,
  clients,
  leads,
  onToggle,
  overdue,
  showLink = true,
}: {
  task: Task;
  clients: Client[];
  leads: Lead[];
  onToggle: () => void;
  overdue?: boolean;
  showLink?: boolean;
}) {
  const link = taskLink(task, clients, leads);
  const done = task.status === "concluida";
  return (
    <div
      className={cn(
        "rounded-md border bg-card p-3",
        done && "opacity-50",
        overdue && !done && "border-l-4 border-destructive bg-destructive/5",
      )}
    >
      <div className="flex items-start gap-2.5">
        <button
          onClick={onToggle}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors",
            done ? "border-success bg-success text-success-foreground" : "border-muted-foreground/40 hover:border-primary",
          )}
        >
          {done && <Check className="h-3.5 w-3.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className={cn("line-clamp-2 break-all text-[14px] font-semibold leading-snug", done && "line-through")}>{task.title}</div>
          {task.description && (
            <p className="mt-1 line-clamp-3 break-all text-[12px] leading-snug text-muted-foreground">{task.description}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {overdue && !done && (
              <span className="inline-flex items-center gap-1 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive-foreground">
                <AlertTriangle className="h-2.5 w-2.5" />
                Atrasada · {new Date(task.dueDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              </span>
            )}
            {showLink && (
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                  link.kind === "cliente" && "bg-primary/10 text-primary",
                  link.kind === "lead" && "bg-info/10 text-info",
                  link.kind === "geral" && "bg-muted text-muted-foreground",
                )}
              >
                {link.label}
              </span>
            )}
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                task.priority === "urgente" && "bg-destructive",
                task.priority === "alta" && "bg-warning",
                task.priority === "media" && "bg-info",
                task.priority === "baixa" && "bg-muted-foreground",
              )}
              title={`Prioridade ${task.priority}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function OverdueMiniList({ tasks, onToggle }: { tasks: Task[]; onToggle: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? tasks : tasks.slice(0, 3);
  const hidden = tasks.length - visible.length;

  return (
    <div className="mb-2.5 space-y-1 border-b pb-2.5">
      {visible.map((t) => (
        <button
          key={t.id}
          onClick={() => onToggle(t.id)}
          className="flex w-full items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-left transition-colors hover:bg-destructive/10"
        >
          <span className="h-3 w-3 shrink-0 rounded-sm border-2 border-destructive/50" />
          <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-foreground">{t.title}</span>
          <span className="shrink-0 font-mono text-[9px] font-semibold text-destructive">
            {new Date(t.dueDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
          </span>
        </button>
      ))}
      {tasks.length > 3 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-destructive hover:bg-destructive/10"
        >
          {expanded ? "Mostrar menos" : `+ ${hidden} atrasada${hidden > 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}

function SemanaPanel() {
  const { tasks, clients, leads, toggleTaskDone } = useDataStore();
  const [view, setView] = useState<"dia" | "cliente">("dia");
  const weekDays = getWeekDays(HOJE);

  const atrasadas = tasks.filter((t) => t.status !== "concluida" && t.dueDate < weekDays[0]);
  const daSemana = tasks.filter((t) => weekDays.includes(t.dueDate));
  const futuras = tasks
    .filter((t) => t.status !== "concluida" && t.dueDate > weekDays[6])
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-md border bg-surface p-0.5">
          <button
            onClick={() => setView("dia")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-medium transition-colors",
              view === "dia" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-3 w-3" /> Por dia
          </button>
          <button
            onClick={() => setView("cliente")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-[12px] font-medium transition-colors",
              view === "cliente" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <User className="h-3 w-3" /> Por cliente
          </button>
        </div>
      </div>

      {view === "dia" ? (
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {weekDays.map((date, i) => {
            const isToday = date === HOJE;
            const list = daSemana.filter((t) => t.dueDate === date);
            return (
              <div
                key={date}
                className={cn(
                  "flex flex-col rounded-xl border bg-surface/40 p-3",
                  isToday && "border-primary/50 bg-primary/5",
                )}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[13px] font-bold uppercase tracking-wide">
                    {weekdayLabels[i]}
                    {isToday && <span className="ml-1.5 rounded bg-primary px-1.5 py-0.5 text-[9px] normal-case text-primary-foreground">hoje</span>}
                  </span>
                  <span className="font-mono text-[11px] font-medium text-muted-foreground">
                    {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </span>
                </div>

                {isToday && atrasadas.length > 0 && <OverdueMiniList tasks={atrasadas} onToggle={toggleTaskDone} />}

                <div className="space-y-2">
                  {list.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">—</p>
                  ) : (
                    list.map((t) => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        clients={clients}
                        leads={leads}
                        onToggle={() => toggleTaskDone(t.id)}
                        overdue={t.dueDate < HOJE}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <ClienteView tasks={[...atrasadas, ...daSemana]} clients={clients} leads={leads} toggleTaskDone={toggleTaskDone} hoje={HOJE} />
      )}

      {futuras.length > 0 && (
        <div className="rounded-lg border bg-surface/30 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Semanas seguintes ({futuras.length})
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {futuras.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-[12px]">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {new Date(t.dueDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClienteView({
  tasks,
  clients,
  leads,
  toggleTaskDone,
  hoje,
}: {
  tasks: Task[];
  clients: Client[];
  leads: Lead[];
  toggleTaskDone: (id: string) => void;
  hoje: string;
}) {
  const groups = new Map<string, { label: string; kind: "cliente" | "lead" | "geral"; tasks: Task[] }>();
  for (const t of tasks) {
    const link = taskLink(t, clients, leads);
    const key = `${link.kind}-${link.label}`;
    if (!groups.has(key)) groups.set(key, { label: link.label, kind: link.kind, tasks: [] });
    groups.get(key)!.tasks.push(t);
  }
  for (const g of groups.values()) g.tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const contas = Array.from(groups.values())
    .filter((g) => g.kind !== "geral")
    .sort((a, b) => a.label.localeCompare(b.label));
  const geral = groups.get("geral-Geral");

  if (contas.length === 0 && !geral) {
    return <p className="text-[12px] text-muted-foreground">Nenhuma tarefa nessa semana.</p>;
  }

  return (
    <div className="space-y-4">
      {contas.length > 0 && (
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {contas.map((g) => (
            <div key={g.label} className="rounded-xl border bg-surface/40 p-3.5">
              <div className="mb-3 flex items-center justify-between border-b pb-2.5">
                <span className="flex items-center gap-1.5 text-[13px] font-bold">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      g.kind === "cliente" ? "bg-primary" : "bg-info",
                    )}
                  />
                  {g.label}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                  {g.tasks.length}
                </span>
              </div>
              <div className="space-y-2">
                {g.tasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    clients={clients}
                    leads={leads}
                    onToggle={() => toggleTaskDone(t.id)}
                    overdue={t.dueDate < hoje}
                    showLink={false}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {geral && (
        <div className="rounded-xl border border-dashed bg-transparent p-3.5">
          <div className="mb-3 flex items-center justify-between border-b pb-2.5">
            <span className="text-[13px] font-bold text-muted-foreground">Geral · administrativo</span>
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
              {geral.tasks.length}
            </span>
          </div>
          <div className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {geral.tasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                clients={clients}
                leads={leads}
                onToggle={() => toggleTaskDone(t.id)}
                overdue={t.dueDate < hoje}
                showLink={false}
              />
            ))}
          </div>
        </div>
      )}
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
      <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[12px] text-warning">
        Essa aba ainda mostra dados de exemplo — reuniões/compromissos reais ainda não têm cadastro próprio. Em construção.
      </div>
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
