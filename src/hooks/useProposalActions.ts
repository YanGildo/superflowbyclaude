// Mudanças de situação da proposta e seus efeitos no pipeline e nas conversões.
import { toast } from "sonner";
import { useCrmMutations, useDeals, useStages } from "@/hooks/useCrm";
import { useCrmFlows } from "@/hooks/useCrmFlows";
import type { Proposal } from "@/integrations/supabase/types";

export function useProposalActions() {
  const { patch } = useCrmMutations("proposals");
  const dealM = useCrmMutations("deals");
  const { data: deals = [] } = useDeals();
  const { data: stages = [] } = useStages();
  const { logConversion } = useCrmFlows();
  const value = (p: Proposal) => Number(p.monthly_value) || Number(p.setup_fee);

  /** Leva a oportunidade aberta do contato para a primeira etapa com o resultado pedido. */
  const moveDeal = (p: Proposal, outcome: "won" | "lost" | "proposal") => {
    const deal = deals.find((d) => d.contact_id === p.contact_id && d.status === "open");
    if (!deal) return;
    const stage = outcome === "proposal"
      ? stages.find((s) => s.pipeline_id === deal.pipeline_id && s.name.toLowerCase().startsWith("proposta"))
      : stages.find((s) => s.pipeline_id === deal.pipeline_id && s.outcome === outcome);
    if (stage) dealM.patch.mutate({ id: deal.id, values: { stage_id: stage.id } });
  };

  const send = (p: Proposal) => patch.mutate({ id: p.id, values: { status: "enviada" } }, {
    onSuccess: () => { void logConversion("Proposta enviada", p.contact_id, value(p)); moveDeal(p, "proposal"); toast.success("Proposta marcada como enviada."); },
  });

  const approve = (p: Proposal) => patch.mutate({ id: p.id, values: { status: "aprovada" } }, {
    onSuccess: () => {
      void logConversion("Negócio fechado", p.contact_id, value(p));
      moveDeal(p, "won");
      toast.success("Aprovada! O contato virou cliente ativo e a mensalidade entrou em Pagar e receber.");
    },
  });

  const refuse = (p: Proposal) => patch.mutate({ id: p.id, values: { status: "recusada" } }, { onSuccess: () => moveDeal(p, "lost") });

  return { send, approve, refuse };
}
