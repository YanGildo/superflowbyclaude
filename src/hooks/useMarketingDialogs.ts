// Abre os diálogos de Marketing (conteúdo, campanha, entrega) de qualquer aba.
import { createContext, useContext } from "react";
import type { Campaign, ContentItem, Delivery } from "@/integrations/supabase/types";
import type { ContentDefaults } from "@/lib/marketingForms";

export interface MarketingDialogs {
  openContent: (item?: ContentItem | null, defaults?: ContentDefaults) => void;
  openCampaign: (c?: Campaign | null) => void;
  openDelivery: (d?: Delivery | null) => void;
}

const noop = () => undefined;
export const MarketingDialogsContext = createContext<MarketingDialogs>({ openContent: noop, openCampaign: noop, openDelivery: noop });

export const useMarketingDialogs = () => useContext(MarketingDialogsContext);
