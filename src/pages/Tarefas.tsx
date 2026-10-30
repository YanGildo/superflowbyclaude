import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Sun, CheckCircle2, List as ListIcon, LayoutGrid, Trash2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState } from "@/components/common/PageHeader";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskRow, type TaskLookups } from "@/components/tasks/TaskRow";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import { TaskNavAside, TaskViewSelect } from "@/components/tasks/TaskNav";
import { doneInView, isSmart, parseView, viewDefaults, viewKey, viewTitle } from "@/components/tasks/views";
import {
  filterTasks, useAllTasks, useFlows, useListMutations, useTaskLists, useTaskMutations, type TaskView,
} from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjectsGoals";
import type { Task } from "@/integrations/supabase/types";
import { localISODate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Mode = "lista" | "quadro";

/** Ações de linha comuns à lista, ao quadro e às concluídas. */
interface RowHandlers {
  lookups: TaskLookups;
  openId: string | null;
  open: (t: Task) => void;
  toggleDone: (t: Task) => void;
  toggleImportant: (t: Task) => void;
}

function TaskRows({ tasks, h, markSelected = true }: { tasks: Task[]; h: RowHandlers; markSelected?: boolean }) {
  return (
    <>
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} lookups={h.lookups} selected={markSelected ? t.id === h.openId : undefined}
          onOpen={() => h.open(t)} onToggleDone={() => h.toggleDone(t)} onToggleImportant={() => h.toggleImportant(t)} />
      ))}
    </>
  );
}

function EmptyView({ view }: { view: TaskView }) {
  const myDay = isSmart(view, "meu-dia");
  return (
    <EmptyState
      icon={myDay ? Sun : CheckCircle2}
      title={isSmart(view, "concluidas") ? "Nada concluído ainda" : "Tudo em dia por aqui"}
      description={myDay
        ? "Adicione o que você quer fazer hoje. Tarefas com prazo para hoje ou atrasadas aparecem aqui sozinhas."
        : "Use o campo acima para adicionar uma tarefa."}
    />
  );
}

function DoneSection({ done, h }: { done: Task[]; h: RowHandlers }) {
  const [show, setShow] = useState(false);
  if (done.length === 0) return null;
  return (
    <div className="pt-2">
      <button onClick={() => setShow((s) => !s)} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronDown className={cn("size-4 transition-transform", !show && "-rotate-90")} />
        Concluídas ({done.length})
      </button>
      {show && <div className="mt-2 space-y-1.5"><TaskRows tasks={done} h={h} markSelected={false} /></div>}
    </div>
  );
}

function ModeToggle({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as Mode)} className="rounded-lg border bg-card p-0.5">
      <ToggleGroupItem value="lista" aria-label="Ver em lista" className="h-8 px-2.5"><ListIcon className="size-4" /></ToggleGroupItem>
      <ToggleGroupItem value="quadro" aria-label="Ver em quadro" className="h-8 px-2.5"><LayoutGrid className="size-4" /></ToggleGroupItem>
    </ToggleGroup>
  );
}

function useTaskData(view: TaskView) {
  const { data: tasks = [], isLoading } = useAllTasks();
  const { data: flows = [] } = useFlows();
  const { data: lists = [] } = useTaskLists();
  const { data: projects = [] } = useProjects();
  const lookups: TaskLookups = useMemo(() => ({
    flowName: (id) => (view.kind === "flow" ? undefined : flows.find((f) => f.id === id)?.name),
    listName: (id) => (view.kind === "list" ? undefined : lists.find((l) => l.id === id)?.name),
    projectName: (id) => projects.find((p) => p.id === id)?.name,
  }), [flows, lists, projects, view.kind]);
  return { tasks, isLoading, flows, lists, lookups };
}

export default function Tarefas() {
  const [params, setParams] = useSearchParams();
  const view = parseView(params.get("v"));
  const setView = (v: TaskView) => setParams((p) => { p.set("v", viewKey(v)); return p; }, { replace: true });
  const [mode, setMode] = useState<Mode>("lista");
  const [openId, setOpenId] = useState<string | null>(null);

  const { tasks, isLoading, flows, lists, lookups } = useTaskData(view);
  const { update, toggleDone } = useTaskMutations();
  const listM = useListMutations();

  const visible = filterTasks(tasks, view);
  const h: RowHandlers = {
    lookups, openId, toggleDone, open: (t) => setOpenId(t.id),
    toggleImportant: (t) => update.mutate({ id: t.id, patch: { is_important: !t.is_important } }),
  };

  const createList = async (name: string) => {
    const l = await listM.create.mutateAsync(name);
    setView({ kind: "list", id: l.id });
  };

  const body = () => {
    if (isLoading) return <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>;
    if (mode === "quadro") {
      return (
        <TaskKanban tasks={filterTasks(tasks, view, { includeDone: true })} lookups={lookups} onOpen={h.open}
          onToggleDone={toggleDone} onToggleImportant={h.toggleImportant}
          onMove={(t, status) => update.mutate({ id: t.id, patch: { status } })} />
      );
    }
    if (visible.length === 0) return <EmptyView view={view} />;
    return <div className="space-y-1.5"><TaskRows tasks={visible} h={h} /></div>;
  };

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      {/* Navegação de listas — desktop */}
      <TaskNavAside view={view} setView={setView} flows={flows} lists={lists}
        count={(v) => filterTasks(tasks, v).length} onCreateList={createList} />

      {/* Conteúdo */}
      <section className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="brand-eyebrow mb-1">Tarefas</p>
            <h1 className="font-heading text-2xl font-semibold">{viewTitle(view, lists, flows)}</h1>
            {isSmart(view, "meu-dia") && (
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <TaskViewSelect view={view} setView={setView} flows={flows} lists={lists} />
            <ModeToggle mode={mode} setMode={setMode} />
            {view.kind === "list" && (
              <Button variant="ghost" size="icon" aria-label="Excluir lista" title="Excluir lista"
                onClick={() => { listM.remove.mutate(view.id); setView({ kind: "smart", id: "todas" }); }}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {!isSmart(view, "concluidas") && <QuickAddTask defaults={viewDefaults(view, localISODate())} />}

        {body()}

        {mode === "lista" && <DoneSection done={doneInView(tasks, view)} h={h} />}
      </section>

      <TaskDetailSheet task={tasks.find((t) => t.id === openId) ?? null} onClose={() => setOpenId(null)} />
    </div>
  );
}
