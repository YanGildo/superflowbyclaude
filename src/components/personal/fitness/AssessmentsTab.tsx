import { useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/PageHeader";
import { useAssessments } from "@/hooks/usePersonal";
import type { BodyAssessment } from "@/integrations/supabase/types";
import { dmy, n1 } from "@/lib/formFields";
import { bmi, CIRCUMFERENCES, levelOf, SKINFOLDS, trend, type Better } from "@/lib/fitness";
import { cn } from "@/lib/utils";
import { AssessmentDialog } from "./AssessmentDialog";

type Row = { label: string; get: (a: BodyAssessment) => number | null | undefined; better: Better; unit?: string; d?: number };
const MAIN: Row[] = [
  { label: "Peso", get: (a) => a.weight, better: "down", unit: "kg" },
  { label: "IMC", get: (a) => bmi(a.weight, a.height), better: "down", d: 2 },
  { label: "% gordura (dobras)", get: (a) => a.fat_pct, better: "down", unit: "%", d: 2 },
  { label: "% gordura (bioimpedância)", get: (a) => a.bio_fat_pct, better: "down", unit: "%" },
  { label: "% massa magra (bioimpedância)", get: (a) => a.bio_muscle_pct, better: "up", unit: "%" },
  { label: "Massa gorda", get: (a) => a.fat_kg, better: "down", unit: "kg" },
  { label: "Massa magra", get: (a) => a.lean_kg, better: "up", unit: "kg" },
  { label: "Peso muscular", get: (a) => a.muscle_kg, better: "up", unit: "kg" },
];
const rows: Row[] = [
  ...MAIN,
  ...CIRCUMFERENCES.map((m) => ({ label: m.label, get: (a: BodyAssessment) => a.circumferences[m.key], better: m.better, unit: "cm" })),
  ...SKINFOLDS.map((m) => ({ label: `Dobra ${m.label.toLowerCase()}`, get: (a: BodyAssessment) => a.skinfolds[m.key], better: m.better, unit: "mm" })),
];

/** Comparação lado a lado de todas as avaliações (mais recente primeiro). */
export function AssessmentsTab() {
  const list = useAssessments().data ?? [];
  const [edit, setEdit] = useState<BodyAssessment | null | "new">(null);
  const shown = rows.filter((r) => list.some((a) => r.get(a)));
  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button onClick={() => setEdit("new")}><Plus className="size-4" />Nova avaliação</Button></div>
      {list.length === 0 ? <EmptyState icon={ClipboardList} title="Nenhuma avaliação" description="Cadastre a ficha da academia: peso, dobras, bioimpedância e medidas." /> : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm" aria-label="Avaliações físicas">
            <thead className="bg-muted/40 text-xs">
              <tr>
                <th className="sticky left-0 bg-muted/90 px-3 py-2 text-left">Medida</th>
                {list.map((a) => (
                  <th key={a.id} className="px-3 py-2 text-right">
                    <button type="button" className="font-semibold text-primary hover:underline" onClick={() => setEdit(a)}>{dmy(a.date)}</button>
                    <p className="font-normal text-muted-foreground">{levelOf(a.fat_pct)?.name ?? ""}</p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {shown.map((r) => (
                <tr key={r.label}>
                  <td className="sticky left-0 bg-card px-3 py-1.5 text-muted-foreground">{r.label}</td>
                  {list.map((a, i) => {
                    const v = r.get(a); const prev = list[i + 1] ? r.get(list[i + 1]) : null;
                    const t = trend(v, prev, r.better);
                    return <td key={a.id} className={cn("px-3 py-1.5 text-right tabular-nums", t === "good" && "text-success", t === "bad" && "text-destructive")}>{v ? `${n1(v, r.d ?? 1)}${r.unit ? ` ${r.unit}` : ""}` : "—"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {list[0]?.anamnese && <p className="rounded-xl border bg-card p-3 text-sm"><b>Anamnese ({dmy(list[0].date)}):</b> {list[0].anamnese}</p>}
      <AssessmentDialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)} row={edit === "new" ? null : edit} />
    </div>
  );
}
