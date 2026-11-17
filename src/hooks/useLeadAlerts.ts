// Avisos de lead novo (e-mail) e rotas de leads do Meta por campanha.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useScope } from "@/hooks/useScope";

export interface LeadAlert { id: string; workspace_id: string; pipeline_id: string | null; emails: string[]; active: boolean }
export interface OutboxItem { id: string; to_emails: string[]; subject: string; status: "pendente" | "enviado" | "falhou"; error: string | null; created_at: string; sent_at: string | null }
export interface MetaRoute { id: string; page_id: string; form_id: string; pipeline_id: string; stage_id: string | null; source: string; active: boolean }

export function useLeadAlert(pipelineId: string, enabled: boolean) {
  const scope = useScope();
  const qc = useQueryClient();
  const alert = useQuery({
    queryKey: ["lead-alert", pipelineId], enabled: enabled && scope.ready,
    queryFn: async () => {
      const { data, error } = await supabase.from("lead_alerts").select("*").eq("pipeline_id", pipelineId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as LeadAlert | null;
    },
  });
  const outbox = useQuery({
    queryKey: ["outbox", scope.wsId], enabled: enabled && scope.ready, staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("notification_outbox").select("id,to_emails,subject,status,error,created_at,sent_at")
        .eq("workspace_id", scope.wsId).order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return (data ?? []) as OutboxItem[];
    },
  });
  const route = useQuery({
    queryKey: ["meta-route", pipelineId], enabled: enabled && scope.ready,
    queryFn: async () => {
      const { data, error } = await supabase.from("meta_lead_routes").select("*").eq("pipeline_id", pipelineId).limit(1).maybeSingle();
      if (error) throw error;
      return (data ?? null) as MetaRoute | null;
    },
  });
  const saveAlert = useMutation({
    mutationFn: async (v: { emails: string[]; active: boolean }) => {
      const row = { workspace_id: scope.wsId, pipeline_id: pipelineId, ...v };
      const { error } = alert.data
        ? await supabase.from("lead_alerts").update(v).eq("id", alert.data.id)
        : await supabase.from("lead_alerts").insert(row);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Aviso salvo."); qc.invalidateQueries({ queryKey: ["lead-alert", pipelineId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const saveRoute = useMutation({
    mutationFn: async (v: { page_id: string; form_id: string; stage_id: string | null; active: boolean }) => {
      const row = { workspace_id: scope.wsId, pipeline_id: pipelineId, ...v };
      const { error } = route.data
        ? await supabase.from("meta_lead_routes").update(v).eq("id", route.data.id)
        : await supabase.from("meta_lead_routes").insert(row);
      if (error) throw new Error(error.message.includes("duplicate") ? "Esse formulário já está ligado a outra campanha." : error.message);
    },
    onSuccess: () => { toast.success("Ligação com o Meta salva."); qc.invalidateQueries({ queryKey: ["meta-route", pipelineId] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { alert, outbox, route, saveAlert, saveRoute };
}
