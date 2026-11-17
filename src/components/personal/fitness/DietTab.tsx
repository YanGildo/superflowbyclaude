import { useState } from "react";
import { Droplets, Pencil, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/personal/Bits";
import { FormDialog } from "@/components/personal/FormDialog";
import { useCrmMutations } from "@/hooks/useCrm";
import { useDietLogs, useFitnessSettings } from "@/hooks/usePersonal";
import type { DietLog, FitnessSettings } from "@/integrations/supabase/types";
import { dietAdherence, mealsText, parseMeals } from "@/lib/fitness";
import { dmy, n1, type Field } from "@/lib/formFields";
import { todayISO } from "@/lib/tiktokShop";
import { cn } from "@/lib/utils";

const PLAN_FIELDS: Field[] = [
  { key: "goal", label: "Objetivo", placeholder: "Diminuir percentual de gordura" },
  { key: "target_fat_pct", label: "Meta de % gordura", type: "number", half: true },
  { key: "target_weight", label: "Meta de peso (kg)", type: "number", half: true },
  { key: "workouts_per_week", label: "Treinos por semana", type: "number", half: true },
  { key: "kcal", label: "Calorias por dia", type: "number", half: true },
  { key: "protein_g", label: "Proteína (g)", type: "number", half: true }, { key: "carbs_g", label: "Carboidrato (g)", type: "number", half: true },
  { key: "fat_g", label: "Gordura (g)", type: "number", half: true }, { key: "water_l", label: "Água (litros)", type: "number", half: true },
  { key: "meals", label: "Refeições (uma por linha)", type: "textarea", rows: 7, placeholder: "07:00 | Café da manhã | 3 ovos, 1 pão integral, café\n12:30 | Almoço | 150 g frango, arroz, salada",
    help: "Horário | refeição | o que comer. Monte com seu nutricionista." },
];
const FOLLOWED = [{ value: "sim", label: "Segui" }, { value: "parcial", label: "Em parte" }, { value: "nao", label: "Não segui" }] as const;
const LOG_FIELDS: Field[] = [
  { key: "date", label: "Dia", type: "date", required: true, half: true },
  { key: "followed", label: "Dieta", type: "select", options: [...FOLLOWED], initial: "sim", half: true },
  { key: "water_l", label: "Água (L)", type: "number", half: true }, { key: "kcal", label: "Calorias", type: "number", half: true },
  { key: "protein_g", label: "Proteína (g)", type: "number", half: true },
  { key: "notes", label: "Observações", type: "textarea", rows: 2, placeholder: "Fome à noite, jantar fora…" },
];
const TONE = { sim: "bg-success", parcial: "bg-warning", nao: "bg-destructive" } as const;

function summary(s: FitnessSettings | null | undefined) {
  const macros: [string, number | null | undefined, string][] = [["Calorias", s?.kcal, "kcal"], ["Proteína", s?.protein_g, "g"], ["Carboidrato", s?.carbs_g, "g"], ["Gordura", s?.fat_g, "g"], ["Água", s?.water_l, "L"]];
  const goal = s?.goal ? [`Objetivo: ${s.goal}`, s.target_fat_pct ? `meta ${n1(s.target_fat_pct)}% de gordura` : null, s.target_weight ? `${n1(s.target_weight)} kg` : null].filter(Boolean).join(" · ") : null;
  return { macros, goal, meals: s?.meals ?? [] };
}

function PlanCard({ s, onEdit }: { s: FitnessSettings | null | undefined; onEdit: () => void }) {
  const { macros, goal, meals } = summary(s);
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between"><p className="font-heading font-semibold">Plano alimentar</p><Button size="sm" variant="outline" onClick={onEdit}><Pencil className="size-4" />Editar</Button></div>
        {goal && <p className="text-sm text-muted-foreground">{goal}</p>}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {macros.map(([l, v, u]) => (
            <div key={l} className="rounded-lg bg-muted/50 p-2 text-center"><p className="text-[11px] text-muted-foreground">{l}</p><p className="font-semibold">{v ? `${n1(Number(v))} ${u}` : "—"}</p></div>
          ))}
        </div>
        {meals.length === 0 ? <p className="text-sm text-muted-foreground">Cadastre as refeições do seu plano para ver aqui.</p> : (
          <ol className="divide-y text-sm">{meals.map((ml, i) => (
            <li key={i} className="flex gap-3 py-1.5"><span className="w-12 shrink-0 font-medium text-primary">{ml.time ?? ""}</span><span><b>{ml.name}</b>{ml.items ? ` · ${ml.items}` : ""}</span></li>
          ))}</ol>
        )}
      </div>
  );
}

function TodayPanel({ logs, today, water, onQuick, onLog }: {
  logs: DietLog[]; today: DietLog | undefined; water: number | null; onQuick: (f: DietLog["followed"]) => void; onLog: (l: DietLog | "new") => void;
}) {
  const adh = dietAdherence(logs);
  return (
    <div className="space-y-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium">Hoje você seguiu a dieta?</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {FOLLOWED.map((f) => <Button key={f.value} variant={today?.followed === f.value ? "default" : "outline"} onClick={() => onQuick(f.value)}>{f.label}</Button>)}
          </div>
          <Button variant="ghost" size="sm" className="mt-1" onClick={() => onLog(today ?? "new")}>Anotar água, calorias e observações</Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={Utensils} label="Aderência (14 dias)" value={adh.logged ? `${n1(adh.pct, 0)}%` : "—"} tone={adh.pct >= 80 ? "good" : adh.logged ? "warn" : undefined} hint={`${adh.logged} dia(s) anotados`} />
          <Stat icon={Droplets} label="Água hoje" value={today?.water_l ? `${n1(today.water_l)} L` : "—"} hint={water ? `meta ${n1(water)} L` : undefined} />
        </div>
        <div className="flex flex-wrap gap-1" aria-label="Últimos dias da dieta">
          {logs.slice(0, 28).reverse().map((l) => (
            <button key={l.id} type="button" onClick={() => onLog(l)} title={`${dmy(l.date)}: ${FOLLOWED.find((f) => f.value === l.followed)?.label}`} className={cn("size-6 rounded", TONE[l.followed])} />
          ))}
        </div>
      </div>
  );
}

/** Plano alimentar e o check do dia (segui / em parte / não). */
export function DietTab() {
  const { q, save } = useFitnessSettings();
  const logs = useDietLogs().data ?? [];
  const m = useCrmMutations("diet_logs");
  const [editPlan, setEditPlan] = useState(false);
  const [log, setLog] = useState<DietLog | null | "new">(null);
  const s = q.data;
  const today = logs.find((l) => l.date === todayISO());
  const quick = (followed: DietLog["followed"]) => m.save.mutate(today ? { id: today.id, followed } : { date: todayISO(), followed });
  const cur = log === "new" ? null : log;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
      <PlanCard s={s} onEdit={() => setEditPlan(true)} />
      <TodayPanel logs={logs} today={today} water={s?.water_l ?? null} onQuick={quick} onLog={setLog} />
      <FormDialog open={editPlan} onOpenChange={setEditPlan} title="Plano alimentar e metas" fields={PLAN_FIELDS}
        initial={s ? { ...s, meals: mealsText(s.meals) } : { workouts_per_week: 4 }} pending={save.isPending}
        onSubmit={(v) => save.mutateAsync({ ...v, workouts_per_week: (v.workouts_per_week as number) ?? 4, meals: parseMeals(String(v.meals ?? "")) })} />
      <FormDialog open={log !== null} onOpenChange={(o) => !o && setLog(null)} title="Dia da dieta" fields={LOG_FIELDS} initial={cur ?? { date: todayISO() }}
        pending={m.save.isPending} onSubmit={(v) => { const ex = cur ?? logs.find((l) => l.date === v.date); return m.save.mutateAsync(ex ? { id: ex.id, ...v } : v); }}
        onDelete={cur ? () => m.remove.mutate(cur.id) : undefined} />
    </div>
  );
}
