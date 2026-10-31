import { useMemo, useState, type ReactNode } from "react";
import { MarketingDialogsContext, type MarketingDialogs } from "@/hooks/useMarketingDialogs";
import type { Campaign, ContentItem, Delivery } from "@/integrations/supabase/types";
import type { ContentDefaults } from "@/lib/marketingForms";
import { CampaignDialog } from "./CampaignDialog";
import { ContentDialog } from "./ContentDialog";
import { DeliveryDialog } from "./DeliveryDialog";

type State =
  | { kind: "content"; item: ContentItem | null; defaults?: ContentDefaults }
  | { kind: "campaign"; item: Campaign | null }
  | { kind: "delivery"; item: Delivery | null }
  | null;

/** Dono dos diálogos de Marketing: as abas só pedem para abrir. */
export function MarketingDialogsProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<State>(null);
  const api = useMemo<MarketingDialogs>(() => ({
    openContent: (item = null, defaults) => setS({ kind: "content", item, defaults }),
    openCampaign: (item = null) => setS({ kind: "campaign", item }),
    openDelivery: (item = null) => setS({ kind: "delivery", item }),
  }), []);
  const close = (o: boolean) => { if (!o) setS(null); };

  return (
    <MarketingDialogsContext.Provider value={api}>
      {children}
      <ContentDialog open={s?.kind === "content"} onOpenChange={close} item={s?.kind === "content" ? s.item : null}
        defaults={s?.kind === "content" ? s.defaults : undefined} />
      <CampaignDialog open={s?.kind === "campaign"} onOpenChange={close} campaign={s?.kind === "campaign" ? s.item : null} />
      <DeliveryDialog open={s?.kind === "delivery"} onOpenChange={close} delivery={s?.kind === "delivery" ? s.item : null} />
    </MarketingDialogsContext.Provider>
  );
}
