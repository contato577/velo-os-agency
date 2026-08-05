import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Target, Plus, Trash2, CalendarDays, CheckCircle2 } from "lucide-react";

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
  const { pontosControle, pontoControleAtual, salvarPontoControle } = useDataStore();
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

  const addQualidade = () => {
    const item: QualidadeItem = {
      id: `q-${Date.now()}`,
      titulo: "",
      descricao: "",
    };
    set("qualidade", [...form.qualidade, item]);
  };

  const updateQualidade = (id: string, partial: Partial<QualidadeItem>) => {
    set(
      "qualidade",
      form.qualidade.map((q) => (q.id === id ? { ...q, ...partial } : q)),
    );
  };

  const removeQualidade = (id: string) => {
    set("qualidade", form.qualidade.filter((q) => q.id !== id));
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
              <h2 className="text-sm font-semibold">1. Análise do mês anterior</h2>
              <Field label="Resumo do mês anterior">
                <textarea
                  rows={3}
                  value={form.analiseAnterior}
                  onChange={(e) => set("analiseAnterior", e.target.value)}
                  className={inputCls}
                  placeholder="Resultados, números e contexto do mês que passou..."
                />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="O que funcionou">
                  <textarea
                    rows={3}
                    value={form.funcionou}
                    onChange={(e) => set("funcionou", e.target.value)}
                    className={inputCls}
                    placeholder="Manter e escalar..."
                  />
                </Field>
                <Field label="O que não funcionou">
                  <textarea
                    rows={3}
                    value={form.naoFuncionou}
                    onChange={(e) => set("naoFuncionou", e.target.value)}
                    className={inputCls}
                    placeholder="Corrigir ou abandonar..."
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
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">3. Meta operacional / qualidade</h2>
                <button
                  onClick={addQualidade}
                  className="flex items-center gap-1 rounded-md border bg-surface px-2 py-1 text-[11px] font-medium hover:bg-accent"
                >
                  <Plus className="h-3 w-3" /> Adicionar
                </button>
              </div>
              <div className="space-y-2">
                {form.qualidade.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum indicador definido.</p>
                )}
                {form.qualidade.map((q) => (
                  <div key={q.id} className="flex flex-col gap-2 rounded-lg border bg-surface/40 p-2 md:flex-row md:items-center">
                    <input
                      value={q.titulo}
                      onChange={(e) => updateQualidade(q.id, { titulo: e.target.value })}
                      placeholder="Indicador"
                      className="w-full rounded-md border bg-card px-2 py-1.5 text-xs md:w-48"
                    />
                    <input
                      value={q.descricao}
                      onChange={(e) => updateQualidade(q.id, { descricao: e.target.value })}
                      placeholder="Meta / critério"
                      className="w-full flex-1 rounded-md border bg-card px-2 py-1.5 text-xs"
                    />
                    <button
                      onClick={() => removeQualidade(q.id)}
                      className="self-end rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remover indicador"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
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
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs transition hover:bg-accent ${
                      p.mes === mes ? "border-primary/40 bg-primary/5" : "bg-surface/40"
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

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-surface/40 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono font-semibold ${highlight ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}
