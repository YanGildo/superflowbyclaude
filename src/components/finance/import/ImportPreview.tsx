import { useState } from "react";
import { AlertTriangle, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { catValue, type ImportFlow } from "@/hooks/useImportFlow";
import type { FinCategory } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";
import { shortDate } from "@/lib/labels";
import type { ImportLine } from "@/lib/statementImport";
import { cn } from "@/lib/utils";

const NONE = "__none";
type Filter = "novos" | "sem" | "transf" | "antigos";

/** Confere a soma lida com o total que o próprio extrato informa. */
function TotalsCheck({ f }: { f: ImportFlow }) {
  const s = f.parsed?.summary, t = f.totals;
  if (!t) return null;
  if (!s || s.totalIn == null || s.totalOut == null) {
    return <p className="text-xs text-muted-foreground">Lidas {f.lines.length} linhas · entradas {brl(t.totalIn)} · saídas {brl(t.totalOut)} (este formato não traz total para conferir).</p>;
  }
  const ok = Math.abs(t.totalIn - s.totalIn) < 0.01 && Math.abs(t.totalOut - s.totalOut) < 0.01;
  return (
    <div role="status" aria-label="Conferência com o extrato" className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm", ok ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5")}>
      {ok ? <CheckCircle2 className="mt-0.5 size-4 text-success" /> : <AlertTriangle className="mt-0.5 size-4 text-destructive" />}
      <div>
        <p className="font-medium">{ok ? "Bateu com o extrato" : "Não bateu com o total do extrato"}</p>
        <p className="text-xs text-muted-foreground">Entradas {brl(t.totalIn)} (extrato {brl(s.totalIn)}) · Saídas {brl(t.totalOut)} (extrato {brl(s.totalOut)})
          {s.final != null && ` · Saldo final do extrato ${brl(s.final)}`}</p>
        {!ok && <p className="text-xs text-destructive">Texto colado às vezes vem embaralhado. Envie o PDF do extrato para ler certinho.</p>}
      </div>
    </div>
  );
}

function CategoryPick({ l, categories, onChange }: { l: ImportLine; categories: FinCategory[]; onChange: (v: string) => void }) {
  if (l.type === "transferencia") return <Badge variant="secondary" className="max-w-48 shrink-0 gap-1 truncate font-normal"><ArrowLeftRight className="size-3" />{l.transfer}</Badge>;
  const list = categories.filter((c) => c.kind === l.type || c.kind === "ambos");
  const v = catValue(l);
  return (
    <Select value={v || NONE} onValueChange={(x) => onChange(x === NONE ? "" : x)}>
      <SelectTrigger aria-label={`Categoria de ${l.description}`} className={cn("h-8 w-40 shrink-0 text-xs sm:w-48", !v && "text-muted-foreground")}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Sem categoria</SelectItem>
        {l.category.name && <SelectItem value={`new:${l.category.name}`}>{l.category.name} (nova)</SelectItem>}
        {list.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Row({ l, f, old }: { l: ImportLine; f: ImportFlow; old: boolean }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-2 py-1.5 text-sm last:border-0 sm:flex-nowrap", old && "opacity-50")}>
      <Checkbox checked={!old && !f.excluded.has(l.key)} disabled={old} onCheckedChange={() => f.toggle(l.key)} aria-label={`Importar ${l.description}`} />
      <span className="w-12 shrink-0 text-xs text-muted-foreground">{shortDate(l.row.date)}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{l.description}</p>
        <p className="truncate text-[11px] text-muted-foreground">{old ? "já importado" : l.row.kind}</p>
      </div>
      <div className="order-last w-full pl-7 sm:order-none sm:w-auto sm:pl-0"><CategoryPick l={l} categories={f.categories} onChange={(v) => f.choose(l, v)} /></div>
      <span className={cn("w-24 shrink-0 text-right font-semibold tabular-nums", l.row.dir === "in" ? "text-success" : "text-destructive")}>
        {l.row.dir === "in" ? "+" : "−"}{brl(l.row.amount)}
      </span>
    </div>
  );
}

function Filters({ f, filter, setFilter }: { f: ImportFlow; filter: Filter; setFilter: (x: Filter) => void }) {
  const sem = f.fresh.filter((l) => l.type !== "transferencia" && !catValue(l)).length;
  const items: [Filter, string][] = [["novos", `Novos (${f.fresh.length})`], ["sem", `Sem categoria (${sem})`],
    ["transf", `Transferências (${f.fresh.filter((l) => l.type === "transferencia").length})`], ["antigos", `Já importados (${f.lines.length - f.fresh.length})`]];
  return (
    <div role="tablist" className="flex flex-wrap gap-1">
      {items.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
          className={cn("rounded-full border px-3 py-1 text-xs", filter === id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}>{label}</button>
      ))}
    </div>
  );
}

export function ImportPreview({ f }: { f: ImportFlow }) {
  const [filter, setFilter] = useState<Filter>("novos");
  const shown = filter === "antigos" ? f.lines.filter((l) => f.known.has(l.key))
    : filter === "sem" ? f.fresh.filter((l) => l.type !== "transferencia" && !catValue(l))
    : filter === "transf" ? f.fresh.filter((l) => l.type === "transferencia") : f.fresh;
  return (
    <div className="min-w-0 space-y-3">
      <TotalsCheck f={f} />
      <Filters f={f} filter={filter} setFilter={setFilter} />
      <p className="text-xs text-muted-foreground">Trocar a categoria de uma linha muda todas do mesmo nome, e o Superflow lembra na próxima importação.</p>
      <div className="max-h-[48vh] overflow-y-auto rounded-lg border" aria-label="Prévia da importação">
        {shown.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">Nada aqui.</p>}
        {shown.slice(0, 400).map((l) => <Row key={l.key} l={l} f={f} old={f.known.has(l.key)} />)}
      </div>
    </div>
  );
}
