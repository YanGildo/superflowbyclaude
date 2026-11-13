// Campanhas (funis): criar com etapas, renomear, arquivar, excluir sem negócios, regras de temperatura e importação de leads.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Pipeline } from "@/integrations/supabase/types";
import { useScope } from "@/hooks/useScope";
import type { LeadRow, StageDraft } from "@/lib/leadImport";

export interface ImportSummary { novos: number; atualizados: number; ignorados: number; cards: number; erros: { line: string; erro: string }[] }

export function useCampaigns() {
  const qc = useQueryClient();
  const scope = useScope();
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["crm"] }); qc.invalidateQueries({ queryKey: ["dashboard-kpis"] }); };
  const fail = (e: Error) => toast.error(e.message);

  const create = useMutation({
    mutationFn: async ({ name, businessId, position, stages }: { name: string; businessId: string | null; position: number; stages: StageDraft[] }) => {
      if (!stages.length) throw new Error("Adicione pelo menos uma etapa.");
      const { data, error } = await supabase.from("pipelines")
        .insert({ workspace_id: scope.wsId, business_id: businessId, name: name.trim(), position }).select("id").single();
      if (error) throw error;
      const id = (data as { id: string }).id;
      const st = await supabase.from("pipeline_stages")
        .insert(stages.map((s, i) => ({ ...s, workspace_id: scope.wsId, pipeline_id: id, position: i })));
      if (st.error) { await supabase.from("pipelines").delete().eq("id", id); throw st.error; }
      return id;
    },
    onSuccess: () => { invalidate(); toast.success("Campanha criada."); },
    onError: fail,
  });

  const update = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Pipeline> }) => {
      const { error } = await supabase.from("pipelines").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: fail,
  });

  /** Exclui só se nunca teve negócio (nem na lixeira), porque excluir o funil apagaria os cards. */
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { count, error } = await supabase.from("deals").select("id", { count: "exact", head: true }).eq("pipeline_id", id);
      if (error) throw error;
      if ((count ?? 0) > 0) throw new Error("Esta campanha tem negócios. Arquive em vez de excluir.");
      const del = await supabase.from("pipelines").delete().eq("id", id);
      if (del.error) throw del.error;
    },
    onSuccess: () => { invalidate(); toast.success("Campanha excluída."); },
    onError: fail,
  });

  /** Envia em blocos de 200 linhas e soma os resultados. */
  const importLeads = useMutation({
    mutationFn: async ({ pipelineId, stageId, rows, onProgress }: { pipelineId: string; stageId: string; rows: LeadRow[]; onProgress?: (done: number) => void }) => {
      const total: ImportSummary = { novos: 0, atualizados: 0, ignorados: 0, cards: 0, erros: [] };
      for (let i = 0; i < rows.length; i += 200) {
        const chunk = rows.slice(i, i + 200);
        const { data, error } = await supabase.rpc("import_campaign_leads", { _pipeline: pipelineId, _stage: stageId, _rows: chunk });
        if (error) throw error;
        const r = data as ImportSummary;
        total.novos += r.novos; total.atualizados += r.atualizados; total.ignorados += r.ignorados; total.cards += r.cards;
        total.erros.push(...r.erros);
        onProgress?.(Math.min(rows.length, i + 200));
      }
      return total;
    },
    onSuccess: invalidate,
    onError: fail,
  });

  return { create, update, remove, importLeads };
}
