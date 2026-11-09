// Dados do módulo Conteúdo (todos no espaço atual; os de negócio respeitam o seletor do topo).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type {
  ClientQuestion, ContentMetric, ContentSettings, ContentStory, Hook, HookFormula, Recording, ReferenceAccount, ReferencePost, TrendItem,
} from "@/integrations/supabase/types";
import { useCrmList } from "@/hooks/useCrm";
import { useScope } from "@/hooks/useScope";

const recent = (q: any) => q.order("created_at", { ascending: false }); // eslint-disable-line @typescript-eslint/no-explicit-any

export const useHooks = () => useCrmList<Hook>("hooks", [], recent);
export const useStories = () => useCrmList<ContentStory>("content_stories", [], recent);
export const useQuestions = () => useCrmList<ClientQuestion>("client_questions", [], recent);
export const useRecordings = () => useCrmList<Recording>("recordings", [], recent);
export const useRefAccounts = () => useCrmList<ReferenceAccount>("reference_accounts", [], (q) => q.order("handle"));
export const useRefPosts = () => useCrmList<ReferencePost>("reference_posts", [], recent);
export const useMetrics = () => useCrmList<ContentMetric>("content_metrics", [], (q) => q.order("measured_on", { ascending: false }).limit(2000));
export const useTrends = () => useCrmList<TrendItem>("trend_items", [], (q) => q.order("found_on", { ascending: false }).order("created_at", { ascending: false }));

export function useFormulas() {
  return useQuery({
    queryKey: ["hook-formulas"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from("hook_formulas").select("*").order("id");
      if (error) throw error;
      return (data ?? []) as HookFormula[];
    },
  });
}

export function useContentSettings() {
  const scope = useScope();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["content-settings", scope.wsId],
    enabled: scope.ready,
    queryFn: async () => {
      const { data, error } = await supabase.from("content_settings").select("*").eq("workspace_id", scope.wsId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as ContentSettings | null;
    },
  });
  const save = useMutation({
    mutationFn: async (v: Omit<ContentSettings, "workspace_id">) => {
      const { error } = await supabase.from("content_settings").upsert({ ...v, workspace_id: scope.wsId, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Configuração salva."); qc.invalidateQueries({ queryKey: ["content-settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { q, save };
}

/** Grava a métrica do dia de uma peça (atualiza se já houver). */
export function useSaveMetric() {
  const scope = useScope();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: Partial<ContentMetric> & { item_id: string; measured_on: string }) => {
      const { error } = await supabase.from("content_metrics").upsert({ ...v, workspace_id: scope.wsId }, { onConflict: "item_id,measured_on" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Métricas salvas."); qc.invalidateQueries({ queryKey: ["crm", "content_metrics"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}
