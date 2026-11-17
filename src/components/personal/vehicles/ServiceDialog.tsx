import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { FormDialog } from "@/components/personal/FormDialog";
import { useCrmMutations } from "@/hooks/useCrm";
import type { ServiceItem, Vehicle, VehicleService } from "@/integrations/supabase/types";
import { brl, parseMoney } from "@/lib/format";
import { todayISO } from "@/lib/tiktokShop";
import type { Field } from "@/lib/formFields";
import { itemTotal, itemsTotal, SERVICE_CATEGORIES } from "@/lib/vehicles";

const FIELDS: Field[] = [
  { key: "date", label: "Data", type: "date", required: true, half: true },
  { key: "category", label: "Tipo", type: "select", options: SERVICE_CATEGORIES, initial: "manutencao", half: true },
  { key: "shop", label: "Oficina / local", half: true, placeholder: "Gomes Pneus" },
  { key: "shop_phone", label: "Telefone da oficina", half: true },
  { key: "os_number", label: "Nº da ordem de serviço / nota", half: true },
  { key: "km", label: "Km no dia", type: "number", half: true },
  { key: "next_date", label: "Próxima revisão (data)", type: "date", half: true },
  { key: "next_km", label: "Próxima revisão (km)", type: "number", half: true },
  { key: "notes", label: "Observações", type: "textarea", rows: 2, placeholder: "O que o mecânico falou, garantia, o que ficou para depois…" },
];

type Row = { desc: string; qty: string; unit: string; discount: string };
const toRow = (i: ServiceItem): Row => ({ desc: i.desc, qty: String(i.qty), unit: String(i.unit).replace(".", ","), discount: i.discount ? String(i.discount).replace(".", ",") : "" });
const toItem = (r: Row): ServiceItem => ({ desc: r.desc.trim(), qty: Number(r.qty.replace(",", ".")) || 1, unit: parseMoney(r.unit) ?? 0, discount: parseMoney(r.discount) ?? 0 });

function Items({ rows, set }: { rows: Row[]; set: (r: Row[]) => void }) {
  const up = (i: number, k: keyof Row, v: string) => set(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  return (
    <div className="space-y-1.5" aria-label="Peças e serviços">
      <p className="text-sm font-medium">Peças e serviços</p>
      <div className="grid grid-cols-[1fr_3rem_5.5rem_5rem_2rem] gap-1 text-[11px] text-muted-foreground"><span>Descrição</span><span>Qtd</span><span>Valor unit.</span><span>Desconto</span><span /></div>
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_3rem_5.5rem_5rem_2rem] items-center gap-1">
          <Input aria-label={`Item ${i + 1}`} value={r.desc} onChange={(e) => up(i, "desc", e.target.value)} className="h-8" placeholder="Pastilha de freio" />
          <Input aria-label={`Quantidade ${i + 1}`} value={r.qty} onChange={(e) => up(i, "qty", e.target.value)} className="h-8" inputMode="decimal" />
          <Input aria-label={`Valor ${i + 1}`} value={r.unit} onChange={(e) => up(i, "unit", e.target.value)} className="h-8" inputMode="decimal" />
          <Input aria-label={`Desconto ${i + 1}`} value={r.discount} onChange={(e) => up(i, "discount", e.target.value)} className="h-8" inputMode="decimal" />
          <Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => set(rows.filter((_, j) => j !== i))} aria-label={`Remover item ${i + 1}`}><X className="size-4" /></Button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button type="button" size="sm" variant="outline" onClick={() => set([...rows, { desc: "", qty: "1", unit: "", discount: "" }])}><Plus className="size-4" />Adicionar item</Button>
        <p className="text-sm">Total: <b>{brl(itemsTotal(rows.map(toItem)))}</b></p>
      </div>
    </div>
  );
}

/** Registrar uma ida à oficina (ou abastecimento, IPVA…) com cada peça e valor. */
export function ServiceDialog({ open, onOpenChange, vehicle, service }: {
  open: boolean; onOpenChange: (o: boolean) => void; vehicle: Vehicle; service: VehicleService | null;
}) {
  const m = useCrmMutations("vehicle_services");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState("");
  const [toFinance, setToFinance] = useState(true);
  useEffect(() => {
    if (!open) return;
    setRows(service?.items.length ? service.items.map(toRow) : [{ desc: "", qty: "1", unit: "", discount: "" }]);
    setTotal(service && !service.items.length ? String(service.total).replace(".", ",") : "");
    setToFinance(service?.to_finance ?? true);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async (v: Record<string, unknown>) => {
    const items = rows.map(toItem).filter((i) => i.desc);
    const sum = items.length ? itemsTotal(items) : parseMoney(total) ?? 0;
    const row = { ...v, vehicle_id: vehicle.id, items, total: Math.round(sum * 100) / 100, to_finance: toFinance };
    await m.save.mutateAsync(service ? { id: service.id, ...row } : row);
    const km = v.km as number | null;
    if (km && (!vehicle.current_km || km > vehicle.current_km)) await vehicleKm.save.mutateAsync({ id: vehicle.id, current_km: km });
  };
  const vehicleKm = useCrmMutations("vehicles");
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={service ? "Editar registro" : `Novo gasto · ${vehicle.name}`} fields={FIELDS}
      initial={service ?? { date: todayISO() }} pending={m.save.isPending} onSubmit={save} onDelete={service ? () => m.remove.mutate(service.id) : undefined}>
      <Items rows={rows} set={setRows} />
      {rows.every((r) => !r.desc.trim()) && (
        <div className="mt-2 space-y-1"><p className="text-xs text-muted-foreground">Sem itens? Informe só o total (ex.: abastecimento):</p>
          <Input aria-label="Total" value={total} onChange={(e) => setTotal(e.target.value)} className="h-9 w-40" placeholder="R$ 0,00" /></div>
      )}
      <label className="mt-3 flex items-center gap-2 text-sm"><Switch checked={toFinance} onCheckedChange={setToFinance} aria-label="Lançar no Financeiro" />Lançar como saída no Financeiro (categoria Veículo)</label>
      <p className="mt-1 text-[11px] text-muted-foreground">{rows.filter((r) => r.desc.trim()).map((r) => `${r.desc}: ${brl(itemTotal(toItem(r)))}`).join(" · ")}</p>
    </FormDialog>
  );
}
