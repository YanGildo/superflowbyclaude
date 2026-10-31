// Prospect vira lead: contato + oportunidade na etapa padrão + conversão; o prospect fica marcado.
import { toast } from "sonner";
import { useCrmMutations, usePipelines, useStages } from "@/hooks/useCrm";
import { useCrmFlows } from "@/hooks/useCrmFlows";
import { useProspectActions, useProspectSettings } from "@/hooks/useProspects";
import type { Prospect } from "@/integrations/supabase/types";

export function useConvertProspect() {
  const { data: pipelines = [] } = usePipelines();
  const { data: stages = [] } = useStages();
  const { createLead } = useCrmFlows();
  const contactM = useCrmMutations("contacts");
  const { patch } = useProspectActions();
  const { settings } = useProspectSettings();

  return async (p: Prospect) => {
    const pl = pipelines[0];
    const own = stages.filter((s) => s.pipeline_id === pl?.id);
    const stage = own.find((s) => s.name === settings.defaultStage) ?? own[0];
    if (!pl || !stage) return toast.error("Nenhum pipeline encontrado.");
    const contactId = await createLead.mutateAsync({
      name: p.name, company: p.name, phone: p.whatsapp ?? p.phone ?? "", email: p.email ?? "", source: "Prospecção", service: null,
      stageId: stage.id, pipelineId: pl.id, notes: [p.address, p.website, p.maps_url].filter(Boolean).join("\n"),
    });
    contactM.patch.mutate({ id: contactId, values: { city: p.city, state: p.state, website: p.website, instagram: p.instagram, segment: p.category, prospect_id: p.id } });
    patch.mutate({ id: p.id, values: { status: "Virou lead", converted_contact_id: contactId } });
  };
}
