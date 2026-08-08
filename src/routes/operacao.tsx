import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
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
  Pencil,
  User,
  CornerUpLeft,
  Trash2,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { agendaEvents } from "@/lib/mock-data";
import type { Task, Client, Lead } from "@/lib/mock-data";
import { useDataStore } from "@/lib/data-store";
import { NewTaskButton, EditTaskDialog } from "@/components/quick-actions";
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
  const { tasks, projects: projetosReais } = useDataStore();

  const tarefasAtrasadas = tasks.filter(
    (t) => t.status !== "concluida" && new Date(t.dueDate) < new Date(HOJE),
  );
  const tarefasHoje = tasks.filter((t) => t.status === "hoje" || t.dueDate === HOJE);
  // Só projetos de Implementação entram na conta de "atrasado" — Operação Contínua
  // usa a data de renovação como "prazo", e isso não é a mesma coisa que um projeto atrasado.
  const projetosAtrasados = projetosReais.filter(
    (p) => p.fase === "implementacao" && p.status !== "entregue" && new Date(p.deadline) < new Date(HOJE),
  );
  const reunioesHoje = agendaEvents.filter((e) => e.date === HOJE && e.type === "reuniao");

  const tabsList: { key: Tab; label: string; icon: typeof FolderKanban; count: number }[] = [
    { key: "tarefas", label: "Minha Semana", icon: CheckSquare, count: tasks.filter((t) => t.status !== "concluida").length },
    { key: "projetos", label: "Projetos", icon: FolderKanban, count: projetosReais.filter((p) => p.fase === "implementacao").length },
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
            value={projetosReais.filter((p) => p.fase === "implementacao" && p.status === "producao").length}
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
  const { projects: projetosReais } = useDataStore();
  const groups = ["briefing", "producao", "revisao", "entregue"] as const;
  // Só projetos de Implementação entram nesse quadro — eles são os que realmente
  // "andam" por essas 4 colunas. Operação Contínua não tem esse ciclo (não tem fim),
  // por isso fica de fora daqui e é mostrada como um resumo à parte, mais abaixo.
  const implementacoes = projetosReais.filter((p) => p.fase === "implementacao");
  const emOperacaoContinua = projetosReais.filter((p) => p.fase === "operacao_continua");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {groups.map((g) => {
          const list = implementacoes.filter((p) => p.status === g);
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
                {list.map((p) => {
                  const checklist = p.checklist ?? [];
                  const pct = checklist.length > 0 ? Math.round((checklist.filter((i) => i.done).length / checklist.length) * 100) : p.progress;
                  return (
                    <div key={p.id} className="rounded-md border bg-card p-3">
                      <div className="text-[13px] font-medium">{p.name}</div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">{p.clientName}</div>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-2.5 w-2.5" /> {p.owner.split(" ")[0]}
                        </span>
                        <span className="font-mono text-primary">{pct}%</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded bg-surface">
                        <div className="h-full rounded bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {list.length === 0 && <p className="text-center text-[11px] text-muted-foreground">Nada aqui.</p>}
              </div>
            </div>
          );
        })}
      </div>

      {emOperacaoContinua.length > 0 && (
        <div className="rounded-xl border bg-surface/30 p-3 text-[12px] text-muted-foreground">
          <b className="text-foreground">{emOperacaoContinua.length}</b> cliente
          {emOperacaoContinua.length === 1 ? "" : "s"} em Operação Contínua — veja o detalhe na ficha de cada cliente, aba
          Operação.
        </div>
      )}
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
  draggable = false,
}: {
  task: Task;
  clients: Client[];
  leads: Lead[];
  onToggle: () => void;
  overdue?: boolean;
  showLink?: boolean;
  draggable?: boolean;
}) {
  const link = taskLink(task, clients, leads);
  const done = task.status === "concluida";
  const [editOpen, setEditOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const dragStyle =
    draggable && transform
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 40 }
      : undefined;
  const priorityLabel = { urgente: "Urgente", alta: "Alta", media: "Média", baixa: "Baixa" }[task.priority];
  const priorityClass = {
    urgente: "bg-destructive text-destructive-foreground",
    alta: "bg-warning text-warning-foreground",
    media: "bg-info text-info-foreground",
    baixa: "bg-surface-3 text-muted-foreground",
  }[task.priority];

  return (
    <div
      ref={draggable ? setNodeRef : undefined}
      style={dragStyle}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      onClick={() => {
        if (isDragging) return;
        setEditOpen(true);
      }}
      className={cn(
        "group card-trello relative cursor-pointer select-none p-2.5",
        done && "opacity-50",
        overdue && !done && "border-l-4 border-l-destructive bg-destructive/5",
      )}
    >
      <div className="pointer-events-none absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-md bg-surface/90 text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
        <Pencil className="h-2.5 w-2.5" />
      </div>
      {!done && (
        <span className={cn("pill-label mb-1.5", priorityClass)}>
          {priorityLabel}
        </span>
      )}
      <div className="flex items-start gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn(
            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
            done ? "border-success bg-success text-success-foreground" : "border-muted-foreground/40 hover:border-primary",
          )}
        >
          {done && <Check className="h-3 w-3" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className={cn("line-clamp-1 break-all text-[13px] font-semibold leading-snug", done && "line-through")}>{task.title}</div>
          {task.description && (
            <p className="mt-0.5 line-clamp-1 break-all text-[11px] leading-snug text-muted-foreground">{task.description}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {overdue && !done && (
              <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive">
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
          </div>
        </div>
      </div>
      {editOpen &&
        createPortal(<EditTaskDialog task={task} onClose={() => setEditOpen(false)} />, document.body)}
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
  const { tasks, clients, leads, toggleTaskDone, updateTask, deleteTask } = useDataStore();
  const [view, setView] = useState<"dia" | "cliente">("dia");
  const weekDays = getWeekDays(HOJE);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const atrasadas = tasks.filter((t) => t.status !== "concluida" && t.dueDate < weekDays[0]);
  const daSemana = tasks.filter((t) => weekDays.includes(t.dueDate));
  const futuras = tasks
    .filter((t) => t.status !== "concluida" && t.dueDate > weekDays[6])
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const handleDragEnd = (e: DragEndEvent) => {
    const taskId = String(e.active.id);
    const targetDate = e.over?.id ? String(e.over.id) : null;
    if (!targetDate) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.dueDate === targetDate) return;
    updateTask(taskId, { dueDate: targetDate });
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
          <div className="flex items-start gap-3 overflow-x-auto pb-3">
            {weekDays.map((date, i) => (
              <DayColumn
                key={date}
                date={date}
                label={weekdayLabels[i]}
                isToday={date === HOJE}
                tasks={daSemana.filter((t) => t.dueDate === date)}
                atrasadas={date === HOJE ? atrasadas : []}
                clients={clients}
                leads={leads}
                onToggle={toggleTaskDone}
              />
            ))}
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
              {futuras.map((t) => {
                const link = taskLink(t, clients, leads);
                const priorityClass = {
                  urgente: "bg-destructive text-destructive-foreground",
                  alta: "bg-warning text-warning-foreground",
                  media: "bg-info text-info-foreground",
                  baixa: "bg-surface-3 text-muted-foreground",
                }[t.priority];
                return (
                  <div key={t.id} className="group relative rounded-md border bg-card px-2.5 py-2 text-[12px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {new Date(t.dueDate + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </span>
                      <span className={cn("rounded px-1 py-0.5 text-[9px] font-semibold uppercase", priorityClass)}>
                        {t.priority}
                      </span>
                    </div>
                    <div className="mt-1 truncate font-medium">{t.title}</div>
                    <span
                      className={cn(
                        "mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold",
                        link.kind === "cliente" && "bg-primary/10 text-primary",
                        link.kind === "lead" && "bg-info/10 text-info",
                        link.kind === "geral" && "bg-muted text-muted-foreground",
                      )}
                    >
                      {link.label}
                    </span>

                    {/* Ações visíveis só no hover — mover pra semana atual, ou excluir */}
                    <div className="absolute right-1.5 top-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        title="Mover para a semana atual"
                        onClick={() => updateTask(t.id, { dueDate: HOJE })}
                        className="flex h-5 w-5 items-center justify-center rounded bg-surface/95 text-muted-foreground shadow-sm hover:bg-primary/15 hover:text-primary"
                      >
                        <CornerUpLeft className="h-3 w-3" />
                      </button>
                      <button
                        title="Excluir tarefa"
                        onClick={() => deleteTask(t.id)}
                        className="flex h-5 w-5 items-center justify-center rounded bg-surface/95 text-muted-foreground shadow-sm hover:bg-destructive/15 hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DndContext>
  );
}

function DayColumn({
  date,
  label,
  isToday,
  tasks,
  atrasadas,
  clients,
  leads,
  onToggle,
}: {
  date: string;
  label: string;
  isToday: boolean;
  tasks: Task[];
  atrasadas: Task[];
  clients: Client[];
  leads: Lead[];
  onToggle: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[280px] w-[270px] shrink-0 flex-col rounded-xl border bg-surface/40 p-3 transition-colors",
        isToday && "border-primary/50 bg-primary/5",
        isOver && "border-primary bg-primary/10",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-bold uppercase tracking-wide">
          {label}
          {isToday && <span className="ml-1.5 rounded bg-primary px-1.5 py-0.5 text-[9px] normal-case text-primary-foreground">hoje</span>}
        </span>
        <span className="font-mono text-[11px] font-medium text-muted-foreground">
          {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
        </span>
      </div>

      {isToday && atrasadas.length > 0 && <OverdueMiniList tasks={atrasadas} onToggle={onToggle} />}

      <div className="space-y-2">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            clients={clients}
            leads={leads}
            onToggle={() => onToggle(t.id)}
            overdue={t.dueDate < HOJE}
            draggable
          />
        ))}
      </div>

      <NewTaskButton
        label="+ Adicionar tarefa"
        defaultDate={date}
        className="mt-2 w-full justify-center border-dashed text-muted-foreground"
      />
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
  const groups = new Map<
    string,
    { label: string; kind: "cliente" | "lead" | "geral"; tasks: Task[]; clientId?: string }
  >();
  for (const t of tasks) {
    const link = taskLink(t, clients, leads);
    const key = `${link.kind}-${link.label}`;
    if (!groups.has(key)) groups.set(key, { label: link.label, kind: link.kind, tasks: [], clientId: t.clientId });
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
        <div className="grid max-h-[70vh] grid-cols-1 items-start gap-3 overflow-y-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
          {contas.map((g) => {
            const client = g.kind === "cliente" ? clients.find((c) => c.id === g.clientId) : undefined;
            const overdueCount = g.tasks.filter((t) => t.dueDate < hoje && t.status !== "concluida").length;

            const statusInfo =
              client?.status === "pausado"
                ? { label: "Pausado", cls: "bg-muted text-muted-foreground" }
                : overdueCount > 0
                  ? { label: "Atrasado", cls: "bg-destructive/15 text-destructive" }
                  : { label: "Em dia", cls: "bg-success/15 text-success" };

            return (
              <div key={g.label} className="rounded-xl border bg-surface/40 p-3.5">
                <div className="mb-2 flex items-center justify-between border-b pb-2.5">
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
                {client && (
                  <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                    <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", statusInfo.cls)}>
                      {statusInfo.label}
                    </span>
                    {client.etapaJornada && (
                      <span className="rounded bg-info/10 px-1.5 py-0.5 text-[10px] font-medium text-info">
                        {client.etapaJornada}
                      </span>
                    )}
                  </div>
                )}
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
            );
          })}
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
