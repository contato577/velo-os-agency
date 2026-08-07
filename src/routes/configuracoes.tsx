import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Palette, Zap, FileStack, ChevronRight, Check, Plus, Trash2, Sun, Moon,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { useDataStore } from "@/lib/data-store";
import type { ServiceTemplate } from "@/lib/service-templates";
import { automationRules, triggerLabels, actionLabels, type AutomationRule } from "@/lib/automation-engine";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · Veloce" },
      { name: "description", content: "Aparência, templates operacionais editáveis e automações do sistema." },
      { property: "og:title", content: "Configurações · Veloce OS" },
      { property: "og:description", content: "Ajuste tema, templates operacionais e automações da sua agência." },
    ],
  }),
  component: Config,
});

const inputCls =
  "w-full rounded-md border bg-background px-2.5 py-1.5 text-[12px] focus:border-primary/60 focus:outline-none";

const prioridades = ["media", "alta", "urgente"] as const;

function ListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
}) {
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              className={inputCls}
              value={item}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="shrink-0 rounded-md border bg-surface p-1.5 text-muted-foreground hover:text-destructive"
              aria-label={`Remover ${label}`}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...items, ""])}
          className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" /> Adicionar
        </button>
      </div>
    </div>
  );
}

function TemplateEditor({ template }: { template: ServiceTemplate }) {
  const { updateServiceTemplate } = useDataStore();
  const [draft, setDraft] = useState<ServiceTemplate>(template);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(template), [template]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1600);
    return () => clearTimeout(t);
  }, [saved]);

  const set = <K extends keyof ServiceTemplate>(key: K, value: ServiceTemplate[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = () => {
    updateServiceTemplate(template.id, {
      name: draft.name.trim() || template.name,
      defaultDeadlineDays: Math.max(1, draft.defaultDeadlineDays || 1),
      stages: draft.stages.map((s) => s.trim()).filter(Boolean),
      checklist: draft.checklist.map((s) => s.trim()).filter(Boolean),
      tasks: draft.tasks
        .filter((t) => t.title.trim())
        .map((t) => ({ ...t, title: t.title.trim(), dueOffsetDays: Math.max(0, t.dueOffsetDays || 0) })),
    });
    setSaved(true);
  };

  return (
    <details className="group">
      <summary className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-surface/40">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileStack className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium">{template.name}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {template.stages.length} etapas · {template.checklist.length} itens de checklist ·{" "}
            {template.tasks.length} tarefas iniciais
          </div>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">Prazo: {template.defaultDeadlineDays}d</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
      </summary>

      <div className="border-t bg-surface/30 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Nome do template
            </div>
            <input className={inputCls} value={draft.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Prazo padrão (dias)
            </div>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={draft.defaultDeadlineDays}
              onChange={(e) => set("defaultDeadlineDays", Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <ListEditor
            label="Etapas"
            items={draft.stages}
            placeholder="Nome da etapa"
            onChange={(v) => set("stages", v)}
          />
          <ListEditor
            label="Checklist"
            items={draft.checklist}
            placeholder="Item do checklist"
            onChange={(v) => set("checklist", v)}
          />
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Tarefas iniciais
            </div>
            <div className="space-y-2">
              {draft.tasks.map((task, i) => (
                <div key={i} className="rounded-md border bg-card p-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      className={inputCls}
                      value={task.title}
                      placeholder="Título da tarefa"
                      onChange={(e) =>
                        set("tasks", draft.tasks.map((t, j) => (j === i ? { ...t, title: e.target.value } : t)))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => set("tasks", draft.tasks.filter((_, j) => j !== i))}
                      className="shrink-0 rounded-md border bg-surface p-1.5 text-muted-foreground hover:text-destructive"
                      aria-label="Remover tarefa"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    <input
                      type="number"
                      min={0}
                      className={inputCls}
                      value={task.dueOffsetDays}
                      onChange={(e) =>
                        set(
                          "tasks",
                          draft.tasks.map((t, j) =>
                            j === i ? { ...t, dueOffsetDays: Number(e.target.value) || 0 } : t,
                          ),
                        )
                      }
                    />
                    <select
                      className={inputCls}
                      value={task.priority}
                      onChange={(e) =>
                        set(
                          "tasks",
                          draft.tasks.map((t, j) =>
                            j === i ? { ...t, priority: e.target.value as (typeof prioridades)[number] } : t,
                          ),
                        )
                      }
                    >
                      {prioridades.map((p) => (
                        <option key={p} value={p}>
                          Prioridade {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  set("tasks", [...draft.tasks, { title: "", dueOffsetDays: 1, priority: "media" as const }])
                }
                className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3 w-3" /> Adicionar tarefa
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
          {saved && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
              <Check className="h-3 w-3" /> Template salvo
            </span>
          )}
          <button
            type="button"
            onClick={save}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Salvar template
          </button>
        </div>
      </div>
    </details>
  );
}

function Config() {
  const { theme, setTheme } = useTheme();
  const { serviceTemplates } = useDataStore();
  const [rules, setRules] = useState(automationRules);

  const toggleRule = (id: string) =>
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)));

  const byCategory = rules.reduce<Record<string, AutomationRule[]>>((acc, r) => {
    (acc[r.category] ||= []).push(r);
    return acc;
  }, {});

  return (
    <AppShell title="Configurações" subtitle="Aparência, templates operacionais e automações">
      <div className="px-4 py-6 md:px-6">
        <PageHeader title="Configurações" subtitle="Tema da interface, templates da sua operação e automações" />

        {/* Aparência */}
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
              <Palette className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Aparência</h3>
              <p className="text-[11px] text-muted-foreground">Escolha o tema da interface.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 md:max-w-sm">
            {([
              { value: "light", label: "Claro", icon: Sun },
              { value: "dark", label: "Escuro", icon: Moon },
            ] as const).map((t) => {
              const Icon = t.icon;
              const active = theme === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-md border p-3 text-[12px] font-medium transition-all",
                    active ? "border-primary bg-primary/10 text-primary" : "bg-surface hover:bg-accent",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
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
                  Quando uma venda é fechada, o sistema monta a operação a partir destes templates — edite etapas,
                  checklist e tarefas.
                </p>
              </div>
            </div>
            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">
              {serviceTemplates.length} templates
            </span>
          </div>

          <div className="divide-y">
            {serviceTemplates.map((t) => (
              <TemplateEditor key={t.id} template={t} />
            ))}
          </div>
        </div>

        {/* Automações Ativas */}
        <div className="mt-6 rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b bg-surface/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15">
                <Zap className="h-3.5 w-3.5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight">Automações do sistema</h3>
                <p className="text-[11px] text-muted-foreground">Regras que executam ações automaticamente conforme eventos acontecem.</p>
              </div>
            </div>
            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">
              {rules.filter((r) => r.active).length}/{rules.length} ativas
            </span>
          </div>

          <div className="divide-y">
            {Object.entries(byCategory).map(([cat, list]) => (
              <div key={cat} className="p-4">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{cat}</div>
                <div className="space-y-2">
                  {list.map((r) => (
                    <div key={r.id} className="flex items-start gap-3 rounded-md border bg-surface/30 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium">{r.name}</span>
                          <span className="rounded bg-accent px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
                            {r.runs} execuções
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Quando: <span className="text-foreground/80">{triggerLabels[r.when]}</span>
                          {r.condition && <> · <span>{r.condition}</span></>}
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {r.do.map((a) => (
                            <span key={a} className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                              {actionLabels[a]}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleRule(r.id)}
                        className={cn(
                          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                          r.active ? "bg-primary" : "bg-muted",
                        )}
                        aria-label={r.active ? "Desativar automação" : "Ativar automação"}
                      >
                        <span
                          className={cn(
                            "absolute top-0.5 h-4 w-4 rounded-full bg-background transition-transform",
                            r.active ? "translate-x-4" : "translate-x-0.5",
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
