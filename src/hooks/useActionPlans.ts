// Planos de ação: leitura e gravação (planos, etapas, scripts/prompts e números da semana).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ActionPlan, ActionPlanAsset, ActionPlanCheckin, ActionPlanStep } from "@/integrations/supabase/types";
import { useScope } from "@/hooks/useScope";
import { documentWithMetrics, type ImportedPlan } from "@/lib/planPrompt";

type Table = "action_plans" | "action_plan_steps" | "action_plan_assets" | "action_plan_checkins";
type Builder = (q: any) => any; // eslint-disable-line @typescript-eslint/no-explicit-any

function useList<T>(table: Table, key: unknown[], build: Builder, enabled = true) {
  const scope = useScope();
  return useQuery({
    queryKey: ["plans", table, scope.wsId, ...key],
    enabled: scope.ready && enabled,
    queryFn: async () => {
      const { data, error } = await build(supabase.from(table).select("*").eq("workspace_id", scope.wsId));
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export const usePlans = () => useList<ActionPlan>("action_plans", [], (q) => q.order("created_at", { ascending: false }));

/** Todas as etapas de todos os planos (para o progresso nos cards e o próximo passo na Central). */
export const useAllSteps = () => useList<ActionPlanStep>("action_plan_steps", ["all"], (q) => q.order("position"));

export const usePlanAssets = (planId: string | null) =>
  useList<ActionPlanAsset>("action_plan_assets", [planId], (q) => q.eq("plan_id", planId).order("position").order("created_at"), Boolean(planId));

export const usePlanCheckins = (planId: string | null) =>
  useList<ActionPlanCheckin>("action_plan_checkins", [planId], (q) => q.eq("plan_id", planId).order("week_start", { ascending: false }), Boolean(planId));

/** Salvar (cria sem id), remover e marcar etapa como feita. */
export function usePlanMutations(table: Table) {
  const qc = useQueryClient();
  const scope = useScope();
  const refresh = () => qc.invalidateQueries({ queryKey: ["plans"] });
  const onError = (e: Error) => toast.error(`Não salvou: ${e.message}`);
  const save = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { id, ...rest } = row;
      const q = id ? supabase.from(table).update(rest).eq("id", id as string) : supabase.from(table).insert({ workspace_id: scope.wsId, ...rest });
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: refresh, onError,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refresh, onError,
  });
  return { save, remove };
}

/** Marcar / desmarcar etapa (resposta imediata na tela). */
export function useToggleStep() {
  const qc = useQueryClient();
  const scope = useScope();
  return useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("action_plan_steps").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, done }) => {
      const key = ["plans", "action_plan_steps", scope.wsId, "all"];
      qc.setQueryData<ActionPlanStep[]>(key, (old) => old?.map((s) => (s.id === id ? { ...s, done_at: done ? new Date().toISOString() : null } : s)));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["plans"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Números da semana: cria ou atualiza a linha da semana. */
export function useSaveCheckin() {
  const qc = useQueryClient();
  const scope = useScope();
  return useMutation({
    mutationFn: async (c: { plan_id: string; week_start: string; values: Record<string, number | null>; notes: string | null }) => {
      const { error } = await supabase.from("action_plan_checkins").upsert({ workspace_id: scope.wsId, ...c }, { onConflict: "plan_id,week_start" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); toast.success("Números da semana salvos."); },
    onError: (e: Error) => toast.error(`Não salvou: ${e.message}`),
  });
}

/** Cria um plano completo (plano + etapas + scripts/prompts) a partir do resultado do prompt universal. */
export function useImportPlan() {
  const qc = useQueryClient();
  const scope = useScope();
  return useMutation({
    mutationFn: async (p: ImportedPlan) => {
      const ws = scope.wsId;
      const plan = await supabase.from("action_plans").insert({
        workspace_id: ws, title: p.title, goal: p.goal, summary: p.summary, document: documentWithMetrics(p),
      }).select("id").single();
      if (plan.error) throw plan.error;
      const planId = (plan.data as { id: string }).id;
      const steps = await supabase.from("action_plan_steps")
        .insert(p.steps.map((s, i) => ({ workspace_id: ws, plan_id: planId, position: i, ...s })))
        .select("id,title");
      if (steps.error) throw steps.error;
      const byTitle = new Map(((steps.data ?? []) as { id: string; title: string }[]).map((s) => [s.title.toLowerCase(), s.id]));
      if (p.assets.length) {
        const { error } = await supabase.from("action_plan_assets").insert(p.assets.map((a, i) => ({
          workspace_id: ws, plan_id: planId, position: i, kind: a.kind, title: a.title, body: a.body, url: a.url,
          step_id: a.step ? byTitle.get(a.step.toLowerCase()) ?? null : null,
        })));
        if (error) throw error;
      }
      return planId;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["plans"] }); toast.success("Plano criado a partir do texto colado."); },
    onError: (e: Error) => toast.error(`Não criou o plano: ${e.message}`),
  });
}
