import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Target,
  CalendarDays,
  CheckCircle2,
  TrendingUp,
  Users,
  Percent,
  Wallet,
  Gauge,
  Truck,
  ChevronLeft,
  ChevronRight,
  Check,
  FileDown,
} from "lucide-react";

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
      { property: "og:description", content: "Planejamento estratégico mensal da Veloce Performance." },
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
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {/* Explicação curta do campo — pensada pra quem não lembra o que cada número representa */}
      {hint && <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary/60 focus:ring-2 focus:ring-primary/20";

const STEPS = [
  { title: "Mês anterior", desc: "O que aconteceu de verdade" },
  { title: "Metas do mês", desc: "Números que vocês querem bater" },
  { title: "Prioridades", desc: "O que fazer primeiro" },
] as const;
// Etapa "Qualidade" tirada da tela por enquanto — ainda vaga demais, sem critério
// claro pra operação. Os dados (qualidadePadrao/updateQualidade) continuam existindo
// por baixo, só não aparecem aqui até definirmos algo que faça sentido de verdade.

function PontoControlePage() {
  const { pontosControle, pontoControleAtual, salvarPontoControle, clients, expenses, tasks } = useDataStore();
  const [mes, setMes] = useState(mesAtualISO());
  const [step, setStep] = useState(0);
  const existente = useMemo(() => pontosControle.find((p) => p.mes === mes) ?? null, [pontosControle, mes]);
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
    setForm(registro ? { ...registro, qualidade: registro.qualidade.map((q) => ({ ...q })) } : emptyForm(novoMes));
    setSaved(false);
    setStep(0);
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

  // Exporta o planejamento como um documento Word (.doc) — mesmo truque leve que já
  // usamos pro PDF do relatório de cliente, sem precisar instalar biblioteca nova.
  // Título do arquivo já sai com o mês por extenso, fácil de achar depois.
  const exportarWord = (dados: FormState, mesRef: string) => {
    const titulo = `Ponto de Controle — ${formatMesLabel(mesRef)}`;
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><title>${titulo}</title></head>
      <body style="font-family: Calibri, Arial, sans-serif; font-size: 12pt; color: #1a1a1a;">
        <h1 style="font-size: 20pt; margin-bottom: 4px;">${titulo}</h1>
        <p style="color:#666; margin-top:0;">Reunião estratégica mensal · Veloce</p>
        <hr/>
        <h2>Análise do mês anterior</h2>
        <p><b>O que funcionou:</b><br/>${(dados.funcionou || "—").replace(/\n/g, "<br/>")}</p>
        <p><b>O que não funcionou:</b><br/>${(dados.naoFuncionou || "—").replace(/\n/g, "<br/>")}</p>
        <h2>Metas do mês</h2>
        <ul>
          <li>Meta comercial: ${formatBRL(dados.metaComercial)}</li>
          <li>Novos clientes desejados: ${dados.novosClientesDesejados}</li>
          <li>Serviços a entregar: ${dados.servicosEntregar}</li>
          <li>Taxa prospecção → reunião: ${dados.taxaProspeccaoReuniao}%</li>
          <li>Taxa reunião → fechamento: ${dados.taxaReuniaoFechamento}%</li>
        </ul>
        <h2>Objetivos, prioridades e próximos passos</h2>
        <p><b>Objetivos:</b><br/>${(dados.objetivos || "—").replace(/\n/g, "<br/>")}</p>
        <p><b>Prioridades:</b><br/>${(dados.prioridades || "—").replace(/\n/g, "<br/>")}</p>
        <p><b>Próximos passos:</b><br/>${(dados.proximosPassos || "—").replace(/\n/g, "<br/>")}</p>
      </body>
      </html>
    `;
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${titulo}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Projeções derivadas do planejamento
  const ticketAlvo = form.novosClientesDesejados > 0 ? form.metaComercial / form.novosClientesDesejados : 0;
  const reunioesNecessarias =
    form.taxaReuniaoFechamento > 0 ? Math.ceil(form.novosClientesDesejados / (form.taxaReuniaoFechamento / 100)) : 0;
  const leadsNecessarios =
    form.taxaProspeccaoReuniao > 0 ? Math.ceil(reunioesNecessarias / (form.taxaProspeccaoReuniao / 100)) : 0;

  return (
    <AppShell title="Ponto de Controle" subtitle="Reunião estratégica mensal">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title={`Planejamento · ${formatMesLabel(mes)}`} subtitle="Uma etapa de cada vez — leva 5 minutos">
          <input
            type="month"
            value={mes}
            onChange={(e) => trocarMes(e.target.value)}
            className="rounded-lg border bg-surface px-2.5 py-1.5 text-xs"
          />
        </PageHeader>

        {saved && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Planejamento de {formatMesLabel(mes)} salvo. O CRM e o Dashboard já usam esta meta.
            </span>
            <button
              onClick={() => exportarWord(form, mes)}
              className="inline-flex items-center gap-1 rounded-md border border-success/40 bg-success/10 px-2 py-1 text-[11px] font-medium hover:bg-success/20"
            >
              <FileDown className="h-3 w-3" /> Baixar em Word
            </button>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* Indicador de etapas — clicável, não é preciso seguir em ordem */}
            <div className="flex items-center gap-1.5">
              {STEPS.map((s, i) => (
                <button
                  key={s.title}
                  onClick={() => setStep(i)}
                  className={`flex flex-1 flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left transition ${i === step ? "border-primary/50 bg-primary/10" : "bg-surface/40 hover:bg-accent"
                    }`}
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {i + 1}
                    </span>
                    Passo {i + 1}
                  </span>
                  <span className="text-[12px] font-semibold">{s.title}</span>
                </button>
              ))}
            </div>

            {/* ── Passo 1: Análise do mês anterior ─────────────────────────────── */}
            {step === 0 && (
              <section className="card-trello space-y-4 p-4">
                <div>
                  <h2 className="text-sm font-semibold">Análise do mês anterior</h2>
                  <p className="text-[11px] text-muted-foreground">
                    Números de {formatMesLabel(mesAnterior)}, puxados automaticamente do Comercial, DRE e Operação —
                    nada aqui precisa ser digitado, é só pra você olhar antes de planejar o próximo mês.
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
                    <KpiCard
                      icon={Percent}
                      label="Churn"
                      value={kpis.churn !== null ? `${kpis.churn.toFixed(1)}%` : "Sem dados"}
                      tone={kpis.churn !== null && kpis.churn > 5 ? "warning" : "default"}
                    />
                    <KpiCard
                      icon={TrendingUp}
                      label="Ticket médio"
                      value={kpis.ticketMedio !== null ? formatBRL(kpis.ticketMedio) : "Sem dados"}
                    />
                    <KpiCard
                      icon={Gauge}
                      label="Margem"
                      value={kpis.margem !== null ? `${kpis.margem.toFixed(0)}%` : "Sem dados"}
                      tone={kpis.margem !== null && kpis.margem < 20 ? "warning" : "default"}
                    />
                    <KpiCard
                      icon={Truck}
                      label="Entregas no prazo"
                      value={kpis.entregasNoPrazo !== null ? `${kpis.entregasNoPrazo.toFixed(0)}%` : "Sem dados"}
                      tone={kpis.entregasNoPrazo !== null && kpis.entregasNoPrazo < 80 ? "warning" : "default"}
                    />
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Principais acertos" hint="O que, olhando os números acima, vale manter e repetir esse mês.">
                    <textarea rows={3} value={form.funcionou} onChange={(e) => set("funcionou", e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Principais problemas" hint="O que os números acima mostram que precisa mudar.">
                    <textarea
                      rows={3}
                      value={form.naoFuncionou}
                      onChange={(e) => set("naoFuncionou", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>
              </section>
            )}

            {/* ── Passo 2: Metas do mês ─────────────────────────────────────────── */}
            {step === 1 && (
              <section className="card-trello space-y-4 p-4">
                <div>
                  <h2 className="text-sm font-semibold">Metas do mês</h2>
                  <p className="text-[11px] text-muted-foreground">Os números que definem tudo mais — quanto vender e com que eficiência.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="Meta comercial (R$)" hint="Quanto em vendas novas vocês querem fechar esse mês.">
                    <input
                      type="number"
                      min={0}
                      value={form.metaComercial}
                      onChange={(e) => set("metaComercial", Number(e.target.value))}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Novos clientes" hint="Quantos contratos novos fechados isso representa.">
                    <input
                      type="number"
                      min={0}
                      value={form.novosClientesDesejados}
                      onChange={(e) => set("novosClientesDesejados", Number(e.target.value))}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Serviços a entregar" hint="Quantas entregas/projetos a operação precisa fechar esse mês.">
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
                  <Field
                    label="Prospecção → reunião (%)"
                    hint="De cada 100 leads que entram no funil, quantos costumam virar reunião marcada."
                  >
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.taxaProspeccaoReuniao}
                      onChange={(e) => set("taxaProspeccaoReuniao", Number(e.target.value))}
                      className={inputCls}
                    />
                  </Field>
                  <Field
                    label="Reunião → fechamento (%)"
                    hint="De cada 100 reuniões feitas, quantas costumam virar cliente fechado."
                  >
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

                {/* Projeção fica visível aqui também, junto do que a gerou — mais fácil de entender a conta */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                    <Target className="h-3.5 w-3.5" /> O que essas taxas significam na prática
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                    <Row label="Ticket médio alvo" value={formatBRL(Math.round(ticketAlvo))} />
                    <Row label="Reuniões necessárias" value={String(reunioesNecessarias)} />
                    <Row label="Leads necessários" value={String(leadsNecessarios)} highlight />
                  </div>
                </div>
              </section>
            )}

            {/* ── Passo 3: Prioridades ──────────────────────────────────────────── */}
            {step === 2 && (
              <section className="card-trello space-y-4 p-4">
                <h2 className="text-sm font-semibold">Objetivos, prioridades e próximos passos</h2>
                <Field label="Objetivos do mês" hint="O resultado principal que vocês querem alcançar — em 1 ou 2 frases.">
                  <textarea rows={3} value={form.objetivos} onChange={(e) => set("objetivos", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Prioridades" hint="O que vem primeiro se o tempo apertar — evita que tudo pareça igualmente urgente.">
                  <textarea rows={3} value={form.prioridades} onChange={(e) => set("prioridades", e.target.value)} className={inputCls} />
                </Field>
                <Field label="Próximos passos" hint="As primeiras ações concretas pra sair do papel — o que fazer na próxima semana.">
                  <textarea
                    rows={3}
                    value={form.proximosPassos}
                    onChange={(e) => set("proximosPassos", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </section>
            )}

            {/* Navegação entre passos */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Voltar
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  Próximo passo <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={salvar}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Check className="h-3.5 w-3.5" /> {existente ? "Atualizar planejamento" : "Salvar planejamento"}
                </button>
              )}
            </div>
          </div>

          {/* Lateral — sempre visível, é só leitura rápida, não sobrecarrega */}
          <div className="space-y-6">
            <section className="card-trello space-y-3 p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Target className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-semibold">Resumo da meta</h2>
              </div>
              <div className="space-y-2 text-xs">
                <Row label="Meta comercial" value={formatBRL(form.metaComercial)} />
                <Row label="Leads necessários" value={String(leadsNecessarios)} highlight />
              </div>
              <p className="text-[10px] text-muted-foreground">Detalhe completo no Passo 2.</p>
            </section>

            <section className="card-trello space-y-3 p-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Histórico</h2>
              </div>
              {pontosControle.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma reunião registrada ainda.</p>}
              <div className="space-y-1.5">
                {pontosControle.map((p) => (
                  <div
                    key={p.id}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs transition ${p.mes === mes ? "border-primary/40 bg-primary/5" : "bg-surface/40"
                      }`}
                  >
                    <button onClick={() => trocarMes(p.mes)} className="flex flex-1 items-center justify-between text-left hover:opacity-80">
                      <span className="font-medium">{formatMesLabel(p.mes)}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">{formatBRL(p.metaComercial)}</span>
                    </button>
                    <button
                      onClick={() => exportarWord(p, p.mes)}
                      title="Baixar em Word"
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                    >
                      <FileDown className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              {pontoControleAtual && <p className="text-[10px] text-muted-foreground">Mês corrente planejado — metas ativas no sistema.</p>}
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
  hint,
  meta,
  onMetaChange,
  valorReal,
  alerta,
  neutro,
}: {
  titulo: string;
  hint?: string;
  meta: string;
  onMetaChange: (v: string) => void;
  valorReal: string;
  alerta?: boolean;
  neutro?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-surface/40 p-2.5">
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <span className="w-full shrink-0 text-xs font-semibold md:w-36">{titulo}</span>
        <input
          value={meta}
          onChange={(e) => onMetaChange(e.target.value)}
          className="w-full flex-1 rounded-md border bg-card px-2 py-1.5 text-xs"
          placeholder="Meta / critério"
        />
        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] font-semibold ${neutro ? "bg-muted text-muted-foreground" : alerta ? "bg-warning/15 text-warning" : "bg-success/10 text-success"
            }`}
        >
          {valorReal}
        </span>
      </div>
      {hint && <p className="mt-1.5 text-[10px] text-muted-foreground md:ml-36 md:pl-2.5">{hint}</p>}
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
