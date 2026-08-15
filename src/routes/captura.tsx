import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Instagram, Loader2, Rocket, Sparkles } from "lucide-react";
import veloceLogo from "@/assets/veloce-logo.jpg.asset.json";

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0b0d10] px-4 py-10">
      {/* Fundo dinâmico: blobs de gradiente flutuando devagar, só efeito visual */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 animate-[float_9s_ease-in-out_infinite] rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute -bottom-24 -right-16 h-80 w-80 animate-[float_11s_ease-in-out_infinite_reverse] rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-56 w-56 -translate-x-1/2 animate-[float_13s_ease-in-out_infinite] rounded-full bg-sky-500/10 blur-3xl" />
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
            className="subir rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl sm:p-8"
          >
            <div className="mb-6 flex flex-col items-center text-center">
              <img
                src={veloceLogo.url}
                alt="Veloce"
                className="mb-3 h-12 w-12 rounded-xl object-cover shadow-lg"
              />
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary">
                <Sparkles className="h-3 w-3" />
                {origem === "TikTok" ? "Vim do TikTok" : "Vim do Instagram"}
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                Vamos turbinar o seu negócio
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">
                Preenche rapidinho e nossa equipe te chama no WhatsApp em breve.
              </p>
            </div>

            <div className="space-y-3.5">
              <Campo label="Seu nome*">
                <input
                  required
                  autoFocus
                  placeholder="Como podemos te chamar"
                  className={inputCls}
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                />
              </Campo>

              <Campo label="Empresa / marca">
                <input
                  placeholder="Nome do seu negócio"
                  className={inputCls}
                  value={form.empresa}
                  onChange={(e) => set("empresa", e.target.value)}
                />
              </Campo>

              <div className="grid grid-cols-2 gap-3">
                <Campo label="WhatsApp*">
                  <input
                    required
                    type="tel"
                    placeholder="(11) 9…"
                    className={inputCls}
                    value={form.telefone}
                    onChange={(e) => set("telefone", e.target.value)}
                  />
                </Campo>
                <Campo label="Cidade">
                  <input
                    placeholder="Sua cidade"
                    className={inputCls}
                    value={form.cidade}
                    onChange={(e) => set("cidade", e.target.value)}
                  />
                </Campo>
              </div>

              <Campo label="Qual seu nicho?">
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

            {erro && <p className="mt-3 text-[12px] text-destructive">{erro}</p>}

            <button
              type="submit"
              disabled={!podeEnviar}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 disabled:opacity-40"
            >
              {enviando ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4" /> Quero falar com a equipe
                </>
              )}
            </button>

            <p className="mt-3 flex items-center justify-center gap-1 text-center text-[10px] text-white/35">
              <Instagram className="h-3 w-3" /> Seus dados ficam só com a gente, sem spam.
            </p>
          </form>
        ) : (
          <div className="subir flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl backdrop-blur-xl">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-white">Recebemos seu contato! 🎉</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-white/60">
              Em breve alguém da nossa equipe fala com você no WhatsApp que você deixou. Fica de
              olho!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-primary/60 focus:bg-white/[0.09]";

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-medium text-white/50">{label}</div>
      {children}
    </div>
  );
}
