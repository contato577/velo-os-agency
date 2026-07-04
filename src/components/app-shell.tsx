import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  LineChart,
  BarChart3,
  Layers,
  Settings,
  Search,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  Command,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { notifications } from "@/lib/mock-data";
import veloceLogo from "@/assets/veloce-logo.jpg.asset.json";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/comercial", label: "CRM", icon: Briefcase, badge: 18 },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/operacao", label: "Operação", icon: Layers, badge: 4 },
  { to: "/performance", label: "Performance", icon: LineChart },
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
  const [notifOpen, setNotifOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="dark flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "sticky top-0 h-screen shrink-0 border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200",
          collapsed ? "w-[64px]" : "w-[240px]",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b px-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-black ring-1 ring-primary/30">
            <img src={veloceLogo.url} alt="Veloce Performance" className="h-8 w-8 object-cover" />
          </div>
          {!collapsed && (
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate text-sm font-semibold tracking-tight">Veloce</span>
              <span className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">Performance OS</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="ml-auto rounded-md p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
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
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
                )}
                <Icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} />
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {"badge" in item && item.badge ? (
                      <span className="rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                        {item.badge}
                      </span>
                    ) : null}
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {!collapsed && (
          <div className="absolute inset-x-2 bottom-2 rounded-md border bg-sidebar-accent/40 p-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/50 text-[11px] font-semibold text-primary-foreground">
                RS
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-xs font-medium">Rafael Souza</div>
                <div className="truncate text-[10px] text-muted-foreground">Administrador</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="hidden min-w-0 flex-col leading-tight md:flex">
              <h1 className="truncate text-sm font-semibold tracking-tight">{title}</h1>
              {subtitle && <span className="truncate text-xs text-muted-foreground">{subtitle}</span>}
            </div>
          </div>
          <div className="hidden max-w-md flex-1 md:block">
            <div className="group relative flex items-center">
              <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                placeholder="Buscar cliente, lead, projeto, tarefa…"
                className="h-8 w-full rounded-md border bg-surface pl-8 pr-14 text-[13px] placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <kbd className="pointer-events-none absolute right-2 flex items-center gap-0.5 rounded border bg-background px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                aria-label="Notificações"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary ring-2 ring-background" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-10 z-30 w-80 rounded-lg border bg-popover p-2 shadow-elegant">
                  <div className="mb-1 flex items-center justify-between px-2 py-1">
                    <span className="text-xs font-semibold">Notificações</span>
                    <span className="text-[10px] text-muted-foreground">{notifications.length} novas</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {notifications.map((n) => (
                      <div key={n.id} className="flex items-start gap-2 rounded-md p-2 hover:bg-accent">
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
                          <div className="truncate text-[11px] text-muted-foreground">{n.description}</div>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{n.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
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
