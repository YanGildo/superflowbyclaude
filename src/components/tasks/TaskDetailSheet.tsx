import { useState, type FormEvent } from "react";
import { Star, Sun, Trash2, X, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Business, Goal, Task, TaskStep } from "@/integrations/supabase/types";
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

type Named = { id: string; name: string };
type Patch = (p: Partial<Task>) => void;

function StepsSection({ taskId, steps }: { taskId: string; steps: TaskStep[] }) {
  const stepM = useStepMutations(taskId);
  const [newStep, setNewStep] = useState("");

  const addStep = (e: FormEvent) => {
    e.preventDefault();
    if (!newStep.trim()) return;
    stepM.add.mutate({ title: newStep, position: steps.length });
    setNewStep("");
  };

  return (
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
  );
}

/** O rascunho do título recomeça a cada tarefa aberta (key = id da tarefa). */
function SheetTop({ task, patch, onToggleDone }: { task: Task; patch: Patch; onToggleDone: () => void }) {
  const [title, setTitle] = useState(task.title);
  const today = localISODate();
  const inMyDay = task.my_day_date === today;
  const done = task.status === "concluida";

  return (
    <SheetHeader className="space-y-0 border-b p-5 text-left">
      <SheetDescription className="sr-only">Detalhes da tarefa</SheetDescription>
      <div className="flex items-start gap-3 pr-6">
        <div className="pt-2.5"><TaskCheck done={done} onToggle={onToggleDone} label={task.title} /></div>
        <SheetTitle className="sr-only">{task.title}</SheetTitle>
        <Textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title.trim() !== task.title && patch({ title: title.trim() })}
          rows={2}
          aria-label="Título da tarefa"
          className={cn("min-h-0 resize-none border-0 px-0 font-heading text-lg font-semibold shadow-none focus-visible:ring-0",
            done && "text-muted-foreground line-through")}
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
  );
}

function TaskFields({ task, patch, refs }: {
  task: Task; patch: Patch; refs: { flows: Named[]; lists: Named[]; projects: Named[]; goals: Goal[]; businesses: Business[] };
}) {
  return (
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
        <RefSelect value={task.flow_id} onChange={(v) => patch({ flow_id: v })} options={refs.flows} placeholder="Sem fluxo" />
      </Field>
      <Field label="Lista">
        <RefSelect value={task.list_id} onChange={(v) => patch({ list_id: v })} options={refs.lists} placeholder="Sem lista" />
      </Field>
      <Field label="Projeto">
        <RefSelect value={task.project_id} onChange={(v) => patch({ project_id: v })} options={refs.projects} placeholder="Sem projeto" />
      </Field>
      <Field label="Meta">
        <RefSelect value={task.goal_id} onChange={(v) => patch({ goal_id: v })}
          options={refs.goals.map((g) => ({ id: g.id, name: g.title }))} placeholder="Sem meta" />
      </Field>
      <div className="col-span-2">
        <Field label="Negócio">
          <RefSelect value={task.business_id} onChange={(v) => patch({ business_id: v })} options={refs.businesses} placeholder="Sem negócio" />
        </Field>
      </div>
    </section>
  );
}

/** O rascunho das anotações recomeça a cada tarefa aberta (key = id da tarefa). */
function NotesField({ task, patch }: { task: Task; patch: Patch }) {
  const [notes, setNotes] = useState(task.notes ?? "");
  return (
    <Field label="Anotações">
      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} placeholder="Detalhes, links, ideias..."
        onBlur={() => notes !== (task.notes ?? "") && patch({ notes: notes || null })} />
    </Field>
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

  if (!task) return <Sheet open={false} onOpenChange={onClose}><SheetContent /></Sheet>;

  const patch: Patch = (p) => update.mutate({ id: task.id, patch: p });

  return (
    <Sheet open={Boolean(task)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md">
        <SheetTop key={task.id} task={task} patch={patch} onToggleDone={() => toggleDone(task)} />

        <div className="space-y-5 p-5">
          <StepsSection taskId={task.id} steps={steps} />
          <TaskFields task={task} patch={patch} refs={{ flows, lists, projects, goals, businesses }} />

          {task.recurrence !== "none" && (
            <p className="rounded-md bg-primary/5 p-2.5 text-xs text-muted-foreground">
              Ao concluir, a próxima repetição é criada automaticamente com o prazo seguinte.
            </p>
          )}

          <NotesField key={task.id} task={task} patch={patch} />
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
