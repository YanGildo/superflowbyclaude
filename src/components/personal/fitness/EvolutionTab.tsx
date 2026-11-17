import { Activity, CalendarClock, Dumbbell, Flame, Ruler, Scale, Trophy, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/PageHeader";
import { Bar, Stat } from "@/components/personal/Bits";
import { useAssessments, useDietLogs, useFitnessSettings, useWorkoutLogs } from "@/hooks/usePersonal";
import type { BodyAssessment } from "@/integrations/supabase/types";
import { dmy, n1 } from "@/lib/formFields";
import {
  bmi, bmiClass, daysUntil, dietAdherence, LEVELS, levelOf, nextLevelTarget, waistHeight, weekStreak, workoutsThisWeek,
} from "@/lib/fitness";
import { cn } from "@/lib/utils";
import { BodyFigure } from "./BodyFigure";

/** Escada dos 7 níveis com o atual destacado. */
function Ladder({ fat }: { fat: number }) {
  const cur = levelOf(fat);
  return (
    <ol className="space-y-1.5" aria-label="Níveis de evolução">
      {[...LEVELS].reverse().map((l) => {
        const here = cur?.n === l.n;
        const done = cur ? l.n < cur.n : false;
        return (
          <li key={l.n} className={cn("flex items-center gap-3 rounded-lg border px-3 py-2", here ? "border-2 bg-card shadow-sm" : "bg-card/50", !here && !done && "opacity-70")}
            style={here ? { borderColor: l.color } : undefined} aria-current={here ? "step" : undefined}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: l.color }}>{l.n}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{l.name} {here && <span className="ml-1 text-xs font-medium" style={{ color: l.color }}>· você está aqui</span>}</p>
              <p className="text-xs text-muted-foreground">{l.gym} · gordura {n1(l.min)}% a {n1(l.max)}%</p>
            </div>
            {done && <Trophy className="size-4 text-success" aria-label="Nível conquistado" />}
          </li>
        );
      })}
    </ol>
  );
}

function NextLevel({ a }: { a: BodyAssessment }) {
  const t = nextLevelTarget(a);
  if (!t) return null;
  return (
    <div className="rounded-xl border bg-card p-4" style={{ borderColor: t.level.color }}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Nível {t.level.n} · {t.level.name}</p>
      {t.next ? (
        <>
          <p className="mt-1 font-heading text-lg font-semibold">Próximo: nível {t.next.n} · {t.next.name}</p>
          <p className="text-sm text-muted-foreground">Chegar a {n1(t.targetFat ?? 0)}% de gordura: perder cerca de <b className="text-foreground">{n1(t.fatToLose)} kg de gordura</b> mantendo a massa magra (peso alvo ~{n1(t.targetWeight ?? 0)} kg).</p>
          <Bar pct={t.progress} className="" />
          <p className="mt-1 text-xs text-muted-foreground">{n1(t.progress, 0)}% do caminho dentro do nível atual</p>
        </>
      ) : <p className="mt-1 font-heading text-lg font-semibold">Nível máximo. Agora é manter.</p>}
      <p className="mt-2 rounded-md bg-muted/60 p-2 text-xs">{t.level.tip}</p>
    </div>
  );
}

function Routine({ goal }: { goal: number }) {
  const logs = useWorkoutLogs().data ?? [];
  const diet = useDietLogs().data ?? [];
  const week = workoutsThisWeek(logs);
  const streak = weekStreak(logs, goal);
  const adh = dietAdherence(diet);
  return (
    <div className="grid grid-cols-2 gap-3">
      <Stat icon={Dumbbell} label="Treinos na semana" value={`${week}/${goal}`} tone={week >= goal ? "good" : undefined}><Bar pct={(week / Math.max(1, goal)) * 100} /></Stat>
      <Stat icon={Flame} label="Semanas seguidas na meta" value={streak} hint="Constância é o que sobe de nível" />
      <Stat icon={Utensils} label="Dieta (14 dias)" value={adh.logged ? `${n1(adh.pct, 0)}%` : "—"} hint={`${adh.logged} dia(s) anotados`} tone={adh.pct >= 80 ? "good" : adh.logged ? "warn" : undefined} />
    </div>
  );
}

const kg = (v: number | null | undefined) => (v ? `${n1(v)} kg` : "—");
const reavLabel = (reav: number | null) => (reav == null ? "Sem data" : reav >= 0 ? `em ${reav} dia(s)` : `atrasada ${-reav} dia(s)`);
function topHints(a: BodyAssessment, before?: BodyAssessment) {
  const b = bmi(a.weight, a.height);
  const rce = waistHeight(a);
  const reav = daysUntil(a.next_date);
  const dw = before?.weight && a.weight ? a.weight - before.weight : null;
  return {
    b, reav,
    weight: dw != null && before ? `${dw > 0 ? "+" : ""}${n1(dw)} kg desde ${dmy(before.date)}` : `Avaliação de ${dmy(a.date)}`,
    fat: a.bio_fat_pct != null ? `Bioimpedância: ${n1(a.bio_fat_pct)}%` : levelOf(a.fat_pct)?.gym,
    bmi: [bmiClass(b), rce ? `cintura/altura ${n1(rce, 2)}${rce > 0.5 ? " (acima de 0,5)" : ""}` : null].filter(Boolean).join(" · "),
    reavText: reavLabel(reav),
  };
}

function TopStats({ a, before }: { a: BodyAssessment; before?: BodyAssessment }) {
  const h = topHints(a, before);
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Stat icon={Scale} label="Peso" value={kg(a.weight)} hint={h.weight} />
      <Stat icon={Flame} label="% de gordura (dobras)" value={a.fat_pct != null ? `${n1(a.fat_pct, 2)}%` : "—"} hint={h.fat} />
      <Stat icon={Ruler} label="IMC" value={h.b ? n1(h.b, 2) : "—"} hint={h.bmi} />
      <Stat icon={CalendarClock} label="Reavaliação" value={dmy(a.next_date)} hint={h.reavText} tone={h.reav != null && h.reav < 0 ? "warn" : undefined} />
    </div>
  );
}

function BodyCard({ a, before }: { a: BodyAssessment; before?: BodyAssessment }) {
  const parts = [
    `Massa magra ${kg(a.lean_kg)}`, `gordura ${kg(a.fat_kg)}`,
    a.muscle_kg ? `muscular ${n1(a.muscle_kg)} kg` : null, before ? `setas comparam com ${dmy(before.date)}` : null,
  ].filter(Boolean).join(" · ");
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="mb-1 text-sm font-medium">Seu corpo hoje</p>
      <p className="mb-2 text-xs text-muted-foreground">{parts}</p>
      <BodyFigure now={a} before={before} color={levelOf(a.fat_pct)?.color ?? "#6366f1"} />
    </div>
  );
}

/** Evolução: nível atual, próximo alvo, boneco com medidas e rotina. */
export function EvolutionTab({ go }: { go: (t: string) => void }) {
  const list = useAssessments().data ?? [];
  const settings = useFitnessSettings().q.data;
  const [a, before] = list;
  if (!a) return <EmptyState icon={Activity} title="Nenhuma avaliação ainda" description="Cadastre sua avaliação física (dobras, bioimpedância e medidas) para ver seu nível e o boneco." action={<Button onClick={() => go("avaliacoes")}>Cadastrar avaliação</Button>} />;
  return (
    <div className="space-y-4">
      <TopStats a={a} before={before} />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <NextLevel a={a} />
          {a.fat_pct != null && <Ladder fat={a.fat_pct} />}
        </div>
        <div className="space-y-4">
          <BodyCard a={a} before={before} />
          <Routine goal={settings?.workouts_per_week ?? 4} />
        </div>
      </div>
    </div>
  );
}
