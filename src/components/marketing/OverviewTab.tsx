import { CalendarClock, CheckCircle2, Clapperboard, Lightbulb } from "lucide-react";
import { useContentItems } from "@/hooks/useMarketing";
import { CONTENT_STAGES, marketingKpis } from "@/lib/marketing";
import { ContentBoard } from "./ContentBoard";
import { KpiGrid } from "./Kpis";
import { PlanCard } from "./PlanCard";

export function OverviewTab() {
  const { data: items = [] } = useContentItems();
  const k = marketingKpis(items);
  return (
    <div className="space-y-5">
      <KpiGrid items={[
        { label: "Ideias", value: k.ideas, icon: Lightbulb },
        { label: "Em produção", value: k.production, icon: Clapperboard, tone: "bg-warning/15 text-warning" },
        { label: "Próximos 7 dias", value: k.next7, icon: CalendarClock, tone: "bg-info/10 text-info" },
        { label: "Publicados no mês", value: k.published, icon: CheckCircle2, tone: "bg-success/10 text-success" },
      ]} />
      <PlanCard />
      <div>
        <h3 className="mb-2 font-heading font-semibold">Tudo que está em andamento</h3>
        <ContentBoard items={items} stages={CONTENT_STAGES} emptyText="Nenhum conteúdo, vídeo ou ação ainda." />
      </div>
    </div>
  );
}
