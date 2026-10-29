import { useEffect, useState, type FormEvent } from "react";
import { Star, Sun, Trash2, X, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Task } from "@/integrations/supabase/types";
import { useFlows, useStepMutations, useTaskLists, useTaskMutations, useTaskSteps } from "@/hooks/useTasks";
import { useProjects, useGoals } from "@/hooks/useProjectsGoals";
import { useWorkspace } from "@/lib/workspace";
import { PRIORITIES, PRIORITY, RECURRENCE, RECURRENCES, TASK_STATUS, TASK_STATUSES } from "@/lib/labels";
import { localISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TaskCheck } from "./TaskRow";

const NONE = "__none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function RefSelect({
  value, onChange, options, placeholder,
}: { value: string | null; onChange: (v: string | null) => void; options: { id: string; name: string }[]; placeholder: string }) {
  return (
    <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
      <SelectTrigger className="h-9"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>
        {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function TaskDetailSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { update, toggleDone, remove } = useTaskMutations();
  const { data: flows = [] } = useFlows();
  const { data: lists = [] } = useTaskLists();
  const { data: projects = [] } = useProjects();
  const { data: goals = [] } = useGoals();
  const { businesses } = useWorkspace();
  const { data: steps = [] } = useTaskSteps(task?.id ?? null);
  const stepM = useStepMutations(task?.id ?? null);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [newStep, setNewStep] = useState("");

  useEffect(() => {
    setTitle(task?.title ?? "");
    setNotes(task?.notes ?? "");
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) return <Sheet open={false} onOpenChange={onClose}><SheetContent /></Sheet>;

  const patch = (p: Partial<Task>) => update.mutate({ id: task.id, patch: p });
  const today = localISODate();
  const inMyDay = task.my_day_date === today;

  const addStep = (e: FormEvent) => {
    e.preventDefault();
    if (!newStep.trim()) return;
    stepM.add.mutate({ title: newStep, position: steps.length });
    setNewStep("");
  };

  return (
    <Sheet open={Boolean(task)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetHeader className="space-y-0 border-b p-5 text-left">
          <SheetDescription className="sr-only">Detalhes da tarefa</SheetDescription>
          <div className="flex items-start gap-3 pr-6">
            <div className="pt-2.5"><TaskCheck done={task.status === "concluida"} onToggle={() => toggleDone(task)} label={task.title} /></div>
            <SheetTitle className="sr-only">{task.title}</SheetTitle>
            <Textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => title.trim() && title.trim() !== task.title && patch({ title: title.trim() })}
              rows={2}
              aria-label="Título da tarefa"
              className={cn("min-h-0 resize-none border-0 px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0",
                task.status === "concluida" && "text-muted-foreground line-through")}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-3">
            <Button size="sm" variant={inMyDay ? "default" : "outline"} onClick={() => patch({ my_day_date: inMyDay ? null : today })}>
              <Sun className="size-4" />{inMyDay ? "No meu dia" : "Adicionar ao meu dia"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => patch({ is_important: !task.is_important })}
              className={cn(task.is_important && "border-warning/50 text-warning")}>
              <Star className={cn("size-4", task.is_important && "fill-current")} />Importante
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-5 p-5">
          {/* Etapas */}
          <section className="space-y-2">
            <p className="brand-eyebrow">Etapas</p>
            {steps.map((s) => (
              <div key={s.id} className="group flex items-center gap-2.5 rounded-md px-1 py-1 hover:bg-accent/50">
                <TaskCheck done={s.done} onToggle={() => stepM.toggle.mutate(s)} label={s.title} />
                <span className={cn("flex-1 text-sm", s.done && "text-muted-foreground line-through")}>{s.title}</span>
                <button aria-label={`Remover etapa ${s.title}`} onClick={() => stepM.remove.mutate(s.id)}
                  className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100">
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            <form onSubmit={addStep} className="flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              <Input value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="Adicionar etapa"
                aria-label="Nova etapa" className="h-8 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0" />
            </form>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select value={task.status} onValueChange={(v) => patch({ status: v as Task["status"] })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_STATUSES.map((s) => <SelectItem key={s} value={s}>{TASK_STATUS[s].label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Prioridade">
              <Select value={task.priority} onValueChange={(v) => patch({ priority: v as Task["priority"] })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{PRIORITY[p].label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Prazo">
              <Input type="date" className="h-9" value={task.due_date ?? ""} onChange={(e) => patch({ due_date: e.target.value || null })} />
            </Field>
            <Field label="Repetir">
              <Select value={task.recurrence} onValueChange={(v) => patch({ recurrence: v as Task["recurrence"] })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{RECURRENCES.map((r) => <SelectItem key={r} value={r}>{RECURRENCE[r]}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Fluxo">
              <RefSelect value={task.flow_id} onChange={(v) => patch({ flow_id: v })} options={flows} placeholder="Sem fluxo" />
            </Field>
            <Field label="Lista">
              <RefSelect value={task.list_id} onChange={(v) => patch({ list_id: v })} options={lists} placeholder="Sem lista" />
            </Field>
            <Field label="Projeto">
              <RefSelect value={task.project_id} onChange={(v) => patch({ project_id: v })} options={projects} placeholder="Sem projeto" />
            </Field>
            <Field label="Meta">
              <RefSelect value={task.goal_id} onChange={(v) => patch({ goal_id: v })}
                options={goals.map((g) => ({ id: g.id, name: g.title }))} placeholder="Sem meta" />
            </Field>
            <div className="col-span-2">
              <Field label="Negócio">
                <RefSelect value={task.business_id} onChange={(v) => patch({ business_id: v })} options={businesses} placeholder="Sem negócio" />
              </Field>
            </div>
          </section>

          {task.recurrence !== "none" && (
            <p className="rounded-md bg-primary/5 p-2.5 text-xs text-muted-foreground">
              Ao concluir, a próxima repetição é criada automaticamente com o prazo seguinte.
            </p>
          )}

          <Field label="Anotações">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Detalhes, links, ideias..."
              onBlur={() => notes !== (task.notes ?? "") && patch({ notes: notes || null })} />
          </Field>
        </div>

        <div className="mt-auto flex items-center justify-between border-t p-4 text-xs text-muted-foreground">
          <span>Criada em {new Date(task.created_at).toLocaleDateString("pt-BR")}</span>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
            onClick={() => { remove.mutate(task.id); onClose(); }}>
            <Trash2 className="size-4" />Excluir
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
