import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Calendar, ChevronRight, Filter, Plus, X } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { formatBRL, type Client } from "@/lib/mock-data";
import { useDataStore } from "@/lib/data-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes · Veloce" },
      { name: "description", content: "Carteira de clientes ativos, contratos e renovações." },
    ],
  }),
  component: ClientesList,
});

const statusColor = {
  ativo: "bg-success/15 text-success",
  onboarding: "bg-info/15 text-info",
  pausado: "bg-warning/15 text-warning",
  cancelado: "bg-destructive/15 text-destructive",
  arquivado: "bg-muted text-muted-foreground",
};

const SERVICOS = [
  "Tráfego",
  "Landing Page",
  "Site",
  "Consultoria",
  "Criativos",
  "Automação",
] as const;

function ClientesList() {
  const { clients, updateClientStatus, addClientManual } = useDataStore();
  const [query, setQuery] = useState("");
  // Por padrão esconde clientes cancelados e arquivados do dia a dia,
  // mas o histórico continua ali — dá pra ver via filtro, útil pra remarketing/follow-up.
  const [statusFiltro, setStatusFiltro] = useState<"ativos" | "todos" | Client["status"]>("ativos");
  const [novoAberto, setNovoAberto] = useState(false);
  const mrr = clients.filter((c) => c.status === "ativo").reduce((s, c) => s + c.monthlyValue, 0);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      const bateBusca =
        !q || c.company.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
      const bateStatus =
        statusFiltro === "todos"
          ? true
          : statusFiltro === "ativos"
            ? c.status !== "cancelado" && c.status !== "arquivado"
            : c.status === statusFiltro;
      return bateBusca && bateStatus;
    });
  }, [clients, query, statusFiltro]);

  return (
    <AppShell title="Clientes" subtitle="Carteira ativa">
      <div className="px-4 py-6 md:px-6">
        <PageHeader
          title="Clientes"
          subtitle={`${clients.length} clientes · MRR ${formatBRL(mrr)}`}
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente…"
              className="h-8 w-52 rounded-md border bg-surface pl-7 pr-2 text-xs focus:border-primary/60 focus:outline-none"
            />
          </div>
          <div className="relative">
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value as typeof statusFiltro)}
              className="h-8 appearance-none rounded-md border bg-surface pl-2.5 pr-7 text-xs font-medium focus:border-primary/60 focus:outline-none"
            >
              <option value="ativos">Ativos (padrão)</option>
              <option value="todos">Todos, incl. arquivados</option>
              <option value="onboarding">Onboarding</option>
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
              <option value="cancelado">Cancelados</option>
              <option value="arquivado">Arquivados</option>
            </select>
            <Filter className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          </div>
          <button
            onClick={() => setNovoAberto(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Novo Cliente
          </button>
        </PageHeader>

        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-surface/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Cliente</th>
                <th className="px-4 py-2.5 font-medium">Plano</th>
                <th className="px-4 py-2.5 font-medium">Mensalidade</th>
                <th className="px-4 py-2.5 font-medium">Serviços</th>
                <th className="px-4 py-2.5 font-medium">Renovação</th>
                <th className="px-4 py-2.5 font-medium">Responsável</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr
                  key={c.id}
                  className="group border-b transition-colors last:border-b-0 hover:bg-surface/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      to="/clientes/$clientId"
                      params={{ clientId: c.id }}
                      className="flex items-center gap-2.5"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/40 text-[10px] font-semibold text-primary-foreground">
                        {c.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium">{c.company}</div>
                        <div className="truncate text-[11px] text-muted-foreground">{c.name}</div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] font-medium">
                      {c.plano ?? c.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-primary">
                    {formatBRL(c.monthlyValue)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.services.slice(0, 2).map((s) => (
                        <span
                          key={s}
                          className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {s}
                        </span>
                      ))}
                      {c.services.length > 2 && (
                        <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{c.services.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(c.renewalDate).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">{c.owner}</td>
                  <td className="px-4 py-3">
                    <select
                      value={c.status}
                      onChange={(e) => updateClientStatus(c.id, e.target.value as Client["status"])}
                      className={cn(
                        "cursor-pointer appearance-none rounded px-2 py-0.5 pr-5 text-[10px] font-medium uppercase tracking-wider outline-none",
                        statusColor[c.status],
                      )}
                    >
                      <option value="onboarding">Onboarding</option>
                      <option value="ativo">Ativo</option>
                      <option value="pausado">Pausado</option>
                      <option value="cancelado">Cancelado</option>
                      {/* Só libera "Arquivado" depois que o cliente já está cancelado — fluxo em 2 passos. */}
                      {(c.status === "cancelado" || c.status === "arquivado") && (
                        <option value="arquivado">Arquivado</option>
                      )}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to="/clientes/$clientId"
                      params={{ clientId: c.id }}
                      className="inline-flex items-center gap-1 rounded-md border bg-surface px-2 py-1 text-[11px] font-medium text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-primary/10 hover:text-primary"
                    >
                      Abrir <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-8 text-center text-[12px] text-muted-foreground"
                  >
                    Nenhum cliente encontrado com esse filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {novoAberto && (
        <NovoClienteModal onClose={() => setNovoAberto(false)} onSave={addClientManual} />
      )}
    </AppShell>
  );
}

function NovoClienteModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (
    partial: Pick<Client, "name" | "company" | "owner" | "plan" | "monthlyValue" | "services"> &
      Partial<Client>,
  ) => Client;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [owner, setOwner] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [monthlyValue, setMonthlyValue] = useState(500);
  const [services, setServices] = useState<string[]>([]);

  const toggleServico = (s: string) => {
    setServices((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const podeCadastrar = name.trim() && company.trim() && owner.trim() && services.length > 0;

  const salvar = () => {
    if (!podeCadastrar) return;
    const plan: Client["plan"] =
      monthlyValue >= 3000 ? "Scale" : monthlyValue >= 1500 ? "Growth" : "Starter";
    onSave({
      name,
      company,
      owner,
      plan,
      monthlyValue,
      services,
      email: email || undefined,
      phone: phone || undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border bg-card p-5 shadow-elegant"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Novo cliente</h3>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-[11px] text-muted-foreground">
          Pra cliente que veio de venda fechada no CRM, ele já entra sozinho — use isso só pra
          cadastro direto (indicação, migração de outra ferramenta, etc).
        </p>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Empresa">
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputCls}
                placeholder="Empresa Ltda"
              />
            </Field>
            <Field label="Contato principal">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Nome do contato"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="E-mail">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className={inputCls}
                placeholder="opcional"
              />
            </Field>
            <Field label="Telefone">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputCls}
                placeholder="opcional"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Responsável interno">
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className={inputCls}
                placeholder="Quem toca a conta"
              />
            </Field>
            <Field label="Mensalidade (R$)">
              <input
                type="number"
                min={0}
                value={monthlyValue}
                onChange={(e) => setMonthlyValue(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>
          <Field label="Serviços contratados">
            <div className="flex flex-wrap gap-1.5">
              {SERVICOS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleServico(s)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-[11px] font-medium transition-colors",
                    services.includes(s)
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "bg-surface text-muted-foreground hover:bg-accent",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>
        </div>

        <button
          onClick={salvar}
          disabled={!podeCadastrar}
          className="mt-5 w-full rounded-md bg-primary py-2 text-[13px] font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cadastrar cliente
        </button>
      </div>
    </div>
  );
}

const inputCls =
  "h-8 w-full rounded-md border bg-surface px-2 text-[12px] focus:border-primary/60 focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
