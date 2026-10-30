import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskRow } from "@/components/tasks/TaskRow";
import { useTaskMutations } from "@/hooks/useTasks";
import type { Goal, Project, Task } from "@/integrations/supabase/types";
import { PROJECT_STATUS_LABEL, shortDate } from "@/lib/labels";

function ProjectBadges({ project, goals }: { project: Project; goals: Goal[] }) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Badge variant="secondary">{PROJECT_STATUS_LABEL[project.status] ?? project.status}</Badge>
      {project.deadline && <Badge variant="outline">Prazo {shortDate(project.deadline)}</Badge>}
      {goals.filter((g) => g.project_id === project.id).map((g) => <Badge key={g.id} variant="outline">Meta: {g.title}</Badge>)}
      {project.link && (
        <a href={project.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
          <ExternalLink className="size-3" />Abrir link
        </a>
      )}
    </div>
  );
}

/** Conteúdo da gaveta de um projeto: dados, tarefas e ações. */
export function ProjectDetail({ project, tasks, goals, onOpenTask, onDelete, onEdit }: {
  project: Project; tasks: Task[]; goals: Goal[];
  onOpenTask: (id: string) => void; onDelete: () => void; onEdit: () => void;
}) {
  const taskM = useTaskMutations();
  const mine = tasks.filter((t) => t.project_id === project.id);
  return (
    <>
      <SheetHeader className="space-y-1 text-left">
        <p className="brand-eyebrow">{project.category ?? "Projeto"}</p>
        <SheetTitle className="font-heading text-xl">{project.name}</SheetTitle>
        <SheetDescription>{project.description || "Sem descrição."}</SheetDescription>
      </SheetHeader>
      <ProjectBadges project={project} goals={goals} />
      <div className="mt-6 space-y-3">
        <p className="brand-eyebrow">Tarefas do projeto</p>
        <QuickAddTask defaults={{ project_id: project.id, business_id: project.business_id }} placeholder="Nova tarefa neste projeto" />
        {mine.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa ainda.</p>}
        <div className="space-y-1.5">
          {[...mine].sort((a, b) => Number(a.status === "concluida") - Number(b.status === "concluida")).map((t) => (
            <TaskRow key={t.id} task={t} lookups={{}} onOpen={() => onOpenTask(t.id)}
              onToggleDone={() => taskM.toggleDone(t)}
              onToggleImportant={() => taskM.update.mutate({ id: t.id, patch: { is_important: !t.is_important } })} />
          ))}
        </div>
      </div>
      <div className="mt-8 flex justify-between border-t pt-4">
        <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="size-4" />Excluir
        </Button>
        <Button variant="outline" onClick={onEdit}><Pencil className="size-4" />Editar</Button>
      </div>
    </>
  );
}
