import { useSearchParams } from "react-router-dom";
import { Clapperboard, FileImage, Megaphone, PackageCheck, Zap } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { CalendarTab } from "@/components/marketing/CalendarTab";
import { CampaignsTab } from "@/components/marketing/CampaignsTab";
import { ContentTab } from "@/components/marketing/ContentTab";
import { DeliveriesTab } from "@/components/marketing/DeliveriesTab";
import { IdeasTab } from "@/components/marketing/IdeasTab";
import { MarketingDialogsProvider } from "@/components/marketing/MarketingDialogs";
import { OverviewTab } from "@/components/marketing/OverviewTab";
import { VideosTab } from "@/components/marketing/VideosTab";
import { useMarketingDialogs } from "@/hooks/useMarketingDialogs";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "visao", label: "Visão geral", el: <OverviewTab /> },
  { id: "campanhas", label: "Campanhas", el: <CampaignsTab /> },
  { id: "conteudo", label: "Conteúdo / Criativos", el: <ContentTab /> },
  { id: "videos", label: "Produção de vídeos", el: <VideosTab /> },
  { id: "entregas", label: "Entregas", el: <DeliveriesTab /> },
  { id: "calendario", label: "Calendário", el: <CalendarTab /> },
  { id: "ideias", label: "Ideias / Backlog", el: <IdeasTab /> },
];

function Actions() {
  const d = useMarketingDialogs();
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => d.openContent(null, { kind: "Ação", stage: "ideia" })}><Zap className="size-4" />Nova ação</Button>
      <Button variant="outline" size="sm" onClick={() => d.openCampaign()}><Megaphone className="size-4" />Nova campanha</Button>
      <Button variant="outline" size="sm" onClick={() => d.openContent(null, { kind: "Post" })}><FileImage className="size-4" />Novo conteúdo</Button>
      <Button variant="outline" size="sm" onClick={() => d.openContent(null, { kind: "Reels", stage: "roteiro" })}><Clapperboard className="size-4" />Novo vídeo</Button>
      <Button size="sm" onClick={() => d.openDelivery()}><PackageCheck className="size-4" />Nova entrega</Button>
    </>
  );
}

function MarketingInner() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get("aba")) ?? TABS[0];
  const go = (id: string) => setParams((p) => { p.set("aba", id); return p; }, { replace: true });
  return (
    <div>
      <PageHeader eyebrow="Marketing" title="Marketing" description="Plano do mês, campanhas, conteúdos, vídeos, entregas, calendário e ideias." actions={<Actions />} />
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg border bg-card p-1" role="tablist" aria-label="Seções do marketing">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab.id === t.id} onClick={() => go(t.id)}
            className={cn("shrink-0 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              tab.id === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab.el}
    </div>
  );
}

export default function Marketing() {
  return <MarketingDialogsProvider><MarketingInner /></MarketingDialogsProvider>;
}
