import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefSelect } from "@/components/common/RefSelect";
import { useCampaignOptions, useContacts } from "@/hooks/useCrm";
import { ACTIVITY_STATUS, CHANNELS } from "@/lib/crm";
import { EMPTY_FILTER, isFiltered, type ActivityFilter } from "@/lib/activityFilters";

const opts = (l: string[]) => l.map((x) => ({ id: x, name: x }));
const STATUS_OPTS = Object.entries(ACTIVITY_STATUS).map(([id, s]) => ({ id, name: s.label }));

export function ActivityFilters({ f, setF, types, withCampaign, withStatus }: {
  f: ActivityFilter; setF: (f: ActivityFilter) => void; types: string[]; withCampaign?: boolean; withStatus?: boolean;
}) {
  const { data: contacts = [] } = useContacts();
  const { data: campaigns = [] } = useCampaignOptions();
  const set = <K extends keyof ActivityFilter>(k: K, v: ActivityFilter[K]) => setF({ ...f, [k]: v });
  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium"><Filter className="size-4" />Filtros</p>
        {isFiltered(f) && <Button size="sm" variant="ghost" onClick={() => setF(EMPTY_FILTER)}><X className="size-4" />Limpar</Button>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <RefSelect value={f.type} onChange={(v) => set("type", v)} options={opts(types)} placeholder="Todos os tipos" />
        <RefSelect value={f.contact} onChange={(v) => set("contact", v)} options={contacts} placeholder="Todos os clientes" />
        {withCampaign && <RefSelect value={f.campaign} onChange={(v) => set("campaign", v)} options={campaigns} placeholder="Todas as campanhas" />}
        <RefSelect value={f.channel} onChange={(v) => set("channel", v)} options={opts(CHANNELS)} placeholder="Todos os canais" />
        {withStatus && <RefSelect value={f.status} onChange={(v) => set("status", v)} options={STATUS_OPTS} placeholder="Todos os status" />}
        <Input type="date" aria-label="De" value={f.from} onChange={(e) => set("from", e.target.value)} className="h-9" />
        <Input type="date" aria-label="Até" value={f.to} onChange={(e) => set("to", e.target.value)} className="h-9" />
      </div>
    </div>
  );
}
