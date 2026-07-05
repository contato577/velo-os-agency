import { createFileRoute } from "@tanstack/react-router";
import { User, Building2, Bell, Shield, Palette, Users, Zap, Plug, FileStack, ChevronRight, Check } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { serviceTemplates } from "@/lib/service-templates";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · Veloce" },
      { name: "description", content: "Perfil, workspace, templates operacionais, integrações e automações." },
    ],
  }),
  component: Config,
});

const sections = [
  { icon: User, title: "Perfil", desc: "Nome, avatar, e-mail e preferências pessoais" },
  { icon: Building2, title: "Workspace", desc: "Dados da agência, logotipo e domínio" },
  { icon: Users, title: "Usuários e Permissões", desc: "Convide sócios ou operadores quando escalar" },
  { icon: Bell, title: "Notificações", desc: "E-mail, push e WhatsApp" },
  { icon: Palette, title: "Aparência", desc: "Tema, densidade e idioma" },
  { icon: Shield, title: "Segurança", desc: "Senha, 2FA e sessões ativas" },
  { icon: Plug, title: "Integrações", desc: "Meta Ads, Google Ads, Analytics, WhatsApp" },
  { icon: Zap, title: "Automações", desc: "Motor de regras (ver Central de IA)" },
];

function Config() {
  return (
    <AppShell title="Configurações" subtitle="Ajustes gerais e templates operacionais">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Configurações" subtitle="Ajustes gerais do sistema e templates da sua operação" />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {sections.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.title}
                className="group flex items-start gap-3 rounded-lg border bg-card p-4 text-left transition-all hover:border-primary/40 hover:bg-surface/40"
              >
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

        {/* Templates Operacionais */}
        <div className="mt-6 rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b bg-surface/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
                <FileStack className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Templates Operacionais</h3>
                <p className="text-[11px] text-muted-foreground">
                  Quando uma venda é fechada, escolha os serviços vendidos e o sistema monta toda a operação automaticamente.
                </p>
              </div>
            </div>
            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">
              {serviceTemplates.length} templates
            </span>
          </div>

          <div className="divide-y">
            {serviceTemplates.map((t) => (
              <details key={t.id} className="group">
                <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-surface/40">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary`}>
                    <FileStack className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium">{t.name}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {t.stages.length} etapas · {t.checklist.length} itens de checklist · {t.tasks.length} tarefas iniciais
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    Prazo padrão: {t.defaultDeadlineDays}d
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>

                <div className="grid grid-cols-1 gap-4 border-t bg-surface/30 p-4 md:grid-cols-3">
                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Etapas
                    </div>
                    <ol className="space-y-1">
                      {t.stages.map((s, i) => (
                        <li key={s} className="flex items-center gap-2 text-[12px]">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 font-mono text-[9px] text-primary">
                            {i + 1}
                          </span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Checklist
                    </div>
                    <ul className="space-y-1">
                      {t.checklist.map((c) => (
                        <li key={c} className="flex items-start gap-2 text-[12px]">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Tarefas iniciais
                    </div>
                    <ul className="space-y-1.5">
                      {t.tasks.map((task) => (
                        <li key={task.title} className="rounded-md border bg-card p-2 text-[12px]">
                          <div className="font-medium">{task.title}</div>
                          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>+{task.dueOffsetDays}d</span>
                            <span>·</span>
                            <span className="capitalize">Prioridade {task.priority}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
