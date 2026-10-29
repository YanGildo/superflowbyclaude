import { useMemo, useState } from "react";
import { AlarmClock, CalendarClock, CheckCircle2, Sun, Sparkles, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { QuickAddTask } from "@/components/tasks/QuickAddTask";
import { TaskRow, type TaskLookups } from "@/components/tasks/TaskRow";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";
import { useAllTasks, useFlows, useTaskMutations } from "@/hooks/useTasks";
import { useProjects } from "@/hooks/useProjectsGoals";
import type { Task } from "@/integrations/supabase/types";
import { localISODate } from "@/lib/format";

function Group({
  title, icon: Icon, tasks, tone, children,
}: { title: string; icon: LucideIcon; tasks: Task[]; tone?: string; children: (t: Task) => React.ReactNode }) {
  if (!tasks.length) return null;
  return (
    <section className="space-y-2">
      <h2 className={`flex items-center gap-2 text-sm font-semibold ${tone ?? ""}`}>
        <Icon className="size-4" />{title}<span className="font-normal text-muted-foreground">· {tasks.length}</span>
      </h2>
      <div className="space-y-1.5">{tasks.map(children)}</div>
    </section>
  );
}

export default function Hoje() {
  const { data: tasks = [], isLoading } = useAllTasks();
  const { data: flows = [] } = useFlows();
  const { data: projects = [] } = useProjects();
  const { update, toggleDone } = useTaskMutations();
  const [openId, setOpenId] = useState<string | null>(null);

  const today = localISODate();
  const in7 = localISODate(new Date(Date.now() + 7 * 864e5));

  const g = useMemo(() => {
    const open = tasks.filter((t) => t.status !== "concluida");
    const overdue = open.filter((t) => t.due_date && t.due_date < today);
    const todayList = open.filter((t) => !(t.due_date && t.due_date < today) && (t.my_day_date === today || t.due_date === today));
    const next = open.filter((t) => t.due_date && t.due_date > today && t.due_date <= in7 && t.my_day_date !== today)
      .sort((a, b) => a.due_date!.localeCompare(b.due_date!));
    const doneToday = tasks.filter((t) => t.status === "concluida" && t.completed_at && localISODate(new Date(t.completed_at)) === today);
    const suggestions = open.filter((t) => t.is_important && t.my_day_date !== today && !todayList.includes(t) && !overdue.includes(t)).slice(0, 5);
    return { overdue, todayList, next, doneToday, suggestions };
  }, [tasks, today, in7]);

  const lookups: TaskLookups = {
    flowName: (id) => flows.find((f) => f.id === id)?.name,
    projectName: (id) => projects.find((p) => p.id === id)?.name,
  };
  const totalDay = g.overdue.length + g.todayList.length + g.doneToday.length;
  const pct = totalDay ? Math.round((g.doneToday.length / totalDay) * 100) : 0;
  const row = (t: Task) => (
    <TaskRow key={t.id} task={t} lookups={lookups} selected={t.id === openId} onOpen={() => setOpenId(t.id)}
      onToggleDone={() => toggleDone(t)} onToggleImportant={() => update.mutate({ id: t.id, patch: { is_important: !t.is_important } })} />
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        title="Hoje"
        description="O que precisa sair do papel hoje."
      />

      {totalDay > 0 && (
        <div className="mb-5 rounded-xl border bg-card p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Progresso do dia</span>
            <span className="text-muted-foreground">{g.doneToday.length} de {totalDay} · {pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
      )}

      <div className="mb-6"><QuickAddTask defaults={{ my_day_date: today }} placeholder="O que você vai fazer hoje? (Enter)" /></div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : (
        <div className="space-y-7">
          <Group title="Atrasadas" icon={AlarmClock} tasks={g.overdue} tone="text-destructive">{row}</Group>
          <Group title="Para hoje" icon={Sun} tasks={g.todayList} tone="text-primary">{row}</Group>

          {g.overdue.length + g.todayList.length === 0 && (
            <EmptyState icon={Sun} title={g.doneToday.length ? "Dia concluído!" : "Seu dia está livre"}
              description={g.doneToday.length ? "Você concluiu tudo o que planejou para hoje." : "Adicione tarefas acima ou puxe alguma das sugestões abaixo."} />
          )}

          {g.suggestions.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4 text-brand-cyan" />Sugestões (importantes)</h2>
              {g.suggestions.map((t) => (
                <div key={t.id} className="flex items-center gap-2 rounded-lg border border-dashed bg-card/60 px-3 py-2">
                  <span className="flex-1 truncate text-sm">{t.title}</span>
                  <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: t.id, patch: { my_day_date: today } })}>
                    <Plus className="size-4" />Meu dia
                  </Button>
                </div>
              ))}
            </section>
          )}

          <Group title="Próximos 7 dias" icon={CalendarClock} tasks={g.next}>{row}</Group>
          <Group title="Concluídas hoje" icon={CheckCircle2} tasks={g.doneToday} tone="text-success">{row}</Group>
        </div>
      )}

      <TaskDetailSheet task={tasks.find((t) => t.id === openId) ?? null} onClose={() => setOpenId(null)} />
    </div>
  );
}
