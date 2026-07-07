import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus, Filter, Search, MoreHorizontal, Phone, Instagram, Globe, MapPin, X, Clock, Building2, Flame, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { stageOrder, stageLabels, formatBRL, type Lead, type LeadStage, type LeadPotential } from "@/lib/mock-data";
import { useDataStore } from "@/lib/data-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/comercial")({
  head: () => ({
    meta: [
      { title: "CRM · Veloce" },
      { name: "description", content: "Pipeline comercial com Kanban drag-and-drop e fechamento automático." },
    ],
  }),
  component: Comercial,
});

const stageColors: Record<LeadStage, string> = {
  novo: "bg-info",
  contato: "bg-info",
  diagnostico: "bg-primary",
  reuniao: "bg-primary",
  proposta: "bg-warning",
  negociacao: "bg-warning",
  fechado: "bg-success",
  perdido: "bg-muted-foreground",
};

const stageBorderColors: Record<LeadStage, string> = {
  novo: "border-l-info",
  contato: "border-l-info",
  diagnostico: "border-l-primary",
  reuniao: "border-l-primary",
  proposta: "border-l-warning",
  negociacao: "border-l-warning",
  fechado: "border-l-success",
  perdido: "border-l-muted-foreground",
};

const potencialStyles: Record<LeadPotential, { label: string; chip: string; dot: string }> = {
  alto: { label: "Alto", chip: "bg-primary/15 text-primary border-primary/30", dot: "bg-primary" },
  medio: { label: "Médio", chip: "bg-info/15 text-info border-info/30", dot: "bg-info" },
  baixo: { label: "Baixo", chip: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

function LeadCard({ lead, onClick, justMoved }: { lead: Lead; onClick: () => void; justMoved: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 40 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (isDragging) return;
        // Só abrir detalhe em clique simples, não em drag
        if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
        onClick();
      }}
      className={cn(
        "group w-full cursor-grab rounded-md border border-l-4 bg-card p-2.5 text-left transition-all hover:border-primary/50 hover:shadow-elegant active:cursor-grabbing",
        stageBorderColors[lead.stage],
        isDragging && "opacity-40",
        justMoved && "ring-2 ring-primary/50",
      )}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium">{lead.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{lead.company}</div>
        </div>
        <MoreHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <div className="mb-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <MapPin className="h-2.5 w-2.5" />
        <span className="truncate">{lead.city}</span>
        <span>·</span>
        <span className="truncate">{lead.origin}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[12px] font-semibold text-primary">{formatBRL(lead.value)}</span>
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
              potencialStyles[lead.potencial].chip,
            )}
          >
            <span className={cn("h-1 w-1 rounded-full", potencialStyles[lead.potencial].dot)} />
            {potencialStyles[lead.potencial].label}
          </span>
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/40 text-[9px] font-semibold text-primary-foreground">
            {lead.owner.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
        </div>
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  leads,
  onCardClick,
  justMovedId,
  onAdd,
}: {
  stage: LeadStage;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  justMovedId: string | null;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${stage}` });
  const stageValue = leads.reduce((s, l) => s + l.value, 0);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-lg border bg-surface/40 transition-colors",
        isOver && "border-primary/60 bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", stageColors[stage])} />
          <span className="truncate text-[12px] font-semibold uppercase tracking-wider">{stageLabels[stage]}</span>
          <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{leads.length}</span>
        </div>
      </div>
      <div className="border-b px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
        {formatBRL(stageValue)}
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            justMoved={justMovedId === lead.id}
            onClick={() => onCardClick(lead)}
          />
        ))}
        <button
          data-no-drag
          onClick={onAdd}
          className="flex items-center justify-center gap-1 rounded-md border border-dashed py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Plus className="h-3 w-3" /> Adicionar lead
        </button>
      </div>
    </div>
  );
}

function LeadDetailPanel({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l bg-card shadow-elegant">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/40 text-sm font-semibold text-primary-foreground">
              {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold">{lead.name}</div>
              <div className="truncate text-xs text-muted-foreground">{lead.company}</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium bg-opacity-15 text-foreground", stageColors[lead.stage])}>
              <span className={cn("h-1.5 w-1.5 rounded-full", stageColors[lead.stage])} />
              {stageLabels[lead.stage]}
            </span>
            <span className="rounded-md bg-accent px-2 py-1 text-[11px] text-muted-foreground">{lead.origin}</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium",
                potencialStyles[lead.potencial].chip,
              )}
            >
              <Flame className="h-3 w-3" /> Potencial {potencialStyles[lead.potencial].label}
            </span>
          </div>

          <div className="mt-4 rounded-lg border bg-surface p-3">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Valor da oportunidade</div>
            <div className="font-mono text-2xl font-semibold text-primary">{formatBRL(lead.value)}</div>
          </div>

          <div className="mt-4 space-y-2 text-[13px]">
            <InfoRow icon={Phone} label="Telefone" value={lead.phone} />
            <InfoRow icon={Instagram} label="Instagram" value={lead.instagram} />
            <InfoRow icon={Globe} label="Site" value={lead.site} />
            <InfoRow icon={MapPin} label="Cidade" value={lead.city} />
            <InfoRow icon={Building2} label="Responsável" value={lead.owner} />
            <InfoRow icon={Clock} label="Criado em" value={new Date(lead.createdAt).toLocaleDateString("pt-BR")} />
          </div>
        </div>

        <div className="border-t p-3">
          <div className="flex gap-2">
            <button className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              Registrar contato
            </button>
            <button className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-accent">Editar</button>
          </div>
        </div>
      </aside>
    </>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate">{value}</div>
      </div>
    </div>
  );
}

function VendaConfirmDialog({
  lead,
  onConfirm,
  onCancel,
}: {
  lead: Lead;
  onConfirm: (servicos: string[]) => void;
  onCancel: () => void;
}) {
  const [servicos, setServicos] = useState<string[]>(["Gestão de Tráfego"]);
  const toggle = (s: string) =>
    setServicos((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border bg-card shadow-elegant">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <h3 className="text-sm font-semibold tracking-tight">Fechar venda — {lead.company}</h3>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Cliente, projeto, checklist e cobrança serão criados automaticamente a partir dos templates.
          </p>
        </div>
        <div className="space-y-3 p-4">
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Valor da venda
            </div>
            <div className="font-mono text-2xl font-semibold text-primary">{formatBRL(lead.value)}</div>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Serviços vendidos
            </div>
            <div className="grid grid-cols-2 gap-1.5 rounded-md border bg-surface/40 p-2 text-[12px]">
              {["Gestão de Tráfego", "Landing Page", "Site Institucional", "Consultoria Estratégica"].map((s) => (
                <label key={s} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={servicos.includes(s)}
                    onChange={() => toggle(s)}
                    className="h-3 w-3 accent-primary"
                  />
                  {s}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t bg-surface/40 px-4 py-3">
          <button onClick={onCancel} className="rounded-md border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(servicos)}
            disabled={servicos.length === 0}
            className="rounded-md bg-success px-3 py-1.5 text-xs font-medium text-success-foreground hover:opacity-90 disabled:opacity-50"
          >
            Confirmar fechamento
          </button>
        </div>
      </div>
    </>
  );
}

function Comercial() {
  const { leads, updateLeadStage } = useDataStore();
  const [selected, setSelected] = useState<Lead | null>(null);
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [potFilter, setPotFilter] = useState<Set<LeadPotential>>(new Set());
  const [ownerFilter, setOwnerFilter] = useState<string>("");
  const [justMovedId, setJustMovedId] = useState<string | null>(null);
  const [pendingWin, setPendingWin] = useState<Lead | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const openNewLead = () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  };

  const owners = useMemo(() => Array.from(new Set(leads.map((l) => l.owner))), [leads]);
  const filteredLeads = useMemo(
    () =>
      leads.filter((l) => {
        const q = query.toLowerCase().trim();
        if (q && !l.name.toLowerCase().includes(q) && !l.company.toLowerCase().includes(q)) return false;
        if (potFilter.size > 0 && !potFilter.has(l.potencial)) return false;
        if (ownerFilter && l.owner !== ownerFilter) return false;
        return true;
      }),
    [leads, query, potFilter, ownerFilter],
  );

  const totalPipeline = filteredLeads
    .filter((l) => !["fechado", "perdido"].includes(l.stage))
    .reduce((s, l) => s + l.value, 0);

  const togglePot = (p: LeadPotential) => {
    setPotFilter((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const leadId = String(e.active.id);
    const overId = e.over?.id;
    if (!overId) return;
    const targetStage = String(overId).replace("col-", "") as LeadStage;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === targetStage) return;

    if (targetStage === "fechado") {
      setPendingWin(lead);
      return;
    }
    updateLeadStage(leadId, targetStage);
    setJustMovedId(leadId);
    setTimeout(() => setJustMovedId(null), 1500);
  };

  const confirmarVenda = (servicos: string[]) => {
    if (!pendingWin) return;
    updateLeadStage(pendingWin.id, "fechado");
    setJustMovedId(pendingWin.id);
    setToast(`Venda fechada — cliente, ${servicos.length} projeto(s), checklist e cobrança criados.`);
    setPendingWin(null);
    setTimeout(() => setJustMovedId(null), 1500);
    setTimeout(() => setToast(null), 4200);
  };

  return (
    <AppShell title="CRM" subtitle="Pipeline comercial">
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 md:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">Pipeline</h2>
            <p className="text-xs text-muted-foreground">
              {filteredLeads.length} de {leads.length} leads · <span className="text-primary font-mono">{formatBRL(totalPipeline)}</span> em aberto · <span className="text-muted-foreground">arraste para mover</span>
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar leads…"
                className="h-8 w-52 rounded-md border bg-surface pl-7 pr-2 text-xs focus:border-primary/60 focus:outline-none"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium hover:bg-accent",
                  (potFilter.size > 0 || ownerFilter) ? "border-primary/50 bg-primary/10 text-primary" : "bg-surface",
                )}
              >
                <Filter className="h-3.5 w-3.5" /> Filtrar
                {(potFilter.size + (ownerFilter ? 1 : 0)) > 0 && (
                  <span className="rounded bg-primary px-1 font-mono text-[10px] text-primary-foreground">
                    {potFilter.size + (ownerFilter ? 1 : 0)}
                  </span>
                )}
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setFilterOpen(false)} />
                  <div className="absolute right-0 top-9 z-40 w-64 rounded-lg border bg-popover p-3 shadow-elegant">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Potencial</div>
                    <div className="mb-3 flex flex-col gap-1">
                      {(["alto", "medio", "baixo"] as LeadPotential[]).map((p) => (
                        <label key={p} className="flex items-center gap-2 text-[12px] capitalize">
                          <input type="checkbox" checked={potFilter.has(p)} onChange={() => togglePot(p)} className="h-3 w-3" />
                          {potencialStyles[p].label}
                        </label>
                      ))}
                    </div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Responsável</div>
                    <select
                      value={ownerFilter}
                      onChange={(e) => setOwnerFilter(e.target.value)}
                      className="w-full rounded-md border bg-background px-2 py-1 text-[12px]"
                    >
                      <option value="">Todos</option>
                      {owners.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <button
                      onClick={() => { setPotFilter(new Set()); setOwnerFilter(""); }}
                      className="mt-3 w-full rounded-md border bg-surface py-1 text-[11px] text-muted-foreground hover:bg-accent"
                    >
                      Limpar filtros
                    </button>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={openNewLead}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3.5 w-3.5" /> Novo Lead
            </button>
          </div>
        </div>

        {/* Kanban */}
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex h-full min-w-max gap-3 p-4 md:p-6">
              {stageOrder.map((stage) => (
                <StageColumn
                  key={stage}
                  stage={stage}
                  leads={filteredLeads.filter((l) => l.stage === stage)}
                  onCardClick={setSelected}
                  justMovedId={justMovedId}
                  onAdd={openNewLead}
                />
              ))}
            </div>
          </div>
        </DndContext>

        <div className="border-t bg-surface/30 px-4 py-2 text-[10px] text-muted-foreground md:px-6">
          Dados mantidos durante a sessão. Persistência real será ativada com o banco de dados.
        </div>
      </div>

      {selected && <LeadDetailPanel lead={selected} onClose={() => setSelected(null)} />}
      {pendingWin && (
        <VendaConfirmDialog
          lead={pendingWin}
          onConfirm={confirmarVenda}
          onCancel={() => setPendingWin(null)}
        />
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-md border border-success/40 bg-success/10 px-4 py-2 text-[12px] font-medium text-success shadow-elegant">
          <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5" />
          {toast}
        </div>
      )}
    </AppShell>
  );
}
