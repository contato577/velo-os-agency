import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Plus,
  UserPlus,
  Building2,
  DollarSign,
  Receipt,
  CheckSquare,
  Search,
  Command as CommandIcon,
  ArrowRight,
  X,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { leads, clients } from "@/lib/mock-data";

type QuickKind = "lead" | "cliente" | "venda" | "despesa" | "tarefa";

const items: {
  key: QuickKind;
  label: string;
  icon: typeof UserPlus;
  hint: string;
  shortcut: string;
}[] = [
  { key: "lead", label: "Novo Lead", icon: UserPlus, hint: "Adicionar oportunidade ao CRM", shortcut: "L" },
  { key: "cliente", label: "Novo Cliente", icon: Building2, hint: "Cadastrar cliente diretamente", shortcut: "C" },
  { key: "venda", label: "Nova Venda", icon: DollarSign, hint: "Registrar venda fechada", shortcut: "V" },
  { key: "despesa", label: "Nova Despesa", icon: Receipt, hint: "Lançar despesa no DRE", shortcut: "D" },
  { key: "tarefa", label: "Nova Tarefa", icon: CheckSquare, hint: "Criar tarefa rápida", shortcut: "T" },
];

export function QuickActions() {
  const [openMenu, setOpenMenu] = useState(false);
  const [openCmd, setOpenCmd] = useState(false);
  const [dialog, setDialog] = useState<QuickKind | null>(null);

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

  const open = (k: QuickKind) => {
    setDialog(k);
    setOpenMenu(false);
    setOpenCmd(false);
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setOpenMenu((v) => !v)}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-3.5 w-3.5" /> Novo
          <kbd className="ml-1 hidden items-center gap-0.5 rounded border border-primary-foreground/20 bg-primary-foreground/10 px-1 py-0.5 font-mono text-[9px] md:inline-flex">
            <CommandIcon className="h-2 w-2" />K
          </kbd>
        </button>

        {openMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(false)} />
            <div className="absolute right-0 top-10 z-50 w-64 overflow-hidden rounded-lg border bg-popover shadow-elegant">
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
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
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
          </>
        )}
      </div>

      {openCmd && <CommandPalette onClose={() => setOpenCmd(false)} onCreate={open} />}
      {dialog && <QuickDialog kind={dialog} onClose={() => setDialog(null)} />}
    </>
  );
}

// ─── Command Palette (⌘K) ───────────────────────────────────────────────

function CommandPalette({ onClose, onCreate }: { onClose: () => void; onCreate: (k: QuickKind) => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const nav = [
    { label: "Dashboard", to: "/" },
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
  }, [query]);

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
          <Group title="Criar rapidamente">
            {items.map((it) => {
              const Icon = it.icon;
              return (
                <Row key={it.key} onClick={() => onCreate(it.key)} icon={<Icon className="h-3.5 w-3.5 text-primary" />} label={it.label} shortcut={it.shortcut} />
              );
            })}
          </Group>

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
  cliente: { title: "Novo Cliente", desc: "Cadastrar cliente diretamente" },
  venda: { title: "Nova Venda", desc: "Registrar venda fechada — cria cliente, projeto e primeira cobrança" },
  despesa: { title: "Nova Despesa", desc: "Lançamento é refletido no DRE automaticamente" },
  tarefa: { title: "Nova Tarefa", desc: "Adicionar item à sua lista de execução" },
};

function QuickDialog({ kind, onClose }: { kind: QuickKind; onClose: () => void }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const meta = kindMeta[kind];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(onClose, 900);
    }, 500);
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
              {kind === "venda"
                ? "Cliente, projeto, checklist e primeira cobrança criados automaticamente."
                : "As automações vinculadas foram disparadas."}
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
            {kind === "lead" && <LeadForm />}
            {kind === "cliente" && <ClienteForm />}
            {kind === "venda" && <VendaForm />}
            {kind === "despesa" && <DespesaForm />}
            {kind === "tarefa" && <TarefaForm />}

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

function LeadForm() {
  return (
    <>
      <Row2>
        <F label="Nome"><input required placeholder="Marina Costa" className={cls} /></F>
        <F label="Empresa"><input placeholder="Studio Marina" className={cls} /></F>
      </Row2>
      <Row2>
        <F label="Telefone"><input placeholder="(11) 9…" className={cls} /></F>
        <F label="WhatsApp"><input placeholder="(11) 9…" className={cls} /></F>
      </Row2>
      <Row2>
        <F label="Instagram"><input placeholder="@…" className={cls} /></F>
        <F label="Origem">
          <select className={cls}>
            <option>Instagram</option><option>Indicação</option><option>Google Ads</option>
            <option>LinkedIn</option><option>Site</option><option>Outbound</option>
          </select>
        </F>
      </Row2>
      <Row2>
        <F label="Valor estimado (R$)"><input type="number" min="0" placeholder="0" className={cls} /></F>
        <F label="Potencial">
          <select className={cls}><option>Alto</option><option>Médio</option><option>Baixo</option></select>
        </F>
      </Row2>
      <F label="Próxima ação">
        <input placeholder="Ex: Ligar amanhã 14h" className={cls} />
      </F>
      <F label="Observações"><textarea rows={2} className={cls} placeholder="Contexto do lead…" /></F>
    </>
  );
}

function ClienteForm() {
  return (
    <>
      <Row2>
        <F label="Nome"><input required placeholder="André Pereira" className={cls} /></F>
        <F label="Empresa"><input placeholder="Pereira Ortopedia" className={cls} /></F>
      </Row2>
      <Row2>
        <F label="Plano">
          <select className={cls}><option>Starter</option><option>Growth</option><option>Scale</option><option>Enterprise</option></select>
        </F>
        <F label="Mensalidade (R$)"><input type="number" placeholder="0" className={cls} /></F>
      </Row2>
      <Row2>
        <F label="Dia de pagamento"><input type="number" min="1" max="31" placeholder="5" className={cls} /></F>
        <F label="Início do contrato"><input type="date" className={cls} /></F>
      </Row2>
    </>
  );
}

function VendaForm() {
  return (
    <>
      <F label="Lead / Cliente"><input required placeholder="Buscar…" className={cls} /></F>
      <Row2>
        <F label="Valor (R$)"><input type="number" required className={cls} /></F>
        <F label="Data de fechamento"><input type="date" className={cls} /></F>
      </Row2>
      <F label="Serviços vendidos">
        <div className="grid grid-cols-2 gap-1.5 rounded-md border bg-surface/40 p-2 text-[12px]">
          {["Gestão de Tráfego", "Landing Page", "Site Institucional", "Consultoria"].map((s) => (
            <label key={s} className="flex items-center gap-2">
              <input type="checkbox" className="h-3 w-3 accent-primary" defaultChecked={s === "Gestão de Tráfego"} />
              {s}
            </label>
          ))}
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground">
          A operação (cliente, projeto, checklist e cobrança) será criada automaticamente a partir dos templates.
        </div>
      </F>
    </>
  );
}

function DespesaForm() {
  return (
    <>
      <F label="Descrição"><input required placeholder="Ex: Meta Ads Manager" className={cls} /></F>
      <Row2>
        <F label="Categoria">
          <select className={cls}>
            <option>Ferramentas</option><option>Marketing</option><option>Equipe</option>
            <option>Impostos</option><option>Operacional</option><option>Outro</option>
          </select>
        </F>
        <F label="Fornecedor"><input placeholder="Nome" className={cls} /></F>
      </Row2>
      <Row2>
        <F label="Valor (R$)"><input type="number" required className={cls} /></F>
        <F label="Data"><input type="date" required className={cls} /></F>
      </Row2>
      <Row2>
        <F label="Forma de pagamento">
          <select className={cls}><option>PIX</option><option>Boleto</option><option>Cartão</option><option>Transferência</option></select>
        </F>
        <F label="Recorrente?">
          <select className={cls}><option>Não</option><option>Mensal</option><option>Anual</option></select>
        </F>
      </Row2>
      <F label="Observações"><textarea rows={2} className={cls} /></F>
      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-2.5 text-[12px] text-muted-foreground hover:bg-accent">
        <Paperclip className="h-3.5 w-3.5" />
        <span>Anexar comprovante (opcional)</span>
        <input type="file" className="hidden" />
      </label>
    </>
  );
}

export type TarefaDefaultContext = { type: "cliente" | "projeto"; id: string; label: string };

function TarefaForm({ defaultContext }: { defaultContext?: TarefaDefaultContext }) {
  return (
    <>
      <F label="Título"><input required placeholder="Ex: Ligar para Marina" className={cls} /></F>
      <Row2>
        <F label="Prazo"><input type="date" required className={cls} /></F>
        <F label="Prioridade">
          <select className={cls}><option>Baixa</option><option>Média</option><option>Alta</option><option>Urgente</option></select>
        </F>
      </Row2>
      <F label={defaultContext ? `Vinculado a ${defaultContext.type}` : "Vincular a cliente / projeto (opcional)"}>
        {defaultContext ? (
          <div className="flex items-center gap-2 rounded-md border bg-surface/60 px-3 py-1.5 text-[13px]">
            <span className="inline-flex h-5 items-center rounded-full bg-primary/10 px-2 text-[10px] font-medium uppercase tracking-widest text-primary">
              {defaultContext.type}
            </span>
            <span className="min-w-0 flex-1 truncate">{defaultContext.label}</span>
            <span className="text-[10px] text-muted-foreground">travado</span>
            <input type="hidden" value={defaultContext.id} readOnly />
          </div>
        ) : (
          <input placeholder="Buscar…" className={cls} />
        )}
      </F>
      <F label="Observações"><textarea rows={2} className={cls} /></F>
    </>
  );
}

export function NewTaskButton({
  defaultContext,
  className,
  label = "+ Nova tarefa",
}: {
  defaultContext?: TarefaDefaultContext;
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
      {open && (
        <QuickDialog kind="tarefa" defaultContext={defaultContext} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

// Silence unused import warning
void cn;
