import { useMemo, useState } from "react";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectDetail } from "@/components/projects/ProjectDetail";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import { useProjectMutations, useProjects, useGoals } from "@/hooks/useProjectsGoals";
import { useAllTasks } from "@/hooks/useTasks";
import type { Project } from "@/integrations/supabase/types";
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL } from "@/lib/labels";
import { localISODate } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS = [
  { v: "ativos", label: "Ativos" },
  ...PROJECT_STATUSES.map((s) => ({ v: s, label: PROJECT_STATUS_LABEL[s] })),
  { v: "todos", label: "Todos" },
];

function matchesFilter(p: Project, status: string): boolean {
  if (status === "todos") return true;
  if (status === "ativos") return p.status !== "concluído";
  return p.status === status;
}

function StatusFilter({ status, setStatus }: { status: string; setStatus: (s: string) => void }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por status">
      {FILTERS.map((f) => (
        <button key={f.v} role="tab" aria-selected={status === f.v} onClick={() => setStatus(f.v)}
          className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            status === f.v ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}>
          {f.label}
        </button>
      ))}
    </div>
  );
}

export default function Projetos() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: tasks = [] } = useAllTasks();
  const { data: goals = [] } = useGoals();
  const { remove } = useProjectMutations();
  const [status, setStatus] = useState<string>("ativos");
  const [dialog, setDialog] = useState<{ open: boolean; project?: Project | null }>({ open: false });
  const [openId, setOpenId] = useState<string | null>(null);
  const [taskOpenId, setTaskOpenId] = useState<string | null>(null);
  const today = localISODate();

  const list = useMemo(() => projects.filter((p) => matchesFilter(p, status)), [projects, status]);
  const open = projects.find((p) => p.id === openId) ?? null;
  const newProject = () => setDialog({ open: true, project: null });

  const grid = () => {
    if (isLoading) return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>;
    if (list.length === 0) {
      return (
        <EmptyState icon={FolderKanban} title={projects.length ? "Nenhum projeto neste filtro" : "Nenhum projeto ainda"}
          description="Crie um projeto para agrupar as tarefas de um cliente, campanha ou produto."
          action={<Button onClick={newProject}><Plus className="size-4" />Criar projeto</Button>} />
      );
    }
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((p) => <ProjectCard key={p.id} p={p} tasks={tasks} today={today} onOpen={() => setOpenId(p.id)} />)}
      </div>
    );
  };

  return (
    <div>
      <PageHeader eyebrow="Produtividade" title="Projetos" description="Iniciativas com tarefas, metas e prazo."
        actions={<Button onClick={newProject}><Plus className="size-4" />Novo projeto</Button>} />

      <StatusFilter status={status} setStatus={setStatus} />

      {grid()}

      <ProjectDialog open={dialog.open} project={dialog.project} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />

      <Sheet open={Boolean(open)} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {open && (
            <ProjectDetail project={open} tasks={tasks} goals={goals} onOpenTask={setTaskOpenId}
              onDelete={() => { remove.mutate(open.id); setOpenId(null); }}
              onEdit={() => setDialog({ open: true, project: open })} />
          )}
        </SheetContent>
      </Sheet>

      <TaskDetailSheet task={tasks.find((t) => t.id === taskOpenId) ?? null} onClose={() => setTaskOpenId(null)} />
    </div>
  );
}
