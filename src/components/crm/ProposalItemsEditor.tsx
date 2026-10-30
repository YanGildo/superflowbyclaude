import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MoneyInput } from "@/components/finance/MoneyInput";
import type { Service } from "@/integrations/supabase/types";
import { brl, moneyInput } from "@/lib/format";
import { emptyItem, type ItemRow } from "@/lib/proposalForm";

/** Linhas da proposta: escolha um serviço do catálogo (preenche nome/preço) ou escreva livre. */
export function ProposalItemsEditor({ items, onChange, services, totals }: {
  items: ItemRow[]; onChange: (items: ItemRow[]) => void; services: Service[]; totals: { monthly: number; oneOff: number };
}) {
  const update = (i: number, patch: Partial<ItemRow>) => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const pickService = (i: number, name: string) => {
    const s = services.find((x) => x.name === name);
    update(i, { description: name, service_id: s?.id ?? null, recurring: s?.recurring ?? true,
      unit_price: s?.default_price ? moneyInput(s.default_price) : items[i].unit_price });
  };

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Itens</p>
        <datalist id="service-names">{services.filter((s) => s.active).map((s) => <option key={s.id} value={s.name} />)}</datalist>
      </div>
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_64px_120px_auto_auto] items-center gap-2 rounded-lg border p-2">
          <Input list="service-names" aria-label={`Item ${i + 1}`} placeholder="Serviço ou descrição" value={it.description}
            onChange={(e) => pickService(i, e.target.value)} className="h-9" />
          <Input aria-label={`Quantidade do item ${i + 1}`} inputMode="decimal" value={it.quantity} onChange={(e) => update(i, { quantity: e.target.value })} className="h-9" />
          <MoneyInput aria-label={`Preço do item ${i + 1}`} value={it.unit_price} onChange={(e) => update(i, { unit_price: e.target.value })} className="h-9" />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Switch checked={it.recurring} onCheckedChange={(c) => update(i, { recurring: c })} aria-label={`Item ${i + 1} mensal`} />Mensal
          </label>
          <Button type="button" size="icon" variant="ghost" className="size-8" aria-label={`Remover item ${i + 1}`}
            onClick={() => onChange(items.length > 1 ? items.filter((_, j) => j !== i) : [emptyItem()])}><Trash2 className="size-4" /></Button>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, emptyItem()])}><Plus className="size-4" />Item</Button>
        <p className="text-sm">
          Mensalidade <b className="font-heading">{brl(totals.monthly)}</b>
          <span className="mx-2 text-muted-foreground">·</span>
          Valor único <b className="font-heading">{brl(totals.oneOff)}</b>
        </p>
      </div>
    </div>
  );
}
