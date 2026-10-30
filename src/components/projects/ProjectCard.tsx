import { CalendarDays } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Project, Task } from "@/integrations/supabase/types";
import { PRIORITY, PROJECT_STATUS_LABEL, shortDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, string> = {
  planejado: "bg-muted text-muted-foreground",
  "em andamento": "bg-primary/10 text-primary",
  pausado: "bg-warning/15 text-warning",
  "concluído": "bg-success/10 text-success",
};

/** Progresso: % de tarefas concluídas quando há tarefas; senão o valor manual. */
function progressOf(p: Project, tasks: Task[]) {
  const mine = tasks.filter((t) => t.project_id === p.id);
  if (!mine.length) return { pct: p.status === "concluído" ? 100 : p.progress, done: 0, total: 0 };
  const done = mine.filter((t) => t.status === "concluida").length;
  return { pct: Math.round((done / mine.length) * 100), done, total: mine.length };
}

function ProjectFooter({ p, today }: { p: Project; today: string }) {
  const late = p.deadline && p.deadline < today && p.status !== "concluído";
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {p.deadline && (
        <span className={cn("inline-flex items-center gap-1 text-muted-foreground", late && "font-medium text-destructive")}>
          <CalendarDays className="size-3.5" />{shortDate(p.deadline)}{late && " · atrasado"}
        </span>
      )}
      {p.priority !== "media" && <span className={cn("rounded-full px-2 py-0.5", PRIORITY[p.priority].className)}>{PRIORITY[p.priority].label}</span>}
    </div>
  );
}

export function ProjectCard({ p, tasks, today, onOpen }: { p: Project; tasks: Task[]; today: string; onOpen: () => void }) {
  const pr = progressOf(p, tasks);
  return (
    <Card className="group relative cursor-pointer overflow-hidden transition-shadow hover:shadow-md" onClick={onOpen}>
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: p.color ?? "hsl(var(--primary))" }} />
      <CardContent className="space-y-3 p-4 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <button className="block max-w-full truncate text-left font-heading font-semibold hover:underline"
              onClick={(e) => { e.stopPropagation(); onOpen(); }}>{p.name}</button>
            {p.category && <p className="text-xs text-muted-foreground">{p.category}</p>}
          </div>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_TONE[p.status] ?? STATUS_TONE.planejado)}>
            {PROJECT_STATUS_LABEL[p.status] ?? p.status}
          </span>
        </div>
        {p.description && <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{pr.total ? `${pr.done}/${pr.total} tarefas` : "Sem tarefas"}</span>
            <span className="font-medium text-foreground">{pr.pct}%</span>
          </div>
          <Progress value={pr.pct} className="h-1.5" />
        </div>
        <ProjectFooter p={p} today={today} />
      </CardContent>
    </Card>
  );
}
