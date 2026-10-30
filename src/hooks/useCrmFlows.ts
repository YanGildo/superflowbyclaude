// Ações compostas do comercial (várias gravações de uma vez).
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Temperature } from "@/integrations/supabase/types";
import { useScope } from "@/hooks/useScope";

export interface NewLead {
  name: string; company: string; phone: string; email: string; source: string | null; service: string | null;
  stageId: string; pipelineId: string; notes: string; temperature?: Temperature | null; value?: number | null;
}

const orNull = (s: string) => (s.trim() ? s.trim() : null);

export function useCrmFlows() {
  const qc = useQueryClient();
  const scope = useScope();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["crm"] });
    qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
  };

  /** Registra um evento no histórico (contato ou conversão). */
  const logActivity = async (row: Record<string, unknown>) => {
    const { error } = await supabase.from("activities").insert({
      workspace_id: scope.wsId, business_id: scope.businessIdForNew, origin: "automatico", ...row,
    });
    if (error) throw error;
  };

  /** Novo lead: contato + oportunidade na etapa escolhida + conversão "Lead gerado". */
  const createLead = useMutation({
    mutationFn: async (l: NewLead) => {
      const base = { workspace_id: scope.wsId, business_id: scope.businessIdForNew };
      const c = await supabase.from("contacts").insert({
        ...base, name: l.name.trim(), company: orNull(l.company), phone: orNull(l.phone), whatsapp: orNull(l.phone),
        email: orNull(l.email), source: l.source, services: l.service ? [l.service] : [], notes: orNull(l.notes),
        temperature: l.temperature ?? null, kind: l.company.trim() ? "empresa" : "pessoa",
      }).select("id").single();
      if (c.error) throw c.error;
      const contactId = (c.data as { id: string }).id;
      const d = await supabase.from("deals").insert({
        ...base, contact_id: contactId, pipeline_id: l.pipelineId, stage_id: l.stageId,
        title: l.company.trim() || l.name.trim(), value: l.value ?? null,
      });
      if (d.error) throw d.error;
      await logActivity({ contact_id: contactId, category: "conversao", type: "Lead gerado", channel: l.source, summary: l.name.trim() });
      return contactId;
    },
    onSuccess: () => { refresh(); toast.success("Lead adicionado ao pipeline."); },
    onError: (e: Error) => toast.error(`Não salvou: ${e.message}`),
  });

  /** Grava uma conversão automática (proposta enviada, negócio fechado...). Falha não interrompe o fluxo. */
  const logConversion = async (type: string, contactId: string, value?: number | null) => {
    try {
      await logActivity({ contact_id: contactId, category: "conversao", type, value: value ?? null, outcome: "fechado" });
      refresh();
    } catch { /* o principal já foi salvo; o histórico é complementar */ }
  };

  return { createLead, logConversion };
}
