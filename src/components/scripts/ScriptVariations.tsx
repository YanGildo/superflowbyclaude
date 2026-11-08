import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface Variation { label: string; body: string }

/** Abas das versões no card do script (só aparecem quando há mais de uma). */
export function VariationTabs({ labels, active, onChange, title }: { labels: string[]; active: number; onChange: (i: number) => void; title: string }) {
  if (labels.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-1" role="tablist" aria-label={`Versões de ${title}`}>
      {labels.map((l, i) => (
        <button key={`${l}-${i}`} type="button" role="tab" aria-selected={active === i} onClick={() => onChange(i)}
          className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
            active === i ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent")}>
          {l}
        </button>
      ))}
    </div>
  );
}

/** Edita o nome do texto principal e as variações (nome + texto). */
export function VariationsEditor({ mainLabel, setMainLabel, list, setList }: {
  mainLabel: string; setMainLabel: (v: string) => void; list: Variation[]; setList: (v: Variation[]) => void;
}) {
  const set = (i: number, k: keyof Variation, v: string) => setList(list.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="space-y-1.5">
        <Label htmlFor="sc-main-label">Nome do texto principal (opcional)</Label>
        <Input id="sc-main-label" value={mainLabel} onChange={(e) => setMainLabel(e.target.value)} placeholder="Ex.: Formal, Curta, 1º contato…" />
      </div>
      {list.map((v, i) => (
        <div key={i} className="space-y-1.5 rounded-lg border p-2.5">
          <div className="flex items-center gap-2">
            <Input value={v.label} onChange={(e) => set(i, "label", e.target.value)} placeholder={`Variação ${i + 2}`} aria-label={`Nome da variação ${i + 2}`} className="h-8" />
            <Button type="button" size="icon" variant="ghost" className="size-8 shrink-0 hover:text-destructive" aria-label={`Remover variação ${i + 2}`}
              onClick={() => setList(list.filter((_, j) => j !== i))}><Trash2 className="size-4" /></Button>
          </div>
          <Textarea rows={5} value={v.body} onChange={(e) => set(i, "body", e.target.value)} aria-label={`Texto da variação ${i + 2}`} placeholder="Outra versão do mesmo script…" />
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => setList([...list, { label: "", body: "" }])}><Plus className="size-4" />Adicionar variação</Button>
    </div>
  );
}
