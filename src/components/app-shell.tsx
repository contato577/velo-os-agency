import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  BarChart3,
  Layers,
  Settings,
  Search,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  Command,
  Brain,
  LogOut,
  Target,
  X,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/lib/data-store";
import { getSessionAsync, signOutReal, type Session } from "@/lib/auth";
import { QuickActionsButton } from "@/components/quick-actions";
import veloceLogo from "@/assets/veloce-logo.jpg.asset.json";

const nav = [
  { to: "/", label: "Comercial", icon: LayoutDashboard },
  { to: "/comercial", label: "CRM", icon: Briefcase, badge: 18 },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/operacao", label: "Operação", icon: Layers, badge: 4 },
  { to: "/ponto-controle", label: "Ponto de Controle", icon: Target },
  { to: "/dre", label: "DRE Inteligente", icon: BarChart3 },

  { to: "/central-ia", label: "Central de IA", icon: Brain, badge: "IA" },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const { insights, systemNotifications, logoUrl } = useDataStore();

  // Notificações dispensadas ficam salvas no navegador — assim, ao clicar no X,
  // a notificação some de verdade e não volta a cada recarregamento da página,
  // a não ser que a situação mude e um novo alerta seja gerado.
  const [dispensadas, setDispensadas] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("veloce-notif-dispensadas") ?? "[]");
    } catch {
      return [];
    }
  });
  const dispensarNotificacao = (id: string) => {
    setDispensadas((prev) => {
      const nova = [...prev, id];
      localStorage.setItem("veloce-notif-dispensadas", JSON.stringify(nova));
      return nova;
    });
  };

  // Notificações agora vêm de duas fontes: eventos reais do sistema (ex: "lead
  // novo chegou", que ficam gravados e não somem) + diagnósticos da IA (mesma
  // fonte da Central de IA). Eventos reais aparecem primeiro, por serem mais
  // recentes/urgentes que um diagnóstico calculado.
  const notifications = [
    ...systemNotifications.map((n) => ({
      id: n.id,
      title: n.title,
      description: n.description,
      to: n.to,
      search: n.search,
      type: "success" as const,
    })),
    ...insights.map((i) => ({
      id: i.id,
      title: i.titulo,
      description: i.descricao,
      to: i.to,
      search: i.search,
      type:
        i.prioridade === "critica" || i.prioridade === "alta"
          ? ("warning" as const)
          : i.prioridade === "media"
            ? ("info" as const)
            : ("success" as const),
    })),
  ]
    .filter((n) => !dispensadas.includes(n.id))
    .slice(0, 12);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Fecha o menu mobile sozinho assim que a pessoa navega pra outra tela —
  // sem isso, o menu ficaria aberto por cima da tela nova depois do clique.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);
  const navigate = useNavigate();

  // Auth gate (client-side) — agora busca a sessão real do Supabase, não do localStorage
  useEffect(() => {
    let ativo = true;
    getSessionAsync().then((s) => {
      if (!ativo) return;
      if (!s) {
        navigate({ to: "/auth" });
        return;
      }
      setSession(s);
      setReady(true);
    });
    return () => {
      ativo = false;
    };
  }, [navigate]);

  const handleSignOut = () => {
    signOutReal().then(() => navigate({ to: "/auth" }));
  };

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background text-foreground">
        <div className="text-xs text-muted-foreground">Carregando…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Fundo escurecido/transparente atrás do menu, só no mobile — clicar nele fecha o menu */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-screen shrink-0 border-r bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-200 md:sticky md:top-0 md:shadow-none",
          "w-[236px]",
          collapsed ? "md:w-[64px]" : "md:w-[236px]",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b px-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-sidebar-accent ring-1 ring-primary/40">
            <img src={logoUrl ?? veloceLogo.url} alt="Veloce" className="h-8 w-8 object-cover" />
          </div>
          {(!collapsed || mobileNavOpen) && (
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-semibold tracking-tight">Veloce</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto hidden rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground md:block"
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground md:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 p-2">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2.5 text-[15px] font-medium transition-colors md:py-1.5 md:text-[13px]",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
                title={collapsed && !mobileNavOpen ? item.label : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-brand-deep" />
                )}
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 md:h-4 md:w-4",
                    active ? "text-primary" : "",
                  )}
                />
                {(!collapsed || mobileNavOpen) && (
                  <>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {"badge" in item && item.badge ? (
                      <span className="rounded bg-sidebar-accent px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {item.badge}
                      </span>
                    ) : null}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User card + menu */}
        {(!collapsed || mobileNavOpen) && (
          <div className="absolute inset-x-2 bottom-2">
            <button
              onClick={() => setUserOpen((v) => !v)}
              className="flex w-full items-center gap-2 rounded-md border bg-sidebar-accent/40 p-2.5 text-left transition-colors hover:bg-sidebar-accent/70"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/50 text-[11px] font-semibold text-primary-foreground">
                {session.initials}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-xs font-medium">{session.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">{session.email}</div>
              </div>
            </button>
            {userOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
                <div className="absolute bottom-14 left-0 right-0 z-50 overflow-hidden rounded-md border bg-popover shadow-elegant">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sair
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="hidden min-w-0 flex-col leading-tight md:flex">
              <h1 className="truncate text-sm font-semibold tracking-tight">
                {title === "Dashboard" ? "Comercial" : title}
              </h1>
              {subtitle && (
                <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
              )}
            </div>
          </div>
          <div className="hidden max-w-md flex-1 md:block">
            <div className="group relative flex items-center">
              <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                placeholder="Buscar cliente, lead, projeto…  (⌘K)"
                className="h-8 w-full rounded-md border bg-surface pl-8 pr-14 text-[13px] placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                readOnly
                onFocus={(e) => {
                  e.currentTarget.blur();
                  window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
                }}
              />
              <kbd className="pointer-events-none absolute right-2 flex items-center gap-0.5 rounded border bg-background px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <QuickActionsButton />
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                aria-label="Notificações"
              >
                <Bell className="h-4 w-4" />
                {notifications.length > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-background" />
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-10 z-40 w-80 rounded-lg border bg-popover p-2 shadow-elegant">
                    <div className="mb-1 flex items-center justify-between px-2 py-1">
                      <span className="text-xs font-semibold">Notificações</span>
                      <span className="text-[10px] text-muted-foreground">
                        {notifications.length} {notifications.length === 1 ? "ativa" : "ativas"}
                      </span>
                    </div>
                    <div className="flex max-h-80 flex-col gap-0.5 overflow-y-auto">
                      {notifications.length === 0 && (
                        <div className="px-2 py-4 text-center text-[12px] text-muted-foreground">
                          Tudo tranquilo por aqui.
                        </div>
                      )}
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className="group flex items-start gap-2 rounded-md p-2 hover:bg-accent"
                        >
                          <button
                            onClick={() => {
                              setNotifOpen(false);
                              navigate({ to: n.to, search: n.search });
                            }}
                            className="flex min-w-0 flex-1 items-start gap-2 text-left"
                          >
                            <span
                              className={cn(
                                "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                                n.type === "success" && "bg-success",
                                n.type === "warning" && "bg-warning",
                                n.type === "info" && "bg-info",
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[12px] font-medium">{n.title}</div>
                              <div className="truncate text-[11px] text-muted-foreground">
                                {n.description}
                              </div>
                            </div>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dispensarNotificacao(n.id);
                            }}
                            title="Dispensar"
                            className="shrink-0 rounded p-1 text-muted-foreground opacity-70 hover:bg-background hover:text-foreground hover:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            {actions}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
