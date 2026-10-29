import { useState } from "react";
import type { Task, TaskStatus } from "@/integrations/supabase/types";
import { TASK_STATUS, TASK_STATUSES } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { TaskRow, type TaskLookups } from "./TaskRow";

/** Quadro por status. Arraste um cartão para outra coluna para mudar o status. */
export function TaskKanban({
  tasks, lookups, onOpen, onToggleDone, onToggleImportant, onMove,
}: {
  tasks: Task[];
  lookups: TaskLookups;
  onOpen: (t: Task) => void;
  onToggleDone: (t: Task) => void;
  onToggleImportant: (t: Task) => void;
  onMove: (t: Task, status: TaskStatus) => void;
}) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {TASK_STATUSES.map((status) => {
        const col = tasks.filter((t) => t.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => { e.preventDefault(); setOver(status); }}
            onDragLeave={() => setOver(null)}
            onDrop={() => {
              const t = tasks.find((x) => x.id === dragId);
              if (t && t.status !== status) onMove(t, status);
              setDragId(null); setOver(null);
            }}
            className={cn("flex min-h-[200px] flex-col gap-2 rounded-xl border bg-muted/40 p-2 transition-colors",
              over === status && "border-primary/50 bg-primary/5")}
            aria-label={`Coluna ${TASK_STATUS[status].label}`}
          >
            <div className="flex items-center justify-between px-1.5 py-1">
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", TASK_STATUS[status].className)}>
                {TASK_STATUS[status].label}
              </span>
              <span className="text-xs text-muted-foreground">{col.length}</span>
            </div>
            {col.map((t) => (
              <div key={t.id} draggable onDragStart={() => setDragId(t.id)} onDragEnd={() => setDragId(null)}
                className={cn(dragId === t.id && "opacity-50")}>
                <TaskRow wrap task={t} lookups={lookups} onOpen={() => onOpen(t)}
                  onToggleDone={() => onToggleDone(t)} onToggleImportant={() => onToggleImportant(t)} />
              </div>
            ))}
            {col.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">Arraste tarefas para cá</p>}
          </div>
        );
      })}
    </div>
  );
}
