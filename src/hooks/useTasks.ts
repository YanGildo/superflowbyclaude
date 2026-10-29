import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Task, TaskList, TaskStep, WorkFlow } from "@/integrations/supabase/types";
import { useScope } from "@/hooks/useScope";
import { localISODate } from "@/lib/format";

/* ----------------------------- Consultas ----------------------------- */

export function useFlows() {
  const { wsId, ready } = useScope();
  return useQuery({
    queryKey: ["work_flows", wsId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase.from("work_flows").select("*").eq("workspace_id", wsId).order("position");
      if (error) throw error;
      // "Hoje" e "Semana" são do sistema antigo; no v2 viraram Meu dia / tela Hoje.
      return ((data ?? []) as WorkFlow[]).filter((f) => !f.is_system);
    },
  });
}

export function useTaskLists() {
  const { wsId, ready } = useScope();
  return useQuery({
    queryKey: ["task_lists", wsId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase.from("task_lists").select("*")
        .eq("workspace_id", wsId).is("deleted_at", null).order("position").order("created_at");
      if (error) throw error;
      return (data ?? []) as TaskList[];
    },
  });
}

/** Todas as tarefas ativas do escopo (o filtro por lista/fluxo é feito na tela). */
export function useAllTasks() {
  const scope = useScope();
  return useQuery({
    queryKey: ["tasks", scope.wsId, scope.businessFilter],
    enabled: scope.ready,
    queryFn: async () => {
      const { data, error } = await scope.apply(supabase.from("tasks").select("*"))
        .is("deleted_at", null)
        .order("position")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });
}

export function useTaskSteps(taskId: string | null) {
  return useQuery({
    queryKey: ["task_steps", taskId],
    enabled: Boolean(taskId),
    queryFn: async () => {
      const { data, error } = await supabase.from("task_steps").select("*").eq("task_id", taskId!).order("position");
      if (error) throw error;
      return (data ?? []) as TaskStep[];
    },
  });
}

/* ----------------------------- Filtros ------------------------------ */

export type SmartView = "meu-dia" | "importantes" | "planejadas" | "todas" | "concluidas";
export type TaskView =
  | { kind: "smart"; id: SmartView }
  | { kind: "list"; id: string }
  | { kind: "flow"; id: string };

export function isOverdue(t: Task, today = localISODate()) {
  return t.status !== "concluida" && Boolean(t.due_date) && t.due_date! < today;
}

export function isToday(t: Task, today = localISODate()) {
  return t.my_day_date === today || t.due_date === today;
}

export function filterTasks(tasks: Task[], view: TaskView, opts?: { includeDone?: boolean }): Task[] {
  const today = localISODate();
  const open = (t: Task) => opts?.includeDone || t.status !== "concluida";
  switch (view.kind) {
    case "list": return tasks.filter((t) => t.list_id === view.id && open(t));
    case "flow": return tasks.filter((t) => t.flow_id === view.id && open(t));
    case "smart":
      switch (view.id) {
        case "meu-dia": return tasks.filter((t) => open(t) && (isToday(t, today) || isOverdue(t, today)));
        case "importantes": return tasks.filter((t) => open(t) && t.is_important);
        case "planejadas": return tasks.filter((t) => open(t) && t.due_date)
          .sort((a, b) => a.due_date!.localeCompare(b.due_date!));
        case "todas": return tasks.filter(open);
        case "concluidas": return tasks.filter((t) => !open(t))
          .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
      }
  }
}

/* ---------------------------- Mutations ----------------------------- */

export function useTaskMutations() {
  const qc = useQueryClient();
  const scope = useScope();
  const key = ["tasks", scope.wsId, scope.businessFilter];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
  };

  const create = useMutation({
    mutationFn: async (input: Partial<Task> & { title: string }) => {
      const { data, error } = await supabase.from("tasks").insert({
        workspace_id: scope.wsId,
        business_id: scope.businessIdForNew,
        ...input,
        title: input.title.trim(),
      }).select().single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(`Não criou a tarefa: ${e.message}`),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Task> }) => {
      const { error } = await supabase.from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    // atualização otimista: a tela muda na hora
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Task[]>(key);
      qc.setQueryData<Task[]>(key, (old) => old?.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      toast.error(`Não salvou: ${e.message}`);
    },
    onSettled: invalidate,
  });

  const toggleDone = (t: Task) => {
    const done = t.status === "concluida";
    update.mutate({ id: t.id, patch: { status: done ? "pendente" : "concluida" } });
    if (!done && t.recurrence !== "none") toast.success("Concluída. A próxima repetição já foi criada.");
  };

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      invalidate();
      toast("Tarefa movida para a lixeira.", {
        action: { label: "Desfazer", onClick: () => restore.mutate(id) },
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").update({ deleted_at: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, toggleDone, remove, restore };
}

export function useStepMutations(taskId: string | null) {
  const qc = useQueryClient();
  const { wsId } = useScope();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["task_steps", taskId] });

  const add = useMutation({
    mutationFn: async ({ title, position }: { title: string; position: number }) => {
      const { error } = await supabase.from("task_steps").insert({ workspace_id: wsId, task_id: taskId, title: title.trim(), position });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = useMutation({
    mutationFn: async (s: TaskStep) => {
      const { error } = await supabase.from("task_steps").update({ done: !s.done }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("task_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { add, toggle, remove };
}

export function useListMutations() {
  const qc = useQueryClient();
  const { wsId, businessIdForNew } = useScope();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["task_lists"] });
  const create = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("task_lists")
        .insert({ workspace_id: wsId, business_id: businessIdForNew, name: name.trim(), position: Date.now() % 1e6 })
        .select().single();
      if (error) throw error;
      return data as TaskList;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });
  const rename = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("task_lists").update({ name: name.trim() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("task_lists").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast("Lista movida para a lixeira. As tarefas dela continuam em \"Todas\"."); },
  });
  return { create, rename, remove };
}

export function useFlowMutations() {
  const qc = useQueryClient();
  const { wsId } = useScope();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["work_flows"] });
  const create = useMutation({
    mutationFn: async ({ name, position }: { name: string; position: number }) => {
      const { error } = await supabase.from("work_flows").insert({ workspace_id: wsId, name: name.trim(), position });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message.includes("duplicate") ? "Já existe um fluxo com esse nome." : e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("work_flows").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); qc.invalidateQueries({ queryKey: ["tasks"] }); },
  });
  return { create, remove };
}
