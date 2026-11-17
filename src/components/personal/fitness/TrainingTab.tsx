import { useState } from "react";
import { CheckCircle2, Dumbbell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/PageHeader";
import { Bar } from "@/components/personal/Bits";
import { FormDialog } from "@/components/personal/FormDialog";
import { useCrmMutations } from "@/hooks/useCrm";
import { useFitnessSettings, useWorkoutLogs, useWorkoutPlans } from "@/hooks/usePersonal";
import type { WorkoutLog, WorkoutPlan } from "@/integrations/supabase/types";
import { exercisesText, parseExercises, weekStreak, workoutsThisWeek } from "@/lib/fitness";
import { dmy, type Field } from "@/lib/formFields";
import { todayISO } from "@/lib/tiktokShop";

const KINDS = [
  { value: "musculacao", label: "Musculação" }, { value: "cardio", label: "Cardio" }, { value: "luta", label: "Luta" },
  { value: "funcional", label: "Funcional" }, { value: "outro", label: "Outro" },
];
const PLAN_FIELDS: Field[] = [
  { key: "name", label: "Nome do treino", required: true, placeholder: "Treino A · Peito e tríceps" },
  { key: "focus", label: "Foco / dia", placeholder: "Segunda e quinta" },
  { key: "exercises", label: "Exercícios (um por linha)", type: "textarea", rows: 8,
    placeholder: "Supino reto | 4x10 | 30 kg | 60s\nCrucifixo | 3x12 | 12 kg\nTríceps corda | 3x15", help: "Nome | séries x repetições | carga | descanso | observação" },
];

function logFields(plans: WorkoutPlan[]): Field[] {
  return [
    { key: "date", label: "Dia", type: "date", required: true, half: true },
    { key: "kind", label: "Tipo", type: "select", options: KINDS, initial: "musculacao", half: true },
    { key: "plan_id", label: "Treino da ficha", type: "ref", refs: plans, placeholder: "Nenhum" },
    { key: "duration_min", label: "Duração (min)", type: "number", half: true },
    { key: "effort", label: "Esforço (1 a 10)", type: "number", half: true },
    { key: "notes", label: "Como foi", type: "textarea", rows: 2, placeholder: "Subi a carga no supino, dor no ombro…" },
  ];
}

function PlanList({ plans, onOpen }: { plans: WorkoutPlan[]; onOpen: (p: WorkoutPlan | "new") => void }) {
  return (
    <div className="space-y-3">
        <div className="flex items-center justify-between"><p className="font-heading font-semibold">Fichas</p><Button size="sm" onClick={() => onOpen("new")}><Plus className="size-4" />Nova ficha</Button></div>
        {plans.length === 0 ? <EmptyState icon={Dumbbell} title="Nenhuma ficha" description="Cadastre o treino A, B, C… com séries, cargas e descanso." /> : plans.map((p) => (
          <button key={p.id} type="button" onClick={() => onOpen(p)} className="w-full rounded-xl border bg-card p-3 text-left hover:border-primary/50">
            <p className="font-medium">{p.name} {p.focus && <span className="text-sm font-normal text-muted-foreground">· {p.focus}</span>}</p>
            <ul className="mt-1.5 space-y-0.5 text-sm">{p.exercises.map((e, i) => (
              <li key={i} className="flex justify-between gap-2 border-b border-dashed py-0.5"><span>{e.name}</span><span className="text-muted-foreground">{[e.sets, e.load, e.rest].filter(Boolean).join(" · ")}</span></li>
            ))}</ul>
          </button>
        ))}
      </div>
  );
}

function LogPanel({ logs, plans, goal, onOpen }: { logs: WorkoutLog[]; plans: WorkoutPlan[]; goal: number; onOpen: (l: WorkoutLog | "new") => void }) {
  const week = workoutsThisWeek(logs);
  const name = new Map(plans.map((p) => [p.id, p.name]));
  const label = (l: WorkoutLog) => (l.plan_id ? name.get(l.plan_id) : KINDS.find((k) => k.value === l.kind)?.label);
  const extra = (l: WorkoutLog) => [l.duration_min ? `${l.duration_min} min` : null, l.effort ? `esforço ${l.effort}` : null].filter(Boolean).join(" · ");
  return (
    <div className="space-y-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm font-medium">Semana: {week} de {goal} treino(s) · {weekStreak(logs, goal)} semana(s) seguidas na meta</p>
          <Bar pct={(week / Math.max(1, goal)) * 100} className={week >= goal ? "bg-success" : ""} />
          <Button className="mt-3 w-full" onClick={() => onOpen("new")}><CheckCircle2 className="size-4" />Treinei hoje</Button>
        </div>
        <ul className="divide-y rounded-xl border bg-card text-sm" aria-label="Treinos feitos">
          {logs.length === 0 && <li className="p-3 text-muted-foreground">Nenhum treino registrado.</li>}
          {logs.slice(0, 30).map((l) => (
            <li key={l.id}><button type="button" onClick={() => onOpen(l)} className="flex w-full justify-between gap-2 p-2.5 text-left hover:bg-accent/40">
              <span><b>{dmy(l.date)}</b> · {label(l)}</span>
              <span className="text-muted-foreground">{extra(l)}</span>
            </button></li>
          ))}
        </ul>
      </div>
  );
}

function PlanDialog({ plan, count, onClose }: { plan: WorkoutPlan | null | "new"; count: number; onClose: () => void }) {
  const pm = useCrmMutations("workout_plans");
  const cur = plan === "new" ? null : plan;
  return (
    <FormDialog open={plan !== null} onOpenChange={(o) => !o && onClose()} title={cur ? "Editar ficha" : "Nova ficha"} fields={PLAN_FIELDS}
      initial={cur ? { ...cur, exercises: exercisesText(cur.exercises) } : null} pending={pm.save.isPending}
      onSubmit={(v) => pm.save.mutateAsync({ ...(cur ? { id: cur.id } : { position: count }), ...v, exercises: parseExercises(String(v.exercises ?? "")) })}
      onDelete={cur ? () => pm.save.mutate({ id: cur.id, archived_at: new Date().toISOString() }) : undefined} />
  );
}

/** Fichas de treino e registro de cada treino feito. */
export function TrainingTab() {
  const plans = useWorkoutPlans().data ?? [];
  const logs = useWorkoutLogs().data ?? [];
  const goal = useFitnessSettings().q.data?.workouts_per_week ?? 4;
  const lm = useCrmMutations("workout_logs");
  const [plan, setPlan] = useState<WorkoutPlan | null | "new">(null);
  const [log, setLog] = useState<WorkoutLog | null | "new">(null);
  const curLog = log === "new" ? null : log;
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <PlanList plans={plans} onOpen={setPlan} />
      <LogPanel logs={logs} plans={plans} goal={goal} onOpen={setLog} />
      <PlanDialog plan={plan} count={plans.length} onClose={() => setPlan(null)} />
      <FormDialog open={log !== null} onOpenChange={(o) => !o && setLog(null)} title={curLog ? "Editar treino" : "Registrar treino"} fields={logFields(plans)}
        initial={curLog ?? { date: todayISO() }} pending={lm.save.isPending}
        onSubmit={(v) => lm.save.mutateAsync(curLog ? { id: curLog.id, ...v } : v)} onDelete={curLog ? () => lm.remove.mutate(curLog.id) : undefined} />
    </div>
  );
}
