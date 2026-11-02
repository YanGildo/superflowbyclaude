import { useEffect, useState } from "react";
import { SimpleSelect } from "@/components/common/RefSelect";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { AreaField, Field, FormShell, TextField } from "@/components/marketing/FormShell";
import { useFinMutations } from "@/hooks/useFinance";
import type { AssetKind, FinAsset } from "@/integrations/supabase/types";
import { localISODate, moneyInput, parseMoney } from "@/lib/format";
import { ASSET_KIND, ASSET_KINDS } from "@/lib/netWorth";

const KIND_OPTIONS = ASSET_KINDS.map((k) => ({ value: k, label: ASSET_KIND[k] }));
type Form = { name: string; kind: AssetKind; value: string; value_date: string; notes: string };
const toForm = (a?: FinAsset | null): Form => ({
  name: a?.name ?? "", kind: a?.kind ?? "investimento", value: a ? moneyInput(Number(a.value)) : "",
  value_date: a?.value_date ?? localISODate(), notes: a?.notes ?? "",
});

/** Bem fora do banco: investimento, imóvel, veículo… (valor atual). */
export function AssetDialog({ open, onOpenChange, asset }: { open: boolean; onOpenChange: (o: boolean) => void; asset?: FinAsset | null }) {
  const { save } = useFinMutations("fin_assets");
  const [f, setF] = useState<Form>(toForm());
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setF(toForm(asset)); setError(null); } }, [open, asset]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const submit = async () => {
    if (!f.name.trim()) return setError("Dê um nome (ex.: Tesouro Selic, Apartamento, Carro).");
    const value = parseMoney(f.value);
    if (value == null || value < 0) return setError("Informe o valor atual.");
    await save.mutateAsync({ id: asset?.id, name: f.name.trim(), kind: f.kind, value, value_date: f.value_date || localISODate(), notes: f.notes.trim() || null });
    onOpenChange(false);
  };
  return (
    <FormShell open={open} onOpenChange={onOpenChange} onSubmit={submit} error={error} pending={save.isPending}
      title={asset ? "Editar bem" : "Novo bem"} description="Bens fora das contas bancárias. Atualize o valor de vez em quando.">
      <TextField id="as-name" label="Nome *" wide autoFocus value={f.name} onChange={(v) => set("name", v)} placeholder="Ex.: Tesouro Selic, Apartamento, Carro" />
      <Field id="as-kind" label="Tipo"><SimpleSelect id="as-kind" value={f.kind} onChange={(v) => set("kind", v)} options={KIND_OPTIONS} /></Field>
      <Field id="as-value" label="Valor atual"><MoneyInput id="as-value" value={f.value} onChange={(e) => set("value", e.target.value)} /></Field>
      <TextField id="as-date" label="Valor de quando" type="date" value={f.value_date} onChange={(v) => set("value_date", v)} />
      <AreaField id="as-notes" label="Observações" value={f.notes} onChange={(v) => set("notes", v)} />
    </FormShell>
  );
}
