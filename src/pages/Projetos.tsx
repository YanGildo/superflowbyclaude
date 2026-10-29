import { useMemo, useState } from "react";
import { CalendarDays, ExternalLink, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import { useProjectMutations, useProjects, useGoals } from "@/hooks/useProjectsGoals";
import { useAllTasks, useTaskMutations } from "@/hooks/useTasks";
import type { Project, Task } from "@/integrations/supabase/types";
import { PRIORITY, PROJECT_STATUSES, PROJECT_STATUS_LABEL, shortDate } from "@/lib/labels";
import { localISODate } from "@/lib/format";
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

export default function Projetos() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: tasks = [] } = useAllTasks();
  const { data: goals = [] } = useGoals();
  const { remove } = useProjectMutations();
  const taskM = useTaskMutations();
  const [status, setStatus] = useState<string>("ativos");
  const [dialog, setDialog] = useState<{ open: boolean; project?: Project | null }>({ open: false });
  const [openId, setOpenId] = useState<string | null>(null);
  const [taskOpenId, setTaskOpenId] = useState<string | null>(null);
  const today = localISODate();

  const list = useMemo(() => projects.filter((p) =>
    status === "todos" ? true : status === "ativos" ? p.status !== "concluído" : p.status === status), [projects, status]);
  const open = projects.find((p) => p.id === openId) ?? null;
  const openTasks = open ? tasks.filter((t) => t.project_id === open.id) : [];

  const filters = [
    { v: "ativos", label: "Ativos" },
    ...PROJECT_STATUSES.map((s) => ({ v: s, label: PROJECT_STATUS_LABEL[s] })),
    { v: "todos", label: "Todos" },
  ];

  return (
    <div>
      <PageHeader eyebrow="Produtividade" title="Projetos" description="Iniciativas com tarefas, metas e prazo."
        actions={<Button onClick={() => setDialog({ open: true, project: null })}><Plus className="size-4" />Novo projeto</Button>} />

      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar por status">
        {filters.map((f) => (
          <button key={f.v} role="tab" aria-selected={status === f.v} onClick={() => setStatus(f.v)}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              status === f.v ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44 rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState icon={FolderKanban} title={projects.length ? "Nenhum projeto neste filtro" : "Nenhum projeto ainda"}
          description="Crie um projeto para agrupar as tarefas de um cliente, campanha ou produto."
          action={<Button onClick={() => setDialog({ open: true, project: null })}><Plus className="size-4" />Criar projeto</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((p) => {
            const pr = progressOf(p, tasks);
            const late = p.deadline && p.deadline < today && p.status !== "concluído";
            return (
              <Card key={p.id} className="group relative cursor-pointer overflow-hidden transition-shadow hover:shadow-md" onClick={() => setOpenId(p.id)}>
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: p.color ?? "hsl(var(--primary))" }} />
                <CardContent className="space-y-3 p-4 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button className="block max-w-full truncate text-left font-heading font-semibold hover:underline"
                        onClick={(e) => { e.stopPropagation(); setOpenId(p.id); }}>{p.name}</button>
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
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {p.deadline && (
                      <span className={cn("inline-flex items-center gap-1 text-muted-foreground", late && "font-medium text-destructive")}>
                        <CalendarDays className="size-3.5" />{shortDate(p.deadline)}{late && " · atrasado"}
                      </span>
                    )}
                    {p.priority !== "media" && <span className={cn("rounded-full px-2 py-0.5", PRIORITY[p.priority].className)}>{PRIORITY[p.priority].label}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ProjectDialog open={dialog.open} project={dialog.project} onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))} />

      <Sheet open={Boolean(open)} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {open && (
            <>
              <SheetHeader className="space-y-1 text-left">
                <p className="brand-eyebrow">{open.category ?? "Projeto"}</p>
                <SheetTitle className="font-heading text-xl">{open.name}</SheetTitle>
                <SheetDescription>{open.description || "Sem descrição."}</SheetDescription>
              </SheetHeader>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="secondary">{PROJECT_STATUS_LABEL[open.status] ?? open.status}</Badge>
                {open.deadline && <Badge variant="outline">Prazo {shortDate(open.deadline)}</Badge>}
                {goals.filter((g) => g.project_id === open.id).map((g) => <Badge key={g.id} variant="outline">Meta: {g.title}</Badge>)}
                {open.link && (
                  <a href={open.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <ExternalLink className="size-3" />Abrir link
                  </a>
                )}
              </div>
              <div className="mt-6 space-y-3">
                <p className="brand-eyebrow">Tarefas do projeto</p>
                <QuickAddTask defaults={{ project_id: open.id, business_id: open.business_id }} placeholder="Nova tarefa neste projeto" />
                {openTasks.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma tarefa ainda.</p>}
                <div className="space-y-1.5">
                  {[...openTasks].sort((a, b) => Number(a.status === "concluida") - Number(b.status === "concluida")).map((t) => (
                    <TaskRow key={t.id} task={t} lookups={{}} onOpen={() => setTaskOpenId(t.id)}
                      onToggleDone={() => taskM.toggleDone(t)}
                      onToggleImportant={() => taskM.update.mutate({ id: t.id, patch: { is_important: !t.is_important } })} />
                  ))}
                </div>
              </div>
              <div className="mt-8 flex justify-between border-t pt-4">
                <Button variant="ghost" className="text-destructive hover:text-destructive"
                  onClick={() => { remove.mutate(open.id); setOpenId(null); }}>
                  <Trash2 className="size-4" />Excluir
                </Button>
                <Button variant="outline" onClick={() => setDialog({ open: true, project: open })}><Pencil className="size-4" />Editar</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <TaskDetailSheet task={tasks.find((t) => t.id === taskOpenId) ?? null} onClose={() => setTaskOpenId(null)} />
    </div>
  );
}
