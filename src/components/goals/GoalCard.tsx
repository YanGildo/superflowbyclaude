import { useState, type FormEvent } from "react";
import { CalendarDays, Pencil, Plus, Sun, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { TaskCheck } from "@/components/tasks/TaskRow";
import { useGoalMutations } from "@/hooks/useProjectsGoals";
import { useTaskMutations } from "@/hooks/useTasks";
import type { Goal, GoalStep } from "@/integrations/supabase/types";
import { GOAL_STATUS_LABEL, shortDate } from "@/lib/labels";
import { brl, localISODate } from "@/lib/format";
import { goalProgress, goalProgressText } from "@/lib/goals";
import { cn } from "@/lib/utils";

function GoalMeta({ goal, linkedTasks, today }: { goal: Goal; linkedTasks: number; today: string }) {
  const late = goal.deadline && goal.deadline < today && goal.status !== "concluida";
  const plural = linkedTasks > 1 ? "s" : "";
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {goal.deadline && <span className={cn("inline-flex items-center gap-1", late && "font-medium text-destructive")}><CalendarDays className="size-3.5" />{shortDate(goal.deadline)}{late && " · atrasada"}</span>}
      {linkedTasks > 0 && <span>{linkedTasks} tarefa{plural} ligada{plural}</span>}
      <span>{GOAL_STATUS_LABEL[goal.status]}</span>
    </div>
  );
}

function GoalSteps({ goal, steps }: { goal: Goal; steps: GoalStep[] }) {
  const m = useGoalMutations();
  const [newStep, setNewStep] = useState("");

  const addStep = (e: FormEvent) => {
    e.preventDefault();
    if (!newStep.trim()) return;
    m.addStep.mutate({ goalId: goal.id, title: newStep, position: steps.length });
    setNewStep("");
  };

  return (
    <div className="space-y-1">
      {steps.map((s) => (
        <div key={s.id} className="group flex items-center gap-2.5 rounded-md px-1 py-0.5 hover:bg-accent/50">
          <TaskCheck done={s.done} onToggle={() => m.toggleStep.mutate(s)} label={s.title} />
          <span className={cn("flex-1 text-sm", s.done && "text-muted-foreground line-through")}>{s.title}</span>
          <button aria-label={`Remover etapa ${s.title}`} onClick={() => m.removeStep.mutate(s.id)}
            className="rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"><X className="size-3.5" /></button>
        </div>
      ))}
      <form onSubmit={addStep} className="flex items-center gap-2 px-1">
        <Plus className="size-4 text-primary" />
        <Input value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="Adicionar etapa" aria-label={`Nova etapa para ${goal.title}`}
          className="h-7 border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0" />
      </form>
    </div>
  );
}

function NextStepButton({ goal, next, today }: { goal: Goal; next: GoalStep; today: string }) {
  const { create } = useTaskMutations();
  const nextToToday = async () => {
    await create.mutateAsync({ title: next.title, goal_id: goal.id, project_id: goal.project_id, business_id: goal.business_id, my_day_date: today });
    toast.success("Próxima etapa adicionada ao seu dia.");
  };
  return (
    <Button variant="outline" size="sm" className="mt-auto justify-start" onClick={nextToToday} disabled={create.isPending}>
      <Sun className="size-4 text-primary" /><span className="truncate">Fazer hoje: {next.title}</span>
    </Button>
  );
}

export function GoalCard({ goal, steps, linkedTasks, onEdit }: { goal: Goal; steps: GoalStep[]; linkedTasks: number; onEdit: () => void }) {
  const m = useGoalMutations();
  const pct = goalProgress(goal, steps);
  const next = steps.find((s) => !s.done);
  const today = localISODate();
  const done = goal.status === "concluida";

  return (
    <Card className={cn("flex flex-col", done && "opacity-75")}>
      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{goal.category ?? "Meta"}</p>
            <h3 className="font-heading font-semibold leading-snug">{goal.title}</h3>
          </div>
          <div className="flex shrink-0">
            <Button size="icon" variant="ghost" className="size-8" aria-label="Editar meta" onClick={onEdit}><Pencil className="size-4" /></Button>
            <Button size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" aria-label="Excluir meta" onClick={() => m.remove.mutate(goal.id)}><Trash2 className="size-4" /></Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="text-muted-foreground">{goalProgressText(goal, steps, brl)}</span>
            <span className="font-heading text-sm font-semibold">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <GoalMeta goal={goal} linkedTasks={linkedTasks} today={today} />
        <GoalSteps goal={goal} steps={steps} />

        {next && !done && <NextStepButton goal={goal} next={next} today={today} />}
      </CardContent>
    </Card>
  );
}
