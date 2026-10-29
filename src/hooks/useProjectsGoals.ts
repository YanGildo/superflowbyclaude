import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Goal, GoalStep, Project } from "@/integrations/supabase/types";
import { useScope } from "@/hooks/useScope";

/* ------------------------------ Projetos ------------------------------ */

export function useProjects() {
  const scope = useScope();
  return useQuery({
    queryKey: ["projects", scope.wsId, scope.businessFilter],
    enabled: scope.ready,
    queryFn: async () => {
      const { data, error } = await scope.apply(supabase.from("projects").select("*"))
        .is("deleted_at", null).order("position").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Project[];
    },
  });
}

export function useProjectMutations() {
  const qc = useQueryClient();
  const scope = useScope();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["projects"] });

  const save = useMutation({
    mutationFn: async (p: Partial<Project> & { name: string }) => {
      const { id, ...rest } = p;
      const payload = { ...rest, name: p.name.trim() };
      const { error } = id
        ? await supabase.from("projects").update(payload).eq("id", id)
        : await supabase.from("projects").insert({ workspace_id: scope.wsId, business_id: scope.businessIdForNew, ...payload });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(`Não salvou: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast("Projeto movido para a lixeira."); },
  });

  return { save, remove };
}

/* -------------------------------- Metas ------------------------------- */

export function useGoals() {
  const scope = useScope();
  return useQuery({
    queryKey: ["goals", scope.wsId, scope.businessFilter],
    enabled: scope.ready,
    queryFn: async () => {
      const { data, error } = await scope.apply(supabase.from("goals").select("*"))
        .is("deleted_at", null).order("position").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Goal[];
    },
  });
}

export function useGoalSteps() {
  const { wsId, ready } = useScope();
  return useQuery({
    queryKey: ["goal_steps", wsId],
    enabled: ready,
    queryFn: async () => {
      const { data, error } = await supabase.from("goal_steps").select("*").eq("workspace_id", wsId).order("position");
      if (error) throw error;
      return (data ?? []) as GoalStep[];
    },
  });
}

export function useGoalMutations() {
  const qc = useQueryClient();
  const scope = useScope();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["goals"] });
    qc.invalidateQueries({ queryKey: ["goal_steps"] });
  };

  const save = useMutation({
    mutationFn: async (g: Partial<Goal> & { title: string }) => {
      const { id, ...rest } = g;
      const payload = { ...rest, title: g.title.trim() };
      if (payload.status === "concluida" && !payload.completed_at) payload.completed_at = new Date().toISOString();
      const { error } = id
        ? await supabase.from("goals").update(payload).eq("id", id)
        : await supabase.from("goals").insert({ workspace_id: scope.wsId, business_id: scope.businessIdForNew, ...payload });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(`Não salvou: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast("Meta movida para a lixeira."); },
  });

  const addStep = useMutation({
    mutationFn: async ({ goalId, title, position }: { goalId: string; title: string; position: number }) => {
      const { error } = await supabase.from("goal_steps").insert({ workspace_id: scope.wsId, goal_id: goalId, title: title.trim(), position });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleStep = useMutation({
    mutationFn: async (s: GoalStep) => {
      const { error } = await supabase.from("goal_steps").update({ done: !s.done }).eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeStep = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goal_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { save, remove, addStep, toggleStep, removeStep };
}
