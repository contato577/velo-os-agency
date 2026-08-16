import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, CheckCircle2, Loader2 } from "lucide-react";

// ─── Formulário público de captura de leads ───────────────────────────────
// Essa é a página que vai no link da bio do Instagram e do TikTok. Ela NÃO
// grava direto no Supabase — ela envia os dados pro N8N (via webhook), e é
// o N8N quem grava o lead no banco. Isso deixa espaço pra você mudar depois
// no N8N (ex: mandar aviso no WhatsApp, checar duplicado, etc.) sem precisar
// mexer em código aqui de novo.
//
// >>> TROQUE A LINHA ABAIXO pela URL do seu Webhook do N8N assim que criar: <<<
const N8N_WEBHOOK_URL = "https://veloceads.app.n8n.cloud/webhook/veloce-novo-lead";

const FATURAMENTO_OPCOES = [
  "Ainda não faturo",
  "Até R$ 10 mil/mês",
  "R$ 10 mil – R$ 30 mil/mês",
  "R$ 30 mil – R$ 100 mil/mês",
  "Acima de R$ 100 mil/mês",
];

export const Route = createFileRoute("/captura")({
  head: () => ({
    meta: [
      { title: "Fale com a Veloce" },
      {
        name: "description",
        content: "Conta pra gente sobre o seu negócio e alguém da nossa equipe te chama.",
      },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  component: CapturaLead,
});

interface FormState {
  nome: string;
  empresa: string;
  telefone: string;
  cidade: string;
  nicho: string;
  faturamento: string;
}

const vazio: FormState = {
  nome: "",
  empresa: "",
  telefone: "",
  cidade: "",
  nicho: "",
  faturamento: FATURAMENTO_OPCOES[0],
};

function CapturaLead() {
  const [form, setForm] = useState<FormState>(vazio);
  const [origem, setOrigem] = useState<"Instagram" | "TikTok">("Instagram");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // A mesma página serve os dois links de bio — o que muda é só o final da URL:
  // .../captura?origem=tiktok ou .../captura?origem=instagram (padrão)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const o = params.get("origem")?.toLowerCase();
    if (o === "tiktok") setOrigem("TikTok");
  }, []);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const podeEnviar = form.nome.trim().length > 1 && form.telefone.trim().length > 7 && !enviando;

  // Barra de progresso viva — dá o empurrão de "já tô quase terminando" pra pessoa concluir.
  const camposRastreados = [form.nome, form.empresa, form.telefone, form.cidade, form.nicho];
  const preenchidos = camposRastreados.filter((v) => v.trim().length > 0).length;
  const progresso = useMemo(
    () => Math.round((preenchidos / camposRastreados.length) * 100),
    [preenchidos],
  );

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!podeEnviar) return;
    setEnviando(true);
    setErro(null);
    try {
      const resp = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome.trim(),
          empresa: form.empresa.trim(),
          telefone: form.telefone.trim(),
          cidade: form.cidade.trim(),
          nicho: form.nicho.trim(),
          faturamento: form.faturamento,
          origem,
          pagina: window.location.href,
          enviadoEm: new Date().toISOString(),
        }),
      });
      if (!resp.ok) throw new Error("Falha no envio");
      setEnviado(true);
    } catch {
      setErro(
        "Não conseguimos enviar agora. Verifica sua internet e tenta de novo em alguns segundos.",
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10"
      style={{ fontFamily: "'Montserrat', sans-serif" }}
    >
      {/* Fundo dinâmico: verde escuro e forte, exclusivo dessa página */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-80 w-80 animate-[float_10s_ease-in-out_infinite] rounded-full bg-[#0c3d24] opacity-60 blur-3xl" />
        <div className="absolute -bottom-28 -right-20 h-96 w-96 animate-[float_13s_ease-in-out_infinite_reverse] rounded-full bg-[#08291a] opacity-70 blur-3xl" />
        <div className="absolute left-1/2 top-1/4 h-64 w-64 -translate-x-1/2 animate-[float_15s_ease-in-out_infinite] rounded-full bg-[#0f5132] opacity-30 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black" />
      </div>

      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-24px) translateX(14px); } }
        @keyframes subir { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .subir { animation: subir 0.5s ease-out both; }
      `}</style>

      <div className="relative z-10 w-full max-w-md">
        {!enviado ? (
          <form
            onSubmit={enviar}
            className="subir rounded-2xl border border-[#1c4a30] bg-[#070a08]/80 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-8"
          >
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-4 text-2xl font-semibold tracking-[0.15em] text-white sm:text-3xl">
                VELOCE
              </div>
              <h1 className="text-lg font-medium text-white sm:text-xl">
                Conte sobre o seu negócio
              </h1>
              <p className="mt-2 text-[13px] font-light leading-relaxed text-white/70">
                Preencha os dados abaixo. Nossa equipe analisa seu momento atual e retorna com
                transparência sobre os próximos passos.
              </p>
            </div>

            {/* Barra de progresso — some visualmente o quanto falta */}
            <div className="mb-5">
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-medium text-white/50">
                <span>Progresso</span>
                <span>{progresso}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#0f5132] to-[#4ade80] transition-all duration-500 ease-out"
                  style={{ width: `${progresso}%` }}
                />
              </div>
            </div>

            <div className="space-y-3.5">
              <Campo label="Seu nome*" preenchido={form.nome.trim().length > 0}>
                <input
                  required
                  autoFocus
                  placeholder="Como podemos te chamar"
                  className={inputCls}
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                />
              </Campo>

              <Campo label="Empresa / marca" preenchido={form.empresa.trim().length > 0}>
                <input
                  placeholder="Nome do seu negócio"
                  className={inputCls}
                  value={form.empresa}
                  onChange={(e) => set("empresa", e.target.value)}
                />
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="WhatsApp*" preenchido={form.telefone.trim().length > 0}>
                  <input
                    required
                    type="tel"
                    placeholder="(11) 9…"
                    className={inputCls}
                    value={form.telefone}
                    onChange={(e) => set("telefone", e.target.value)}
                  />
                </Campo>
                <Campo label="Cidade" preenchido={form.cidade.trim().length > 0}>
                  <input
                    placeholder="Sua cidade"
                    className={inputCls}
                    value={form.cidade}
                    onChange={(e) => set("cidade", e.target.value)}
                  />
                </Campo>
              </div>

              <Campo label="Qual seu nicho?" preenchido={form.nicho.trim().length > 0}>
                <input
                  placeholder="Ex: estética, advocacia, moda…"
                  className={inputCls}
                  value={form.nicho}
                  onChange={(e) => set("nicho", e.target.value)}
                />
              </Campo>

              <Campo label="Faturamento aproximado hoje">
                <select
                  className={inputCls}
                  value={form.faturamento}
                  onChange={(e) => set("faturamento", e.target.value)}
                >
                  {FATURAMENTO_OPCOES.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>

            {erro && <p className="mt-3 text-[12px] font-light text-red-400">{erro}</p>}

            <button
              type="submit"
              disabled={!podeEnviar}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0f5132] to-[#1a7a4c] py-3 text-sm font-medium tracking-wide text-white shadow-lg shadow-[#0f5132]/30 transition-all hover:brightness-110 disabled:opacity-40"
            >
              {enviando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : (
                "Enviar meus dados"
              )}
            </button>

            <p className="mt-3 text-center text-[11px] font-light text-white/45">
              Seus dados ficam só com a gente, sem spam.
            </p>
          </form>
        ) : (
          <div className="subir flex flex-col items-center rounded-2xl border border-[#1c4a30] bg-[#070a08]/80 p-8 text-center shadow-2xl shadow-black/60 backdrop-blur-xl">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#0f5132]/25">
              <CheckCircle2 className="h-8 w-8 text-[#4ade80]" />
            </div>
            <h2 className="text-lg font-medium text-white">Recebemos seu contato</h2>
            <p className="mt-2 text-[13px] font-light leading-relaxed text-white/70">
              Um especialista vai analisar suas informações e retornar pelo WhatsApp que você
              deixou, com transparência sobre os próximos passos.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-[#1c4a30] bg-white/[0.03] px-3.5 py-2.5 text-sm font-normal text-white placeholder:text-white/35 outline-none transition-colors focus:border-[#4ade80]/70 focus:bg-white/[0.06]";

function Campo({
  label,
  children,
  preenchido,
}: {
  label: string;
  children: React.ReactNode;
  preenchido?: boolean;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-white/55">
        {label}
        {preenchido && <Check className="h-3 w-3 text-[#4ade80]" />}
      </div>
      {children}
    </div>
  );
}
