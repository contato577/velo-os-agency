import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
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
  Pencil,
  X,
  Check,
  Trash2,
  Eye,
  ClipboardList,
  BarChart2,
  Lightbulb,
  MoreVertical,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { NewTaskButton } from "@/components/quick-actions";
import { formatBRL, type Client } from "@/lib/mock-data";
import { useDataStore } from "@/lib/data-store";
import { gerarResumoCliente, exportarRelatorioPDF, linkWhatsApp } from "@/lib/client-report";
import { cn } from "@/lib/utils";
import { serviceTemplates } from "@/lib/service-templates";

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
  const { clients } = useDataStore();
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
function TabGeral({ client }: { client: Client }) {
  const { updateClientInfo } = useDataStore();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: client.name,
    company: client.company,
    email: client.email ?? `contato@${client.company.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}.com.br`,
    phone: client.phone ?? `+55 11 9${String(80000000 + client.id.length * 12345).slice(0, 8)}`,
  });

  // Sync form when client changes from external updates
  const handleEdit = () => {
    setForm({
      name: client.name,
      company: client.company,
      email: client.email ?? `contato@${client.company.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}.com.br`,
      phone: client.phone ?? `+55 11 9${String(80000000 + client.id.length * 12345).slice(0, 8)}`,
    });
    setEditing(true);
  };

  const handleSave = () => {
    updateClientInfo(client.id, form);
    setEditing(false);
  };

  // Contract state (stored on the client object via updateClientInfo-like approach)
  const [showContractUpload, setShowContractUpload] = useState(false);
  const [contrato, setContrato] = useState<{ nome: string; url: string } | undefined>(client.contratoArquivo);
  const contratoInputRef = useRef<HTMLInputElement>(null);

  const handleContratoUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    const url = URL.createObjectURL(f);
    const novo = { nome: f.name, url };
    setContrato(novo);
    updateClientInfo(client.id, { contratoArquivo: novo });
    setShowContractUpload(false);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border bg-card p-5 lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight">Dados da empresa</h3>
          {editing ? (
            <div className="flex gap-1.5">
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Check className="h-3 w-3" /> Salvar
              </button>
              <button
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1 rounded-md border bg-surface px-2.5 py-1 text-[11px] hover:bg-accent"
              >
                <X className="h-3 w-3" /> Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={handleEdit}
              className="inline-flex items-center gap-1 rounded-md border bg-surface px-2.5 py-1 text-[11px] hover:bg-accent"
            >
              <Pencil className="h-3 w-3" /> Editar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {editing ? (
            <>
              <EditField
                icon={Building2}
                label="Empresa"
                value={form.company}
                onChange={(v) => setForm((f) => ({ ...f, company: v }))}
              />
              <EditField
                icon={User}
                label="Contato principal"
                value={form.name}
                onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              />
              <EditField
                icon={Phone}
                label="Telefone"
                value={form.phone}
                onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
              />
              <EditField
                icon={Mail}
                label="E-mail"
                value={form.email}
                onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              />
              <Field icon={Calendar} label="Cliente desde" value={new Date(client.since).toLocaleDateString("pt-BR")} />
              <Field icon={User} label="Responsável Veloce" value={client.owner} />
            </>
          ) : (
            <>
              <Field icon={Building2} label="Empresa" value={client.company} />
              <Field icon={User} label="Contato principal" value={client.name} />
              <Field
                icon={Phone}
                label="Telefone"
                value={client.phone ?? `+55 11 9${String(80000000 + client.id.length * 12345).slice(0, 8)}`}
              />
              <Field
                icon={Mail}
                label="E-mail"
                value={client.email ?? `contato@${client.company.toLowerCase().replace(/[^a-z]/g, "").slice(0, 12)}.com.br`}
              />
              <Field icon={Calendar} label="Cliente desde" value={new Date(client.since).toLocaleDateString("pt-BR")} />
              <Field icon={User} label="Responsável Veloce" value={client.owner} />
            </>
          )}
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

          {/* Contrato */}
          {contrato ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-md border bg-surface/50 px-2.5 py-2">
                <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="min-w-0 flex-1 truncate text-[12px]">{contrato.nome}</span>
                <a
                  href={contrato.url}
                  download={contrato.nome}
                  className="text-muted-foreground hover:text-foreground"
                  title="Baixar"
                >
                  <Download className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="flex gap-1.5">
                <a
                  href={contrato.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border bg-surface px-3 py-2 text-xs font-medium hover:bg-accent"
                >
                  <Eye className="h-3.5 w-3.5" /> Visualizar
                </a>
                <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md border bg-surface px-3 py-2 text-xs font-medium hover:bg-accent">
                  <FileUp className="h-3.5 w-3.5" /> Substituir
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => handleContratoUpload(e.target.files)}
                  />
                </label>
              </div>
            </div>
          ) : (
            <>
              {showContractUpload ? (
                <div className="rounded-md border border-dashed p-3 text-center">
                  <p className="mb-2 text-[11px] text-muted-foreground">Selecione o arquivo de contrato (PDF ou Word)</p>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                    <FileUp className="h-3.5 w-3.5" /> Escolher arquivo
                    <input
                      ref={contratoInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => handleContratoUpload(e.target.files)}
                    />
                  </label>
                  <button
                    onClick={() => setShowContractUpload(false)}
                    className="mt-1.5 block w-full text-center text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowContractUpload(true)}
                  className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border bg-surface px-3 py-2 text-xs font-medium hover:bg-accent"
                >
                  <FileText className="h-3.5 w-3.5" /> Anexar contrato
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EditField({
  icon: Icon,
  label,
  value,
  onChange,
}: {
  icon: typeof User;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-2.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-0.5 w-full rounded border bg-background px-2 py-1 text-[13px] focus:border-primary/60 focus:outline-none"
        />
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
const adIntegrations = [
  {
    key: "meta",
    name: "Meta Ads",
    description: "Facebook e Instagram Ads — investimento, leads, CPL, CTR e ROAS.",
    icon: TrendingUp,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
    metrics: [
      { label: "Investimento", key: "investimento" },
      { label: "Leads", key: "leads" },
      { label: "CPL", key: "cpl" },
      { label: "CTR", key: "ctr" },
      { label: "ROAS", key: "roas" },
    ],
  },
  {
    key: "google-ads",
    name: "Google Ads",
    description: "Cliques, impressões, conversões, CTR e CPC médio.",
    icon: MousePointerClick,
    iconColor: "text-warning",
    iconBg: "bg-warning/10",
    metrics: [
      { label: "Cliques", key: "cliques" },
      { label: "Impressões", key: "impressoes" },
      { label: "Conversões", key: "conversoes" },
      { label: "CTR", key: "ctr" },
      { label: "CPC médio", key: "cpc" },
    ],
  },
  {
    key: "ga4",
    name: "Google Analytics",
    description: "Usuários, sessões, taxa de rejeição e conversões.",
    icon: LineIcon,
    iconColor: "text-success",
    iconBg: "bg-success/10",
    metrics: [
      { label: "Usuários", key: "usuarios" },
      { label: "Sessões", key: "sessoes" },
      { label: "Taxa rejeição", key: "bounce" },
      { label: "Conversões", key: "conversoes" },
    ],
  },
];

// Toast de aviso de integração em breve
function ComingSoonToast({ name, onClose }: { name: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl border bg-card p-4 shadow-elegant animate-in fade-in slide-in-from-bottom-2 duration-200" style={{ maxWidth: 320 }}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-info/15">
        <Plug className="h-4 w-4 text-info" />
      </div>
      <div className="flex-1">
        <div className="text-[13px] font-semibold">Integração em breve</div>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          A conexão com <strong>{name}</strong> requer backend com armazenamento seguro de tokens OAuth. Disponível quando o banco de dados for ativado.
        </p>
      </div>
      <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function TabPerformance({ client }: { client: Client }) {
  const { projects } = useDataStore();
  const [exporting, setExporting] = useState(false);
  const [toastIntegration, setToastIntegration] = useState<string | null>(null);
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
    <div className="space-y-6">
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

      {/* Integrações de anúncios */}
      <div>
        <div className="mb-1">
          <h3 className="text-sm font-semibold tracking-tight">Integrações de anúncios</h3>
          <p className="text-[12px] text-muted-foreground">Conecte as contas de anúncios do cliente para trazer dados em tempo real.</p>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {adIntegrations.map((intg) => {
            const Icon = intg.icon;
            return (
              <div key={intg.key} className="flex flex-col rounded-xl border bg-card p-4">
                {/* Header */}
                <div className="mb-3 flex items-center justify-between">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", intg.iconBg)}>
                    <Icon className={cn("h-4.5 w-4.5", intg.iconColor)} />
                  </div>
                  <span className="flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/8 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive/70">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive/50" />
                    Não conectado
                  </span>
                </div>

                <h4 className="text-[14px] font-semibold tracking-tight">{intg.name}</h4>
                <p className="mt-1 flex-1 text-[12px] leading-relaxed text-muted-foreground">{intg.description}</p>

                {/* Métricas — placeholder */}
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  {intg.metrics.map((m) => (
                    <div key={m.key} className="rounded-md border border-dashed bg-surface/40 px-2 py-1.5">
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground/60">{m.label}</div>
                      <div className="mt-0.5 text-[12px] font-mono text-muted-foreground/40">—</div>
                    </div>
                  ))}
                </div>

                <p className="mt-2 text-center text-[10px] italic text-muted-foreground/50">
                  Conecte a conta para ver os dados aqui
                </p>

                <button
                  onClick={() => setToastIntegration(intg.name)}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border bg-surface px-3 py-1.5 text-[12px] font-medium hover:bg-accent"
                >
                  <Plug className="h-3.5 w-3.5" /> Conectar {intg.name}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Outras integrações (Search Console, Landing Pages) */}
      <div>
        <div className="mb-3">
          <h3 className="text-sm font-semibold tracking-tight">Outras integrações</h3>
          <p className="text-[12px] text-muted-foreground">Dados de SEO e páginas de conversão — disponíveis em breve.</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { key: "gsc", name: "Google Search Console", description: "Impressões orgânicas, cliques, CTR e posição média.", Icon: SearchIcon },
            { key: "landing", name: "Landing Pages", description: "Visitantes, tempo na página e taxa de conversão.", Icon: LayoutIcon },
          ].map((item) => (
            <div key={item.key} className="flex items-center gap-3 rounded-xl border bg-card p-3.5 opacity-60">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-surface">
                <item.Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{item.name}</div>
                <div className="text-[11px] text-muted-foreground">{item.description}</div>
              </div>
              <span className="shrink-0 rounded border border-info/30 bg-info/10 px-1.5 py-0.5 text-[10px] font-medium text-info">Em breve</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── DOCUMENTOS ─────────────────────────────────────────────────────────────
type DocCategory = "Atas" | "Relatórios" | "Estratégia" | "Outros";
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
];

const categoryMeta: Record<DocCategory, { icon: typeof FolderOpen; color: string; bg: string }> = {
  Atas: { icon: ClipboardList, color: "text-info", bg: "bg-info/10" },
  Relatórios: { icon: BarChart2, color: "text-primary", bg: "bg-primary/10" },
  Estratégia: { icon: Lightbulb, color: "text-warning", bg: "bg-warning/10" },
  Outros: { icon: FolderOpen, color: "text-muted-foreground", bg: "bg-surface" },
};

function TabDocumentos() {
  const [docs, setDocs] = useState<DocItem[]>(seedDocs);
  const [query, setQuery] = useState("");
  const [openCategory, setOpenCategory] = useState<DocCategory | null>(null);
  const [addingIn, setAddingIn] = useState<DocCategory | null>(null);
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const categories: DocCategory[] = ["Atas", "Relatórios", "Estratégia", "Outros"];
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

  const deleteDoc = (id: string) => {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setConfirmDeleteId(null);
  };

  // Category card view
  if (!openCategory) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Documentos do cliente</h3>
            <p className="text-[12px] text-muted-foreground">Atas, relatórios, estratégia e outros arquivos.</p>
          </div>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar em todos os documentos…"
              className="h-8 w-56 rounded-md border bg-surface pl-7 pr-2 text-xs focus:border-primary/60 focus:outline-none"
            />
          </div>
        </div>

        {/* Se há busca ativa, mostra lista flat */}
        {query.trim() ? (
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 text-[11px] text-muted-foreground">{filtered.length} resultado(s) para "{query}"</p>
            {filtered.length === 0 ? (
              <div className="rounded-md border border-dashed py-6 text-center text-[11px] text-muted-foreground">Nenhum documento encontrado.</div>
            ) : (
              <ul className="space-y-1">
                {filtered.map((d) => (
                  <DocRow key={d.id} doc={d} onDelete={() => setConfirmDeleteId(d.id)} confirmDeleteId={confirmDeleteId} onConfirmDelete={deleteDoc} onCancelDelete={() => setConfirmDeleteId(null)} />
                ))}
              </ul>
            )}
          </div>
        ) : (
          /* Cards por categoria */
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {categories.map((cat) => {
              const items = docs.filter((d) => d.category === cat);
              const meta = categoryMeta[cat];
              const IconComp = meta.icon;
              const mostRecent = items.sort((a, b) => b.addedAt.localeCompare(a.addedAt))[0];
              return (
                <button
                  key={cat}
                  onClick={() => setOpenCategory(cat)}
                  className="group flex flex-col rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-elegant"
                >
                  <div className={cn("mb-3 flex h-10 w-10 items-center justify-center rounded-lg", meta.bg)}>
                    <IconComp className={cn("h-5 w-5", meta.color)} />
                  </div>
                  <div className="text-[14px] font-semibold tracking-tight">{cat}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {items.length === 0
                      ? "Nenhum arquivo"
                      : `${items.length} arquivo${items.length > 1 ? "s" : ""}`}
                  </div>
                  {mostRecent && (
                    <div className="mt-1.5 text-[10px] text-muted-foreground">
                      Último: {new Date(mostRecent.addedAt).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                  <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Ver arquivos →
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Categoria aberta — lista de arquivos
  const catItems = docs.filter((d) => d.category === openCategory);
  const catMeta = categoryMeta[openCategory];
  const CatIcon = catMeta.icon;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setOpenCategory(null); setAddingIn(null); }}
          className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </button>
        <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", catMeta.bg)}>
          <CatIcon className={cn("h-4 w-4", catMeta.color)} />
        </div>
        <h3 className="text-sm font-semibold tracking-tight">{openCategory}</h3>
        <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{catItems.length}</span>
        <div className="ml-auto flex gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border bg-surface px-2.5 py-1.5 text-[11px] hover:bg-accent">
            <FileUp className="h-3 w-3" /> Arquivo
            <input type="file" multiple className="hidden" onChange={(e) => addFile(openCategory, e.target.files)} />
          </label>
          <button
            onClick={() => setAddingIn(addingIn ? null : openCategory)}
            className="inline-flex items-center gap-1 rounded-md border bg-surface px-2.5 py-1.5 text-[11px] hover:bg-accent"
          >
            <LinkIcon className="h-3 w-3" /> Link
          </button>
        </div>
      </div>

      {addingIn === openCategory && (
        <div className="flex flex-wrap items-end gap-2 rounded-md border bg-surface/40 p-2">
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
            onClick={() => addLink(openCategory)}
            className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}

      {catItems.length === 0 ? (
        <div className="rounded-xl border border-dashed py-10 text-center text-[12px] text-muted-foreground">
          Nenhum arquivo nesta categoria. Clique em "Arquivo" ou "Link" para adicionar.
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-3">
          <ul className="space-y-1">
            {catItems.map((d) => (
              <DocRow
                key={d.id}
                doc={d}
                onDelete={() => setConfirmDeleteId(d.id)}
                confirmDeleteId={confirmDeleteId}
                onConfirmDelete={deleteDoc}
                onCancelDelete={() => setConfirmDeleteId(null)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DocRow({
  doc,
  onDelete,
  confirmDeleteId,
  onConfirmDelete,
  onCancelDelete,
}: {
  doc: DocItem;
  onDelete: () => void;
  confirmDeleteId: string | null;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
}) {
  const isConfirming = confirmDeleteId === doc.id;
  return (
    <li className="flex items-center gap-2.5 rounded-md border bg-surface/50 px-3 py-2 text-[12px]">
      {doc.type === "file" ? <FileText className="h-3.5 w-3.5 text-muted-foreground" /> : <LinkIcon className="h-3.5 w-3.5 text-info" />}
      {doc.type === "link" ? (
        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate hover:text-primary">
          {doc.title}
        </a>
      ) : (
        <span className="min-w-0 flex-1 truncate">{doc.title}</span>
      )}
      <span className="hidden text-[10px] text-muted-foreground sm:inline">{doc.addedBy}</span>
      <span className="text-[10px] text-muted-foreground">{new Date(doc.addedAt).toLocaleDateString("pt-BR")}</span>
      {doc.size && <span className="text-[10px] text-muted-foreground">{doc.size}</span>}
      {doc.url && doc.type === "file" && (
        <a href={doc.url} download={doc.title} className="text-muted-foreground hover:text-foreground" title="Baixar">
          <Download className="h-3 w-3" />
        </a>
      )}
      {doc.type === "link" && doc.url && (
        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" title="Abrir">
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
      {isConfirming ? (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-destructive">Excluir?</span>
          <button onClick={() => onConfirmDelete(doc.id)} className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/20">Sim</button>
          <button onClick={onCancelDelete} className="rounded bg-surface px-1.5 py-0.5 text-[10px] hover:bg-accent">Não</button>
        </div>
      ) : (
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive" title="Excluir">
          <Trash2 className="h-3 w-3" />
        </button>
      )}
    </li>
  );
}

// ─── OPERAÇÃO ────────────────────────────────────────────────────────────────
interface ArquivoItem {
  id: string;
  name: string;
  size: string;
  url?: string;
}

const statusProjectMeta: Record<string, { label: string; className: string }> = {
  briefing: { label: "Briefing", className: "bg-muted/50 text-muted-foreground" },
  producao: { label: "Produção", className: "bg-info/10 text-info" },
  revisao: { label: "Revisão", className: "bg-warning/10 text-warning" },
  entregue: { label: "Entregue", className: "bg-success/10 text-success" },
};

function ProjectCard({ project }: { project: import("@/lib/mock-data").Project }) {
  const { toggleChecklistItem } = useDataStore();
  const [expanded, setExpanded] = useState(false);
  const checklist = project.checklist ?? [];
  const doneCount = checklist.filter((i) => i.done).length;
  const statusMeta = statusProjectMeta[project.status] ?? { label: project.status, className: "bg-surface text-muted-foreground" };

  return (
    <div className="rounded-xl border bg-card p-4 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold">{project.name}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{project.type} · Resp. {project.owner.split(" ")[0]}</div>
        </div>
        <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider", statusMeta.className)}>
          {statusMeta.label}
        </span>
      </div>

      {/* Barra de progresso */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Progresso</span>
          <span className="font-mono text-[10px] text-primary">{project.progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>

      {/* Prazo */}
      <div className="mt-2 text-[11px] text-muted-foreground">
        Prazo: {new Date(project.deadline).toLocaleDateString("pt-BR")}
      </div>

      {/* Checklist */}
      {checklist.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between text-[11px] text-muted-foreground hover:text-foreground"
          >
            <span>Checklist ({doneCount}/{checklist.length})</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1">
              {checklist.map((item) => (
                <li
                  key={item.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md p-1 hover:bg-accent"
                  onClick={() => toggleChecklistItem(project.id, item.id)}
                >
                  <span
                    className={cn(
                      "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors",
                      item.done ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}
                  >
                    {item.done && <span className="text-[8px] font-bold">✓</span>}
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate text-[12px]", item.done && "text-muted-foreground line-through")}>
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function TabOperacao({ clientId }: { clientId: string }) {
  const { clients, projects, tasks } = useDataStore();
  const client = clients.find((c) => c.id === clientId) ?? clients[0];
  const clientProjects = projects.filter((p) => p.clientId === clientId);
  const clientTasks = tasks.filter((t) => t.clientId === clientId);

  const [arquivos, setArquivos] = useState<ArquivoItem[]>([
    { id: "f1", name: "Briefing_kickoff.pdf", size: "1.2 MB" },
    { id: "f2", name: "Criativos_Julho.zip", size: "12.4 MB" },
  ]);
  const [confirmDeleteArquivoId, setConfirmDeleteArquivoId] = useState<string | null>(null);

  const handleUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const novos: ArquivoItem[] = Array.from(files).map((f, i) => ({
      id: `f-${Date.now()}-${i}`,
      name: f.name,
      size: f.size < 1024 * 1024
        ? `${Math.max(1, Math.round(f.size / 1024))} KB`
        : `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      url: URL.createObjectURL(f),
    }));
    setArquivos((prev) => [...novos, ...prev]);
  };

  const deleteArquivo = (id: string) => {
    setArquivos((prev) => prev.filter((a) => a.id !== id));
    setConfirmDeleteArquivoId(null);
  };

  // Comentários reais via data store
  const { addComentario, removeComentario } = useDataStore();
  const comentarios = client.comentarios ?? [];
  const [novoComentario, setNovoComentario] = useState("");
  const [confirmDeleteComId, setConfirmDeleteComId] = useState<string | null>(null);

  const handleAddComentario = () => {
    const texto = novoComentario.trim();
    if (!texto) return;
    addComentario(clientId, texto, "Rafael Souza");
    setNovoComentario("");
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {/* Projetos */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">Projetos ativos</h3>
            <span className="text-[11px] text-muted-foreground">{clientProjects.length} projeto{clientProjects.length !== 1 ? "s" : ""}</span>
          </div>
          {clientProjects.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-center">
              <Folder className="h-8 w-8 text-muted-foreground/40" />
              <div className="text-[13px] font-medium text-muted-foreground">Nenhum projeto ativo</div>
              <p className="text-[11px] text-muted-foreground/70">Crie um projeto para este cliente no módulo Operação.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientProjects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </div>

        {/* Tarefas */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-tight">Tarefas</h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">{clientTasks.length} tarefas</span>
              <NewTaskButton
                defaultContext={{ type: "cliente", id: client.id, label: client.company }}
              />
            </div>
          </div>
          <ul className="space-y-1">
            {clientTasks.length === 0 && (
              <li className="flex flex-col items-center gap-2 rounded-md border border-dashed py-6 text-center text-[12px] text-muted-foreground">
                <span>Nenhuma tarefa vinculada a este cliente.</span>
                <NewTaskButton
                  defaultContext={{ type: "cliente", id: client.id, label: client.company }}
                  label="+ Nova tarefa"
                />
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
            {comentarios.length === 0 && (
              <div className="rounded-md border border-dashed py-4 text-center text-[11px] text-muted-foreground">
                Nenhum comentário ainda.
              </div>
            )}
            {comentarios.map((c) => {
              const isConfirmingDel = confirmDeleteComId === c.id;
              return (
                <div key={c.id} className="group relative rounded-md bg-surface/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium">{c.autor}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(c.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isConfirmingDel ? (
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-destructive">Excluir?</span>
                          <button
                            onClick={() => { removeComentario(clientId, c.id); setConfirmDeleteComId(null); }}
                            className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/20"
                          >Sim</button>
                          <button
                            onClick={() => setConfirmDeleteComId(null)}
                            className="rounded bg-surface px-1.5 py-0.5 text-[10px] hover:bg-accent"
                          >Não</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteComId(c.id)}
                          className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                          title="Remover comentário"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-[13px] text-muted-foreground">{c.texto}</p>
                </div>
              );
            })}
            <div className="flex gap-2">
              <textarea
                value={novoComentario}
                onChange={(e) => setNovoComentario(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleAddComentario(); }}
                placeholder="Adicionar comentário… (Ctrl+Enter para enviar)"
                rows={2}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-[13px] focus:border-primary/60 focus:outline-none"
              />
              <button
                onClick={handleAddComentario}
                disabled={!novoComentario.trim()}
                className="self-end rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Jornada do Cliente */}
        <JornadaCliente client={client} clientProjects={clientProjects} />

        {/* Arquivos */}
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold tracking-tight">Arquivos</h3>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border bg-surface px-2 py-1 text-[11px] hover:bg-accent">
              <FileUp className="h-3 w-3" /> Upload
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
            </label>
          </div>
          <ul className="space-y-1">
            {arquivos.length === 0 && (
              <li className="rounded-md border border-dashed py-4 text-center text-[11px] text-muted-foreground">
                Nenhum arquivo enviado ainda.
              </li>
            )}
            {arquivos.map((a) => {
              const isConfirmingDel = confirmDeleteArquivoId === a.id;
              return (
                <li key={a.id} className="group flex items-center gap-2 rounded-md border bg-surface/50 px-2.5 py-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  {a.url ? (
                    <a
                      href={a.url}
                      download={a.name}
                      className="min-w-0 flex-1 truncate text-[12px] hover:text-primary hover:underline"
                    >
                      {a.name}
                    </a>
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-[12px]">{a.name}</span>
                  )}
                  <span className="text-[10px] text-muted-foreground">{a.size}</span>
                  {a.url && (
                    <a
                      href={a.url}
                      download={a.name}
                      className="text-muted-foreground hover:text-foreground"
                      title="Baixar"
                    >
                      <Download className="h-3 w-3" />
                    </a>
                  )}
                  {isConfirmingDel ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-destructive">Excluir?</span>
                      <button
                        onClick={() => deleteArquivo(a.id)}
                        className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] text-destructive hover:bg-destructive/20"
                      >Sim</button>
                      <button
                        onClick={() => setConfirmDeleteArquivoId(null)}
                        className="rounded bg-surface px-1.5 py-0.5 text-[10px] hover:bg-accent"
                      >Não</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteArquivoId(a.id)}
                      className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                      title="Excluir arquivo"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── JORNADA DO CLIENTE ──────────────────────────────────────────────────────
function JornadaCliente({
  client,
  clientProjects,
}: {
  client: Client;
  clientProjects: import("@/lib/mock-data").Project[];
}) {
  const { toggleChecklistItem } = useDataStore();

  // Etapas do primeiro template de serviço do cliente
  const matchedTemplate = (client.services ?? [])
    .map((s) => serviceTemplates.find((t) => t.name === s || t.id === s))
    .find(Boolean);
  const stages: string[] = matchedTemplate?.stages ?? [];
  const currentIdx = stages.indexOf(client.etapaJornada ?? "");

  // Indicador de prazo
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const prazoStatus = (() => {
    if (client.status !== "onboarding" || !client.dataPrevistaFimOnboarding) return null;
    const fim = new Date(client.dataPrevistaFimOnboarding);
    fim.setHours(0, 0, 0, 0);
    const diffDias = Math.round((fim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDias > 3) return { label: "No prazo", variant: "success" as const, diff: diffDias };
    if (diffDias >= 0) return { label: `Atenção — faltam ${diffDias}d`, variant: "warning" as const, diff: diffDias };
    return { label: `Atrasado ${Math.abs(diffDias)} dias`, variant: "destructive" as const, diff: diffDias };
  })();

  // Checklist flat de todos os projetos do cliente
  const allItems = clientProjects.flatMap((p) =>
    (p.checklist ?? []).map((item) => ({ ...item, projectId: p.id, projectName: p.name }))
  );
  const doneCount = allItems.filter((i) => i.done).length;
  const totalCount = allItems.length;

  if (stages.length === 0 && allItems.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-sm font-semibold tracking-tight">Jornada do cliente</h3>
        </div>
        {prazoStatus && (
          <span
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
              prazoStatus.variant === "success" && "bg-success/15 text-success",
              prazoStatus.variant === "warning" && "bg-warning/15 text-warning",
              prazoStatus.variant === "destructive" && "bg-destructive/15 text-destructive",
            )}
          >
            {prazoStatus.label}
          </span>
        )}
      </div>

      {/* Barra de etapas */}
      {stages.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-0">
            {stages.map((stage, idx) => {
              const isPast = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              const isFirst = idx === 0;
              const isLast = idx === stages.length - 1;
              return (
                <div key={stage} className="flex flex-1 flex-col items-center">
                  <div className="relative flex w-full items-center">
                    {/* Linha esquerda */}
                    {!isFirst && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 transition-colors",
                          isPast || isCurrent ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                    {/* Bolinha */}
                    <div
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[9px] font-bold transition-all",
                        isPast && "border-primary bg-primary text-primary-foreground",
                        isCurrent && "border-primary bg-background text-primary shadow-[0_0_0_3px] shadow-primary/20",
                        !isPast && !isCurrent && "border-border bg-background text-muted-foreground",
                      )}
                    >
                      {isPast ? "✓" : idx + 1}
                    </div>
                    {/* Linha direita */}
                    {!isLast && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 transition-colors",
                          isPast ? "bg-primary" : "bg-border",
                        )}
                      />
                    )}
                  </div>
                  <span
                    className={cn(
                      "mt-1.5 text-center text-[9px] leading-tight",
                      isCurrent ? "font-semibold text-primary" : isPast ? "text-muted-foreground" : "text-muted-foreground/60",
                    )}
                  >
                    {stage}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Checklist real dos projetos */}
      {allItems.length > 0 && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Checklist de entregas</span>
            <span className="font-mono text-[10px] text-muted-foreground">{doneCount}/{totalCount}</span>
          </div>
          {/* Progress bar */}
          <div className="mb-3 h-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : "0%" }}
            />
          </div>
          <ul className="space-y-1">
            {allItems.map((item) => (
              <li
                key={`${item.projectId}-${item.id}`}
                className="flex cursor-pointer items-center gap-2.5 rounded-md p-1.5 hover:bg-accent"
                onClick={() => toggleChecklistItem(item.projectId, item.id)}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                    item.done
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {item.done && <span className="text-[9px] font-bold">✓</span>}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-[12px]",
                    item.done && "text-muted-foreground line-through",
                  )}
                >
                  {item.text}
                </span>
                <span className="shrink-0 rounded bg-surface px-1.5 py-0.5 text-[9px] text-muted-foreground">
                  {item.projectName.replace(/ — .*/, "")}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {allItems.length === 0 && stages.length > 0 && (
        <p className="text-center text-[11px] text-muted-foreground">
          Nenhum item de checklist ainda. Crie um projeto para este cliente.
        </p>
      )}
    </div>
  );
}

// ─── FINANCEIRO ──────────────────────────────────────────────────────────────
function TabFinanceiro({ client }: { client: Client }) {
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
function TabHistorico({ client }: { client: Client }) {
  const customEntries = (client.timeline ?? []).map((t) => ({
    time: t.time,
    user: t.user,
    text: t.text,
  }));
  const defaultEntries = [
    { time: "há 2h", user: client.owner, text: `Reunião de resultados realizada com ${client.name}` },
    { time: "há 3d", user: "Sistema", text: "Fatura de julho gerada automaticamente" },
    { time: "há 2s", user: "Sistema", text: `Contrato renovado até ${new Date(client.renewalDate).toLocaleDateString("pt-BR")}` },
  ];
  const timeline = [...customEntries, ...defaultEntries];

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
