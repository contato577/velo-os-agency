import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Users2,
  Wallet,
  Target,
  Calendar,
  CheckSquare,
  ArrowRight,
  BadgeCheck,
  Send,
  Bot,
  Megaphone,
  BarChart3,
  Facebook,
  Plug,
  FileText,
  Sparkles,
} from "lucide-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
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
const conectores = [
  { id: "google-ads", nome: "Google Ads", descricao: "Campanhas, custo e conversões", icon: Megaphone },
  { id: "meta-ads", nome: "Meta Ads", descricao: "Facebook e Instagram Ads", icon: Facebook },
  { id: "analytics", nome: "Google Analytics", descricao: "Tráfego e comportamento no site", icon: BarChart3 },
];

// Sugestões de pergunta — mostram, desde já, o tipo de coisa que o assistente
// vai saber responder quando estiver com o back-end conectado
const sugestoes = [
  "Quais clientes estão em risco esse mês?",
  "Como está o funil comercial hoje?",
  "Resuma minhas pendências mais urgentes",
  "Algum contrato vencendo em breve?",
];

type ChatMessage = { id: string; role: "user" | "assistant"; text: string; hora: string };

const horaAgora = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

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

  // ─── Chat com a IA — interface real, estilo WhatsApp, aguardando back-end ──
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m0",
      role: "assistant",
      text: "Olá! Ainda não estou conectada a um modelo de IA de verdade — assim que o back-end for configurado, vou poder ler todo o seu sistema (leads, clientes, financeiro, tarefas) e responder com dados reais, além de montar relatórios pros seus clientes.",
      hora: horaAgora(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const enviarMensagem = (texto: string) => {
    const limpo = texto.trim();
    if (!limpo) return;
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", text: limpo, hora: horaAgora() };
    const reply: ChatMessage = {
      id: `a-${Date.now()}`,
      role: "assistant",
      text: "Recebi sua mensagem! Ainda não tenho acesso a um modelo de IA real pra responder com dados do sistema — isso é ligado assim que o back-end for conectado.",
      hora: horaAgora(),
    };
    setMessages((prev) => [...prev, userMsg, reply]);
    setChatInput("");
  };

  return (
    <AppShell title="Central de IA" subtitle="Diagnósticos, assistente e relatórios de mídia paga">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Central de IA" subtitle="Diagnóstico automático da sua operação — atualizado agora" />

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

        {/* ─── Assistente IA — protagonista da tela, estilo WhatsApp ─────────── */}
        <div className="mt-6 overflow-hidden rounded-xl border bg-card">
          {/* Cabeçalho tipo app de conversa */}
          <div className="flex items-center justify-between gap-3 border-b bg-surface/60 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/30">
                <Bot className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <div className="text-[13px] font-semibold leading-tight">Assistente Veloce</div>
                <div className="text-[11px] text-muted-foreground">Sua operação, em uma conversa</div>
              </div>
            </div>
            <span className="rounded-full bg-warning/15 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-warning">
              Aguardando conexão
            </span>
          </div>

          {/* Área de mensagens — grande, rolável, bolhas */}
          <div ref={scrollRef} className="flex h-[520px] flex-col gap-3 overflow-y-auto bg-background/40 px-4 py-5 md:h-[560px]">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm",
                    m.role === "assistant"
                      ? "rounded-tl-sm border bg-card text-foreground"
                      : "rounded-tr-sm bg-primary/25 text-foreground",
                  )}
                >
                  {m.text}
                  <div className={cn("mt-1 text-[10px] text-muted-foreground", m.role === "user" && "text-right")}>
                    {m.hora}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sugestões rápidas */}
          <div className="flex flex-wrap gap-1.5 border-t bg-surface/40 px-4 pt-3">
            {sugestoes.map((s) => (
              <button
                key={s}
                onClick={() => enviarMensagem(s)}
                className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] text-primary transition-colors hover:bg-primary/15"
              >
                <Sparkles className="h-2.5 w-2.5" /> {s}
              </button>
            ))}
          </div>

          {/* Campo de digitação — estilo app de mensagens */}
          <div className="flex items-center gap-2 bg-surface/40 px-4 py-3">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviarMensagem(chatInput)}
              placeholder="Escreva uma mensagem..."
              className="h-11 flex-1 rounded-full border bg-card px-4 text-[13.5px] outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={() => enviarMensagem(chatInput)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
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
