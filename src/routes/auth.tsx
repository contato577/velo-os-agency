import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { getSession, signIn } from "@/lib/auth-mock";
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
  const [email, setEmail] = useState("rafael@veloce.com");
  const [password, setPassword] = useState("••••••••");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) navigate({ to: "/" });
  }, [navigate]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => {
      signIn(email, mode === "signup" ? name : undefined);
      navigate({ to: "/" });
    }, 400);
  };

  return (
    <div className="dark relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,oklch(0.72_0.19_155/.18),transparent)]" />
      <div className="pointer-events-none absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-black ring-1 ring-primary/30">
            <img src={veloceLogo.url} alt="Veloce" className="h-11 w-11 object-cover" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight">Bem-vindo ao Veloce</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              O sistema operacional da sua agência.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-elegant">
          <div className="mb-4 flex items-center gap-1 rounded-md border bg-surface p-1 text-xs">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 rounded px-3 py-1.5 font-medium transition-colors ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode("signup")}
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
                placeholder="••••••••"
                className={inputCls}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
            >
              {loading ? "Entrando…" : mode === "signin" ? "Entrar no Veloce" : "Criar conta"}
              {!loading && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </form>

          <div className="mt-4 flex items-center gap-2 rounded-md border border-dashed bg-surface/40 p-2.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3 shrink-0 text-primary" />
            <span>
              Modo demonstração — qualquer credencial funciona. A autenticação real será conectada ao Lovable Cloud.
            </span>
          </div>
        </div>

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
