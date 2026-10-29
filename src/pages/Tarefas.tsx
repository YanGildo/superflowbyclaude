import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Sun, Star, CalendarDays, Inbox, CheckCircle2, ListChecks, List as ListIcon,
  LayoutGrid, Plus, Trash2, ChevronDown, Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState } from "@/components/common/PageHeader";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskRow, type TaskLookups } from "@/components/tasks/TaskRow";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import { TaskKanban } from "@/components/tasks/TaskKanban";
import {
  filterTasks, useAllTasks, useFlows, useListMutations, useTaskLists, useTaskMutations,
  type SmartView, type TaskView,
} from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjectsGoals";
import type { Task } from "@/integrations/supabase/types";
import { localISODate } from "@/lib/format";
import { cn } from "@/lib/utils";

const SMART: { id: SmartView; label: string; icon: LucideIcon }[] = [
  { id: "meu-dia", label: "Meu dia", icon: Sun },
  { id: "importantes", label: "Importantes", icon: Star },
  { id: "planejadas", label: "Planejadas", icon: CalendarDays },
  { id: "todas", label: "Todas", icon: Inbox },
  { id: "concluidas", label: "Concluídas", icon: CheckCircle2 },
];

function parseView(v: string | null): TaskView {
  if (!v) return { kind: "smart", id: "meu-dia" };
  const [kind, id] = v.split(":");
  if ((kind === "list" || kind === "flow") && id) return { kind, id };
  if (kind === "smart" && SMART.some((s) => s.id === id)) return { kind, id: id as SmartView };
  return { kind: "smart", id: "meu-dia" };
}
const viewKey = (v: TaskView) => `${v.kind}:${v.id}`;

function NavButton({
  active, icon: Icon, label, count, onClick,
}: { active: boolean; icon: LucideIcon; label: string; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
        active ? "bg-primary/10 font-medium text-primary" : "text-foreground/80 hover:bg-accent")}
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
    </button>
  );
}

export default function Tarefas() {
  const [params, setParams] = useSearchParams();
  const view = parseView(params.get("v"));
  const setView = (v: TaskView) => setParams((p) => { p.set("v", viewKey(v)); return p; }, { replace: true });
  const [mode, setMode] = useState<"lista" | "quadro">("lista");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [newList, setNewList] = useState("");

  const { data: tasks = [], isLoading } = useAllTasks();
  const { data: flows = [] } = useFlows();
  const { data: lists = [] } = useTaskLists();
  const { data: projects = [] } = useProjects();
  const { update, toggleDone } = useTaskMutations();
  const listM = useListMutations();

  const lookups: TaskLookups = useMemo(() => ({
    flowName: (id) => (view.kind === "flow" ? undefined : flows.find((f) => f.id === id)?.name),
    listName: (id) => (view.kind === "list" ? undefined : lists.find((l) => l.id === id)?.name),
    projectName: (id) => projects.find((p) => p.id === id)?.name,
  }), [flows, lists, projects, view.kind]);

  const visible = filterTasks(tasks, view);
  const doneHere = view.kind !== "smart" ? tasks.filter((t) => t.status === "concluida" && (view.kind === "list" ? t.list_id === view.id : t.flow_id === view.id)) : [];
  const kanbanTasks = filterTasks(tasks, view, { includeDone: true });
  const count = (v: TaskView) => filterTasks(tasks, v).length;

  const title =
    view.kind === "smart" ? SMART.find((s) => s.id === view.id)!.label
    : view.kind === "list" ? lists.find((l) => l.id === view.id)?.name ?? "Lista"
    : flows.find((f) => f.id === view.id)?.name ?? "Fluxo";

  const today = localISODate();
  const defaults: Partial<Task> =
    view.kind === "list" ? { list_id: view.id }
    : view.kind === "flow" ? { flow_id: view.id }
    : view.id === "meu-dia" ? { my_day_date: today }
    : view.id === "importantes" ? { is_important: true }
    : view.id === "planejadas" ? { due_date: today }
    : {};

  const openTask = tasks.find((t) => t.id === openId) ?? null;
  const toggleImportant = (t: Task) => update.mutate({ id: t.id, patch: { is_important: !t.is_important } });

  const createList = async (e: FormEvent) => {
    e.preventDefault();
    if (!newList.trim()) return;
    const l = await listM.create.mutateAsync(newList);
    setNewList("");
    setView({ kind: "list", id: l.id });
  };

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      {/* Navegação de listas — desktop */}
      <aside className="hidden w-60 shrink-0 space-y-5 lg:block">
        <div className="space-y-0.5">
          {SMART.map((s) => (
            <NavButton key={s.id} icon={s.icon} label={s.label} active={viewKey(view) === `smart:${s.id}`}
              count={s.id === "concluidas" ? undefined : count({ kind: "smart", id: s.id })}
              onClick={() => setView({ kind: "smart", id: s.id })} />
          ))}
        </div>

        <div>
          <p className="brand-eyebrow mb-1.5 px-2.5">Fluxos</p>
          <div className="space-y-0.5">
            {flows.map((f) => (
              <NavButton key={f.id} icon={Workflow} label={f.name} active={viewKey(view) === `flow:${f.id}`}
                count={count({ kind: "flow", id: f.id })} onClick={() => setView({ kind: "flow", id: f.id })} />
            ))}
          </div>
        </div>

        <div>
          <p className="brand-eyebrow mb-1.5 px-2.5">Listas</p>
          <div className="space-y-0.5">
            {lists.map((l) => (
              <NavButton key={l.id} icon={ListChecks} label={l.name} active={viewKey(view) === `list:${l.id}`}
                count={count({ kind: "list", id: l.id })} onClick={() => setView({ kind: "list", id: l.id })} />
            ))}
          </div>
          <form onSubmit={createList} className="mt-1 flex items-center gap-1 px-1">
            <Plus className="size-4 shrink-0 text-primary" />
            <Input value={newList} onChange={(e) => setNewList(e.target.value)} placeholder="Nova lista"
              aria-label="Nome da nova lista" className="h-8 border-0 bg-transparent px-1.5 shadow-none focus-visible:ring-0" />
          </form>
        </div>
      </aside>

      {/* Conteúdo */}
      <section className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="brand-eyebrow mb-1">Tarefas</p>
            <h1 className="font-heading text-2xl font-semibold">{title}</h1>
            {view.kind === "smart" && view.id === "meu-dia" && (
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* seletor mobile */}
            <Select value={viewKey(view)} onValueChange={(v) => setView(parseView(v))}>
              <SelectTrigger className="h-9 w-44 lg:hidden" aria-label="Escolher lista"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectGroup>{SMART.map((s) => <SelectItem key={s.id} value={`smart:${s.id}`}>{s.label}</SelectItem>)}</SelectGroup>
                {flows.length > 0 && <SelectGroup><SelectLabel>Fluxos</SelectLabel>
                  {flows.map((f) => <SelectItem key={f.id} value={`flow:${f.id}`}>{f.name}</SelectItem>)}</SelectGroup>}
                {lists.length > 0 && <SelectGroup><SelectLabel>Listas</SelectLabel>
                  {lists.map((l) => <SelectItem key={l.id} value={`list:${l.id}`}>{l.name}</SelectItem>)}</SelectGroup>}
              </SelectContent>
            </Select>
            <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as typeof mode)} className="rounded-lg border bg-card p-0.5">
              <ToggleGroupItem value="lista" aria-label="Ver em lista" className="h-8 px-2.5"><ListIcon className="size-4" /></ToggleGroupItem>
              <ToggleGroupItem value="quadro" aria-label="Ver em quadro" className="h-8 px-2.5"><LayoutGrid className="size-4" /></ToggleGroupItem>
            </ToggleGroup>
            {view.kind === "list" && (
              <Button variant="ghost" size="icon" aria-label="Excluir lista" title="Excluir lista"
                onClick={() => { listM.remove.mutate(view.id); setView({ kind: "smart", id: "todas" }); }}>
                <Trash2 className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {!(view.kind === "smart" && view.id === "concluidas") && <QuickAddTask defaults={defaults} />}

        {isLoading ? (
          <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
        ) : mode === "quadro" ? (
          <TaskKanban tasks={kanbanTasks} lookups={lookups} onOpen={(t) => setOpenId(t.id)}
            onToggleDone={toggleDone} onToggleImportant={toggleImportant}
            onMove={(t, status) => update.mutate({ id: t.id, patch: { status } })} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={view.kind === "smart" && view.id === "meu-dia" ? Sun : CheckCircle2}
            title={view.kind === "smart" && view.id === "concluidas" ? "Nada concluído ainda" : "Tudo em dia por aqui"}
            description={view.kind === "smart" && view.id === "meu-dia"
              ? "Adicione o que você quer fazer hoje. Tarefas com prazo para hoje ou atrasadas aparecem aqui sozinhas."
              : "Use o campo acima para adicionar uma tarefa."}
          />
        ) : (
          <div className="space-y-1.5">
            {visible.map((t) => (
              <TaskRow key={t.id} task={t} lookups={lookups} selected={t.id === openId}
                onOpen={() => setOpenId(t.id)} onToggleDone={() => toggleDone(t)} onToggleImportant={() => toggleImportant(t)} />
            ))}
          </div>
        )}

        {mode === "lista" && doneHere.length > 0 && (
          <div className="pt-2">
            <button onClick={() => setShowDone((s) => !s)} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
              <ChevronDown className={cn("size-4 transition-transform", !showDone && "-rotate-90")} />
              Concluídas ({doneHere.length})
            </button>
            {showDone && (
              <div className="mt-2 space-y-1.5">
                {doneHere.map((t) => (
                  <TaskRow key={t.id} task={t} lookups={lookups} onOpen={() => setOpenId(t.id)}
                    onToggleDone={() => toggleDone(t)} onToggleImportant={() => toggleImportant(t)} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <TaskDetailSheet task={openTask} onClose={() => setOpenId(null)} />
    </div>
  );
}
