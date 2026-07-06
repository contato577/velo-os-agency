import { useState, type ReactNode } from "react";
import { Paperclip, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type LancamentoTipo = "entrada" | "saida" | null;

const categoriasEntrada = ["Mensalidade", "Projeto", "Consultoria", "Serviço Extra"];
const categoriasSaida = [
  "Marketing",
  "Ferramentas",
  "Equipe",
  "Impostos",
  "Operacional",
  "Administrativo",
  "Investimentos",
];

const inputCls =
  "w-full rounded-md border bg-background px-3 py-1.5 text-[13px] focus:border-primary/60 focus:outline-none";

function F({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      {children}
    </div>
  );
}

export function LancamentoForm({
  onSubmit,
  onCancel,
}: {
  onSubmit?: (data: unknown) => void;
  onCancel?: () => void;
}) {
  const [tipo, setTipo] = useState<LancamentoTipo>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const categorias = tipo === "entrada" ? categoriasEntrada : tipo === "saida" ? categoriasSaida : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipo) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      onSubmit?.({ tipo });
      setTimeout(() => onCancel?.(), 700);
    }, 400);
  };

  if (saved) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
          ✓
        </div>
        <div className="text-sm font-semibold">
          {tipo === "entrada" ? "Entrada" : "Saída"} registrada
        </div>
        <div className="text-[12px] text-muted-foreground">
          Refletida automaticamente no DRE.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      {/* Toggle Entrada / Saída */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTipo("entrada")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-all",
            tipo === "entrada"
              ? "border-success bg-success/15 text-success ring-2 ring-success/30"
              : "border-border bg-surface text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowUp className="h-4 w-4" /> Entrada
        </button>
        <button
          type="button"
          onClick={() => setTipo("saida")}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-all",
            tipo === "saida"
              ? "border-destructive bg-destructive/15 text-destructive ring-2 ring-destructive/30"
              : "border-border bg-surface text-muted-foreground hover:text-foreground",
          )}
        >
          <ArrowDown className="h-4 w-4" /> Saída
        </button>
      </div>

      {!tipo && (
        <p className="text-center text-[11px] text-muted-foreground">
          Selecione se é uma entrada ou saída para continuar.
        </p>
      )}

      <fieldset disabled={!tipo} className={cn("space-y-3", !tipo && "opacity-50 pointer-events-none")}>
        <F label="Descrição">
          <input required placeholder="Ex: Mensalidade Pereira Ortopedia" className={inputCls} />
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Categoria">
            <select className={inputCls}>
              {categorias.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </F>
          <F label={tipo === "entrada" ? "Cliente" : "Fornecedor"}>
            <input placeholder="Nome" className={inputCls} />
          </F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Valor (R$)">
            <input type="number" min="0" step="0.01" required placeholder="0,00" className={inputCls} />
          </F>
          <F label="Data">
            <input type="date" required className={inputCls} />
          </F>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <F label="Forma de pagamento">
            <select className={inputCls}>
              <option>PIX</option>
              <option>Boleto</option>
              <option>Cartão de crédito</option>
              <option>Transferência</option>
              <option>Dinheiro</option>
            </select>
          </F>
          <F label="Recorrente?">
            <select className={inputCls}>
              <option>Não</option>
              <option>Mensal</option>
              <option>Trimestral</option>
              <option>Anual</option>
            </select>
          </F>
        </div>
        <F label="Observações">
          <textarea rows={2} className={inputCls} placeholder="Notas internas…" />
        </F>
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed p-2.5 text-[12px] text-muted-foreground hover:bg-accent">
          <Paperclip className="h-3.5 w-3.5" />
          <span>Anexar comprovante (opcional)</span>
          <input type="file" className="hidden" />
        </label>
      </fieldset>

      <div className="flex items-center justify-end gap-2 border-t pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border bg-surface px-3 py-1.5 text-xs font-medium hover:bg-accent"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!tipo || saving}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
  );
}
