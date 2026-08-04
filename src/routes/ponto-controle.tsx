import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Target,
  CalendarCheck,
  Save,
  History,
  ThumbsUp,
  ThumbsDown,
  ListChecks,
  Flag,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { formatBRL } from "@/lib/mock-data";
import { useDataStore, mesAtualISO, formatMesLabel, type PontoControle } from "@/lib/data-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ponto-controle")({
  head: () => ({
    meta: [
      { title: "Ponto de Controle · Veloce" },
      { name: "description", content: "Reunião estratégica mensal: análise do mês anterior, metas e prioridades do mês." },
      { property: "og:title", content: "Ponto de Controle · Veloce" },
      { property: "og:description", content: "Planejamento estratégico mensal da agência com metas comercial e operacional/qualidade." },
    ],
  }),
  component: PontoControlePage,
});

type Form = Omit<PontoControle, "id" | "criadoEm" | "ano">;

const vazio = (mes: string): Form => ({
  mes,
  analiseAnterior: "",
  funcionou: "",
  naoFuncionou: "",
  objetivos: "",
  metaComercial: 0,
  metaOperacional: 0,
  metaOperacionalDescricao: "",
  prioridades: "",
  proximosPassos: "",
});

function PontoControlePage() {
  const { pontosControle, pontoControleAtual, salvarPontoControle, leads, clients } = useDataStore();
  const mes = mesAtualISO();
  const [form, setForm] = useState<Form>(() =>
    pontoControleAtual ? { ...pontoControleAtual } : vazio(mes),
  );
  const [saved, setSaved] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);

  const vendasReal = useMemo(
    () => leads.filter((l) => l.stage === "fechado").reduce((s, l) => s + l.value, 0),
    [leads],
  );
  const clientesAtivos = useMemo(() => clients.filter((c) => c.status === "ativo").length, [clients]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setSaved(false);
  };

  const handleSave = () => {
    salvarPontoControle(form);
    setSaved(true);
  };

  const historico = pontosControle.filter((p) => p.mes !== mes);

  return (
    <AppShell title="Ponto de Controle" subtitle="Reunião estratégica mensal">
      <div className="px-4 py-6 md:px-6">
        <PageHeader
          title="Ponto de Controle"
          subtitle="Reunião estratégica mensal — registre a análise do mês anterior e o planejamento do mês vigente."
        >
          <div className="flex items-center gap-2 rounded-lg border bg-surface px-3 py-1.5 text-xs">
            <CalendarCheck className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{formatMesLabel(mes)}</span>
          </div>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-3.5 w-3.5" /> Salvar planejamento
          </button>
        </PageHeader>

        {saved && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-[12px] text-success">
            <CheckCircle2 className="h-4 w-4" />
            Planejamento de {formatMesLabel(form.mes)} registrado. O Comercial já usa esta meta.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Análise do mês anterior */}
          <Bloco
            className="lg:col-span-2"
            icon={History}
            title="Análise do mês anterior"
            subtitle="O que os números mostraram e o aprendizado do período"
          >
            <Campo
              label="Resumo da análise"
              value={form.analiseAnterior}
              onChange={(v) => set("analiseAnterior", v)}
              placeholder="Resultados, desvios de meta, aprendizados..."
              rows={4}
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Campo
                label="O que funcionou"
                icon={ThumbsUp}
                value={form.funcionou}
                onChange={(v) => set("funcionou", v)}
                placeholder="Canais, abordagens e processos que performaram"
              />
              <Campo
                label="O que não funcionou"
                icon={ThumbsDown}
                value={form.naoFuncionou}
                onChange={(v) => set("naoFuncionou", v)}
                placeholder="Gargalos, desperdícios e falhas de execução"
              />
            </div>
          </Bloco>

          {/* Metas */}
          <Bloco icon={Target} title="Metas do mês" subtitle="Somente duas categorias">
            <div className="rounded-lg border bg-surface/50 p-3">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Meta Comercial (R$)
              </label>
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-muted-foreground">R$</span>
                <input
                  type="number"
                  value={form.metaComercial || ""}
                  onChange={(e) => set("metaComercial", Number(e.target.value))}
                  className="w-full bg-transparent font-mono text-lg font-semibold outline-none"
                  placeholder="0"
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Realizado até agora: <span className="font-mono text-primary">{formatBRL(vendasReal)}</span>
              </p>
            </div>

            <div className="rounded-lg border bg-surface/50 p-3">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Meta Operacional / Qualidade
              </label>
              <input
                type="number"
                value={form.metaOperacional || ""}
                onChange={(e) => set("metaOperacional", Number(e.target.value))}
                className="w-full bg-transparent font-mono text-lg font-semibold outline-none"
                placeholder="0"
              />
              <input
                value={form.metaOperacionalDescricao}
                onChange={(e) => set("metaOperacionalDescricao", e.target.value)}
                placeholder="Indicador (ex.: clientes ativos com entrega em dia)"
                className="mt-2 w-full rounded-md border bg-background px-2 py-1.5 text-[12px] outline-none focus:border-primary/60"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Clientes ativos hoje: <span className="font-mono text-primary">{clientesAtivos}</span>
              </p>
            </div>
          </Bloco>

          {/* Planejamento */}
          <Bloco icon={Flag} title="Objetivos do mês" subtitle="Onde queremos chegar">
            <Campo
              label="Objetivos"
              value={form.objetivos}
              onChange={(v) => set("objetivos", v)}
              placeholder="Objetivos estratégicos do mês"
              rows={5}
            />
          </Bloco>

          <Bloco icon={ListChecks} title="Prioridades" subtitle="Foco inegociável do período">
            <Campo
              label="Prioridades"
              value={form.prioridades}
              onChange={(v) => set("prioridades", v)}
              placeholder="1. ...&#10;2. ...&#10;3. ..."
              rows={5}
            />
          </Bloco>

          <Bloco icon={ClipboardList} title="Próximos passos" subtitle="Ações concretas definidas na reunião">
            <Campo
              label="Próximos passos"
              value={form.proximosPassos}
              onChange={(v) => set("proximosPassos", v)}
              placeholder="Ações, responsáveis e prazos"
              rows={5}
            />
          </Bloco>
        </div>

        {/* Histórico */}
        <div className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight">
            <History className="h-4 w-4 text-primary" /> Histórico de reuniões
          </h2>
          {historico.length === 0 ? (
            <div className="rounded-xl border bg-card p-6 text-center text-xs text-muted-foreground">
              Nenhum ponto de controle anterior registrado. Cada mês é preservado sem sobrescrever o anterior.
            </div>
          ) : (
            <div className="space-y-2">
              {historico.map((p) => (
                <div key={p.id} className="rounded-xl border bg-card">
                  <button
                    onClick={() => setAberto((a) => (a === p.id ? null : p.id))}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="h-4 w-4 text-primary" />
                      <span className="text-[13px] font-semibold">{formatMesLabel(p.mes)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>
                        Comercial <span className="font-mono text-foreground">{formatBRL(p.metaComercial)}</span>
                      </span>
                      <span>
                        Operacional/Qualidade <span className="font-mono text-foreground">{p.metaOperacional}</span>
                      </span>
                    </div>
                  </button>
                  {aberto === p.id && (
                    <div className="grid grid-cols-1 gap-3 border-t px-4 py-3 text-[12px] md:grid-cols-2">
                      <Leitura label="Análise do mês anterior" value={p.analiseAnterior} />
                      <Leitura label="Objetivos" value={p.objetivos} />
                      <Leitura label="O que funcionou" value={p.funcionou} />
                      <Leitura label="O que não funcionou" value={p.naoFuncionou} />
                      <Leitura label="Prioridades" value={p.prioridades} />
                      <Leitura label="Próximos passos" value={p.proximosPassos} />
                    </div>
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

function Bloco({
  icon: Icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="leading-tight">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </label>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-y rounded-md border bg-surface/50 px-2.5 py-2 text-[12px] leading-relaxed outline-none focus:border-primary/60"
      />
    </div>
  );
}

function Leitura({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-surface/40 p-3">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <p className="whitespace-pre-wrap text-[12px] leading-relaxed">{value || "—"}</p>
    </div>
  );
}
