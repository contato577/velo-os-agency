import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, AlertCircle, MailCheck } from "lucide-react";
import { getSessionAsync, signInReal, signUpReal, traduzirErroAuth } from "@/lib/auth";
import { playLogin } from "@/lib/sound";
import veloceLogo from "@/assets/veloce-logo.jpg.asset.json";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar · Veloce" },
      { name: "description", content: "Acesse o Veloce — sistema operacional da sua agência." },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aguardandoConfirmacao, setAguardandoConfirmacao] = useState(false);

  useEffect(() => {
    getSessionAsync().then((s) => {
      if (s) navigate({ to: "/" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setErro(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const entrouDireto = await signUpReal(email, password, name);
        if (!entrouDireto) {
          // Supabase está pedindo confirmação por e-mail antes de liberar o acesso
          setAguardandoConfirmacao(true);
          setLoading(false);
          return;
        }
      } else {
        await signInReal(email, password);
      }
      playLogin();
      navigate({ to: "/" });
    } catch (err) {
      setErro(
        traduzirErroAuth(
          err instanceof Error ? err.message : "Não foi possível entrar. Tente de novo.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,oklch(0.72_0.19_155/.18),transparent)]" />
      <div className="pointer-events-none absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-surface-2 ring-1 ring-primary/40">
            <img src={veloceLogo.url} alt="Veloce" className="h-11 w-11 object-cover" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Bem-vindo ao Veloce</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              O sistema operacional da sua agência.
            </p>
          </div>
        </div>

        {aguardandoConfirmacao ? (
          <div className="rounded-2xl border bg-card p-6 text-center shadow-elegant">
            <MailCheck className="mx-auto mb-3 h-8 w-8 text-primary" />
            <h2 className="text-[15px] font-semibold">Confirme seu e-mail</h2>
            <p className="mt-2 text-[13px] text-muted-foreground">
              Enviamos um link de confirmação para <b>{email}</b>. Clique nele e depois volte aqui
              pra entrar.
            </p>
            <button
              onClick={() => {
                setAguardandoConfirmacao(false);
                setMode("signin");
              }}
              className="mt-4 text-[12px] font-medium text-primary hover:underline"
            >
              Já confirmei, quero entrar
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-6 shadow-elegant">
            <div className="mb-4 flex items-center gap-1 rounded-md border bg-surface p-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErro(null);
                }}
                className={`flex-1 rounded px-3 py-1.5 font-medium transition-colors ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setErro(null);
                }}
                className={`flex-1 rounded px-3 py-1.5 font-medium transition-colors ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                Criar conta
              </button>
            </div>

            <form onSubmit={submit} className="space-y-3">
              {mode === "signup" && (
                <Field label="Nome">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Rafael Souza"
                    className={inputCls}
                  />
                </Field>
              )}
              <Field label="E-mail">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  required
                  placeholder="voce@agencia.com"
                  className={inputCls}
                  autoComplete="email"
                />
              </Field>
              <Field label="Senha">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className={inputCls}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </Field>

              {erro && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
              >
                {loading ? "Entrando…" : mode === "signin" ? "Entrar no Veloce" : "Criar conta"}
                {!loading && <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Veloce · v1.0 · feito para operar uma agência inteira sozinho
        </p>
      </div>
    </div>
  );
}

const inputCls =
  "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-[13px] shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
