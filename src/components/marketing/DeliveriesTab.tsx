import { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, PackageCheck, Plus, Send, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/common/PageHeader";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { Button } from "@/components/ui/button";
import { useContacts, useCrmMutations } from "@/hooks/useCrm";
import { useDeliveries } from "@/hooks/useMarketing";
import { useMarketingDialogs } from "@/hooks/useMarketingDialogs";
import type { Delivery, DeliveryStatus } from "@/integrations/supabase/types";
import { shortDate } from "@/lib/labels";
import { DELIVERY_STATUS, DELIVERY_STATUS_OPTIONS, deliveryLate, deliveryOpen } from "@/lib/marketing";
import { cn } from "@/lib/utils";
import { KpiGrid } from "./Kpis";

const ALL = "todas";
const FILTERS = [{ value: ALL, label: "Todos os status" }, ...DELIVERY_STATUS_OPTIONS];

function DeliveryRow({ d, client }: { d: Delivery; client?: string }) {
  const { patch, remove } = useCrmMutations("deliveries");
  const { openDelivery } = useMarketingDialogs();
  const late = deliveryLate(d);
  return (
    <div className="group flex flex-wrap items-center gap-3 border-b px-3 py-2.5 last:border-0 hover:bg-accent/40">
      <button type="button" onClick={() => openDelivery(d)} className="min-w-48 flex-1 text-left">
        <p className="text-sm font-medium">{d.title}</p>
        <p className="text-[11px] text-muted-foreground">
          {[client, d.type].filter(Boolean).join(" · ")}
          {d.due_date && <span className={cn(late && "font-semibold text-destructive")}> · prazo {shortDate(d.due_date)}{late && " (atrasada)"}</span>}
        </p>
      </button>
      <div className="w-44">
        <SimpleSelect<DeliveryStatus> value={d.status} onChange={(v) => patch.mutate({ id: d.id, values: { status: v } })} options={DELIVERY_STATUS_OPTIONS} />
      </div>
      <span className={cn("hidden rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline", DELIVERY_STATUS[d.status].tone)}>{DELIVERY_STATUS[d.status].label}</span>
      <button type="button" aria-label={`Excluir ${d.title}`} onClick={() => remove.mutate(d.id)}
        className="rounded p-1 text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
    </div>
  );
}

/** Entregas para clientes: prazo, status de aprovação e comentários. */
export function DeliveriesTab({ showTitle = true }: { showTitle?: boolean }) {
  const { data: all = [] } = useDeliveries();
  const { data: contacts = [] } = useContacts();
  const { openDelivery } = useMarketingDialogs();
  const [status, setStatus] = useState<string>(ALL);
  const [client, setClient] = useState<string | null>(null);
  const names = new Map(contacts.map((c) => [c.id, c.name]));
  const list = all.filter((d) => (status === ALL || d.status === status) && (!client || d.contact_id === client));

  return (
    <div className="space-y-4">
      {showTitle && <h2 className="font-heading text-xl font-semibold">Entregas</h2>}
      <KpiGrid items={[
        { label: "Em aberto", value: all.filter(deliveryOpen).length, icon: Clock },
        { label: "Atrasadas", value: all.filter((d) => deliveryLate(d)).length, icon: AlertTriangle, tone: "bg-destructive/10 text-destructive" },
        { label: "Com o cliente", value: all.filter((d) => d.status === "enviado_cliente").length, icon: Send, tone: "bg-info/10 text-info" },
        { label: "Aprovadas", value: all.filter((d) => !deliveryOpen(d)).length, icon: CheckCircle2, tone: "bg-success/10 text-success" },
      ]} />
      <div className="flex flex-wrap gap-2">
        <div className="w-48"><SimpleSelect value={status} onChange={setStatus} options={FILTERS} /></div>
        <div className="w-56"><RefSelect value={client} onChange={setClient} options={contacts} placeholder="Todos os clientes" /></div>
      </div>
      {list.length
        ? <div className="overflow-hidden rounded-xl border bg-card">{list.map((d) => <DeliveryRow key={d.id} d={d} client={d.contact_id ? names.get(d.contact_id) : undefined} />)}</div>
        : <EmptyState icon={PackageCheck} title="Nenhuma entrega" description="Registre o que vai para o cliente e acompanhe a aprovação."
            action={<Button size="sm" onClick={() => openDelivery()}><Plus className="size-4" />Nova entrega</Button>} />}
    </div>
  );
}
