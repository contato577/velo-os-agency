import { createFileRoute } from "@tanstack/react-router";
import {
  Send,
  Bot,
  Megaphone,
  BarChart3,
  Facebook,
  Plug,
  FileText,
  Sparkles,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/central-ia")({
  head: () => ({
    meta: [
      { title: "Central de IA · Veloce" },
      { name: "description", content: "Assistente inteligente e relatórios de mídia paga." },
    ],
  }),
  component: CentralIA,
});

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
    <AppShell title="Central de IA" subtitle="Assistente inteligente da Veloce">
      <div className="flex h-[calc(100vh-3.5rem)] flex-col px-4 py-6 md:px-6">
        <PageHeader title="Central de IA" subtitle="Converse com o assistente sobre a sua operação" />

        {/* ─── Assistente IA — protagonista absoluto da tela ─────────────────── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border bg-card">
          {/* Cabeçalho tipo app de conversa */}
          <div className="flex items-center justify-between gap-3 border-b bg-surface/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/20 ring-1 ring-primary/30">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-[15px] font-semibold leading-tight">Assistente Veloce</div>
                <div className="text-[12px] text-muted-foreground">Sua operação, em uma conversa</div>
              </div>
            </div>
            <span className="rounded-full bg-warning/15 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-warning">
              Aguardando conexão
            </span>
          </div>

          {/* Área de mensagens — ocupa todo o espaço disponível */}
          <div ref={scrollRef} className="flex flex-1 flex-col gap-3 overflow-y-auto bg-background/40 px-5 py-6">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm",
                    m.role === "assistant"
                      ? "rounded-tl-sm border bg-card text-foreground"
                      : "rounded-tr-sm bg-primary/25 text-foreground",
                  )}
                >
                  {m.text}
                  <div className={cn("mt-1.5 text-[10px] text-muted-foreground", m.role === "user" && "text-right")}>
                    {m.hora}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Sugestões rápidas */}
          <div className="flex flex-wrap gap-1.5 border-t bg-surface/40 px-5 pt-3">
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
          <div className="flex items-center gap-2 bg-surface/40 px-5 py-4">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && enviarMensagem(chatInput)}
              placeholder="Escreva uma mensagem..."
              className="h-12 flex-1 rounded-full border bg-card px-4 text-[14px] outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={() => enviarMensagem(chatInput)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Send className="h-4.5 w-4.5" />
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
