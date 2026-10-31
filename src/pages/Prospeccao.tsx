import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { List, Map, Megaphone, Search, Settings } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { CampaignsTab } from "@/components/prospecting/CampaignsTab";
import { ListTab } from "@/components/prospecting/ListTab";
import { MapTab } from "@/components/prospecting/MapTab";
import { SearchTab } from "@/components/prospecting/SearchTab";
import { SettingsTab } from "@/components/prospecting/SettingsTab";
import { useProspectActions, useProspects } from "@/hooks/useProspects";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "buscar", label: "Buscar leads", icon: Search, el: <SearchTab /> },
  { id: "mapa", label: "Mapa", icon: Map, el: <MapTab /> },
  { id: "lista", label: "Lista de prospects", icon: List, el: <ListTab /> },
  { id: "campanhas", label: "Campanhas", icon: Megaphone, el: <CampaignsTab /> },
  { id: "config", label: "Configurações", icon: Settings, el: <SettingsTab /> },
];

/** Prospects que chegaram sem score (busca ou importação) ganham o score automaticamente. */
function useAutoScore() {
  const { data: prospects = [] } = useProspects();
  const { rescore } = useProspectActions();
  const pending = prospects.filter((p) => p.score == null).length;
  useEffect(() => { if (pending) void rescore(prospects); }, [pending]); // eslint-disable-line react-hooks/exhaustive-deps
}

export default function Prospeccao() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.id === params.get("aba")) ?? TABS[0];
  useAutoScore();
  return (
    <div>
      <PageHeader eyebrow="CRM Agência" title="Prospecção" description="Extrator de leads do Google Maps (Apify), mapa, lista com score e conversão em lead." />
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg border bg-card p-1" role="tablist" aria-label="Seções da prospecção">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab.id === t.id} onClick={() => setParams((p) => { p.set("aba", t.id); return p; }, { replace: true })}
            className={cn("flex shrink-0 items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
              tab.id === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            <t.icon className="size-4" />{t.label}
          </button>
        ))}
      </div>
      {tab.el}
    </div>
  );
}
