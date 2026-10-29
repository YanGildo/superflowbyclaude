import { Calendar, Repeat, Star, Sun, FolderKanban, ListChecks } from "lucide-react";
import type { Task } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { PRIORITY, shortDate } from "@/lib/labels";
import { isOverdue } from "@/hooks/useTasks";
import { localISODate } from "@/lib/format";

export interface TaskLookups {
  flowName?: (id: string | null) => string | undefined;
  projectName?: (id: string | null) => string | undefined;
  listName?: (id: string | null) => string | undefined;
}

export function TaskCheck({ done, onToggle, label }: { done: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? `Reabrir "${label}"` : `Concluir "${label}"`}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        done ? "border-success bg-success text-white" : "border-muted-foreground/40 hover:border-primary",
      )}
    >
      {done && (
        <svg viewBox="0 0 12 12" className="size-3" aria-hidden="true">
          <path d="M2.5 6.2 5 8.5l4.5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export function TaskRow({
  task, onOpen, onToggleDone, onToggleImportant, lookups, selected, wrap,
}: {
  task: Task;
  onOpen: () => void;
  onToggleDone: () => void;
  onToggleImportant: () => void;
  lookups: TaskLookups;
  selected?: boolean;
  wrap?: boolean;
}) {
  const done = task.status === "concluida";
  const today = localISODate();
  const overdue = isOverdue(task, today);
  const flow = lookups.flowName?.(task.flow_id);
  const project = lookups.projectName?.(task.project_id);
  const list = lookups.listName?.(task.list_id);

  return (
    <div
      onClick={onOpen}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-accent/40",
        selected && "border-primary/50 bg-accent/60",
      )}
    >
      <TaskCheck done={done} onToggle={onToggleDone} label={task.title} />

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOpen(); }}
          className={cn("block w-full text-left text-sm", wrap ? "line-clamp-2" : "truncate", " focus-visible:outline-none focus-visible:underline", done && "text-muted-foreground line-through")}
        >
          {task.title}
        </button>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {task.my_day_date === today && <span className="inline-flex items-center gap-1 text-primary"><Sun className="size-3" />Meu dia</span>}
          {task.due_date && (
            <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-destructive")}>
              <Calendar className="size-3" />{task.due_date === today ? "Hoje" : shortDate(task.due_date)}{overdue && " · atrasada"}
            </span>
          )}
          {task.recurrence !== "none" && <span className="inline-flex items-center gap-1"><Repeat className="size-3" />repete</span>}
          {flow && <span className="inline-flex items-center gap-1"><ListChecks className="size-3" />{flow}</span>}
          {project && <span className="inline-flex items-center gap-1"><FolderKanban className="size-3" />{project}</span>}
          {list && <span>{list}</span>}
        </div>
      </div>

      {task.priority !== "media" && (
        <span className={cn("hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline", PRIORITY[task.priority].className)}>
          {PRIORITY[task.priority].label}
        </span>
      )}

      <button
        type="button"
        aria-label={task.is_important ? "Tirar dos importantes" : "Marcar como importante"}
        aria-pressed={task.is_important}
        onClick={(e) => { e.stopPropagation(); onToggleImportant(); }}
        className={cn("shrink-0 rounded p-1 transition-colors",
          task.is_important ? "text-warning" : "text-muted-foreground/40 hover:text-warning group-hover:text-muted-foreground")}
      >
        <Star className={cn("size-4", task.is_important && "fill-current")} />
      </button>
    </div>
  );
}
