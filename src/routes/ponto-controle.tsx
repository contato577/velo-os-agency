import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Target, CalendarDays, CheckCircle2, TrendingUp, Users, Percent, Wallet, Gauge, Truck } from "lucide-react";

import { AppShell, PageHeader } from "@/components/app-shell";
import { formatBRL } from "@/lib/mock-data";
import {
  useDataStore,
  qualidadePadrao,
  mesAtualISO,
  formatMesLabel,
  type PontoControle,
  type QualidadeItem,
} from "@/lib/data-store";

function mesAnteriorISO(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const Route = createFileRoute("/ponto-controle")({
  head: () => ({
    meta: [
      { title: "Ponto de Controle · Veloce" },
      {
        name: "description",
        content:
          "Reunião estratégica mensal: análise do mês anterior, metas, prioridades e próximos passos da agência.",
      },
      { property: "og:title", content: "Ponto de Controle · Veloce" },
      {
        property: "og:description",
        content: "Planejamento estratégico mensal da Veloce Performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PontoControlePage,
});

type FormState = Omit<PontoControle, "id" | "criadoEm" | "ano">;

function emptyForm(mes: string): FormState {
  return {
    mes,
    analiseAnterior: "",
    funcionou: "",
    naoFuncionou: "",
    objetivos: "",
    metaComercial: 50000,
    novosClientesDesejados: 4,
    servicosEntregar: 6,
    taxaProspeccaoReuniao: 20,
    taxaReuniaoFechamento: 30,
    qualidade: qualidadePadrao.map((q) => ({ ...q })),
    prioridades: "",
    proximosPassos: "",
  };
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20";

function PontoControlePage() {
  const { pontosControle, pontoControleAtual, salvarPontoControle, clients, expenses, tasks } = useDataStore();
  const [mes, setMes] = useState(mesAtualISO());
  const existente = useMemo(
    () => pontosControle.find((p) => p.mes === mes) ?? null,
    [pontosControle, mes],
  );
  const [form, setForm] = useState<FormState>(() => {
    const atual = pontosControle.find((p) => p.mes === mesAtualISO());
    return atual ? { ...atual, qualidade: atual.qualidade.map((q) => ({ ...q })) } : emptyForm(mesAtualISO());
  });
  const [saved, setSaved] = useState(false);

  const mesAnterior = useMemo(() => mesAnteriorISO(mes), [mes]);

  const kpis = useMemo(() => {
    const clientesNovos = clients.filter((c) => c.since.startsWith(mesAnterior));
    const clientesCancelados = clients.filter((c) => c.canceledAt?.startsWith(mesAnterior));
    const baseAtiva =
      clients.filter((c) => c.status === "ativo" || c.status === "onboarding").length + clientesCancelados.length;

    const entradas = expenses
      .filter((e) => e.type === "entrada" && e.date.startsWith(mesAnterior))
      .reduce((s, e) => s + e.amount, 0);
    const saidas = expenses
      .filter((e) => e.type === "saida" && e.date.startsWith(mesAnterior))
      .reduce((s, e) => s + e.amount, 0);

    const tarefasDoMes = tasks.filter((t) => t.dueDate.startsWith(mesAnterior));
    const tarefasNoPrazo = tarefasDoMes.filter((t) => t.status === "concluida").length;

    const clientesAtivosHoje = clients.filter((c) => c.status === "ativo").length;
    const clientesTotalHoje = clients.filter((c) => c.status === "ativo" || c.status === "cancelado" || c.status === "pausado").length;

    return {
      receita: entradas,
      novosClientes: clientesNovos.length,
      churn: baseAtiva > 0 ? (clientesCancelados.length / baseAtiva) * 100 : null,
      ticketMedio: clientesNovos.length > 0 ? clientesNovos.reduce((s, c) => s + c.monthlyValue, 0) / clientesNovos.length : null,
      margem: entradas > 0 ? ((entradas - saidas) / entradas) * 100 : null,
      entregasNoPrazo: tarefasDoMes.length > 0 ? (tarefasNoPrazo / tarefasDoMes.length) * 100 : null,
      retencaoAtual: clientesTotalHoje > 0 ? (clientesAtivosHoje / clientesTotalHoje) * 100 : null,
      temDados: entradas > 0 || clientesNovos.length > 0 || tarefasDoMes.length > 0,
    };
  }, [clients, expenses, tasks, mesAnterior]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const trocarMes = (novoMes: string) => {
    setMes(novoMes);
    const registro = pontosControle.find((p) => p.mes === novoMes);
    setForm(
      registro
        ? { ...registro, qualidade: registro.qualidade.map((q) => ({ ...q })) }
        : emptyForm(novoMes),
    );
    setSaved(false);
  };

  const updateQualidade = (id: string, partial: Partial<QualidadeItem>) => {
    const existe = form.qualidade.some((q) => q.id === id);
    set(
      "qualidade",
      existe
        ? form.qualidade.map((q) => (q.id === id ? { ...q, ...partial } : q))
        : [...form.qualidade, { ...qualidadePadrao.find((q) => q.id === id)!, ...partial }],
    );
  };

  const salvar = () => {
    salvarPontoControle({ ...form, mes });
    setSaved(true);
  };

  // Projeções derivadas do planejamento
  const ticketAlvo =
    form.novosClientesDesejados > 0 ? form.metaComercial / form.novosClientesDesejados : 0;
  const reunioesNecessarias =
    form.taxaReuniaoFechamento > 0
      ? Math.ceil(form.novosClientesDesejados / (form.taxaReuniaoFechamento / 100))
      : 0;
  const leadsNecessarios =
    form.taxaProspeccaoReuniao > 0
      ? Math.ceil(reunioesNecessarias / (form.taxaProspeccaoReuniao / 100))
      : 0;

  return (
    <AppShell title="Ponto de Controle" subtitle="Reunião estratégica mensal">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader
          title={`Planejamento · ${formatMesLabel(mes)}`}
          subtitle="Realizado na 1ª semana do mês — define as metas que o restante do sistema utiliza"
        >
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={mes}
              onChange={(e) => trocarMes(e.target.value)}
              className="rounded-lg border bg-surface px-2.5 py-1.5 text-xs"
            />
            <button
              onClick={salvar}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              {existente ? "Atualizar planejamento" : "Salvar planejamento"}
            </button>
          </div>
        </PageHeader>

        {saved && (
          <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
            <CheckCircle2 className="h-4 w-4" />
            Planejamento de {formatMesLabel(mes)} salvo. O CRM e o Dashboard já usam esta meta.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Análise do mês anterior */}
            <section className="card-trello space-y-4 p-4">
              <div>
                <h2 className="text-sm font-semibold">1. Análise do mês anterior</h2>
                <p className="text-[11px] text-muted-foreground">
                  Números de {formatMesLabel(mesAnterior)}, puxados automaticamente do Comercial, DRE e Operação.
                </p>
              </div>

              {!kpis.temDados ? (
                <p className="rounded-lg border border-dashed bg-surface/40 px-3 py-2 text-[11px] text-muted-foreground">
                  Sem dados suficientes de {formatMesLabel(mesAnterior)} ainda — os cartões abaixo vão se preencher
                  conforme você lançar vendas, despesas e tarefas naquele mês.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                  <KpiCard icon={Wallet} label="Receita" value={formatBRL(kpis.receita)} />
                  <KpiCard icon={Users} label="Novos clientes" value={String(kpis.novosClientes)} />
                  <KpiCard icon={Percent} label="Churn" value={kpis.churn !== null ? `${kpis.churn.toFixed(1)}%` : "Sem dados"} tone={kpis.churn !== null && kpis.churn > 5 ? "warning" : "default"} />
                  <KpiCard icon={TrendingUp} label="Ticket médio" value={kpis.ticketMedio !== null ? formatBRL(kpis.ticketMedio) : "Sem dados"} />
                  <KpiCard icon={Gauge} label="Margem" value={kpis.margem !== null ? `${kpis.margem.toFixed(0)}%` : "Sem dados"} tone={kpis.margem !== null && kpis.margem < 20 ? "warning" : "default"} />
                  <KpiCard icon={Truck} label="Entregas no prazo" value={kpis.entregasNoPrazo !== null ? `${kpis.entregasNoPrazo.toFixed(0)}%` : "Sem dados"} tone={kpis.entregasNoPrazo !== null && kpis.entregasNoPrazo < 80 ? "warning" : "default"} />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Principais acertos">
                  <textarea
                    rows={3}
                    value={form.funcionou}
                    onChange={(e) => set("funcionou", e.target.value)}
                    className={inputCls}
                    placeholder="O que olhando os números acima vale manter e escalar..."
                  />
                </Field>
                <Field label="Principais problemas">
                  <textarea
                    rows={3}
                    value={form.naoFuncionou}
                    onChange={(e) => set("naoFuncionou", e.target.value)}
                    className={inputCls}
                    placeholder="O que os números acima mostram que precisa corrigir..."
                  />
                </Field>
              </div>
            </section>

            {/* Metas */}
            <section className="card-trello space-y-4 p-4">
              <h2 className="text-sm font-semibold">2. Metas do mês</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Meta comercial (R$)">
                  <input
                    type="number"
                    min={0}
                    value={form.metaComercial}
                    onChange={(e) => set("metaComercial", Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Novos clientes">
                  <input
                    type="number"
                    min={0}
                    value={form.novosClientesDesejados}
                    onChange={(e) => set("novosClientesDesejados", Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Serviços a entregar">
                  <input
                    type="number"
                    min={0}
                    value={form.servicosEntregar}
                    onChange={(e) => set("servicosEntregar", Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Prospecção → reunião (%)">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.taxaProspeccaoReuniao}
                    onChange={(e) => set("taxaProspeccaoReuniao", Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>
                <Field label="Reunião → fechamento (%)">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.taxaReuniaoFechamento}
                    onChange={(e) => set("taxaReuniaoFechamento", Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>
              </div>
            </section>

            {/* Meta operacional / qualidade */}
            <section className="card-trello space-y-4 p-4">
              <div>
                <h2 className="text-sm font-semibold">3. Meta operacional / qualidade</h2>
                <p className="text-[11px] text-muted-foreground">3 indicadores fixos da operação — defina a meta, o sistema mostra onde você está agora</p>
              </div>
              <div className="space-y-2">
                <IndicadorQualidade
                  titulo="Clientes ativos"
                  meta={form.qualidade.find((q) => q.id === "q-clientes-ativos")?.descricao ?? "Manter 100% clientes na base"}
                  onMetaChange={(v) => updateQualidade("q-clientes-ativos", { descricao: v })}
                  valorReal={kpis.retencaoAtual !== null ? `${kpis.retencaoAtual.toFixed(0)}%` : "Sem dados"}
                  alerta={kpis.retencaoAtual !== null && kpis.retencaoAtual < 90}
                />
                <IndicadorQualidade
                  titulo="Relatórios semanais"
                  meta={form.qualidade.find((q) => q.id === "q-relatorios")?.descricao ?? "Entregar 100% relatórios semanais"}
                  onMetaChange={(v) => updateQualidade("q-relatorios", { descricao: v })}
                  valorReal="Acompanhamento manual"
                  neutro
                />
                <IndicadorQualidade
                  titulo="Entregas de serviços"
                  meta={form.qualidade.find((q) => q.id === "q-entregas")?.descricao ?? "Entregar 100% serviços no prazo"}
                  onMetaChange={(v) => updateQualidade("q-entregas", { descricao: v })}
                  valorReal={kpis.entregasNoPrazo !== null ? `${kpis.entregasNoPrazo.toFixed(0)}%` : "Sem dados"}
                  alerta={kpis.entregasNoPrazo !== null && kpis.entregasNoPrazo < 80}
                />
              </div>
            </section>

            {/* Prioridades */}
            <section className="card-trello space-y-4 p-4">
              <h2 className="text-sm font-semibold">4. Objetivos, prioridades e próximos passos</h2>
              <Field label="Objetivos do mês">
                <textarea
                  rows={3}
                  value={form.objetivos}
                  onChange={(e) => set("objetivos", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Prioridades">
                <textarea
                  rows={3}
                  value={form.prioridades}
                  onChange={(e) => set("prioridades", e.target.value)}
                  className={inputCls}
                />
              </Field>
              <Field label="Próximos passos">
                <textarea
                  rows={3}
                  value={form.proximosPassos}
                  onChange={(e) => set("proximosPassos", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </section>
          </div>

          {/* Lateral */}
          <div className="space-y-6">
            <section className="card-trello space-y-3 p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Target className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold">Projeção do planejamento</h2>
              </div>
              <div className="space-y-2 text-xs">
                <Row label="Meta comercial" value={formatBRL(form.metaComercial)} />
                <Row label="Ticket médio alvo" value={formatBRL(Math.round(ticketAlvo))} />
                <Row label="Reuniões necessárias" value={String(reunioesNecessarias)} />
                <Row label="Leads necessários" value={String(leadsNecessarios)} highlight />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Calculado a partir das taxas de conversão definidas nesta reunião.
              </p>
            </section>

            <section className="card-trello space-y-3 p-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Histórico</h2>
              </div>
              {pontosControle.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma reunião registrada ainda.</p>
              )}
              <div className="space-y-1.5">
                {pontosControle.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => trocarMes(p.mes)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition hover:bg-accent ${p.mes === mes ? "border-primary/40 bg-primary/5" : "bg-surface/40"
                      }`}
                  >
                    <span className="font-medium">{formatMesLabel(p.mes)}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {formatBRL(p.metaComercial)}
                    </span>
                  </button>
                ))}
              </div>
              {pontoControleAtual && (
                <p className="text-[10px] text-muted-foreground">
                  Mês corrente planejado — metas ativas no sistema.
                </p>
              )}
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className={`rounded-lg border p-2.5 ${tone === "warning" ? "border-warning/40 bg-warning/5" : "bg-surface/40"}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`mt-1 font-mono text-[15px] font-semibold ${tone === "warning" ? "text-warning" : ""}`}>{value}</div>
    </div>
  );
}

function IndicadorQualidade({
  titulo,
  meta,
  onMetaChange,
  valorReal,
  alerta,
  neutro,
}: {
  titulo: string;
  meta: string;
  onMetaChange: (v: string) => void;
  valorReal: string;
  alerta?: boolean;
  neutro?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-surface/40 p-2.5 md:flex-row md:items-center">
      <span className="w-full shrink-0 text-xs font-semibold md:w-36">{titulo}</span>
      <input
        value={meta}
        onChange={(e) => onMetaChange(e.target.value)}
        className="w-full flex-1 rounded-md border bg-card px-2 py-1.5 text-xs"
        placeholder="Meta / critério"
      />
      <span
        className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] font-semibold ${neutro
            ? "bg-muted text-muted-foreground"
            : alerta
              ? "bg-warning/15 text-warning"
              : "bg-success/10 text-success"
          }`}
      >
        {valorReal}
      </span>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-surface/40 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-semibold ${highlight ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}
