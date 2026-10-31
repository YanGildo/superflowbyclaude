import { Plus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { DeliveriesTab } from "@/components/marketing/DeliveriesTab";
import { MarketingDialogsProvider } from "@/components/marketing/MarketingDialogs";
import { useMarketingDialogs } from "@/hooks/useMarketingDialogs";

function NewButton() {
  const { openDelivery } = useMarketingDialogs();
  return <Button size="sm" onClick={() => openDelivery()}><Plus className="size-4" />Nova entrega</Button>;
}

export default function Entregas() {
  return (
    <MarketingDialogsProvider>
      <PageHeader eyebrow="Marketing" title="Entregas" description="Tudo que vai para os clientes, com prazo, status e aprovação." actions={<NewButton />} />
      <DeliveriesTab showTitle={false} />
    </MarketingDialogsProvider>
  );
}
