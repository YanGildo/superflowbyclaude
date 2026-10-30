// Indicadores do Dashboard da Agência (sem React).
import type { Activity, Contact, Deal, PipelineStage, Proposal } from "@/integrations/supabase/types";
import type { AgencyExtras } from "@/hooks/useAgency";

const OPEN_PROPOSAL = ["rascunho", "enviada", "em_negociacao"];
const DONE_DELIVERY = ["aprovado", "publicado"];
const sum = (l: number[]) => l.reduce((a, b) => a + b, 0);

export interface AgencyData {
  contacts: Contact[]; deals: Deal[]; stages: PipelineStage[]; proposals: Proposal[]; activities: Activity[]; extras?: AgencyExtras;
}

/** Números de clientes, propostas e receita. */
export function salesKpis(d: AgencyData, ym: string) {
  const active = d.contacts.filter((c) => c.status === "cliente_ativo");
  const mrr = sum(active.map((c) => Number(c.monthly_value ?? 0)));
  const openProps = d.proposals.filter((p) => OPEN_PROPOSAL.includes(p.status));
  return {
    activeClients: active.length,
    openLeads: d.deals.filter((x) => x.status === "open").length,
    sentProposals: d.proposals.filter((p) => p.status === "enviada" || p.status === "em_negociacao").length,
    openProposals: openProps.length,
    approvedMonth: d.proposals.filter((p) => p.status === "aprovada" && p.approved_at?.slice(0, 7) === ym).length,
    mrr,
    forecast: mrr + sum(openProps.map((p) => Number(p.monthly_value))),
    received: sum((d.extras?.received ?? []).map((r) => Number(r.amount))),
  };
}

/** Números de operação: demandas, campanhas, conteúdos, reuniões e entregas. */
export function opsKpis(d: AgencyData, today: string, ym: string) {
  const e = d.extras;
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString();
  const meetingStage = d.stages.find((s) => s.name.toLowerCase().startsWith("reuni"));
  return {
    lateDeliveries: (e?.deliveries ?? []).filter((x) => x.due_date && x.due_date < today && !DONE_DELIVERY.includes(x.status)).length,
    activeCampaigns: (e?.campaigns ?? []).filter((c) => c.status === "ativa").length,
    pendingCreatives: (e?.content ?? []).filter((c) => /an[úu]ncio|criativo/i.test(c.kind) && !["aprovado", "publicado"].includes(c.stage)).length,
    inApproval: (e?.content ?? []).filter((c) => c.stage === "revisao").length,
    meetingsWeek: d.activities.filter((a) => a.type === "Reunião" && a.at >= today && a.at <= in7).length
      + d.deals.filter((x) => x.stage_id === meetingStage?.id).length,
    deliveriesMonth: (e?.deliveries ?? []).filter((x) => (x.due_date ?? x.created_at).slice(0, 7) === ym).length,
  };
}

/** Serviços mais contratados pelos clientes ativos. */
export function topServices(contacts: Contact[]) {
  const m = new Map<string, number>();
  contacts.filter((c) => c.status === "cliente_ativo").forEach((c) => c.services.forEach((s) => m.set(s, (m.get(s) ?? 0) + 1)));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
}

/** Entregas abertas por cliente. */
export function demandsByClient(extras: AgencyExtras | undefined, contacts: Map<string, Contact>) {
  const m = new Map<string, number>();
  (extras?.deliveries ?? []).filter((x) => x.contact_id && !DONE_DELIVERY.includes(x.status))
    .forEach((x) => m.set(x.contact_id as string, (m.get(x.contact_id as string) ?? 0) + 1));
  return [...m.entries()].map(([id, n]) => ({ name: contacts.get(id)?.name ?? "—", n })).sort((a, b) => b.n - a.n).slice(0, 6);
}
