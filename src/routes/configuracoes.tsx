import { createFileRoute } from "@tanstack/react-router";
import { User, Building2, Bell, Shield, Palette, Users, Zap, Plug } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · Veloce Performance OS" },
      { name: "description", content: "Perfil, workspace, usuários, permissões e integrações." },
    ],
  }),
  component: Config,
});

const sections = [
  { icon: User, title: "Perfil", desc: "Nome, avatar, email e preferências pessoais" },
  { icon: Building2, title: "Workspace", desc: "Dados da agência, logotipo e domínio" },
  { icon: Users, title: "Usuários e Permissões", desc: "Admin, Comercial, Financeiro, Gestor, Operacional" },
  { icon: Bell, title: "Notificações", desc: "Email, push, WhatsApp e canais internos" },
  { icon: Palette, title: "Aparência", desc: "Tema, densidade da interface e idioma" },
  { icon: Shield, title: "Segurança", desc: "Senha, 2FA, sessões ativas e logs" },
  { icon: Plug, title: "Integrações", desc: "Meta Ads, Google Ads, Analytics, WhatsApp Business" },
  { icon: Zap, title: "Automações Globais", desc: "Regras aplicadas em todo o sistema" },
];

const roles = [
  { name: "Administrador", perms: "Acesso total ao sistema", count: 2, color: "text-primary" },
  { name: "Comercial", perms: "CRM, Leads, Clientes, Propostas", count: 4, color: "text-info" },
  { name: "Financeiro", perms: "Financeiro, DRE, Contratos", count: 1, color: "text-success" },
  { name: "Gestor", perms: "Projetos, Tarefas, Relatórios", count: 3, color: "text-warning" },
  { name: "Operacional", perms: "Tarefas e Projetos atribuídos", count: 6, color: "text-muted-foreground" },
];

function Config() {
  return (
    <AppShell title="Configurações" subtitle="Preferências e permissões">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Configurações" subtitle="Ajustes gerais do sistema" />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button key={s.title} className="group flex items-start gap-3 rounded-lg border bg-card p-4 text-left transition-all hover:border-primary/40">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">{s.title}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{s.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-lg border bg-card">
          <div className="border-b bg-surface/50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Perfis de Usuário
          </div>
          <div className="divide-y">
            {roles.map((r) => (
              <div key={r.name} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className={r.color}>
                  <Shield className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground">{r.perms}</div>
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">{r.count} usuário(s)</span>
                <button className="rounded-md border px-2 py-1 text-[11px] hover:bg-accent">Editar</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
