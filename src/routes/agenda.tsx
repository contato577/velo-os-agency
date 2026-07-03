import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { agendaEvents } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda · Veloce Performance OS" },
      { name: "description", content: "Calendário com reuniões, follow-ups, pagamentos e renovações." },
    ],
  }),
  component: Agenda,
});

const typeColor = {
  reuniao: "bg-primary",
  followup: "bg-info",
  pagamento: "bg-success",
  renovacao: "bg-warning",
  tarefa: "bg-muted-foreground",
};

const typeLabel = {
  reuniao: "Reunião",
  followup: "Follow-up",
  pagamento: "Pagamento",
  renovacao: "Renovação",
  tarefa: "Tarefa",
};

function Agenda() {
  // July 2026, starts on Wed (day of week = 3)
  const daysInMonth = 31;
  const firstDay = 3; // Wed
  const cells: Array<number | null> = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDay = new Map<number, typeof agendaEvents>();
  agendaEvents.forEach((e) => {
    const d = new Date(e.date);
    if (d.getFullYear() === 2026 && d.getMonth() === 6) {
      const day = d.getDate();
      if (!eventsByDay.has(day)) eventsByDay.set(day, []);
      eventsByDay.get(day)!.push(e);
    }
  });

  return (
    <AppShell title="Agenda" subtitle="Calendário completo">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Julho 2026" subtitle="Reuniões, follow-ups e vencimentos">
          <div className="flex rounded-md border bg-surface">
            <button className="rounded-l-md border-r px-2 py-1 hover:bg-accent">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button className="px-3 py-1 text-xs">Hoje</button>
            <button className="rounded-r-md border-l px-2 py-1 hover:bg-accent">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-3.5 w-3.5" /> Novo Evento
          </button>
        </PageHeader>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="grid grid-cols-7 border-b bg-surface/50 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
                <div key={d} className="px-2 py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                const isToday = day === 3;
                const events = day ? eventsByDay.get(day) ?? [] : [];
                return (
                  <div
                    key={i}
                    className={cn(
                      "min-h-24 border-b border-r p-1.5 last:border-r-0",
                      i % 7 === 6 && "border-r-0",
                      !day && "bg-surface/20",
                    )}
                  >
                    {day && (
                      <>
                        <div className={cn(
                          "mb-1 text-[11px] font-medium",
                          isToday ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground" : "text-muted-foreground",
                        )}>
                          {day}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          {events.slice(0, 3).map((e) => (
                            <div key={e.id} className="flex items-center gap-1 truncate rounded bg-surface px-1 py-0.5 text-[10px]">
                              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", typeColor[e.type])} />
                              <span className="truncate">{e.title}</span>
                            </div>
                          ))}
                          {events.length > 3 && (
                            <div className="text-[10px] text-muted-foreground">+{events.length - 3}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold tracking-tight">Próximos eventos</h3>
            <div className="flex flex-col gap-2">
              {agendaEvents
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 8)
                .map((e) => (
                  <div key={e.id} className="flex items-start gap-2.5 rounded-md border bg-surface/40 p-2.5">
                    <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", typeColor[e.type])} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium">{e.title}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                        {" · "}
                        <span className="font-mono">{e.time}</span>
                        {" · "}
                        {typeLabel[e.type]}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
