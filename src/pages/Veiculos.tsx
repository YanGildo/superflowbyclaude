import { useState } from "react";
import { Car, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, PageHeader } from "@/components/common/PageHeader";
import { FormDialog } from "@/components/personal/FormDialog";
import { VehicleView } from "@/components/personal/vehicles/VehicleView";
import { useCrmMutations } from "@/hooks/useCrm";
import { useVehicleServices, useVehicles } from "@/hooks/usePersonal";
import type { Vehicle } from "@/integrations/supabase/types";
import type { Field } from "@/lib/formFields";
import { cn } from "@/lib/utils";

const FIELDS: Field[] = [
  { key: "name", label: "Apelido", required: true, placeholder: "Carro, Moto…" },
  { key: "plate", label: "Placa", half: true }, { key: "brand", label: "Marca", half: true },
  { key: "model", label: "Modelo", half: true }, { key: "year", label: "Ano", type: "number", half: true },
  { key: "color", label: "Cor", half: true }, { key: "current_km", label: "Km atual", type: "number", half: true },
  { key: "notes", label: "Observações", type: "textarea", rows: 2, placeholder: "Seguro, mecânico de confiança, documento…" },
];

/** Veículos: manutenções, peças e gastos com histórico (os gastos vão para o Financeiro). */
export default function Veiculos() {
  const vq = useVehicles();
  const vehicles = (vq.data ?? []).filter((v) => !v.archived_at);
  const services = useVehicleServices().data ?? [];
  const m = useCrmMutations("vehicles");
  const [pick, setPick] = useState<string | null>(null);
  const [edit, setEdit] = useState<Vehicle | null | "new">(null);
  const current = vehicles.find((v) => v.id === pick) ?? vehicles[0];
  const editing = edit === "new" ? null : edit;
  return (
    <div>
      <PageHeader eyebrow="Pessoal" title="Veículos" description="Cada ida ao mecânico com peças e valores. Na próxima, você sabe o que já foi feito, quando e quanto custou."
        actions={<Button variant="outline" onClick={() => setEdit("new")}><Plus className="size-4" />Novo veículo</Button>} />
      {vq.isLoading ? <Skeleton className="h-60 rounded-xl" /> : !current ? (
        <EmptyState icon={Car} title="Cadastre seu veículo" description="Depois registre cada manutenção com as peças, a oficina e o km." action={<Button onClick={() => setEdit("new")}><Plus className="size-4" />Novo veículo</Button>} />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Veículos">
            {vehicles.map((v) => (
              <button key={v.id} type="button" role="tab" aria-selected={v.id === current.id} onClick={() => setPick(v.id)}
                className={cn("rounded-xl border px-3 py-2 text-left", v.id === current.id ? "border-primary bg-primary/5" : "bg-card hover:bg-accent")}>
                <p className="text-sm font-medium">{v.name}</p>
                <p className="text-xs text-muted-foreground">{[v.plate, v.brand, v.model, v.year, v.color].filter(Boolean).join(" · ") || "—"}</p>
              </button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setEdit(current)}><Pencil className="size-4" />Editar veículo</Button>
          </div>
          <VehicleView vehicle={current} services={services} />
        </>
      )}
      <FormDialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)} title={editing ? "Editar veículo" : "Novo veículo"} fields={FIELDS}
        initial={editing} pending={m.save.isPending}
        onSubmit={async (v) => { const id = await m.save.mutateAsync(editing ? { id: editing.id, ...v } : v); setPick(id); }}
        onDelete={editing ? () => { if (window.confirm("Excluir o veículo apaga todo o histórico dele. Continuar?")) m.remove.mutate(editing.id); } : undefined} />
    </div>
  );
}
