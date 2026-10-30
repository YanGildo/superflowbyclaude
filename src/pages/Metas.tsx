import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { GoalCard } from "@/components/goals/GoalCard";
import { useGoalMutations, useGoalSteps, useGoals, useProjects } from "@/hooks/useProjectsGoals";
import { useAllTasks } from "@/hooks/useTasks";
import type { Goal, Priority } from "@/integrations/supabase/types";
import { GOAL_CATEGORIES, GOAL_STATUS_LABEL, PRIORITIES, PRIORITY } from "@/lib/labels";

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
