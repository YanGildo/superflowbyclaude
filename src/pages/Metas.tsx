import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CalendarDays, Loader2, Pencil, Plus, Sun, Target, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { TaskCheck } from "@/components/tasks/TaskRow";
import { useGoalMutations, useGoalSteps, useGoals, useProjects } from "@/hooks/useProjectsGoals";
import { useAllTasks, useTaskMutations } from "@/hooks/useTasks";
import type { Goal, GoalStep, Priority } from "@/integrations/supabase/types";
import { GOAL_CATEGORIES, GOAL_STATUS_LABEL, PRIORITIES, PRIORITY, shortDate } from "@/lib/labels";
import { brl, localISODate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Valor-alvo financeiro? Mostra em R$; senão em número simples. */
const isMoney = (g: Goal) => g.category === "Financeiro" || g.category === "Vendas";

function goalProgress(g: Goal, steps: GoalStep[]) {
  if (g.status === "concluida") return 100;
  if (g.target_value && g.target_value > 0) return Math.min(100, Math.round((g.current_value / g.target_value) * 100));
  if (!steps.length) return 0;
  return Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
}

type Form = {
  title: string; description: string; category: string; status: Goal["status"]; priority: Priority;
  target_value: string; current_value: string; deadline: string; project_id: string | null;
};

function GoalDialog({ open, onOpenChange, goal }: { open: boolean; onOpenChange: (o: boolean) => void; goal?: Goal | null }) {
  const { save } = useGoalMutations();
  const { data: projects = [] } = useProjects();
  const [f, setF] = useState<Form>({ title: "", description: "", category: "Produtividade", status: "ativa", priority: "media", target_value: "", current_value: "", deadline: "", project_id: null });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(goal ? {
      title: goal.title, description: goal.description ?? "", category: goal.category ?? "Outro", status: goal.status,
      priority: goal.priority, target_value: goal.target_value?.toString() ?? "", current_value: goal.current_value ? String(goal.current_value) : "",
      deadline: goal.deadline ?? "", project_id: goal.project_id,
    } : { title: "", description: "", category: "Produtividade", status: "ativa", priority: "media", target_value: "", current_value: "", deadline: "", project_id: null });
  }, [open, goal]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return setError("Dê um nome à meta.");
    const target = num(f.target_value), current = num(f.current_value);
    if ((target !== null && (isNaN(target) || target < 0)) || (current !== null && (isNaN(current) || current < 0))) {
      return setError("Valores precisam ser números positivos.");
    }
    await save.mutateAsync({
      id: goal?.id, title: f.title, description: f.description || null, category: f.category, status: f.status,
      priority: f.priority, target_value: target, current_value: current ?? 0, deadline: f.deadline || null, project_id: f.project_id,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{goal ? "Editar meta" : "Nova meta"}</DialogTitle>
          <DialogDescription>Use etapas para metas de execução, ou um valor-alvo para metas numéricas (ex.: faturar R$ 10.000).</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="g-title">Meta</Label>
            <Input id="g-title" value={f.title} onChange={(e) => set("title", e.target.value)} autoFocus placeholder="Ex.: Fechar 5 clientes novos" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="g-desc">Por que essa meta importa?</Label>
            <Textarea id="g-desc" rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-cat">Categoria</Label>
            <SimpleSelect id="g-cat" value={f.category} onChange={(v) => set("category", v)} options={GOAL_CATEGORIES.map((c) => ({ value: c, label: c }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-deadline">Prazo</Label>
            <Input id="g-deadline" type="date" value={f.deadline} onChange={(e) => set("deadline", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-target">Valor-alvo (opcional)</Label>
            <Input id="g-target" inputMode="decimal" value={f.target_value} onChange={(e) => set("target_value", e.target.value)} placeholder="Ex.: 10000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-current">Valor atual</Label>
            <Input id="g-current" inputMode="decimal" value={f.current_value} onChange={(e) => set("current_value", e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-status">Status</Label>
            <SimpleSelect id="g-status" value={f.status} onChange={(v) => set("status", v)}
              options={(Object.keys(GOAL_STATUS_LABEL) as Goal["status"][]).map((s) => ({ value: s, label: GOAL_STATUS_LABEL[s] }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-prio">Prioridade</Label>
            <SimpleSelect id="g-prio" value={f.priority} onChange={(v) => set("priority", v)} options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY[p].label }))} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="g-proj">Projeto ligado</Label>
            <RefSelect id="g-proj" value={f.project_id} onChange={(v) => set("project_id", v)} options={projects} placeholder="Sem projeto" />
          </div>
          {error && <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}{goal ? "Salvar" : "Criar meta"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GoalCard({ goal, steps, linkedTasks, onEdit }: { goal: Goal; steps: GoalStep[]; linkedTasks: number; onEdit: () => void }) {
  const m = useGoalMutations();
  const { create } = useTaskMutations();
  const [newStep, setNewStep] = useState("");
  const pct = goalProgress(goal, steps);
  const next = steps.find((s) => !s.done);
  const today = localISODate();
  const late = goal.deadline && goal.deadline < today && goal.status !== "concluida";

  const addStep = (e: FormEvent) => {
    e.preventDefault();
    if (!newStep.trim()) return;
    m.addStep.mutate({ goalId: goal.id, title: newStep, position: steps.length });
    setNewStep("");
  };

  const nextToToday = async () => {
    if (!next) return;
    await create.mutateAsync({ title: next.title, goal_id: goal.id, project_id: goal.project_id, business_id: goal.business_id, my_day_date: today });
    toast.success("Próxima etapa adicionada ao seu dia.");
  };

  return (
    <Card className={cn("flex flex-col", goal.status === "concluida" && "opacity-75")}>
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
            <span className="text-muted-foreground">
              {goal.target_value
                ? `${isMoney(goal) ? brl(goal.current_value) : goal.current_value} de ${isMoney(goal) ? brl(goal.target_value) : goal.target_value}`
                : steps.length ? `${steps.filter((s) => s.done).length}/${steps.length} etapas` : "Adicione etapas"}
            </span>
            <span className="font-heading text-sm font-semibold">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {goal.deadline && <span className={cn("inline-flex items-center gap-1", late && "font-medium text-destructive")}><CalendarDays className="size-3.5" />{shortDate(goal.deadline)}{late && " · atrasada"}</span>}
          {linkedTasks > 0 && <span>{linkedTasks} tarefa{linkedTasks > 1 ? "s" : ""} ligada{linkedTasks > 1 ? "s" : ""}</span>}
          <span>{GOAL_STATUS_LABEL[goal.status]}</span>
        </div>

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

        {next && goal.status !== "concluida" && (
          <Button variant="outline" size="sm" className="mt-auto justify-start" onClick={nextToToday} disabled={create.isPending}>
            <Sun className="size-4 text-primary" /><span className="truncate">Fazer hoje: {next.title}</span>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function Metas() {
  const { data: goals = [], isLoading } = useGoals();
  const { data: steps = [] } = useGoalSteps();
  const { data: tasks = [] } = useAllTasks();
  const [dialog, setDialog] = useState<{ open: boolean; goal?: Goal | null }>({ open: false });
  const [showDone, setShowDone] = useState(false);

  const visible = useMemo(() => goals.filter((g) => showDone || g.status !== "concluida"), [goals, showDone]);
  const doneCount = goals.filter((g) => g.status === "concluida").length;

  return (
    <div>
      <PageHeader eyebrow="Produtividade" title="Metas" description="Objetivos maiores, quebrados em etapas que viram tarefas do dia."
        actions={<>
          {doneCount > 0 && <Button variant="ghost" onClick={() => setShowDone((s) => !s)}>{showDone ? "Ocultar concluídas" : `Ver concluídas (${doneCount})`}</Button>}
          <Button onClick={() => setDialog({ open: true, goal: null })}><Plus className="size-4" />Nova meta</Button>
        </>} />

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}</div>
      ) : visible.length === 0 ? (
        <EmptyState icon={Target} title="Nenhuma meta ativa" description="Defina uma meta (ex.: faturar R$ 10 mil no mês) e quebre em etapas."
          action={<Button onClick={() => setDialog({ open: true, goal: null })}><Plus className="size-4" />Criar meta</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((g) => (
            <GoalCard key={g.id} goal={g} steps={steps.filter((s) => s.goal_id === g.id)}
              linkedTasks={tasks.filter((t) => t.goal_id === g.id).length} onEdit={() => setDialog({ open: true, goal: g })} />
          ))}
        </div>
      )}

      <GoalDialog open={dialog.open} goal={dialog.goal} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />
    </div>
  );
}
