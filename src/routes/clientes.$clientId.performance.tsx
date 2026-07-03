import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Plug, CheckCircle2, ExternalLink, TrendingUp, MousePointerClick, DollarSign, Users2, LineChart as LineIcon, Search, Layout } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { clients, formatBRL } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clientes/$clientId/performance")({
  head: () => ({
    meta: [
      { title: "Performance do cliente · Veloce Performance OS" },
      { name: "description", content: "Painel de performance do cliente com integrações a plataformas de ads e analytics." },
    ],
  }),
  component: ClientePerformance,
});

interface Integration {
  key: string;
  name: string;
  description: string;
  icon: typeof Plug;
  accent: string;
}

const integrations: Integration[] = [
  { key: "meta", name: "Meta Ads", description: "Facebook e Instagram Ads — leia campanhas, criativos, CPL e ROAS.", icon: TrendingUp, accent: "from-blue-500/20 to-blue-500/0" },
  { key: "google-ads", name: "Google Ads", description: "Search, Performance Max e Display — cliques, conversões e CPA.", icon: MousePointerClick, accent: "from-yellow-500/20 to-yellow-500/0" },
  { key: "ga4", name: "Google Analytics", description: "GA4 — tráfego, conversões, funil e origem/mídia.", icon: LineIcon, accent: "from-orange-500/20 to-orange-500/0" },
  { key: "gsc", name: "Google Search Console", description: "SEO — impressões, cliques, CTR e posição média.", icon: Search, accent: "from-emerald-500/20 to-emerald-500/0" },
  { key: "landing", name: "Landing Pages", description: "Conecte suas páginas para métricas de conversão e A/B.", icon: Layout, accent: "from-fuchsia-500/20 to-fuchsia-500/0" },
];

function ClientePerformance() {
  const { clientId } = useParams({ from: "/clientes/$clientId/performance" });
  const client = clients.find((c) => c.id === clientId) ?? clients[0];

  return (
    <AppShell title={`Performance · ${client.company}`} subtitle="Painel de resultados por integração">
      <div className="px-4 py-6 md:px-6">
        <div className="mb-4">
          <Link to="/clientes" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para clientes
          </Link>
        </div>

        <PageHeader title={client.company} subtitle={`${client.name} · ${client.plan} · ${formatBRL(client.monthlyValue)}/mês`}>
          <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Performance</span>
        </PageHeader>

        {/* KPI resumidos */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryStat icon={DollarSign} label="Investimento" value="—" hint="Aguardando integração" />
          <SummaryStat icon={Users2} label="Leads gerados" value="—" hint="Aguardando integração" />
          <SummaryStat icon={MousePointerClick} label="CPL médio" value="—" hint="Aguardando integração" />
          <SummaryStat icon={TrendingUp} label="ROAS" value="—" hint="Aguardando integração" />
        </div>

        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Integrações</h2>
            <p className="text-[12px] text-muted-foreground">Conecte as contas do cliente para exibir performance em tempo real.</p>
          </div>
          <span className="rounded-md border bg-surface px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            0 de {integrations.length} conectadas
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((i) => (
            <IntegrationCard key={i.key} integration={i} />
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-dashed bg-surface/30 p-4 text-center">
          <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Plug className="h-4 w-4 text-primary" />
          </div>
          <p className="text-[13px] font-medium">Arquitetura preparada para integrações</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Cada card acima está pronto para receber tokens OAuth e sincronizar métricas. As APIs serão ativadas em uma próxima etapa.
          </p>
        </div>
      </div>
    </AppShell>
  );
}

function SummaryStat({ icon: Icon, label, value, hint }: { icon: typeof Plug; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] uppercase tracking-widest">{label}</span>
      </div>
      <div className="mt-2 font-mono text-xl font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function IntegrationCard({ integration }: { integration: Integration }) {
  const Icon = integration.icon;
  const connected = false;
  return (
    <div className={cn("group relative overflow-hidden rounded-lg border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-elegant")}>
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-40", integration.accent)} />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background/70 backdrop-blur">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
              connected ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
            )}
          >
            {connected ? (<><CheckCircle2 className="h-3 w-3" /> Conectado</>) : "Desconectado"}
          </span>
        </div>
        <h3 className="text-[14px] font-semibold tracking-tight">{integration.name}</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{integration.description}</p>
        <div className="mt-4 flex items-center gap-2">
          <button
            disabled
            className="inline-flex h-8 flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-md bg-primary/90 px-3 text-xs font-medium text-primary-foreground opacity-90 hover:bg-primary"
          >
            <Plug className="h-3.5 w-3.5" /> Conecte sua conta
          </button>
          <button className="inline-flex h-8 items-center justify-center rounded-md border bg-surface px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
