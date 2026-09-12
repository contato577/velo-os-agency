import { useState, type ReactNode } from "react";
import { ArrowUp, ArrowDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/lib/data-store";

const NOVO_CLIENTE = "__novo_cliente__";

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
  const { addExpense, clients, addClientManual, addTimelineEntry } = useDataStore();
  const [tipo, setTipo] = useState<LancamentoTipo>(null);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("");
  const [contraparte, setContraparte] = useState("");
  const [valor, setValor] = useState("");
  const [data, setData] = useState("");
  const [recorrente, setRecorrente] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Venda avulsa pra cliente que ainda não existe na base: em vez de deixar o
  // nome solto no texto, cadastra o cliente de verdade e já vincula o lançamento.
  const [criandoCliente, setCriandoCliente] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoEmpresa, setNovoEmpresa] = useState("");
  const [criandoSalvando, setCriandoSalvando] = useState(false);

  const criarClienteEVincular = async () => {
    if (!novoEmpresa.trim()) return;
    setCriandoSalvando(true);
    const cliente = await addClientManual({
      name: novoNome.trim() || novoEmpresa.trim(),
      company: novoEmpresa.trim(),
      owner: "Você",
      plan: "Starter",
      monthlyValue: Number(valor) || 0,
      services: [categoria || "Serviço Extra"],
      // Essa venda avulsa já vai virar um lançamento no financeiro logo abaixo
      // (com a descrição/valor/data que a pessoa está preenchendo agora) — sem
      // isso, o cadastro do cliente criava seu próprio lançamento automático
      // E o formulário criava outro, duplicando a venda no DRE.
      skipFinanceEntry: true,
    });
    setContraparte(cliente.company);
    setCriandoCliente(false);
    setCriandoSalvando(false);
    setNovoNome("");
    setNovoEmpresa("");
  };

  const categorias =
    tipo === "entrada" ? categoriasEntrada : tipo === "saida" ? categoriasSaida : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tipo) return;
    setSaving(true);
    setTimeout(() => {
      addExpense({
        date: data,
        description: descricao,
        category: categoria || (tipo === "entrada" ? "Mensalidade" : "Operacional"),
        costCenter:
          tipo === "entrada"
            ? "Receita"
            : ((categoria ||
              "Operacional") as import("@/lib/mock-data").FinanceEntry["costCenter"]),
        type: tipo,
        amount: Number(valor) || 0,
        client: contraparte || undefined,
        recurring: recorrente,
      });

      // Reflete o lançamento na timeline do cliente vinculado, pra ficar tudo
      // rastreável na carteira dele em vez de sumir só no financeiro.
      if (tipo === "entrada" && contraparte) {
        const clienteVinculado = clients.find((c) => c.company === contraparte);
        if (clienteVinculado) {
          addTimelineEntry(
            clienteVinculado.id,
            `Lançamento financeiro: ${descricao} — R$ ${(Number(valor) || 0).toFixed(2)}${recorrente ? " (recorrente)" : ""}`,
            "Você",
          );
        }
      }

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
        <div className="text-[12px] text-muted-foreground">Salva no sistema financeiro.</div>
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

      <fieldset
        disabled={!tipo}
        className={cn("space-y-3", !tipo && "opacity-50 pointer-events-none")}
      >
        <F label="Descrição">
          <input
            required
            placeholder="Ex: Mensalidade Pereira Ortopedia"
            className={inputCls}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </F>
        <div className="grid grid-cols-2 gap-3">
          <F label="Categoria">
            <select
              className={inputCls}
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              {categorias.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </F>
          <F label={tipo === "entrada" ? "Cliente" : "Fornecedor"}>
            {tipo === "entrada" ? (
              <select
                className={inputCls}
                value={criandoCliente ? NOVO_CLIENTE : contraparte}
                onChange={(e) => {
                  if (e.target.value === NOVO_CLIENTE) {
                    setCriandoCliente(true);
                    setContraparte("");
                  } else {
                    setCriandoCliente(false);
                    setContraparte(e.target.value);
                  }
                }}
              >
                <option value="">Selecione…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.company}>
                    {c.company}
                  </option>
                ))}
                <option value={NOVO_CLIENTE}>+ Novo cliente</option>
              </select>
            ) : (
              <input
                placeholder="Nome"
                className={inputCls}
                value={contraparte}
                onChange={(e) => setContraparte(e.target.value)}
              />
            )}
          </F>
        </div>

        {criandoCliente && (
          <div className="space-y-2 rounded-md border border-dashed bg-surface/40 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Plus className="h-3 w-3" /> Cadastrar cliente novo
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                placeholder="Empresa *"
                className={inputCls}
                value={novoEmpresa}
                onChange={(e) => setNovoEmpresa(e.target.value)}
              />
              <input
                placeholder="Contato (nome)"
                className={inputCls}
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={criarClienteEVincular}
              disabled={!novoEmpresa.trim() || criandoSalvando}
              className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
            >
              {criandoSalvando ? "Criando…" : "Criar e vincular"}
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <F label="Valor (R$)">
            <input
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0,00"
              className={inputCls}
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </F>
          <F label="Data">
            <input
              type="date"
              required
              className={inputCls}
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </F>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[12px] text-muted-foreground">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-primary"
            checked={recorrente}
            onChange={(e) => setRecorrente(e.target.checked)}
          />
          Lançamento recorrente (mensal)
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