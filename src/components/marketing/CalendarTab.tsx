import { useCampaigns, useContentItems, useDeliveries } from "@/hooks/useMarketing";
import { useMarketingDialogs } from "@/hooks/useMarketingDialogs";
import type { CalendarEvent } from "@/lib/marketing";
import { MonthCalendar } from "./MonthCalendar";

const COLORS = { conteudo: "#2563EB", gravacao: "#F59E0B", entrega: "#0EA5E9", campanha: "#16A34A" };
const LEGEND = [
  { label: "Publicação / prazo", color: COLORS.conteudo }, { label: "Gravação", color: COLORS.gravacao },
  { label: "Entrega", color: COLORS.entrega }, { label: "Início de campanha", color: COLORS.campanha },
];

function useEvents(): CalendarEvent[] {
  const { data: items = [] } = useContentItems();
  const { data: deliveries = [] } = useDeliveries();
  const { data: campaigns = [] } = useCampaigns();
  const { openContent, openDelivery, openCampaign } = useMarketingDialogs();
  const content = items.flatMap((c) => {
    const out: CalendarEvent[] = [];
    const d = c.publish_at?.slice(0, 10) ?? c.due_date;
    if (d) out.push({ id: c.id, date: d, title: c.title, color: COLORS.conteudo, kind: c.kind, onOpen: () => openContent(c) });
    if (c.recording_at) out.push({ id: `${c.id}-rec`, date: c.recording_at, title: `🎬 ${c.title}`, color: COLORS.gravacao, kind: "Gravação", onOpen: () => openContent(c) });
    return out;
  });
  const dels = deliveries.flatMap((d) => (d.due_date
    ? [{ id: d.id, date: d.due_date, title: d.title, color: COLORS.entrega, kind: "Entrega", onOpen: () => openDelivery(d) }] : []));
  const camps = campaigns.flatMap((c) => (c.start_date
    ? [{ id: c.id, date: c.start_date, title: c.name, color: COLORS.campanha, kind: "Campanha", onOpen: () => openCampaign(c) }] : []));
  return [...content, ...dels, ...camps];
}

/** Calendário editorial: publicações, gravações, entregas e campanhas juntas. */
export function CalendarTab() {
  const events = useEvents();
  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-heading text-xl font-semibold">Calendário</h2>
        <p className="text-sm text-muted-foreground">Publicações, gravações, entregas e campanhas no mesmo mês.</p>
      </div>
      <MonthCalendar events={events} legend={LEGEND} />
    </div>
  );
}
