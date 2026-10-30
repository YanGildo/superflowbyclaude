// Dados do Dashboard da Agência que não vêm do comercial (marketing e recebimentos).
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useScope } from "@/hooks/useScope";

export interface AgencyExtras {
  campaigns: { status: string }[];
  content: { kind: string; stage: string }[];
  deliveries: { contact_id: string | null; due_date: string | null; status: string; created_at: string }[];
  received: { amount: number; received_date: string | null; contact_id: string | null }[];
}

export function useAgencyExtras(monthStart: string) {
  const scope = useScope();
  return useQuery({
    queryKey: ["crm", "agency-extras", scope.wsId, scope.businessFilter, monthStart],
    enabled: scope.ready,
    queryFn: async (): Promise<AgencyExtras> => {
      const [camp, content, deliv, rec] = await Promise.all([
        scope.apply(supabase.from("campaigns").select("status")),
        scope.apply(supabase.from("content_items").select("kind, stage")).is("deleted_at", null),
        scope.apply(supabase.from("deliveries").select("contact_id, due_date, status, created_at"), { business: false }).is("deleted_at", null),
        scope.apply(supabase.from("receivables").select("amount, received_date, contact_id")).eq("status", "recebido").gte("received_date", monthStart),
      ]);
      for (const r of [camp, content, deliv, rec]) if (r.error) throw r.error;
      return { campaigns: camp.data ?? [], content: content.data ?? [], deliveries: deliv.data ?? [], received: rec.data ?? [] };
    },
  });
}
