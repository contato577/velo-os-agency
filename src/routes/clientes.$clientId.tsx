import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  Plug,
  ExternalLink,
  Download,
  MessageSquare,
  Folder,
  CheckSquare,
  FileUp,
  Wallet,
  History,
  LineChart as LineIcon,
  MousePointerClick,
  Search as SearchIcon,
  Layout as LayoutIcon,
  TrendingUp,
  Paperclip,
  FolderOpen,
  Link as LinkIcon,
  Plus,
  ChevronDown,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { clients, projects, tasks, formatBRL, type Client } from "@/lib/mock-data";
import { gerarResumoCliente, exportarRelatorioPDF, linkWhatsApp } from "@/lib/client-report";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/clientes/$clientId")({
  head: () => ({
    meta: [
      { title: "Cliente · Veloce" },
      { name: "description", content: "Visão 360° do cliente: geral, performance, operação, financeiro, documentos e histórico." },
    ],
  }),
  component: ClienteDetalhe,
});

type Tab = "geral" | "performance" | "operacao" | "financeiro" | "documentos" | "historico";

const tabsList: { key: Tab; label: string; icon: typeof User }[] = [
  { key: "geral", label: "Geral", icon: User },
  { key: "performance", label: "Performance", icon: TrendingUp },
  { key: "operacao", label: "Operação", icon: Folder },
  { key: "financeiro", label: "Financeiro", icon: Wallet },
  { key: "documentos", label: "Documentos", icon: FolderOpen },
  { key: "historico", label: "Histórico", icon: History },
];

function ClienteDetalhe() {
  const { clientId } = useParams({ from: "/clientes/$clientId" });
  const client = clients.find((c) => c.id === clientId) ?? clients[0];
  const [tab, setTab] = useState<Tab>("geral");

  return (
    <AppShell title={client.company} subtitle={`${client.plan} · ${formatBRL(client.monthlyValue)}/mês`}>
      <div className="px-4 py-6 md:px-6">
        <div className="mb-4">
          <Link to="/clientes" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para clientes
          </Link>
        </div>

        <PageHeader title={client.company} subtitle={`${client.name} · Responsável ${client.owner}`}>
          <span
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
              client.status === "ativo" && "bg-success/15 text-success",
              client.status === "onboarding" && "bg-info/15 text-info",
              client.status === "pausado" && "bg-warning/15 text-warning",
              client.status === "cancelado" && "bg-destructive/15 text-destructive",
            )}
          >
            {client.status}
          </span>
        </PageHeader>

        {/* Tabs */}
        <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b">
          {tabsList.map((t) => {
            const Icon = t.icon;
            const active = t.key === tab;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>

        {tab === "geral" && <TabGeral client={client} />}
        {tab === "performance" && <TabPerformance client={client} />}
        {tab === "operacao" && <TabOperacao clientId={client.id} />}
        {tab === "financeiro" && <TabFinanceiro client={client} />}
        {tab === "documentos" && <TabDocumentos />}
        {tab === "historico" && <TabHistorico client={client} />}
      </div>
    </AppShell>
  );
}

// ─── GERAL ───────────────────────────────────────────────────────────────────
function TabGeral({ client }: { client: (typeof clients)[number] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border bg-card p-5 lg:col-span-2">
        <h3 className="mb-4 text-sm font-semibold tracking-tight">Dados da empresa</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field icon={Building2} label="Empresa" value={client.company} />
          <Field icon={User} label="Contato principal" value={client.name} />
          <Field icon={Phone} label="Telefone" value={`+55 11 9${String(80000000 + client.id.length * 12345).slice(0, 8)}`} />
          <Field icon={Mail} label="E-mail" value={`contato@${client.company.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}.com.br`} />
          <Field icon={Calendar} label="Cliente desde" value={new Date(client.since).toLocaleDateString("pt-BR")} />
          <Field icon={User} label="Responsável Veloce" value={client.owner} />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold tracking-tight">Contrato</h3>
        <div className="space-y-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Plano contratado</div>
            <div className="mt-1 text-[15px] font-semibold">{client.plan}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Mensalidade</div>
            <div className="mt-1 font-mono text-[20px] font-semibold text-primary">{formatBRL(client.monthlyValue)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Vencimento</div>
            <div className="mt-1 text-[13px]">Dia {client.paymentDay} de cada mês</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Renovação</div>
            <div className="mt-1 text-[13px]">{new Date(client.renewalDate).toLocaleDateString("pt-BR")}</div>
          </div>
          <div>
            <div className="mb-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">Serviços</div>
            <div className="flex flex-wrap gap-1">
              {client.services.map((s) => (
                <span key={s} className="rounded bg-surface px-1.5 py-0.5 text-[11px] text-muted-foreground">{s}</span>
              ))}
            </div>
          </div>
          <button className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border bg-surface px-3 py-2 text-xs font-medium hover:bg-accent">
            <FileText className="h-3.5 w-3.5" /> Ver contrato
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="truncate text-[13px]">{value}</div>
      </div>
    </div>
  );
}

// ─── PERFORMANCE ─────────────────────────────────────────────────────────────
const integrations = [
  { key: "meta", name: "Meta Ads", description: "Facebook e Instagram — investimento, leads, CPL, CTR e ROAS." },
  { key: "google-ads", name: "Google Ads", description: "Cliques, conversões, CTR e CPC." },
  { key: "ga4", name: "Google Analytics", description: "Usuários, sessões e conversões." },
  { key: "gsc", name: "Google Search Console", description: "Impressões, cliques, CTR e posição média." },
  { key: "landing", name: "Landing Pages", description: "Visitantes, conversões e taxa de conversão." },
];

function TabPerformance({ client }: { client: Client }) {
  const [exporting, setExporting] = useState(false);
  const clientProjects = projects.filter((p) => p.clientId === client.id);
  const relatorio = useMemo(() => gerarResumoCliente(client, clientProjects), [client, clientProjects]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportarRelatorioPDF(relatorio);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Resumo em linguagem simples */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Resumo do período</h3>
            <p className="text-[11px] text-muted-foreground">{relatorio.periodo} · gerado automaticamente</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
            >
              <Download className="h-3.5 w-3.5" /> {exporting ? "Gerando…" : "Exportar PDF"}
            </button>
            <a
              href={linkWhatsApp(relatorio)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-medium text-success hover:bg-success/20"
            >
              <MessageSquare className="h-3.5 w-3.5" /> Enviar por WhatsApp
            </a>
          </div>
        </div>
        <pre className="whitespace-pre-wrap rounded-md border bg-surface/40 p-4 text-[12.5px] leading-relaxed text-foreground/90 font-sans">
          {relatorio.resumo}
        </pre>
      </div>

      {/* Integrações */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-semibold tracking-tight">Integrações de performance</h3>
          <p className="text-[12px] text-muted-foreground">Conecte contas para trazer dados de anúncios em tempo real.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {integrations.map((i) => (
            <div key={i.key} className="group relative overflow-hidden rounded-lg border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-elegant">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background/70">
                  {i.key === "meta" && <TrendingUp className="h-4 w-4" />}
                  {i.key === "google-ads" && <MousePointerClick className="h-4 w-4" />}
                  {i.key === "ga4" && <LineIcon className="h-4 w-4" />}
                  {i.key === "gsc" && <SearchIcon className="h-4 w-4" />}
                  {i.key === "landing" && <LayoutIcon className="h-4 w-4" />}
                </div>
                <span className="rounded border border-info/30 bg-info/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-info">
                  Em breve
                </span>
              </div>
              <h4 className="text-[14px] font-semibold tracking-tight">{i.name}</h4>
              <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{i.description}</p>
              <p className="mt-3 text-[11px] italic text-muted-foreground">
                Autenticação OAuth com {i.name.split(" ")[0]} exige backend com armazenamento seguro de tokens. Disponível quando o banco de dados for ativado.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <button
                  disabled
                  className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border bg-surface px-3 text-xs font-medium text-muted-foreground opacity-70"
                >
                  <Plug className="h-3.5 w-3.5" /> Disponível em breve
                </button>
                <button className="inline-flex h-8 items-center justify-center rounded-md border bg-surface px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DOCUMENTOS ─────────────────────────────────────────────────────────────
type DocCategory = "Atas" | "Relatórios" | "Estratégia" | "Contratos" | "Outros";
interface DocItem {
  id: string;
  title: string;
  category: DocCategory;
  type: "file" | "link";
  url?: string;
  size?: string;
  addedBy: string;
  addedAt: string;
}

const seedDocs: DocItem[] = [
  { id: "d1", title: "Ata reunião kickoff.pdf", category: "Atas", type: "file", size: "420 KB", addedBy: "Rafael Souza", addedAt: "2026-06-01" },
  { id: "d2", title: "Relatório Junho 2026.pdf", category: "Relatórios", type: "file", size: "1.2 MB", addedBy: "Camila Torres", addedAt: "2026-07-01" },
  { id: "d3", title: "Plano estratégico Q3", category: "Estratégia", type: "link", url: "https://miro.com/app/board/exemplo", addedBy: "Rafael Souza", addedAt: "2026-06-15" },
  { id: "d4", title: "Contrato assinado.pdf", category: "Contratos", type: "file", size: "480 KB", addedBy: "Sistema", addedAt: "2025-01-15" },
];

function TabDocumentos() {
  const [docs, setDocs] = useState<DocItem[]>(seedDocs);
  const [query, setQuery] = useState("");
  const [addingIn, setAddingIn] = useState<DocCategory | null>(null);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const categories: DocCategory[] = ["Atas", "Relatórios", "Estratégia", "Contratos", "Outros"];
  const filtered = docs.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()));

  const addFile = (category: DocCategory, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const now = new Date().toISOString().slice(0, 10);
    const items: DocItem[] = Array.from(files).map((f, i) => ({
      id: `d-${Date.now()}-${i}`,
      title: f.name,
      category,
      type: "file",
      size: `${Math.max(1, Math.round(f.size / 1024))} KB`,
      addedBy: "Rafael Souza",
      addedAt: now,
    }));
    setDocs((prev) => [...items, ...prev]);
  };

  const addLink = (category: DocCategory) => {
    if (!linkTitle || !linkUrl) return;
    setDocs((prev) => [
      {
        id: `d-${Date.now()}`,
        title: linkTitle,
        category,
        type: "link",
        url: linkUrl,
        addedBy: "Rafael Souza",
        addedAt: new Date().toISOString().slice(0, 10),
      },
      ...prev,
    ]);
    setLinkTitle("");
    setLinkUrl("");
    setAddingIn(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Documentos do cliente</h3>
          <p className="text-[12px] text-muted-foreground">Atas, relatórios, contratos e links externos (Miro, Figma, etc).</p>
        </div>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar em todos os documentos…"
            className="h-8 w-64 rounded-md border bg-surface pl-7 pr-2 text-xs focus:border-primary/60 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => {
          const items = filtered.filter((d) => d.category === cat);
          return (
            <details key={cat} open className="group rounded-xl border bg-card">
              <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-surface/40">
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-0 [details:not([open])>&]:-rotate-90" />
                <FolderOpen className="h-4 w-4 text-primary" />
                <span className="text-[13px] font-medium">{cat}</span>
                <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{items.length}</span>
                <div className="ml-auto flex gap-2" onClick={(e) => e.preventDefault()}>
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border bg-surface px-2 py-1 text-[11px] hover:bg-accent">
                    <FileUp className="h-3 w-3" /> Arquivo
                    <input type="file" multiple className="hidden" onChange={(e) => addFile(cat, e.target.files)} />
                  </label>
                  <button
                    onClick={() => setAddingIn(addingIn === cat ? null : cat)}
                    className="inline-flex items-center gap-1 rounded-md border bg-surface px-2 py-1 text-[11px] hover:bg-accent"
                  >
                    <LinkIcon className="h-3 w-3" /> Link
                  </button>
                </div>
              </summary>

              <div className="border-t p-3">
                {addingIn === cat && (
                  <div className="mb-3 flex flex-wrap items-end gap-2 rounded-md border bg-surface/40 p-2">
                    <input
                      value={linkTitle}
                      onChange={(e) => setLinkTitle(e.target.value)}
                      placeholder="Título do link"
                      className="h-8 flex-1 rounded-md border bg-background px-2 text-xs"
                    />
                    <input
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://…"
                      className="h-8 flex-1 rounded-md border bg-background px-2 text-xs"
                    />
                    <button
                      onClick={() => addLink(cat)}
                      className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {items.length === 0 ? (
                  <div className="rounded-md border border-dashed py-4 text-center text-[11px] text-muted-foreground">
                    Nenhum documento nesta categoria ainda.
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {items.map((d) => (
                      <li key={d.id} className="flex items-center gap-2.5 rounded-md border bg-surface/50 px-3 py-2 text-[12px]">
                        {d.type === "file" ? <FileText className="h-3.5 w-3.5 text-muted-foreground" /> : <LinkIcon className="h-3.5 w-3.5 text-info" />}
                        {d.type === "link" ? (
                          <a href={d.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate hover:text-primary">
                            {d.title}
                          </a>
                        ) : (
                          <span className="min-w-0 flex-1 truncate">{d.title}</span>
                        )}
                        <span className="hidden text-[10px] text-muted-foreground sm:inline">{d.addedBy}</span>
                        <span className="text-[10px] text-muted-foreground">{new Date(d.addedAt).toLocaleDateString("pt-BR")}</span>
                        {d.size && <span className="text-[10px] text-muted-foreground">{d.size}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}

// ─── OPERAÇÃO ────────────────────────────────────────────────────────────────
function TabOperacao({ clientId }: { clientId: string }) {
  const clientProjects = projects.filter((p) => p.clientId === clientId);
  const clientTasks = tasks.filter((t) => t.clientId === clientId);
  const checklist = [
    { id: "cl1", text: "Kickoff realizado", done: true },
    { id: "cl2", text: "Pixel Meta instalado", done: true },
    { id: "cl3", text: "Landing page publicada", done: true },
    { id: "cl4", text: "Primeira campanha ativa", done: false },
    { id: "cl5", text: "Relatório mensal enviado", done: false },
  ];
  const arquivos = [
    { id: "f1", name: "Briefing_kickoff.pdf", size: "1.2 MB" },
    { id: "f2", name: "Contrato_assinado.pdf", size: "480 KB" },
    { id: "f3", name: "Criativos_Julho.zip", size: "12.4 MB" },
  ];
  const comentarios = [
    { id: "c1", user: "Rafael Souza", time: "há 2h", text: "Cliente aprovou os criativos para veiculação." },
    { id: "c2", user: "Camila Torres", time: "há 1d", text: "Ajustamos o público da campanha conforme feedback." },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {/* Projetos */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">Projetos ativos</h3>
            <span className="text-[11px] text-muted-foreground">{clientProjects.length} projetos</span>
          </div>
          <div className="space-y-2">
            {clientProjects.length === 0 && (
              <div className="rounded-md border border-dashed py-6 text-center text-[12px] text-muted-foreground">
                Nenhum projeto ativo para este cliente.
              </div>
            )}
            {clientProjects.map((p) => (
              <div key={p.id} className="rounded-md border bg-surface/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[13px] font-medium">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">{p.type} · Responsável {p.owner}</div>
                  </div>
                  <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">{p.progress}%</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded bg-background">
                  <div className="h-full rounded bg-primary" style={{ width: `${p.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tarefas */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">Tarefas</h3>
            <span className="text-[11px] text-muted-foreground">{clientTasks.length} tarefas</span>
          </div>
          <ul className="space-y-1">
            {clientTasks.length === 0 && (
              <li className="rounded-md border border-dashed py-6 text-center text-[12px] text-muted-foreground">
                Nenhuma tarefa vinculada a este cliente.
              </li>
            )}
            {clientTasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 rounded-md border bg-surface/50 px-2.5 py-2">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    t.priority === "urgente" && "bg-destructive",
                    t.priority === "alta" && "bg-warning",
                    t.priority === "media" && "bg-info",
                    t.priority === "baixa" && "bg-muted-foreground",
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-[13px]">{t.title}</span>
                <span className="text-[10px] text-muted-foreground">{t.owner.split(" ")[0]}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Comentários */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-sm font-semibold tracking-tight">Comentários da equipe</h3>
          </div>
          <div className="space-y-3">
            {comentarios.map((c) => (
              <div key={c.id} className="rounded-md bg-surface/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium">{c.user}</span>
                  <span className="text-[10px] text-muted-foreground">{c.time}</span>
                </div>
                <p className="mt-1 text-[13px] text-muted-foreground">{c.text}</p>
              </div>
            ))}
            <textarea
              placeholder="Adicionar comentário…"
              rows={2}
              className="w-full rounded-md border bg-background px-3 py-2 text-[13px] focus:border-primary/60 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Checklist */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-sm font-semibold tracking-tight">Checklist de entregas</h3>
          </div>
          <ul className="space-y-1">
            {checklist.map((c) => (
              <li key={c.id} className="flex items-center gap-2.5 rounded-md p-2 hover:bg-accent">
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    c.done ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {c.done && <CheckSquare className="h-2.5 w-2.5" />}
                </span>
                <span className={cn("text-[13px]", c.done && "text-muted-foreground line-through")}>{c.text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Arquivos */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold tracking-tight">Arquivos</h3>
            </div>
            <button className="inline-flex items-center gap-1 rounded-md border bg-surface px-2 py-1 text-[11px] hover:bg-accent">
              <FileUp className="h-3 w-3" /> Upload
            </button>
          </div>
          <ul className="space-y-1">
            {arquivos.map((a) => (
              <li key={a.id} className="flex items-center gap-2 rounded-md border bg-surface/50 px-2.5 py-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-[12px]">{a.name}</span>
                <span className="text-[10px] text-muted-foreground">{a.size}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── FINANCEIRO ──────────────────────────────────────────────────────────────
function TabFinanceiro({ client }: { client: (typeof clients)[number] }) {
  const pagamentos = Array.from({ length: 6 }, (_, i) => ({
    id: `pg-${i}`,
    date: new Date(2026, 6 - i, client.paymentDay).toLocaleDateString("pt-BR"),
    value: client.monthlyValue,
    status: i === 0 ? "pendente" : "pago",
  }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border bg-card p-5">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Mensalidade</div>
        <div className="mt-2 font-mono text-3xl font-semibold text-primary">{formatBRL(client.monthlyValue)}</div>
        <div className="mt-1 text-[12px] text-muted-foreground">Vence dia {client.paymentDay} de cada mês</div>
      </div>
      <div className="rounded-xl border bg-card p-4 lg:col-span-2">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">Últimos pagamentos</h3>
        <ul className="space-y-1">
          {pagamentos.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-md border bg-surface/50 px-3 py-2 text-[13px]">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono">{p.date}</span>
              <span className="ml-auto font-mono text-primary">{formatBRL(p.value)}</span>
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                  p.status === "pago" ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
                )}
              >
                {p.status}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── HISTÓRICO ───────────────────────────────────────────────────────────────
function TabHistorico({ client }: { client: (typeof clients)[number] }) {
  const timeline = [
    { time: "há 2h", user: client.owner, text: `Reunião de resultados realizada com ${client.name}` },
    { time: "há 3d", user: "Sistema", text: "Fatura de julho gerada automaticamente" },
    { time: "há 1s", user: "Camila Torres", text: "Criativos aprovados e veiculação iniciada" },
    { time: "há 2s", user: "Sistema", text: `Contrato renovado até ${new Date(client.renewalDate).toLocaleDateString("pt-BR")}` },
    { time: "há 1m", user: client.owner, text: "Cliente elogiou os resultados da campanha anterior" },
    { time: "há 3m", user: "Sistema", text: `Cliente criado a partir da venda fechada no CRM` },
  ];
  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold tracking-tight">Timeline completa</h3>
      <div className="space-y-3">
        {timeline.map((e, i) => (
          <div key={i} className="flex gap-3">
            <div className="relative flex flex-col items-center">
              <div className="mt-1.5 h-2 w-2 rounded-full bg-primary" />
              {i < timeline.length - 1 && <div className="w-px flex-1 bg-border" />}
            </div>
            <div className="flex-1 pb-3">
              <div className="text-[13px]">{e.text}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{e.user} · {e.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
