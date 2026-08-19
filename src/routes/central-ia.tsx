import { createFileRoute } from "@tanstack/react-router";
import {
  Send,
  Bot,
  Sparkles,
  FileText,
  Download,
  MessageCircleMore,
  ChevronDown,
  CircleCheck,
  CircleAlert,
  Paperclip,
  Plus,
  X,
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { useDataStore } from "@/lib/data-store";
import {
  gerarResumoCliente,
  classificarSentimento,
  exportarRelatorioPDF,
  linkWhatsApp,
  type RelatorioCliente,
} from "@/lib/client-report";
import { playPop } from "@/lib/sound";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/central-ia")({
  head: () => ({
    meta: [
      { title: "Central de IA · Veloce" },
      { name: "description", content: "Assistente inteligente e relatórios de cliente." },
    ],
  }),
  component: CentralIA,
});

// Sugestões de pergunta — mostram, desde já, o tipo de coisa que o assistente
// vai saber responder quando estiver com o back-end conectado
const sugestoes = [
  "Quais clientes estão em risco esse mês?",
  "Como está o funil comercial hoje?",
  "Resuma minhas pendências mais urgentes",
];

type ChatMessage =
  | { id: string; kind: "text"; role: "user" | "assistant"; text: string; hora: string }
  | {
      id: string;
      kind: "relatorio";
      role: "assistant";
      relatorio: RelatorioCliente;
      sentimento: ReturnType<typeof classificarSentimento>;
      clientPhone?: string;
      hora: string;
    };

const horaAgora = () =>
  new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

function CentralIA() {
  const { clients, projects } = useDataStore();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m0",
      kind: "text",
      role: "assistant",
      text: "Olá! Ainda não estou conectada a um modelo de IA de verdade — assim que o back-end for configurado, vou poder ler todo o seu sistema e responder com dados reais. Já dá pra testar o gerador de relatório de cliente abaixo, com dados reais de projeto e prazo.",
      hora: horaAgora(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [digitando, setDigitando] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(clients[0]?.id ?? "");
  const [mostrarSeletorRelatorio, setMostrarSeletorRelatorio] = useState(false);
  // Menu "+" estilo WhatsApp — fica fechado por padrão, só abre quando a
  // pessoa clica, pra não poluir a tela com botão e sugestões o tempo todo.
  const [menuAnexoAberto, setMenuAnexoAberto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, digitando]);

  const responderComAtraso = (msg: ChatMessage) => {
    setDigitando(true);
    setTimeout(() => {
      setDigitando(false);
      setMessages((prev) => [...prev, msg]);
      playPop();
    }, 550);
  };

  const enviarMensagem = (texto: string) => {
    const limpo = texto.trim();
    if (!limpo) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      kind: "text",
      role: "user",
      text: limpo,
      hora: horaAgora(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    responderComAtraso({
      id: `a-${Date.now()}`,
      kind: "text",
      role: "assistant",
      text: "Recebi sua mensagem! Ainda não tenho acesso a um modelo de IA real pra responder com dados do sistema — isso é ligado assim que o back-end for conectado.",
      hora: horaAgora(),
    });
  };

  const anexarArquivo = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const nomes = Array.from(files)
      .map((f) => f.name)
      .join(", ");
    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        kind: "text",
        role: "user",
        text: `📎 Anexou: ${nomes}`,
        hora: horaAgora(),
      },
    ]);
    responderComAtraso({
      id: `a-${Date.now()}`,
      kind: "text",
      role: "assistant",
      text: "Recebi o arquivo! Analisar anexos ainda não está disponível — isso é ligado assim que o back-end de IA for conectado.",
      hora: horaAgora(),
    });
    setMenuAnexoAberto(false);
  };

  const gerarRelatorio = () => {
    const client = clients.find((c) => c.id === clienteSelecionado);
    if (!client) return;
    const clientProjects = projects.filter((p) => p.clientId === client.id);
    const relatorio = gerarResumoCliente(client, clientProjects);
    const sentimento = classificarSentimento(clientProjects);

    setMessages((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        kind: "text",
        role: "user",
        text: `Gerar relatório mensal de ${client.company}`,
        hora: horaAgora(),
      },
    ]);
    responderComAtraso({
      id: `a-${Date.now()}`,
      kind: "relatorio",
      role: "assistant",
      relatorio,
      sentimento,
      clientPhone: client.phone,
      hora: horaAgora(),
    });
  };

  const clienteAtivo = useMemo(
    () => clients.find((c) => c.id === clienteSelecionado),
    [clients, clienteSelecionado],
  );

  return (
    <AppShell title="Central de IA" subtitle="Assistente inteligente da Veloce">
      <div className="flex h-[calc(100vh-3.5rem)] flex-col px-4 py-6 md:px-6">
        <PageHeader
          title="Central de IA"
          subtitle="Converse com o assistente ou gere um relatório pra um cliente"
        />

        {/* ─── Chat — visual premium ──────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-card shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_20px_60px_-24px_rgba(0,0,0,0.5)]">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between gap-3 border-b bg-gradient-to-r from-primary/10 via-card to-card px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/10 ring-1 ring-primary/40">
                <Bot className="h-5 w-5 text-primary" />
                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-warning ring-2 ring-card" />
              </div>
              <div>
                <div className="text-[15px] font-semibold leading-tight">Assistente Veloce</div>
                <div className="text-[12px] text-muted-foreground">
                  Sua operação, em uma conversa
                </div>
              </div>
            </div>
            <span className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-warning">
              Aguardando conexão
            </span>
          </div>

          {/* Mensagens */}
          <div
            ref={scrollRef}
            className="flex flex-1 flex-col gap-3.5 overflow-y-auto bg-background/40 px-5 py-6"
          >
            {messages.map((m) =>
              m.kind === "text" ? (
                <div
                  key={m.id}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm",
                      m.role === "assistant"
                        ? "rounded-tl-sm border bg-card text-foreground"
                        : "rounded-tr-sm bg-gradient-to-br from-primary/35 to-primary/20 text-foreground",
                    )}
                  >
                    {m.text}
                    <div
                      className={cn(
                        "mt-1.5 text-[10px] text-muted-foreground",
                        m.role === "user" && "text-right",
                      )}
                    >
                      {m.hora}
                    </div>
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex justify-start">
                  <RelatorioBubble msg={m} />
                </div>
              ),
            )}
            {digitando && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm border bg-card px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Campo de digitação, com botão "+" estilo WhatsApp à esquerda */}
          <div className="relative border-t bg-surface/40 px-5 py-4">
            {menuAnexoAberto && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuAnexoAberto(false)} />
                <div className="absolute bottom-full left-5 z-40 mb-2 w-72 overflow-hidden rounded-2xl border bg-card shadow-2xl">
                  <div className="flex items-center justify-between border-b px-3 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Mais opções
                    </span>
                    <button
                      onClick={() => setMenuAnexoAberto(false)}
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[13px] hover:bg-accent"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-info/15 text-info">
                      <Paperclip className="h-4 w-4" />
                    </span>
                    Anexar arquivo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => anexarArquivo(e.target.files)}
                  />

                  {!mostrarSeletorRelatorio ? (
                    <button
                      onClick={() => setMostrarSeletorRelatorio(true)}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-[13px] hover:bg-accent"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <FileText className="h-4 w-4" />
                      </span>
                      Gerar relatório de cliente
                    </button>
                  ) : (
                    <div className="space-y-2 px-3.5 py-2.5">
                      <div className="flex items-center gap-2 text-[12px] font-medium text-primary">
                        <FileText className="h-3.5 w-3.5" /> Gerar relatório de cliente
                      </div>
                      <div className="relative">
                        <select
                          value={clienteSelecionado}
                          onChange={(e) => setClienteSelecionado(e.target.value)}
                          className="h-8 w-full appearance-none rounded-md border bg-background py-0 pl-2.5 pr-7 text-[12px] outline-none focus:ring-1 focus:ring-primary/50"
                        >
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.company}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setMostrarSeletorRelatorio(false)}
                          className="text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => {
                            gerarRelatorio();
                            setMostrarSeletorRelatorio(false);
                            setMenuAnexoAberto(false);
                          }}
                          disabled={!clienteAtivo}
                          className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          <Sparkles className="h-3 w-3" /> Gerar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="border-t px-3.5 py-2.5">
                    <div className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                      Perguntas mais usadas
                    </div>
                    <div className="space-y-1">
                      {sugestoes.map((s) => (
                        <button
                          key={s}
                          onClick={() => {
                            enviarMensagem(s);
                            setMenuAnexoAberto(false);
                          }}
                          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Sparkles className="h-3 w-3 shrink-0 text-primary" /> {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMenuAnexoAberto((v) => !v)}
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors",
                  menuAnexoAberto
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                title="Mais opções"
              >
                <Plus
                  className={cn("h-5 w-5 transition-transform", menuAnexoAberto && "rotate-45")}
                />
              </button>
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviarMensagem(chatInput)}
                placeholder="Escreva uma mensagem..."
                className="h-12 flex-1 rounded-full border bg-card px-4 text-[14px] outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button
                onClick={() => enviarMensagem(chatInput)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function RelatorioBubble({ msg }: { msg: Extract<ChatMessage, { kind: "relatorio" }> }) {
  const { relatorio, sentimento, clientPhone, hora } = msg;
  return (
    <div className="max-w-[85%] overflow-hidden rounded-2xl rounded-tl-sm border bg-card shadow-sm">
      <div
        className={cn(
          "flex items-center gap-2 border-b px-4 py-2.5",
          sentimento.status === "bom" ? "bg-success/10" : "bg-warning/10",
        )}
      >
        {sentimento.status === "bom" ? (
          <CircleCheck className="h-3.5 w-3.5 text-success" />
        ) : (
          <CircleAlert className="h-3.5 w-3.5 text-warning" />
        )}
        <span
          className={cn(
            "text-[11px] font-medium",
            sentimento.status === "bom" ? "text-success" : "text-warning",
          )}
        >
          {sentimento.status === "bom" ? "Indo bem" : "Precisa de atenção"} · {sentimento.motivo}
        </span>
      </div>
      <div className="whitespace-pre-line px-4 py-3 text-[13px] leading-relaxed">
        {relatorio.resumo}
      </div>
      <div className="flex items-center gap-2 border-t bg-surface/30 px-4 py-2.5">
        <button
          onClick={() => exportarRelatorioPDF(relatorio)}
          className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Download className="h-3 w-3" /> Exportar PDF
        </button>
        <a
          href={linkWhatsApp(relatorio, clientPhone)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5 text-[11px] font-medium text-success transition-colors hover:bg-success/20"
        >
          <MessageCircleMore className="h-3 w-3" /> Enviar por WhatsApp
        </a>
        <span className="ml-auto text-[10px] text-muted-foreground">{hora}</span>
      </div>
    </div>
  );
}
