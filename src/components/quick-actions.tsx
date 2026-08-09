import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import {
  Plus,
  UserPlus,
  Building2,
  Receipt,
  CheckSquare,
  Search,
  Command as CommandIcon,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { owners } from "@/lib/mock-data";
import type { LeadStage, LeadPotential, Task } from "@/lib/mock-data";
import { useDataStore } from "@/lib/data-store";

export type QuickKind = "lead" | "despesa" | "tarefa";


// ─── Context ─────────────────────────────────────────────────────────────────

interface QuickActionsContextValue {
  openDialog: (kind: QuickKind, defaultStage?: LeadStage) => void;
}

const QuickActionsContext = createContext<QuickActionsContextValue | null>(null);

export function useQuickActions() {
  const ctx = useContext(QuickActionsContext);
  if (!ctx) throw new Error("useQuickActions must be used within QuickActions");
  return ctx;
}

// ─── Items ───────────────────────────────────────────────────────────────────

const items: {
  key: QuickKind;
  label: string;
  icon: typeof UserPlus;
  hint: string;
  shortcut: string;
}[] = [
    { key: "lead", label: "Novo Lead", icon: UserPlus, hint: "Adicionar oportunidade ao CRM", shortcut: "L" },
    { key: "tarefa", label: "Nova Tarefa", icon: CheckSquare, hint: "Criar tarefa rápida", shortcut: "T" },
    { key: "despesa", label: "Nova Despesa", icon: Receipt, hint: "Lançar despesa no financeiro", shortcut: "D" },
  ];

// ─── Main Component ──────────────────────────────────────────────────────────

export function QuickActionsProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<{ kind: QuickKind; defaultStage?: LeadStage } | null>(null);

  const open = (kind: QuickKind, defaultStage?: LeadStage) => {
    setDialog({ kind, defaultStage });
  };

  const contextValue: QuickActionsContextValue = { openDialog: open };

  return (
    <QuickActionsContext.Provider value={contextValue}>
      {children}
      {dialog &&
        createPortal(
          <QuickDialog
            kind={dialog.kind}
            defaultStage={dialog.defaultStage}
            onClose={() => setDialog(null)}
          />,
          document.body,
        )}
    </QuickActionsContext.Provider>
  );
}

export function QuickActionsButton() {
  const { openDialog } = useQuickActions();
  const [openMenu, setOpenMenu] = useState(false);
  const [openCmd, setOpenCmd] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenCmd((v) => !v);
      }
      if (e.key === "Escape") {
        setOpenCmd(false);
        setOpenMenu(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleMenuToggle = () => {
    if (!openMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpenMenu((v) => !v);
  };

  const open = (kind: QuickKind, defaultStage?: LeadStage) => {
    openDialog(kind, defaultStage);
    setOpenMenu(false);
    setOpenCmd(false);
  };

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleMenuToggle}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Novo
          <kbd className="ml-1 hidden items-center gap-0.5 rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1 py-0.5 font-mono text-[9px] md:inline-flex">
            <CommandIcon className="h-2 w-2" />K
          </kbd>
        </button>
      </div>

      {/* Dropdown menu — portal to body */}
      {openMenu &&
        createPortal(
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(false)} />
            <div
              className="fixed z-50 w-72 overflow-hidden rounded-lg border bg-popover shadow-elegant"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <div className="border-b bg-surface/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Criar rapidamente
              </div>
              <div className="p-1">
                {items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.key}
                      onClick={() => open(it.key)}
                      className="flex w-full items-center gap-2.5 rounded-md p-2 text-left text-[13px] transition-colors hover:bg-accent"
                    >
                      <div
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md",
                          "bg-primary/10 text-primary",
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{it.label}</div>
                        <div className="text-[10px] text-muted-foreground">{it.hint}</div>
                      </div>
                      <kbd className="rounded border bg-surface px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
                        {it.shortcut}
                      </kbd>
                    </button>
                  );
                })}
              </div>
            </div>
          </>,
          document.body,
        )}

      {/* Command Palette — portal to body */}
      {openCmd &&
        createPortal(
          <CommandPalette onClose={() => setOpenCmd(false)} />,
          document.body,
        )}
    </>
  );
}

// ─── Command Palette (⌘K) ───────────────────────────────────────────────

function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { leads, clients } = useDataStore();
  const [query, setQuery] = useState("");

  const nav = [
    { label: "Comercial", to: "/" },
    { label: "CRM", to: "/comercial" },
    { label: "Clientes", to: "/clientes" },
    { label: "Operação", to: "/operacao" },
    { label: "DRE Inteligente", to: "/dre" },
    { label: "Central de IA", to: "/central-ia" },
    { label: "Configurações", to: "/configuracoes" },
  ];

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return { nav, leads: leads.slice(0, 4), clients: clients.slice(0, 4) };
    return {
      nav: nav.filter((n) => n.label.toLowerCase().includes(q)),
      leads: leads.filter((l) => l.name.toLowerCase().includes(q) || l.company.toLowerCase().includes(q)).slice(0, 5),
      clients: clients.filter((c) => c.company.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)).slice(0, 5),
    };
  }, [query, leads, clients]);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-24 z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-popover shadow-elegant">
        <div className="flex items-center gap-2 border-b px-3 py-2.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar clientes, leads ou digite um comando…"
            className="flex-1 bg-transparent text-[13px] placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="rounded border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-1">
          {results.nav.length === 0 && results.leads.length === 0 && results.clients.length === 0 && (
            <p className="px-3 py-6 text-center text-[12px] text-muted-foreground">Nada encontrado para "{query}".</p>
          )}

          {results.nav.length > 0 && (
            <Group title="Ir para">
              {results.nav.map((n) => (
                <Row
                  key={n.to}
                  onClick={() => {
                    navigate({ to: n.to });
                    onClose();
                  }}
                  icon={<ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  label={n.label}
                />
              ))}
            </Group>
          )}

          {results.leads.length > 0 && (
            <Group title="Leads">
              {results.leads.map((l) => (
                <Row
                  key={l.id}
                  onClick={() => {
                    navigate({ to: "/comercial" });
                    onClose();
                  }}
                  icon={<UserPlus className="h-3.5 w-3.5 text-info" />}
                  label={l.name}
                  hint={l.company}
                />
              ))}
            </Group>
          )}

          {results.clients.length > 0 && (
            <Group title="Clientes">
              {results.clients.map((c) => (
                <Row
                  key={c.id}
                  onClick={() => {
                    navigate({ to: "/clientes/$clientId", params: { clientId: c.id } });
                    onClose();
                  }}
                  icon={<Building2 className="h-3.5 w-3.5 text-primary" />}
                  label={c.company}
                  hint={c.plan}
                />
              ))}
            </Group>
          )}
        </div>
      </div>
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Row({
  onClick,
  icon,
  label,
  hint,
  shortcut,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  shortcut?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors hover:bg-accent"
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-surface">{icon}</div>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      {shortcut && (
        <kbd className="rounded border bg-surface px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
          {shortcut}
        </kbd>
      )}
    </button>
  );
}

// ─── Dialog rápido ─────────────────────────────────────────────────────

const kindMeta: Record<QuickKind, { title: string; desc: string }> = {
  lead: { title: "Novo Lead", desc: "Adicionar oportunidade ao CRM" },
  despesa: { title: "Nova Despesa", desc: "Lançar despesa no financeiro (entra no DRE)" },
  tarefa: { title: "Nova Tarefa", desc: "Adicionar item à sua lista de execução" },
};

function QuickDialog({
  kind,
  onClose,
  defaultContext,
  defaultStage,
  defaultDate,
}: {
  kind: QuickKind;
  onClose: () => void;
  defaultContext?: TarefaDefaultContext;
  defaultStage?: LeadStage;
  defaultDate?: string;
}) {
  const { addLead, addTask, addExpense, clients: realClients } = useDataStore();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const meta = kindMeta[kind];

  const [leadData, setLeadData] = useState<LeadFormData>(emptyLeadForm);
  const [tarefaData, setTarefaData] = useState<TarefaFormData>({ ...emptyTarefaForm, dueDate: defaultDate ?? "" });
  const [despesaData, setDespesaData] = useState<DespesaFormData>(emptyDespesaForm);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    if (kind === "lead") {
      addLead({
        name: leadData.name,
        company: leadData.company,
        phone: leadData.phone,
        instagram: leadData.instagram || undefined,
        city: leadData.city,
        owner: leadData.owner,
        origin: leadData.origin,
        value: Number(leadData.value) || 0,
        potencial: leadData.potencial,
        stage: defaultStage ?? "novo",
      });
    } else if (kind === "tarefa") {
      addTask({
        title: tarefaData.title,
        description: tarefaData.description || undefined,
        owner: owners[0],
        priority: tarefaData.priority,
        status: "backlog",
        dueDate: tarefaData.dueDate,
        clientId: defaultContext?.type === "cliente" ? defaultContext.id : (!defaultContext ? tarefaData.clientId || undefined : undefined),
        projectId: defaultContext?.type === "projeto" ? defaultContext.id : undefined,
        leadId: defaultContext?.type === "lead" ? defaultContext.id : undefined,
      });
    } else if (kind === "despesa") {
      addExpense({
        date: despesaData.date,
        description: despesaData.description,
        category: despesaData.costCenter,
        costCenter: despesaData.costCenter,
        type: "saida",
        amount: Number(despesaData.amount) || 0,
        client: despesaData.fornecedor || undefined,
        recurring: despesaData.recurring,
      });
    }

    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(onClose, 900);
    }, 400);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border bg-card shadow-elegant">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">{meta.title}</h3>
            <p className="text-[11px] text-muted-foreground">{meta.desc}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {saved ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div className="text-sm font-semibold">Salvo com sucesso</div>
            <div className="text-[12px] text-muted-foreground">
              As automações vinculadas foram disparadas.
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
            {kind === "lead" && (
              <LeadForm data={leadData} onChange={setLeadData} defaultStage={defaultStage} />
            )}
            {kind === "despesa" && <DespesaForm data={despesaData} onChange={setDespesaData} />}
            {kind === "tarefa" && (
              <TarefaForm data={tarefaData} onChange={setTarefaData} defaultContext={defaultContext} clients={realClients} />
            )}

            <div className="flex items-center justify-end gap-2 border-t pt-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
              >
                {saving ? "Salvando…" : "Salvar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}

const cls = "w-full rounded-md border bg-background px-3 py-1.5 text-[13px] focus:border-primary/60 focus:outline-none";

function Row2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

import { stageLabels } from "@/lib/mock-data";

export interface LeadFormData {
  name: string;
  company: string;
  phone: string;
  instagram: string;
  city: string;
  owner: string;
  origin: "Instagram" | "Indicação" | "Google Ads" | "LinkedIn" | "Site" | "Outbound";
  value: string;
  potencial: LeadPotential;
}

export const emptyLeadForm: LeadFormData = {
  name: "",
  company: "",
  phone: "",
  instagram: "",
  city: "",
  owner: owners[0],
  origin: "Instagram",
  value: "",
  potencial: "medio",
};

function LeadForm({
  data,
  onChange,
  defaultStage,
}: {
  data: LeadFormData;
  onChange: (data: LeadFormData) => void;
  defaultStage?: LeadStage;
}) {
  const set = <K extends keyof LeadFormData>(key: K, value: LeadFormData[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <>
      <Row2>
        <F label="Nome">
          <input
            required
            placeholder="Marina Costa"
            className={cls}
            value={data.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </F>
        <F label="Empresa">
          <input
            placeholder="Studio Marina"
            className={cls}
            value={data.company}
            onChange={(e) => set("company", e.target.value)}
          />
        </F>
      </Row2>
      <Row2>
        <F label="Telefone">
          <input
            placeholder="(11) 9…"
            className={cls}
            value={data.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </F>
        <F label="Cidade">
          <input
            required
            placeholder="São Paulo"
            className={cls}
            value={data.city}
            onChange={(e) => set("city", e.target.value)}
          />
        </F>
      </Row2>
      <Row2>
        <F label="Instagram">
          <input
            placeholder="@…"
            className={cls}
            value={data.instagram}
            onChange={(e) => set("instagram", e.target.value)}
          />
        </F>
        <F label="Origem">
          <select
            className={cls}
            value={data.origin}
            onChange={(e) => set("origin", e.target.value as LeadFormData["origin"])}
          >
            <option>Instagram</option><option>Indicação</option><option>Google Ads</option>
            <option>LinkedIn</option><option>Site</option><option>Outbound</option>
          </select>
        </F>
      </Row2>
      <Row2>
        <F label="Valor estimado (R$)">
          <input
            type="number"
            min="0"
            placeholder="0"
            className={cls}
            value={data.value}
            onChange={(e) => set("value", e.target.value)}
          />
        </F>
        <F label="Potencial">
          <select
            className={cls}
            value={data.potencial}
            onChange={(e) => set("potencial", e.target.value as LeadPotential)}
          >
            <option value="alto">Alto</option>
            <option value="medio">Médio</option>
            <option value="baixo">Baixo</option>
          </select>
        </F>
      </Row2>
      <F label="Responsável">
        <select className={cls} value={data.owner} onChange={(e) => set("owner", e.target.value)}>
          {owners.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </F>
      {defaultStage && (
        <F label="Estágio inicial">
          <div className="flex items-center gap-2 rounded-md border bg-surface/60 px-3 py-1.5 text-[13px]">
            <span className="inline-flex h-5 items-center rounded-full bg-primary/10 px-2 text-[10px] font-medium uppercase tracking-widest text-primary">
              {stageLabels[defaultStage]}
            </span>
            <span className="text-[10px] text-muted-foreground">pré-selecionado</span>
          </div>
        </F>
      )}
    </>
  );
}

export interface DespesaFormData {
  description: string;
  costCenter: "Marketing" | "Ferramentas" | "Equipe" | "Impostos" | "Operacional" | "Administrativo" | "Investimentos";
  fornecedor: string;
  amount: string;
  date: string;
  recurring: boolean;
}

export const emptyDespesaForm: DespesaFormData = {
  description: "",
  costCenter: "Ferramentas",
  fornecedor: "",
  amount: "",
  date: "",
  recurring: false,
};

function DespesaForm({ data, onChange }: { data: DespesaFormData; onChange: (data: DespesaFormData) => void }) {
  const set = <K extends keyof DespesaFormData>(key: K, value: DespesaFormData[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <>
      <F label="Descrição">
        <input
          required
          placeholder="Ex: Meta Ads Manager"
          className={cls}
          value={data.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </F>
      <Row2>
        <F label="Categoria">
          <select
            className={cls}
            value={data.costCenter}
            onChange={(e) => set("costCenter", e.target.value as DespesaFormData["costCenter"])}
          >
            <option value="Ferramentas">Ferramentas</option>
            <option value="Marketing">Marketing</option>
            <option value="Equipe">Equipe</option>
            <option value="Impostos">Impostos</option>
            <option value="Operacional">Operacional</option>
            <option value="Administrativo">Administrativo</option>
            <option value="Investimentos">Investimentos</option>
          </select>
        </F>
        <F label="Fornecedor">
          <input
            placeholder="Nome"
            className={cls}
            value={data.fornecedor}
            onChange={(e) => set("fornecedor", e.target.value)}
          />
        </F>
      </Row2>
      <Row2>
        <F label="Valor (R$)">
          <input
            type="number"
            required
            className={cls}
            value={data.amount}
            onChange={(e) => set("amount", e.target.value)}
          />
        </F>
        <F label="Data">
          <input
            type="date"
            required
            className={cls}
            value={data.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </F>
      </Row2>
      <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 accent-primary"
          checked={data.recurring}
          onChange={(e) => set("recurring", e.target.checked)}
        />
        Despesa recorrente (mensal)
      </label>
    </>
  );
}

export type TarefaDefaultContext = { type: "cliente" | "projeto" | "lead"; id: string; label: string };

export interface TarefaFormData {
  title: string;
  dueDate: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  clientId: string;
  description: string;
}

export const emptyTarefaForm: TarefaFormData = {
  title: "",
  dueDate: "",
  priority: "media",
  clientId: "",
  description: "",
};

function TarefaForm({
  data,
  onChange,
  defaultContext,
  clients,
}: {
  data: TarefaFormData;
  onChange: (data: TarefaFormData) => void;
  defaultContext?: TarefaDefaultContext;
  clients: { id: string; company: string }[];
}) {
  const set = <K extends keyof TarefaFormData>(key: K, value: TarefaFormData[K]) =>
    onChange({ ...data, [key]: value });

  return (
    <>
      <F label="Título">
        <input
          required
          placeholder="Ex: Ligar para Marina"
          className={cls}
          value={data.title}
          onChange={(e) => set("title", e.target.value)}
        />
      </F>
      <Row2>
        <F label="Prazo">
          <input
            type="date"
            required
            className={cls}
            value={data.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
          />
        </F>
        <F label="Prioridade">
          <select
            className={cls}
            value={data.priority}
            onChange={(e) => set("priority", e.target.value as TarefaFormData["priority"])}
          >
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
        </F>
      </Row2>
      {defaultContext ? (
        <F label={`Vinculado a ${defaultContext.type}`}>
          <div className="flex items-center gap-2 rounded-md border bg-surface/60 px-3 py-1.5 text-[13px]">
            <span className="inline-flex h-5 items-center rounded-full bg-primary/10 px-2 text-[10px] font-medium uppercase tracking-widest text-primary">
              {defaultContext.type}
            </span>
            <span className="min-w-0 flex-1 truncate">{defaultContext.label}</span>
            <span className="text-[10px] text-muted-foreground">travado</span>
          </div>
        </F>
      ) : (
        <F label="Cliente">
          <select className={cls} value={data.clientId} onChange={(e) => set("clientId", e.target.value)}>
            <option value="">Geral (sem cliente)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company}
              </option>
            ))}
          </select>
        </F>
      )}
      <F label="Observações">
        <textarea
          rows={2}
          className={cls}
          value={data.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </F>
    </>
  );
}

export function NewTaskButton({
  defaultContext,
  defaultDate,
  className,
  label = "+ Nova tarefa",
}: {
  defaultContext?: TarefaDefaultContext;
  defaultDate?: string;
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md border bg-surface px-3 text-xs font-medium hover:bg-accent",
          className,
        )}
      >
        {label}
      </button>
      {open &&
        createPortal(
          <QuickDialog kind="tarefa" defaultContext={defaultContext} defaultDate={defaultDate} onClose={() => setOpen(false)} />,
          document.body,
        )}
    </>
  );
}

export function EditTaskDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const { updateTask, deleteTask, clients: realClients, leads: realLeads } = useDataStore();
  const [data, setData] = useState<TarefaFormData>({
    title: task.title,
    dueDate: task.dueDate,
    priority: task.priority,
    clientId: task.clientId ?? "",
    description: task.description ?? "",
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const lockedContext: TarefaDefaultContext | undefined = task.leadId
    ? { type: "lead", id: task.leadId, label: realLeads.find((l) => l.id === task.leadId)?.name ?? "Lead" }
    : task.projectId
      ? { type: "projeto", id: task.projectId, label: "Projeto vinculado" }
      : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTask(task.id, {
      title: data.title,
      dueDate: data.dueDate,
      priority: data.priority,
      description: data.description || undefined,
      ...(lockedContext ? {} : { clientId: data.clientId || undefined }),
    });
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border bg-card shadow-elegant"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Editar tarefa</h3>
            <p className="text-[11px] text-muted-foreground">Altere os dados ou mude o prazo</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
          <TarefaForm data={data} onChange={setData} defaultContext={lockedContext} clients={realClients} />

          <div className="flex items-center justify-between gap-2 border-t pt-3">
            {confirmDelete ? (
              <div className="flex items-center gap-2 text-[12px]">
                <span className="text-muted-foreground">Excluir de vez?</span>
                <button
                  type="button"
                  onClick={() => {
                    deleteTask(task.id);
                    onClose();
                  }}
                  className="rounded-md bg-destructive px-2 py-1 text-[11px] font-medium text-destructive-foreground hover:bg-destructive/90"
                >
                  Sim, excluir
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-md border px-2 py-1 text-[11px] hover:bg-accent"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-[12px] text-destructive hover:underline"
              >
                Excluir tarefa
              </button>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Salvar
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
