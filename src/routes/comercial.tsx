import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Plus,
  Filter,
  Search,
  MoreHorizontal,
  Phone,
  Instagram,
  Globe,
  MapPin,
  X,
  Clock,
  Building2,
  Flame,
  CheckCircle2,
  Trash2,
  XCircle,
  Tag,
  Pencil,
  Check,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import {
  stageOrder,
  stageLabels,
  formatBRL,
  type Lead,
  type LeadStage,
  type LeadPotential,
  type Client,
} from "@/lib/mock-data";
import { useDataStore } from "@/lib/data-store";
import { playSuccess } from "@/lib/sound";
import { useQuickActions, NewTaskButton } from "@/components/quick-actions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/comercial")({
  head: () => ({
    meta: [
      { title: "CRM · Veloce" },
      {
        name: "description",
        content: "Pipeline comercial com Kanban drag-and-drop e fechamento automático.",
      },
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
  alto: {
    label: "Alto",
    chip: "bg-brand-deep/15 text-brand-deep border-brand-deep/30",
    dot: "bg-brand-deep",
  },
  medio: { label: "Médio", chip: "bg-info/15 text-info border-info/30", dot: "bg-info" },
  baixo: {
    label: "Baixo",
    chip: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
};

function LeadCard({
  lead,
  onClick,
  onDelete,
  justMoved,
  isOverlay = false,
}: {
  lead: Lead;
  onClick: () => void;
  onDelete: () => void;
  justMoved: boolean;
  isOverlay?: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    disabled: isOverlay,
  });

  const style =
    transform && !isOverlay
      ? {
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
          zIndex: 40,
          touchAction: "none" as const,
        }
      : ({ touchAction: "none" as const } satisfies React.CSSProperties);

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={style}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      onClick={(e) => {
        if (isDragging || isOverlay) return;
        // Só abrir detalhe em clique simples, não em drag
        if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
        onClick();
      }}
      className={cn(
        "group card-trello relative w-full cursor-grab border-l-4 p-3 text-left transition-all duration-200 active:cursor-grabbing",
        stageBorderColors[lead.stage],
        isDragging && !isOverlay && "opacity-30 border-dashed bg-accent/40 scale-[0.98]",
        isOverlay &&
          "shadow-2xl ring-2 ring-primary/60 scale-[1.03] opacity-95 bg-card z-50 cursor-grabbing",
        justMoved &&
          !isOverlay &&
          "animate-in fade-in zoom-in-95 ring-2 ring-primary/70 duration-300 shadow-md",
      )}
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium">{lead.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{lead.company}</div>
        </div>
        {!isOverlay && (
          <div data-no-drag className="relative shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete((v) => !v);
              }}
              className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
            {confirmDelete && (
              <div
                data-no-drag
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-6 z-10 w-40 rounded-md border bg-popover p-1 shadow-elegant"
              >
                <button
                  onClick={() => {
                    onDelete();
                    setConfirmDelete(false);
                  }}
                  className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-[12px] text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" /> Excluir lead
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex w-full items-center rounded px-2 py-1.5 text-left text-[12px] text-muted-foreground hover:bg-accent"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mb-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <MapPin className="h-2.5 w-2.5" />
        <span className="truncate">{lead.city}</span>
        <span>·</span>
        <span className="truncate">{lead.origin}</span>
      </div>

      {lead.tags && lead.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {lead.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
            >
              <Tag className="h-2 w-2" />
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
        <span className="font-mono text-sm font-bold text-primary">{formatBRL(lead.value)}</span>
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
            {lead.owner
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
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
  onDelete,
  justMovedId,
  onAdd,
}: {
  stage: LeadStage;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  onDelete: (leadId: string) => void;
  justMovedId: string | null;
  onAdd: (stage: LeadStage) => void;
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
          <span className="truncate text-[12px] font-semibold uppercase tracking-wider">
            {stageLabels[stage]}
          </span>
          <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {leads.length}
          </span>
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
            onDelete={() => onDelete(lead.id)}
          />
        ))}
        <button
          data-no-drag
          onClick={() => onAdd(stage)}
          className="flex items-center justify-center gap-1 rounded-md border border-dashed py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Plus className="h-3 w-3" /> Adicionar lead
        </button>
      </div>
    </div>
  );
}

function LeadDetailPanel({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { updateLeadValue } = useDataStore();
  const [editandoValor, setEditandoValor] = useState(false);
  const [valorInput, setValorInput] = useState(String(lead.value || ""));

  const salvarValor = () => {
    const num = Number(valorInput.replace(/\./g, "").replace(",", "."));
    if (!Number.isNaN(num) && num >= 0) {
      updateLeadValue(lead.id, num);
    }
    setEditandoValor(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l bg-card shadow-elegant">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/40 text-sm font-semibold text-primary-foreground">
              {lead.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold">{lead.name}</div>
              <div className="truncate text-xs text-muted-foreground">{lead.company}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium bg-opacity-15 text-foreground",
                stageColors[lead.stage],
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", stageColors[lead.stage])} />
              {stageLabels[lead.stage]}
            </span>
            <span className="rounded-md bg-accent px-2 py-1 text-[11px] text-muted-foreground">
              {lead.origin}
            </span>
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
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Valor da oportunidade
              </div>
              {!editandoValor && (
                <button
                  onClick={() => {
                    setValorInput(String(lead.value || ""));
                    setEditandoValor(true);
                  }}
                  className="text-muted-foreground hover:text-primary"
                  title="Editar valor"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {editandoValor ? (
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-lg text-muted-foreground">R$</span>
                <input
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  value={valorInput}
                  onChange={(e) => setValorInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && salvarValor()}
                  className="w-full rounded-md border bg-background px-2 py-1 font-mono text-xl font-semibold focus:border-primary/60 focus:outline-none"
                />
                <button
                  onClick={salvarValor}
                  className="rounded-md bg-primary p-1.5 text-primary-foreground hover:bg-primary/90"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditandoValor(false)}
                  className="rounded-md border p-1.5 hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="font-mono text-2xl font-semibold text-primary">
                {formatBRL(lead.value)}
              </div>
            )}
          </div>

          {lead.stage === "perdido" && lead.motivoPerda && (
            <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-destructive">
                <XCircle className="h-3 w-3" /> Motivo da perda
              </div>
              <div className="text-[12px] text-foreground">{lead.motivoPerda}</div>
            </div>
          )}

          {lead.tags && lead.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {lead.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-2 text-[13px]">
            <InfoRow icon={Phone} label="Telefone" value={lead.phone} />
            <InfoRow icon={Instagram} label="Instagram" value={lead.instagram} />
            <InfoRow icon={Globe} label="Site" value={lead.site} />
            <InfoRow icon={MapPin} label="Cidade" value={lead.city} />
            <InfoRow icon={Building2} label="Responsável" value={lead.owner} />
            <InfoRow
              icon={Clock}
              label="Criado em"
              value={new Date(lead.createdAt).toLocaleDateString("pt-BR")}
            />
          </div>
        </div>

        <div className="border-t p-3">
          <div className="flex gap-2">
            <NewTaskButton
              defaultContext={{
                type: "lead",
                id: lead.id,
                label: `${lead.name} (${lead.company})`,
              }}
              label="+ Nova tarefa"
              className="flex-1 justify-center"
            />
          </div>
        </div>
      </aside>
    </>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
}) {
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

const PLANOS_FIXOS = [
  { label: "Plano Essencial", value: 400, desc: "Essencial para começar" },
  { label: "Plano Crescimento", value: 890, desc: "Crescimento contínuo" },
  { label: "Plano Performance", value: 1399, desc: "Performance máxima" },
];

function VendaConfirmDialog({
  lead,
  onConfirm,
  onCancel,
}: {
  lead: Lead;
  onConfirm: (servicos: string[], plano: string, valor: number, contratoMeses: number) => void;
  onCancel: () => void;
}) {
  const [servicos, setServicos] = useState<string[]>(["Gestão de Tráfego"]);
  const [plano, setPlano] = useState<string>("Plano Crescimento");
  const [valor, setValor] = useState<number>(lead.value > 0 ? lead.value : 890);
  const [contratoMeses, setContratoMeses] = useState<number>(12);

  const toggle = (s: string) =>
    setServicos((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const selectPlano = (p: (typeof PLANOS_FIXOS)[number]) => {
    setPlano(p.label);
    setValor(p.value);
  };

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
            Cliente, projeto, checklist e cobrança serão criados automaticamente a partir dos
            templates.
          </p>
        </div>
        <div className="space-y-3.5 p-4 max-h-[75vh] overflow-y-auto">
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Selecione o Plano de Venda
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PLANOS_FIXOS.map((p) => {
                const isSelected = plano === p.label;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => selectPlano(p)}
                    className={cn(
                      "flex flex-col items-start justify-between rounded-lg border p-2.5 text-left transition-all",
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                        : "border-border bg-surface/40 hover:border-primary/30",
                    )}
                  >
                    <span className="text-[11px] font-semibold leading-tight">{p.label}</span>
                    <span className="mt-1.5 font-mono text-xs font-bold text-primary">
                      {formatBRL(p.value)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Valor da venda (R$)
            </div>
            <input
              type="number"
              value={valor}
              onChange={(e) => setValor(Number(e.target.value) || 0)}
              className="w-full rounded-md border bg-background px-3 py-1.5 font-mono text-lg font-semibold text-primary focus:border-primary/60 focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Duração do contrato (meses)
            </div>
            <input
              type="number"
              min={1}
              max={120}
              value={contratoMeses}
              onChange={(e) => setContratoMeses(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-md border bg-background px-3 py-1.5 font-mono text-sm focus:border-primary/60 focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Renovação prevista para{" "}
              {new Date(
                new Date().setMonth(new Date().getMonth() + contratoMeses),
              ).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Serviços vendidos
            </div>
            <div className="grid grid-cols-2 gap-1.5 rounded-md border bg-surface/40 p-2 text-[12px]">
              {[
                "Gestão de Tráfego",
                "Landing Page",
                "Site Institucional",
                "Consultoria Estratégica",
              ].map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer">
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
          <button
            onClick={onCancel}
            className="rounded-md border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(servicos, plano, valor, contratoMeses)}
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

const MOTIVOS_PERDA = [
  "Preço / sem orçamento",
  "Fechou com concorrente",
  "Timing errado",
  "Sumiu / parou de responder",
  "Não era o decisor",
  "Não viu valor na proposta",
  "Outro",
];

function MotivoPerdaDialog({
  lead,
  onConfirm,
  onCancel,
}: {
  lead: Lead;
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
}) {
  const [motivo, setMotivo] = useState<string>(MOTIVOS_PERDA[0]);
  const [detalhe, setDetalhe] = useState("");

  const motivoFinal = motivo === "Outro" ? detalhe.trim() : motivo;
  const podeConfirmar = motivoFinal.length > 0;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border bg-card shadow-elegant">
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold tracking-tight">
              Marcar como perdido — {lead.company}
            </h3>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Conta pra gente o motivo — isso ajuda a entender padrões de perda no funil.
          </p>
        </div>
        <div className="space-y-3.5 p-4">
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Motivo
            </div>
            <div className="flex flex-col gap-1.5">
              {MOTIVOS_PERDA.map((m) => (
                <label
                  key={m}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-[12px] transition-colors",
                    motivo === m
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface/40 hover:border-primary/30",
                  )}
                >
                  <input
                    type="radio"
                    name="motivo-perda"
                    checked={motivo === m}
                    onChange={() => setMotivo(m)}
                    className="h-3 w-3 accent-primary"
                  />
                  {m}
                </label>
              ))}
            </div>
          </div>

          {motivo === "Outro" && (
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Descreva o motivo
              </div>
              <textarea
                value={detalhe}
                onChange={(e) => setDetalhe(e.target.value)}
                rows={2}
                placeholder="Ex: cliente mudou de prioridade este trimestre"
                className="w-full resize-none rounded-md border bg-background px-3 py-1.5 text-[12px] focus:border-primary/60 focus:outline-none"
              />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t bg-surface/40 px-4 py-3">
          <button
            onClick={onCancel}
            className="rounded-md border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(motivoFinal)}
            disabled={!podeConfirmar}
            className="rounded-md bg-muted-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            Confirmar perda
          </button>
        </div>
      </div>
    </>
  );
}

function Comercial() {
  const { leads, updateLeadStage, deleteLead, criarClienteDeVenda } = useDataStore();
  const { openDialog } = useQuickActions();

  const [selected, setSelected] = useState<Lead | null>(null);
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [potFilter, setPotFilter] = useState<Set<LeadPotential>>(new Set());
  const [ownerFilter, setOwnerFilter] = useState<string>("");
  // Fechado/Perdido acumulam pra sempre se não filtrar por período — sem isso,
  // com a operação crescendo, essas 2 colunas ficariam enormes e difíceis de
  // usar no dia a dia. Não apaga nada, só limita o que aparece por padrão.
  const [periodoEncerrados, setPeriodoEncerrados] = useState<30 | 90 | "todos">(30);
  const [justMovedId, setJustMovedId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingWin, setPendingWin] = useState<Lead | null>(null);
  const [pendingLoss, setPendingLoss] = useState<Lead | null>(null);
  const [createdClient, setCreatedClient] = useState<Client | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const owners = useMemo(() => Array.from(new Set(leads.map((l) => l.owner))), [leads]);
  const filteredLeads = useMemo(
    () =>
      leads.filter((l) => {
        const q = query.toLowerCase().trim();
        if (q && !l.name.toLowerCase().includes(q) && !l.company.toLowerCase().includes(q))
          return false;
        if (potFilter.size > 0 && !potFilter.has(l.potencial)) return false;
        if (ownerFilter && l.owner !== ownerFilter) return false;
        return true;
      }),
    [leads, query, potFilter, ownerFilter],
  );

  const activeLead = useMemo(
    () => (activeId ? leads.find((l) => l.id === activeId) : null),
    [activeId, leads],
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

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const leadId = String(e.active.id);
    setActiveId(null);
    const overId = e.over?.id;
    if (!overId) return;
    const targetStage = String(overId).replace("col-", "") as LeadStage;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stage === targetStage) return;

    if (targetStage === "fechado") {
      setPendingWin(lead);
      return;
    }
    if (targetStage === "perdido") {
      setPendingLoss(lead);
      return;
    }
    updateLeadStage(leadId, targetStage);
    setJustMovedId(leadId);
    setTimeout(() => setJustMovedId(null), 1500);
  };

  const confirmarPerda = (motivo: string) => {
    if (!pendingLoss) return;
    updateLeadStage(pendingLoss.id, "perdido", motivo);
    setJustMovedId(pendingLoss.id);
    setPendingLoss(null);
    setTimeout(() => setJustMovedId(null), 1500);
  };

  const confirmarVenda = (
    servicos: string[],
    plano: string,
    valor: number,
    contratoMeses: number,
  ) => {
    if (!pendingWin) return;
    const updatedLead = { ...pendingWin, value: valor };

    // 1. Criar o cliente com prazo, datas, etapa, projetos, checklist, cobrança, timeline e plano
    const client = criarClienteDeVenda(updatedLead, servicos, plano, contratoMeses);
    playSuccess();

    // 2. Atualizar estágio do lead para fechado
    updateLeadStage(pendingWin.id, "fechado");
    setJustMovedId(pendingWin.id);

    // 3. Exibir notificação de sucesso com o link "Ver cliente →" apenas após a criação real
    setCreatedClient(client);
    setPendingWin(null);

    setTimeout(() => setJustMovedId(null), 1500);
  };

  return (
    <AppShell title="CRM" subtitle="Pipeline comercial">
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3 md:px-6">
          <div className="hidden min-w-0 md:block">
            <p className="text-xs text-muted-foreground">
              {filteredLeads.length} de {leads.length} leads ·{" "}
              <span className="font-mono text-primary">{formatBRL(totalPipeline)}</span> em aberto
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrar leads…"
                className="h-8 w-44 rounded-md border bg-surface pl-7 pr-2 text-xs focus:border-primary/60 focus:outline-none md:w-52"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium hover:bg-accent",
                  potFilter.size > 0 || ownerFilter
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "bg-surface",
                )}
              >
                <Filter className="h-3.5 w-3.5" /> Filtrar
                {potFilter.size + (ownerFilter ? 1 : 0) > 0 && (
                  <span className="rounded bg-primary px-1 font-mono text-[10px] text-primary-foreground">
                    {potFilter.size + (ownerFilter ? 1 : 0)}
                  </span>
                )}
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setFilterOpen(false)} />
                  <div className="absolute right-0 top-9 z-40 w-64 rounded-lg border bg-popover p-3 shadow-elegant">
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Potencial
                    </div>
                    <div className="mb-3 flex flex-col gap-1">
                      {(["alto", "medio", "baixo"] as LeadPotential[]).map((p) => (
                        <label key={p} className="flex items-center gap-2 text-[12px] capitalize">
                          <input
                            type="checkbox"
                            checked={potFilter.has(p)}
                            onChange={() => togglePot(p)}
                            className="h-3 w-3"
                          />
                          {potencialStyles[p].label}
                        </label>
                      ))}
                    </div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Responsável
                    </div>
                    <select
                      value={ownerFilter}
                      onChange={(e) => setOwnerFilter(e.target.value)}
                      className="w-full rounded-md border bg-background px-2 py-1 text-[12px]"
                    >
                      <option value="">Todos</option>
                      {owners.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        setPotFilter(new Set());
                        setOwnerFilter("");
                      }}
                      className="mt-3 w-full rounded-md border bg-surface py-1 text-[11px] text-muted-foreground hover:bg-accent"
                    >
                      Limpar filtros
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content View */}

        <div className="flex items-center justify-between gap-2 border-t px-4 py-1.5 md:px-6">
          <span className="text-[10px] text-muted-foreground">
            Fechado/Perdido mostrando:{" "}
            <b className="text-foreground">
              {periodoEncerrados === "todos" ? "tudo" : `últimos ${periodoEncerrados} dias`}
            </b>
          </span>
          <div className="flex items-center gap-1">
            {([30, 90, "todos"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodoEncerrados(p)}
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                  periodoEncerrados === p
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                {p === "todos" ? "Tudo" : `${p}d`}
              </button>
            ))}
          </div>
        </div>

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex h-full min-w-max gap-3 p-4 md:p-6">
              {stageOrder.map((stage) => {
                let stageLeads = filteredLeads.filter((l) => l.stage === stage);
                if ((stage === "fechado" || stage === "perdido") && periodoEncerrados !== "todos") {
                  const limite = Date.now() - periodoEncerrados * 24 * 60 * 60 * 1000;
                  stageLeads = stageLeads.filter(
                    (l) => new Date(l.lastActivity).getTime() >= limite,
                  );
                }
                return (
                  <StageColumn
                    key={stage}
                    stage={stage}
                    leads={stageLeads}
                    onCardClick={setSelected}
                    onDelete={deleteLead}
                    justMovedId={justMovedId}
                    onAdd={(s) => openDialog("lead", s)}
                  />
                );
              })}
            </div>
          </div>
          <DragOverlay
            dropAnimation={{ duration: 200, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}
          >
            {activeLead ? (
              <LeadCard
                lead={activeLead}
                onClick={() => {}}
                onDelete={() => {}}
                justMoved={false}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {selected && <LeadDetailPanel lead={selected} onClose={() => setSelected(null)} />}
      {pendingWin && (
        <VendaConfirmDialog
          lead={pendingWin}
          onConfirm={confirmarVenda}
          onCancel={() => setPendingWin(null)}
        />
      )}
      {pendingLoss && (
        <MotivoPerdaDialog
          lead={pendingLoss}
          onConfirm={confirmarPerda}
          onCancel={() => setPendingLoss(null)}
        />
      )}
      {createdClient && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-success/40 bg-card p-3 shadow-elegant">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
          <div className="text-[12px]">
            <span className="font-semibold text-foreground">Venda fechada com sucesso!</span>
            <span className="ml-1.5 text-muted-foreground">
              Cliente <strong>{createdClient.company}</strong> criado.
            </span>
          </div>
          <Link
            to="/clientes/$clientId"
            params={{ clientId: createdClient.id }}
            className="ml-2 inline-flex shrink-0 items-center gap-1 rounded bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ver cliente →
          </Link>
          <button
            onClick={() => setCreatedClient(null)}
            className="ml-1 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </AppShell>
  );
}
