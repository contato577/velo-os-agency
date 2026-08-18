import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Brain,
  ArrowRight,
  Plus,
  X,
  Trash2,
  BellRing,
  Check,
  Ban,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/app-shell";
import { formatBRL } from "@/lib/mock-data";
import { useDataStore } from "@/lib/data-store";
import { LancamentoForm } from "@/components/lancamento-form";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dre")({
  head: () => ({
    meta: [
      { title: "DRE Inteligente · Veloce" },
      {
        name: "description",
        content: "DRE gerencial automático com indicadores, comparativos e insights de IA.",
      },
    ],
  }),
  component: DRE,
});

function DRE() {
  const {
    insights: aiInsights,
    expenses,
    clients,
    deleteExpense,
    recurringConfirmations,
    confirmRecurring,
  } = useDataStore();
  const [openNew, setOpenNew] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Mês de referência = o mês ATUAL do calendário por padrão, mas agora dá pra
  // trocar manualmente — sem isso, lançamentos de teste espalhados em meses
  // diferentes faziam a tela parecer "quebrada" (só mostrava o que caísse no
  // mês corrente, escondendo o resto sem explicação nenhuma).
  const hojeMesISO = new Date().toISOString().slice(0, 7);
  const diaHoje = new Date().getDate();
  const mesesComDados = [...new Set(expenses.map((f) => f.date.slice(0, 7)))].sort();
  const mesPadrao = mesesComDados.includes(hojeMesISO)
    ? hojeMesISO
    : (mesesComDados[mesesComDados.length - 1] ?? hojeMesISO);
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);
  const mesRef = mesSelecionado ?? mesPadrao;
  const mesRefIdx = mesesComDados.indexOf(mesRef);
  const mesAnteriorRef = mesRefIdx > 0 ? mesesComDados[mesRefIdx - 1] : null;

  // Lançamentos recorrentes que ainda não têm confirmação nenhuma pro mês atual,
  // e cujo dia de cobrança já chegou — precisam de confirmação antes de contar
  // de verdade no DRE (entrada/saída real, não só "deveria acontecer").
  const pendentesConfirmacao = useMemo(() => {
    return expenses.filter((f) => {
      if (!f.recurring) return false;
      const mesOrigem = f.date.slice(0, 7);
      if (mesOrigem >= hojeMesISO) return false;
      const diaCobranca = Number(f.date.slice(8, 10));
      if (diaHoje < diaCobranca) return false;
      const jaConfirmado = recurringConfirmations.some(
        (c) => c.entryId === f.id && c.mes === hojeMesISO,
      );
      return !jaConfirmado;
    });
  }, [expenses, recurringConfirmations, hojeMesISO, diaHoje]);

  useEffect(() => {
    if (pendentesConfirmacao.length === 0) return;
    toast.warning(
      `${pendentesConfirmacao.length} lançamento(s) recorrente(s) aguardando confirmação`,
      { description: "Confirme se a entrada/saída deste mês realmente aconteceu.", duration: 7000 },
    );
    // Só na primeira renderização com pendências — não fica repetindo o aviso a cada re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lançamentos recorrentes contam em TODOS os meses a partir do mês em que foram criados —
  // mas só depois de confirmados (ou se já passaram, sem marcação de "não recebido").
  const entriesForMonth = (mes: string) =>
    expenses.filter((f) => {
      const mesOrigem = f.date.slice(0, 7);
      if (mesOrigem === mes) return true;
      if (!f.recurring || mesOrigem >= mes) return false;
      const confirmacao = recurringConfirmations.find((c) => c.entryId === f.id && c.mes === mes);
      if (confirmacao) return confirmacao.status === "confirmado";
      return mes < hojeMesISO; // mês já encerrado sem marcação — assume que aconteceu
    });

  const referencia = entriesForMonth(mesRef);
  const [refAno, refMesNum] = mesRef.split("-").map(Number);
  const nomeMesRef = new Date(refAno, refMesNum - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  // Antes, "Consultorias" e "Serviços Extras" ficavam travados em R$ 0, mesmo com lançamento real —
  // o filtro simplesmente não existia pra essas 2 categorias. Corrigido: agora somam de verdade.
  const receitas = {
    Mensalidades: referencia
      .filter((f) => f.category === "Mensalidade")
      .reduce((s, f) => s + f.amount, 0),
    Projetos: referencia.filter((f) => f.category === "Projeto").reduce((s, f) => s + f.amount, 0),
    Consultorias: referencia
      .filter((f) => f.category === "Consultoria")
      .reduce((s, f) => s + f.amount, 0),
    "Serviços Extras": referencia
      .filter((f) => f.category === "Serviço Extra")
      .reduce((s, f) => s + f.amount, 0),
  };
  const receitaBruta = Object.values(receitas).reduce((a, b) => a + b, 0);
  const receitaRecorrente = receitas.Mensalidades;
  const receitaExtra = receitaBruta - receitaRecorrente;

  // Mesmo problema aqui: "Operacional", "Administrativo" e "Investimentos" eram opções reais
  // no formulário de lançamento, mas travadas em R$ 0 no DRE — um lançamento nessas categorias
  // simplesmente desaparecia dos totais. Corrigido: agora somam pelo costCenter real.
  const despesas = {
    Marketing: referencia
      .filter((f) => f.costCenter === "Marketing")
      .reduce((s, f) => s + f.amount, 0),
    Ferramentas: referencia
      .filter((f) => f.costCenter === "Ferramentas")
      .reduce((s, f) => s + f.amount, 0),
    Equipe: referencia.filter((f) => f.costCenter === "Equipe").reduce((s, f) => s + f.amount, 0),
    Impostos: referencia
      .filter((f) => f.costCenter === "Impostos")
      .reduce((s, f) => s + f.amount, 0),
    Operacional: referencia
      .filter((f) => f.costCenter === "Operacional")
      .reduce((s, f) => s + f.amount, 0),
    Administrativo: referencia
      .filter((f) => f.costCenter === "Administrativo")
      .reduce((s, f) => s + f.amount, 0),
    Investimentos: referencia
      .filter((f) => f.costCenter === "Investimentos")
      .reduce((s, f) => s + f.amount, 0),
  };
  const totalDespesas = Object.values(despesas).reduce((a, b) => a + b, 0);
  const impostos = despesas.Impostos;
  const receitaLiquida = receitaBruta - impostos;
  const custoOperacional = totalDespesas - impostos;
  // Lucro Bruto = receita menos o custo DIRETO de entregar o serviço — numa
  // agência, isso é a Equipe (quem produz/entrega pro cliente), não
  // Marketing/Ferramentas (que são despesa operacional/administrativa,
  // continuam descontadas mais abaixo, no Lucro Líquido).
  const lucroBruto = receitaLiquida - despesas.Equipe;
  const lucroLiquido = receitaLiquida - custoOperacional;
  const margem = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0;
  const ebitda = lucroLiquido + impostos;

  // Mês anterior: só existe comparativo se houver dado real do mês anterior.
  // Antes isso vinha de números fixos (48500, 22.4%, 12600) — agora ou é real, ou não aparece.
  const anteriorEntries = mesAnteriorRef ? entriesForMonth(mesAnteriorRef) : [];
  const temMesAnterior = anteriorEntries.length > 0;
  const receitaAnterior = anteriorEntries
    .filter((f) => f.type === "entrada")
    .reduce((s, f) => s + f.amount, 0);
  const despesasAnterior = anteriorEntries
    .filter((f) => f.type === "saida")
    .reduce((s, f) => s + f.amount, 0);
  const lucroAnterior = receitaAnterior - despesasAnterior;
  const margemAnterior = receitaAnterior > 0 ? (lucroAnterior / receitaAnterior) * 100 : 0;

  // Comparativos — undefined quando não há mês anterior real (o card some sozinho, sem inventar número)
  const deltaReceita =
    temMesAnterior && receitaAnterior > 0
      ? ((receitaBruta - receitaAnterior) / receitaAnterior) * 100
      : undefined;
  const deltaMargem = temMesAnterior && receitaAnterior > 0 ? margem - margemAnterior : undefined;
  const deltaLucro =
    temMesAnterior && lucroAnterior !== 0
      ? ((lucroLiquido - lucroAnterior) / lucroAnterior) * 100
      : undefined;

  const indicators = [
    { label: "Receita Bruta", value: receitaBruta, tone: "primary" as const, delta: deltaReceita },
    { label: "Receita Recorrente (MRR)", value: receitaRecorrente, tone: "primary" as const },
    { label: "Receita Extraordinária", value: receitaExtra, tone: "info" as const },
    { label: "Custo Operacional", value: custoOperacional, tone: "warning" as const },
    { label: "Lucro Bruto", value: lucroBruto, tone: "success" as const },
    { label: "Lucro Líquido", value: lucroLiquido, tone: "success" as const, delta: deltaLucro },
    {
      label: "Margem Líquida",
      value: margem,
      isPct: true,
      tone: "success" as const,
      delta: deltaMargem,
      deltaIsAbs: true,
    },
    { label: "EBITDA", value: ebitda, tone: "info" as const },
  ];

  const toneClass = {
    primary: "text-primary",
    success: "text-success",
    warning: "text-warning",
    info: "text-info",
  };

  // Top despesas
  const topDespesas = Object.entries(despesas)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Top clientes por receita
  const topClientes = [...clients]
    .filter((c) => c.status === "ativo")
    .sort((a, b) => b.monthlyValue - a.monthlyValue)
    .slice(0, 10);

  // Fluxo de caixa por mês — só com dados reais registrados (antes tinha 5 meses futuros inventados).
  // Sem histórico suficiente ainda para projetar tendência de crescimento com segurança.
  const fluxoReal = mesesComDados.map((m) => {
    const doMes = entriesForMonth(m);
    const entrada = doMes.filter((f) => f.type === "entrada").reduce((s, f) => s + f.amount, 0);
    const saida = doMes.filter((f) => f.type === "saida").reduce((s, f) => s + f.amount, 0);
    const [ano, mesNum] = m.split("-").map(Number);
    const label = new Date(ano, mesNum - 1, 1).toLocaleDateString("pt-BR", { month: "short" });
    return {
      mes: label.charAt(0).toUpperCase() + label.slice(1).replace(".", ""),
      entrada,
      saida,
      saldo: entrada - saida,
    };
  });
  const fluxoProjetado = fluxoReal;
  const temHistoricoSuficiente = fluxoReal.length >= 2;

  // Margem por mês — agora calculada de verdade a partir do fluxo real
  // (antes era uma fórmula fake com Math.sin, só pra "parecer" um gráfico).
  const margemHistorica = fluxoReal.map((f) => ({
    month: f.mes,
    margem: f.entrada > 0 ? ((f.entrada - f.saida) / f.entrada) * 100 : 0,
  }));

  // Evolução de receita — mesma fonte real do fluxo de caixa, sem meta fictícia
  // (antes vinha de mock-data estático, sempre os mesmos 7 meses de exemplo).
  const evolucaoReceita = fluxoReal.map((f) => ({ month: f.mes, receita: f.entrada }));

  // Insights de IA vindos da mesma engine central, filtrados por Financeiro
  // ── Churn, CAC e LTV — calculados com dados reais, no MESMO mês de referência do resto da tela ──
  // (antes usava "hoje" no calendário, que podia divergir do mês mostrado em Receitas/Despesas
  // se algum lançamento fosse feito com data retroativa — agora tudo aponta pro mesmo mês: mesRef)
  const clientesAtivos = clients.filter((c) => c.status === "ativo" || c.status === "onboarding");
  const clientesCanceladosMes = clients.filter((c) => c.canceledAt?.startsWith(mesRef));
  const baseInicioMes = clientesAtivos.length + clientesCanceladosMes.length;
  const churnMensal = baseInicioMes > 0 ? clientesCanceladosMes.length / baseInicioMes : null;

  const ticketMedio =
    clientesAtivos.length > 0
      ? clientesAtivos.reduce((s, c) => s + c.monthlyValue, 0) / clientesAtivos.length
      : 0;
  const ltv = churnMensal && churnMensal > 0 ? ticketMedio / churnMensal : null;

  const gastoMarketingMes = despesas.Marketing;
  const novosClientesMes = clients.filter((c) => c.since.startsWith(mesRef)).length;
  const cac = novosClientesMes > 0 ? gastoMarketingMes / novosClientesMes : null;

  const ltvCac = ltv && cac ? ltv / cac : null;

  const insights = useMemo(() => {
    const financeiros = aiInsights.filter((i) => i.area === "Financeiro");
    // Complementos: só entram quando dão pra sustentar com dado real do mês anterior.
    // Antes eram 2 frases fixas ("MRR cresceu 8%", "lucro acima da média de 6 meses") que apareciam sempre, mesmo sem base real.
    const complementos: { id: string; titulo: string; descricao: string; prioridade: "baixa" }[] =
      [];
    if (temMesAnterior) {
      const mensalidadeAnterior = anteriorEntries
        .filter((f) => f.category === "Mensalidade")
        .reduce((s, f) => s + f.amount, 0);
      if (mensalidadeAnterior > 0 && receitaRecorrente > mensalidadeAnterior) {
        const crescimentoMrr =
          ((receitaRecorrente - mensalidadeAnterior) / mensalidadeAnterior) * 100;
        complementos.push({
          id: "loc-1",
          titulo: "Receita recorrente cresceu",
          descricao: `O MRR cresceu ${crescimentoMrr.toFixed(1)}% em relação ao mês anterior (${formatBRL(mensalidadeAnterior)} → ${formatBRL(receitaRecorrente)}).`,
          prioridade: "baixa",
        });
      }
      if (lucroAnterior > 0 && lucroLiquido > lucroAnterior) {
        complementos.push({
          id: "loc-2",
          titulo: "Lucro líquido melhorou",
          descricao: `Seu lucro líquido de ${formatBRL(lucroLiquido)} é maior que o do mês anterior (${formatBRL(lucroAnterior)}).`,
          prioridade: "baixa",
        });
      }
    }
    return [
      ...financeiros.map((i) => ({
        id: i.id,
        titulo: i.titulo,
        descricao: i.descricao,
        prioridade: i.prioridade,
      })),
      ...complementos,
    ];
  }, [aiInsights, lucroLiquido, temMesAnterior, anteriorEntries, receitaRecorrente, lucroAnterior]);

  return (
    <AppShell title="DRE Inteligente" subtitle="Análise gerencial automática">
      <div className="px-4 py-6 md:px-6">
        <PageHeader
          title={`DRE · ${nomeMesRef}`}
          subtitle="Calculado automaticamente a partir do financeiro"
        >
          {/* Seletor de mês — sem isso, lançamentos em meses diferentes do atual
              ficavam invisíveis sem nenhuma explicação. */}
          <div className="relative">
            <select
              value={mesRef}
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="h-8 appearance-none rounded-md border bg-surface px-2.5 pr-7 text-xs font-medium focus:border-primary/60 focus:outline-none"
            >
              {mesesComDados.length === 0 && <option value={hojeMesISO}>{nomeMesRef}</option>}
              {mesesComDados.map((m) => {
                const [a, n] = m.split("-").map(Number);
                const label = new Date(a, n - 1, 1).toLocaleDateString("pt-BR", {
                  month: "long",
                  year: "numeric",
                });
                return (
                  <option key={m} value={m}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
          <button
            onClick={() => setOpenNew(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3.5 w-3.5" /> Novo Lançamento
          </button>
        </PageHeader>

        {openNew && <NovoLancamentoDialog onClose={() => setOpenNew(false)} />}

        {/* Confirmações pendentes de lançamentos recorrentes */}
        {pendentesConfirmacao.length > 0 && (
          <div className="mb-4 rounded-xl border border-warning/40 bg-warning/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <BellRing className="h-4 w-4 text-warning" />
              <h3 className="text-sm font-semibold tracking-tight">
                {pendentesConfirmacao.length} confirmação(ões) pendente(s) este mês
              </h3>
            </div>
            <div className="space-y-2">
              {pendentesConfirmacao.map((f) => (
                <div
                  key={f.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium">{f.description}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {f.client ?? f.category} · dia {f.date.slice(8, 10)} · {formatBRL(f.amount)}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => confirmRecurring(f.id, hojeMesISO, "confirmado")}
                      className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2.5 py-1.5 text-[11px] font-medium text-success hover:bg-success/25"
                    >
                      <Check className="h-3 w-3" /> Confirmar{" "}
                      {f.type === "entrada" ? "recebimento" : "pagamento"}
                    </button>
                    <button
                      onClick={() => confirmRecurring(f.id, hojeMesISO, "nao_recebido")}
                      className="inline-flex items-center gap-1 rounded-md bg-destructive/15 px-2.5 py-1.5 text-[11px] font-medium text-destructive hover:bg-destructive/25"
                    >
                      <Ban className="h-3 w-3" /> Não aconteceu
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Indicadores */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          {indicators.map((i) => (
            <div key={i.label} className="rounded-lg border bg-card p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {i.label}
              </div>
              <div
                className={cn(
                  "mt-2 font-mono text-[15px] font-semibold tracking-tight",
                  toneClass[i.tone],
                )}
              >
                {i.isPct ? `${i.value.toFixed(1)}%` : formatBRL(i.value)}
              </div>
              {i.delta !== undefined && (
                <div
                  className={cn(
                    "mt-1 flex items-center gap-0.5 text-[10px] font-medium",
                    i.delta >= 0 ? "text-success" : "text-destructive",
                  )}
                >
                  {i.delta >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {i.deltaIsAbs
                    ? `${i.delta >= 0 ? "+" : ""}${i.delta.toFixed(1)}pp`
                    : `${i.delta >= 0 ? "+" : ""}${i.delta.toFixed(1)}%`}{" "}
                  vs mês ant.
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Insights IA */}
        <div className="mt-6 overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-elegant">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/20 ring-1 ring-primary/30">
              <Brain className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Insights da IA</h3>
              <p className="text-[11px] text-muted-foreground">
                Explicação em linguagem simples dos números do DRE
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
            {insights.map((ins) => (
              <div key={ins.id} className="rounded-lg border bg-card/60 p-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      ins.prioridade === "critica" && "bg-destructive",
                      ins.prioridade === "alta" && "bg-warning",
                      ins.prioridade === "media" && "bg-info",
                      ins.prioridade === "baixa" && "bg-success",
                    )}
                  />
                  <span className="text-[12px] font-semibold">{ins.titulo}</span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {ins.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Receitas e Despesas */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-4 text-sm font-semibold tracking-tight">Receitas</h3>
            <div className="space-y-2">
              {Object.entries(receitas).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between border-b py-2 last:border-b-0"
                >
                  <span className="text-[13px]">{k}</span>
                  <span className="font-mono text-[13px] font-medium text-success">
                    {formatBRL(v)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t-2 pt-2">
                <span className="text-[13px] font-semibold">Total</span>
                <span className="font-mono text-[14px] font-semibold text-success">
                  {formatBRL(receitaBruta)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-4 text-sm font-semibold tracking-tight">Despesas</h3>
            <div className="space-y-2">
              {Object.entries(despesas).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between border-b py-2 last:border-b-0"
                >
                  <span className="text-[13px]">{k}</span>
                  <span className="font-mono text-[13px] font-medium text-destructive">
                    {formatBRL(v)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t-2 pt-2">
                <span className="text-[13px] font-semibold">Total</span>
                <span className="font-mono text-[14px] font-semibold text-destructive">
                  {formatBRL(totalDespesas)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Comparativos: mês anterior + anual */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Evolução anual</h3>
                <p className="text-[11px] text-muted-foreground">Receita mensal — dados reais</p>
              </div>
              {deltaReceita !== undefined ? (
                <div
                  className={cn(
                    "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium",
                    deltaReceita >= 0
                      ? "bg-success/10 text-success"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  <TrendingUp className="h-3 w-3" /> {deltaReceita >= 0 ? "+" : ""}
                  {deltaReceita.toFixed(1)}% MoM
                </div>
              ) : (
                <span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  Sem mês anterior p/ comparar
                </span>
              )}
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={evolucaoReceita}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.010 155)" />
                  <XAxis
                    dataKey="month"
                    stroke="oklch(0.68 0.02 155)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="oklch(0.68 0.02 155)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.14 0.008 155)",
                      border: "1px solid oklch(0.22 0.010 155)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: unknown) => formatBRL(Number(v))}
                  />
                  <Bar dataKey="receita" fill="oklch(0.66 0.15 150)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3">
              <h3 className="text-sm font-semibold tracking-tight">Margem por mês</h3>
              <p className="text-[11px] text-muted-foreground">Margem líquida (%) — dados reais</p>
            </div>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={margemHistorica}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.010 155)" />
                  <XAxis
                    dataKey="month"
                    stroke="oklch(0.68 0.02 155)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="oklch(0.68 0.02 155)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.14 0.008 155)",
                      border: "1px solid oklch(0.22 0.010 155)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: unknown) => `${Number(v).toFixed(1)}%`}
                  />
                  <Line
                    type="monotone"
                    dataKey="margem"
                    stroke="oklch(0.66 0.15 150)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "oklch(0.66 0.15 150)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Fluxo de caixa projetado */}
        <div className="mt-4 rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Fluxo de caixa</h3>
              <p className="text-[11px] text-muted-foreground">
                {temHistoricoSuficiente
                  ? "Entradas × saídas × saldo, por mês (dados reais)"
                  : "Ainda com apenas 1 mês de dado real — projeção de tendência aparece a partir de 2 meses de histórico"}
              </p>
            </div>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-mono text-primary">
              Saldo final: {formatBRL(fluxoProjetado.reduce((s, f) => s + f.saldo, 0))}
            </span>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fluxoProjetado}>
                <defs>
                  <linearGradient id="g-saldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.66 0.15 150)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.66 0.15 150)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.010 155)" />
                <XAxis
                  dataKey="mes"
                  stroke="oklch(0.68 0.02 155)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(0.68 0.02 155)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.14 0.008 155)",
                    border: "1px solid oklch(0.22 0.010 155)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: unknown) => formatBRL(Number(v))}
                />
                <Area
                  type="monotone"
                  dataKey="entrada"
                  stroke="oklch(0.66 0.15 150)"
                  fill="url(#g-saldo)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="saida"
                  stroke="oklch(0.65 0.20 25)"
                  fill="transparent"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  stroke="oklch(0.75 0.15 220)"
                  strokeDasharray="4 4"
                  fill="transparent"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 10 despesas / clientes */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">Top 10 despesas</h3>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {nomeMesRef}
              </span>
            </div>
            <div className="space-y-2">
              {topDespesas.map(([nome, valor], i) => {
                const pct = (valor / totalDespesas) * 100;
                return (
                  <div key={nome}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-2">
                        <span className="w-4 text-right font-mono text-[10px] text-muted-foreground">
                          {i + 1}
                        </span>
                        <span>{nome}</span>
                      </span>
                      <span className="font-mono text-destructive">{formatBRL(valor)}</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded bg-surface">
                      <div className="h-full bg-destructive/60" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">Top 10 clientes por receita</h3>
              <Link
                to="/clientes"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {topClientes.map((c, i) => {
                const pct = (c.monthlyValue / topClientes[0].monthlyValue) * 100;
                return (
                  <div key={c.id}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="flex items-center gap-2">
                        <span className="w-4 text-right font-mono text-[10px] text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="truncate">{c.company}</span>
                      </span>
                      <span className="font-mono text-primary">{formatBRL(c.monthlyValue)}</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded bg-surface">
                      <div className="h-full bg-primary/70" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Indicadores financeiros */}
        <div className="mt-4 rounded-lg border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold tracking-tight">Indicadores financeiros</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <FinIndicator label="LTV médio" value={ltv ? formatBRL(ltv) : "Sem dados"} />
            <FinIndicator label="CAC" value={cac ? formatBRL(cac) : "Sem dados"} />
            <FinIndicator
              label="LTV/CAC"
              value={ltvCac ? `${ltvCac.toFixed(1)}x` : "Sem dados"}
              tone={ltvCac && ltvCac >= 3 ? "success" : undefined}
            />
            <FinIndicator
              label="Churn mensal"
              value={churnMensal !== null ? `${(churnMensal * 100).toFixed(1)}%` : "Sem dados"}
              tone={
                churnMensal !== null && churnMensal > 0.05
                  ? "warning"
                  : churnMensal !== null
                    ? "success"
                    : undefined
              }
            />
          </div>
        </div>
        {/* Lançamentos manuais recentes */}
        <div className="mt-4 rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">Lançamentos recentes</h3>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Registrados manualmente
            </span>
          </div>
          {expenses.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">Nenhum lançamento manual ainda.</p>
          ) : (
            <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
              {[...expenses]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-surface/40 px-3 py-2 text-[12px]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{e.description}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {e.category} {e.client ? `· ${e.client}` : ""} {e.date ? `· ${e.date}` : ""}
                        {e.recurring ? " · recorrente" : ""}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 font-mono",
                        e.type === "entrada" ? "text-success" : "text-destructive",
                      )}
                    >
                      {e.type === "entrada" ? "+" : "−"} {formatBRL(e.amount)}
                    </span>
                    {confirmDeleteId === e.id ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => {
                            deleteExpense(e.id);
                            setConfirmDeleteId(null);
                          }}
                          className="rounded-md bg-destructive px-2 py-1 text-[10px] font-medium text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="rounded-md border px-2 py-1 text-[10px] hover:bg-accent"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(e.id)}
                        title="Excluir lançamento"
                        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function FinIndicator({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
  }[tone];
  return (
    <div className="rounded-lg border bg-surface/40 p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-mono text-lg font-semibold tracking-tight", toneClass)}>
        {value}
      </div>
    </div>
  );
}

function NovoLancamentoDialog({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border bg-card shadow-elegant">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Novo lançamento</h3>
            <p className="text-[11px] text-muted-foreground">
              Registre uma entrada ou saída — a IA usa isso para análises.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-4">
          <LancamentoForm onCancel={onClose} />
        </div>
      </div>
    </>
  );
}
