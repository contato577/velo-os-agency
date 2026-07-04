import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Filter, Search, MoreHorizontal, Phone, Instagram, Globe, MapPin, X, Clock, Building2, Flame } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { leads, stageOrder, stageLabels, formatBRL, type Lead, type LeadStage, type LeadPotential } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/comercial")({
  head: () => ({
    meta: [
      { title: "CRM · Veloce" },
      { name: "description", content: "Pipeline comercial completo com priorização inteligente de leads." },
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

const potencialStyles: Record<LeadPotential, { label: string; chip: string; dot: string }> = {
  alto: { label: "Alto", chip: "bg-primary/15 text-primary border-primary/30", dot: "bg-primary" },
  medio: { label: "Médio", chip: "bg-info/15 text-info border-info/30", dot: "bg-info" },
  baixo: { label: "Baixo", chip: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
};

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group w-full rounded-md border bg-card p-2.5 text-left transition-all hover:border-primary/50 hover:shadow-elegant"
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
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/40 text-[9px] font-semibold text-primary-foreground">
          {lead.owner.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
      </div>
      {lead.tags && lead.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.tags.map((t) => (
            <span key={t} className="rounded bg-accent px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      )}
    </button>
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
            <span className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium", stageColors[lead.stage], "bg-opacity-15 text-foreground")}>
              <span className={cn("h-1.5 w-1.5 rounded-full", stageColors[lead.stage])} />
              {stageLabels[lead.stage]}
            </span>
            <span className="rounded-md bg-accent px-2 py-1 text-[11px] text-muted-foreground">{lead.origin}</span>
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

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Timeline</h4>
            </div>
            <div className="space-y-3">
              {[
                { time: "há 2h", user: lead.owner, text: "Follow-up agendado para amanhã 14h" },
                { time: "há 1d", user: "Sistema", text: `Card movido para ${stageLabels[lead.stage]}` },
                { time: "há 2d", user: lead.owner, text: "Primeiro contato realizado via WhatsApp" },
                { time: "há 3d", user: "Sistema", text: `Lead criado via ${lead.origin}` },
              ].map((e, i) => (
                <div key={i} className="flex gap-3">
                  <div className="relative flex flex-col items-center">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                    {i < 3 && <div className="w-px flex-1 bg-border" />}
                  </div>
                  <div className="flex-1 pb-3">
                    <div className="text-[12px]">{e.text}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{e.user} · {e.time}</div>
                  </div>
                </div>
              ))}
            </div>
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

function Comercial() {
  const [selected, setSelected] = useState<Lead | null>(null);
  const totalPipeline = leads
    .filter((l) => !["fechado", "perdido"].includes(l.stage))
    .reduce((s, l) => s + l.value, 0);

  return (
    <AppShell title="Comercial" subtitle="Pipeline de vendas">
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 md:px-6">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">Pipeline</h2>
            <p className="text-xs text-muted-foreground">
              {leads.length} leads · <span className="text-primary font-mono">{formatBRL(totalPipeline)}</span> em aberto
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input placeholder="Filtrar leads…" className="h-8 w-52 rounded-md border bg-surface pl-7 pr-2 text-xs focus:border-primary/60 focus:outline-none" />
            </div>
            <button className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-surface px-2.5 text-xs font-medium hover:bg-accent">
              <Filter className="h-3.5 w-3.5" /> Filtrar
            </button>
            <button className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5" /> Novo Lead
            </button>
          </div>
        </div>

        {/* Kanban */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full min-w-max gap-3 p-4 md:p-6">
            {stageOrder.map((stage) => {
              const stageLeads = leads.filter((l) => l.stage === stage);
              const stageValue = stageLeads.reduce((s, l) => s + l.value, 0);
              return (
                <div key={stage} className="flex h-full w-72 shrink-0 flex-col rounded-lg border bg-surface/40">
                  <div className="flex items-center justify-between border-b px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", stageColors[stage])} />
                      <span className="truncate text-[12px] font-semibold uppercase tracking-wider">{stageLabels[stage]}</span>
                      <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{stageLeads.length}</span>
                    </div>
                    <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="border-b px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                    {formatBRL(stageValue)}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                    {stageLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} onClick={() => setSelected(lead)} />
                    ))}
                    <button className="flex items-center justify-center gap-1 rounded-md border border-dashed py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">
                      <Plus className="h-3 w-3" /> Adicionar lead
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selected && <LeadDetailPanel lead={selected} onClose={() => setSelected(null)} />}
    </AppShell>
  );
}
