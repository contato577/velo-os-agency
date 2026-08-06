import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Users2,
  Wallet,
  Target,
  Calendar,
  CheckSquare,
  ArrowRight,
  Brain,
  Zap,
  BadgeCheck,
  Send,
  Bot,
  User,
  Megaphone,
  BarChart3,
  Facebook,
  Plug,
  FileText,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { automationRules, actionLabels, triggerLabels } from "@/lib/automation-engine";
import {
  sortByPriority,
  priorityStyles,
  type Insight,
  type InsightArea,
} from "@/lib/ai-engine";
import { useDataStore } from "@/lib/data-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/central-ia")({
  head: () => ({
    meta: [
      { title: "Central de IA · Veloce" },
      { name: "description", content: "Diagnósticos automáticos, assistente e relatórios de mídia paga." },
    ],
  }),
  component: CentralIA,
});

const areaIcons: Record<InsightArea, typeof AlertTriangle> = {
  Comercial: Users2,
  Financeiro: Wallet,
  Operacional: CheckSquare,
  Clientes: BadgeCheck,
  Agenda: Calendar,
  Metas: Target,
};

// ─── Conectores de mídia paga — UI pronta, aguardando back-end ───────────────
// Cada plataforma exige um fluxo de autorização (OAuth) e armazenamento seguro
// de token de acesso, então a extração de dados real só existe quando o
// back-end estiver conectado. Por enquanto isso é só a interface preparada.
type ConectorStatus = "nao_conectado";
const conectores: { id: string; nome: string; descricao: string; icon: typeof Megaphone; status: ConectorStatus }[] = [
  { id: "google-ads", nome: "Google Ads", descricao: "Campanhas, custo e conversões", icon: Megaphone, status: "nao_conectado" },
  { id: "meta-ads", nome: "Meta Ads", descricao: "Facebook e Instagram Ads", icon: Facebook, status: "nao_conectado" },
  { id: "analytics", nome: "Google Analytics", descricao: "Tráfego e comportamento no site", icon: BarChart3, status: "nao_conectado" },
];

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

function CentralIA() {
  const { insights } = useDataStore();

  const areas: (InsightArea | "Todas")[] = [
    "Todas",
    "Comercial",
    "Financeiro",
    "Operacional",
    "Clientes",
    "Agenda",
    "Metas",
  ];
  const [filter, setFilter] = useState<InsightArea | "Todas">("Todas");

  const filtered = useMemo(() => {
    const list = filter === "Todas" ? insights : insights.filter((d) => d.area === filter);
    return sortByPriority(list);
  }, [insights, filter]);

  const criticos = insights.filter((d) => d.prioridade === "critica").length;

  // ─── Chat com a IA — interface real, aguardando conexão com back-end ───────
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m0",
      role: "assistant",
      text: "Olá! Ainda não estou conectada a um modelo de IA de verdade — assim que o back-end for configurado, vou poder ler todo o seu sistema (leads, clientes, financeiro, tarefas) e responder perguntas com dados reais, além de montar relatórios pros seus clientes.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");

  const handleSend = () => {
    const texto = chatInput.trim();
    if (!texto) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: texto };
    const reply: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      text: "Recebi sua mensagem, mas ainda não tenho acesso a um modelo de IA real pra responder com informações do sistema. Isso é ligado quando o back-end for conectado.",
    };
    setMessages((prev) => [...prev, userMsg, reply]);
    setChatInput("");
  };

  return (
    <AppShell title="Central de IA" subtitle="Diagnósticos, assistente e relatórios de mídia paga">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Central de IA" subtitle="Diagnóstico automático da sua operação — atualizado agora">
          <div className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            IA analisando em tempo real
          </div>
        </PageHeader>

        {/* Resumo executivo — só com dado real (removido o "Confiança IA 92%" fixo que existia aqui) */}
        <div className="mb-6 overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-card to-card p-5 shadow-elegant">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20 ring-1 ring-primary/30">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] uppercase tracking-widest text-primary/80">Resumo executivo</div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight md:text-xl">
                Sua operação tem{" "}
                <span className={criticos > 0 ? "text-warning" : "text-success"}>
                  {criticos} ponto{criticos === 1 ? "" : "s"} crítico{criticos === 1 ? "" : "s"}
                </span>{" "}
                em aberto agora.
              </h2>
              <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
                A IA identificou {insights.length} diagnóstico{insights.length === 1 ? "" : "s"} com base nos dados atuais do
                seu sistema. Revise os itens abaixo pra manter a operação no rumo certo — pra números de faturamento e meta
                em tempo real, veja a Dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Diagnósticos — reais, calculados a partir do sistema */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {areas.map((a) => (
            <button
              key={a}
              onClick={() => setFilter(a)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                filter === a
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "bg-surface text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {a}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((d) => <DiagnosticCard key={d.id} d={d} />)}
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-6 text-center text-[13px] text-muted-foreground">
            Nenhum diagnóstico {filter !== "Todas" ? `em "${filter}"` : ""} no momento. Tudo tranquilo por aqui.
          </div>
        )}

        {/* Assistente IA — interface pronta, resposta real depende do back-end */}
        <div className="mt-6 rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Assistente IA</h3>
                <p className="text-[11px] text-muted-foreground">Converse sobre a sua operação — respostas reais após conectar o back-end</p>
              </div>
            </div>
            <span className="rounded bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">Aguardando conexão</span>
          </div>

          <div className="flex max-h-[360px] min-h-[160px] flex-col gap-2.5 overflow-y-auto rounded-lg border bg-surface/40 p-3">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex items-start gap-2", m.role === "user" && "flex-row-reverse")}>
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                    m.role === "assistant" ? "bg-primary/15 text-primary" : "bg-accent text-foreground",
                  )}
                >
                  {m.role === "assistant" ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                </div>
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed",
                    m.role === "assistant" ? "bg-card border" : "bg-primary/15 text-foreground",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Pergunte algo sobre sua operação..."
              className="h-9 flex-1 rounded-md border bg-surface px-3 text-[13px] outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={handleSend}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Relatórios de mídia paga — conectores prontos, extração real depende do back-end */}
        <div className="mt-6 rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
              <Plug className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Relatórios de clientes</h3>
              <p className="text-[11px] text-muted-foreground">
                Conecte suas contas de mídia paga pra gerar relatórios simples e automáticos pros seus clientes
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {conectores.map((c) => (
              <div key={c.id} className="rounded-lg border bg-surface/40 p-3">
                <div className="flex items-center gap-2">
                  <c.icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[13px] font-medium">{c.nome}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{c.descricao}</p>
                <button
                  disabled
                  title="Disponível assim que o back-end for conectado"
                  className="mt-3 w-full cursor-not-allowed rounded-md border border-dashed px-2 py-1.5 text-[11px] font-medium text-muted-foreground"
                >
                  Conectar (em breve)
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-lg border bg-surface/40 p-3">
            <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Assim que conectadas, essas contas vão alimentar um modelo padrão de relatório (investimento, resultados e
              principais aprendizados do período) gerado automaticamente por cliente — sem precisar montar nada manualmente.
            </p>
          </div>
        </div>

        {/* Automações ativas — motor declarativo, real */}
        <div className="mt-6 rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
                <Zap className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Automações ativas</h3>
                <p className="text-[11px] text-muted-foreground">
                  Regras do motor de automação — disparadas pelos eventos da sua operação
                </p>
              </div>
            </div>
            <span className="rounded bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success">
              {automationRules.filter((r) => r.active).length} ativas
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {automationRules.map((r) => (
              <div key={r.id} className="rounded-lg border bg-surface/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("h-1.5 w-1.5 rounded-full", r.active ? "bg-success" : "bg-muted-foreground")} />
                      <span className="truncate text-[13px] font-medium">{r.name}</span>
                    </div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {r.category} · {r.runs} execuções
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                  <span className="rounded bg-info/15 px-1.5 py-0.5 text-info">
                    Quando: {triggerLabels[r.when]}
                  </span>
                  {r.condition && (
                    <span className="rounded bg-warning/15 px-1.5 py-0.5 text-warning">
                      {r.condition}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                  {r.do.map((a) => (
                    <span key={a} className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                      → {actionLabels[a]}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function DiagnosticCard({ d }: { d: Insight }) {
  const Icon = areaIcons[d.area] ?? AlertTriangle;
  const ps = priorityStyles[d.prioridade];
  const isCritico = d.prioridade === "critica";
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-lg border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-elegant",
        isCritico ? `${ps.border} ${ps.ring}` : `hover:ring-1 ${ps.ring}`,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", ps.chip)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{d.area}</span>
        </div>
        <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider", ps.chip)}>
          {ps.label}
        </span>
      </div>
      <h3 className="text-[14px] font-semibold leading-snug tracking-tight">{d.titulo}</h3>
      <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{d.descricao}</p>
      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <span className="text-[11px] font-mono text-muted-foreground">{d.impacto}</span>
        <Link
          to={d.to}
          {...(d.search ? { search: d.search as never } : {})}
          className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
        >
          {d.acaoLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
