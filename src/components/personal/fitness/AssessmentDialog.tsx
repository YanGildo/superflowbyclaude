import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { FormDialog } from "@/components/personal/FormDialog";
import { useCrmMutations } from "@/hooks/useCrm";
import type { BodyAssessment } from "@/integrations/supabase/types";
import { parseMoney } from "@/lib/format";
import { CIRCUMFERENCES, SKINFOLDS, type Measure } from "@/lib/fitness";
import { todayISO } from "@/lib/tiktokShop";
import type { Field } from "@/lib/formFields";

const FIELDS: Field[] = [
  { key: "date", label: "Data", type: "date", required: true, half: true },
  { key: "next_date", label: "Reavaliação", type: "date", half: true },
  { key: "evaluator", label: "Avaliador", half: true }, { key: "place", label: "Local", half: true },
  { key: "age", label: "Idade", type: "number", half: true },
  { key: "sex", label: "Sexo", type: "select", half: true, options: [{ value: "M", label: "Masculino" }, { value: "F", label: "Feminino" }], initial: "M" },
  { key: "weight", label: "Peso (kg)", type: "number", half: true }, { key: "height", label: "Altura (m)", type: "number", half: true },
  { key: "protocol", label: "Protocolo", half: true, initial: "Pollock 7 dobras" },
  { key: "fat_pct", label: "% gordura (dobras)", type: "number", half: true },
  { key: "fat_kg", label: "Massa gorda (kg)", type: "number", half: true }, { key: "lean_kg", label: "Massa magra (kg)", type: "number", half: true },
  { key: "muscle_kg", label: "Peso muscular (kg)", type: "number", half: true }, { key: "residual_kg", label: "Peso residual (kg)", type: "number", half: true },
  { key: "bio_fat_pct", label: "Bioimpedância: % gordura", type: "number", half: true },
  { key: "bio_muscle_pct", label: "Bioimpedância: % massa magra", type: "number", half: true },
  { key: "goal", label: "Objetivo", placeholder: "Diminuir percentual de gordura" },
  { key: "anamnese", label: "Anamnese", type: "textarea", rows: 2 },
  { key: "notes", label: "Observações", type: "textarea", rows: 2 },
];

type Vals = Record<string, string>;
const toVals = (o: Record<string, number> | undefined) => Object.fromEntries(Object.entries(o ?? {}).map(([k, v]) => [k, String(v).replace(".", ",")]));
const fromVals = (v: Vals) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, parseMoney(x) ?? 0]).filter(([, x]) => Number(x) > 0));

function Grid({ title, unit, list, vals, set }: { title: string; unit: string; list: Measure[]; vals: Vals; set: (v: Vals) => void }) {
  return (
    <fieldset className="mt-2 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{title} ({unit})</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {list.map((m) => (
          <label key={m.key} className="space-y-1 text-xs text-muted-foreground">{m.label}
            <Input aria-label={`${title}: ${m.label}`} value={vals[m.key] ?? ""} onChange={(e) => set({ ...vals, [m.key]: e.target.value })} className="h-8" inputMode="decimal" />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Avaliação física completa: composição, bioimpedância, dobras e circunferências. */
export function AssessmentDialog({ open, onOpenChange, row }: { open: boolean; onOpenChange: (o: boolean) => void; row: BodyAssessment | null }) {
  const m = useCrmMutations("body_assessments");
  const [folds, setFolds] = useState<Vals>({});
  const [circ, setCirc] = useState<Vals>({});
  useEffect(() => { if (open) { setFolds(toVals(row?.skinfolds)); setCirc(toVals(row?.circumferences)); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async (v: Record<string, unknown>) => {
    const data = { ...v, skinfolds: fromVals(folds), circumferences: fromVals(circ) };
    await m.save.mutateAsync(row ? { id: row.id, ...data } : data);
  };
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={row ? "Editar avaliação" : "Nova avaliação física"}
      description="Copie da ficha da academia. Campos vazios ficam de fora." fields={FIELDS} initial={row ?? { date: todayISO() }}
      pending={m.save.isPending} onSubmit={save} onDelete={row ? () => m.remove.mutate(row.id) : undefined}>
      <Grid title="Dobras cutâneas" unit="mm" list={SKINFOLDS} vals={folds} set={setFolds} />
      <Grid title="Circunferências" unit="cm" list={CIRCUMFERENCES} vals={circ} set={setCirc} />
    </FormDialog>
  );
}
