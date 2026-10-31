// Marketing: conteúdos, campanhas, entregas e plano do mês.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Campaign, ContentItem, Delivery, MarketingPlan } from "@/integrations/supabase/types";
import { useCrmList } from "@/hooks/useCrm";
import { useScope } from "@/hooks/useScope";
import { useTeam } from "@/hooks/useTeam";
import { DEMO_TAG, demoCampaigns } from "@/lib/marketing";

export const useContentItems = () =>
  useCrmList<ContentItem>("content_items", [], (q) => q.is("deleted_at", null).order("position").order("created_at", { ascending: false }));

export const useCampaigns = () =>
  useCrmList<Campaign>("campaigns", [], (q) => q.is("deleted_at", null).order("created_at", { ascending: false }));

export const useDeliveries = () =>
  useCrmList<Delivery>("deliveries", [], (q) => q.is("deleted_at", null).order("due_date", { ascending: true, nullsFirst: false }));

/** Pessoas da equipe para "Responsável". */
export function useMemberOptions() {
  const scope = useScope();
  const { members } = useTeam(scope.wsId);
  return (members.data ?? []).map((m) => ({ id: m.user_id, name: m.full_name || m.email }));
}

/* ------------------------------ Plano do mês ------------------------------ */

export function useMarketingPlan(month: string) {
  const scope = useScope();
  const biz = scope.businessIdForNew;
  return useQuery({
    queryKey: ["crm", "marketing_plans", scope.wsId, biz, month],
    enabled: scope.ready,
    queryFn: async () => {
      let q = supabase.from("marketing_plans").select("*").eq("workspace_id", scope.wsId).eq("month", month);
      q = biz ? q.eq("business_id", biz) : q.is("business_id", null);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return (data ?? null) as MarketingPlan | null;
    },
  });
}

type PlanFields = Pick<MarketingPlan, "goal" | "audience" | "offer" | "channels" | "notes">;

export function useSavePlan() {
  const qc = useQueryClient();
  const scope = useScope();
  return useMutation({
    mutationFn: async ({ id, month, values }: { id?: string; month: string; values: PlanFields }) => {
      const row = { ...values, updated_at: new Date().toISOString() };
      const { error } = id
        ? await supabase.from("marketing_plans").update(row).eq("id", id)
        : await supabase.from("marketing_plans").insert({ ...row, month, workspace_id: scope.wsId, business_id: scope.businessIdForNew });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Plano salvo."); qc.invalidateQueries({ queryKey: ["crm", "marketing_plans"] }); },
    onError: (e: Error) => toast.error(`Plano não salvo: ${e.message}`),
  });
}

/* ------------------------------ Demonstração ------------------------------ */

export function useDemoCampaigns() {
  const qc = useQueryClient();
  const scope = useScope();
  const done = () => qc.invalidateQueries({ queryKey: ["crm", "campaigns"] });

  const load = useMutation({
    mutationFn: async () => {
      const rows = demoCampaigns().map((r) => ({ ...r, workspace_id: scope.wsId, business_id: scope.businessIdForNew }));
      const { error } = await supabase.from("campaigns").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Campanhas de demonstração carregadas."); done(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const clear = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("campaigns").delete().eq("workspace_id", scope.wsId).eq("notes", DEMO_TAG);
      if (error) throw error;
    },
    onSuccess: () => { toast("Demonstração removida."); done(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return { load, clear };
}
