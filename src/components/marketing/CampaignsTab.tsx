import { Link } from "react-router-dom";
import { BarChart3, Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/common/PageHeader";
import { SimpleSelect } from "@/components/common/RefSelect";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useCrmMutations } from "@/hooks/useCrm";
import { useCampaigns } from "@/hooks/useMarketing";
import { useMarketingDialogs } from "@/hooks/useMarketingDialogs";
import type { Campaign, CampaignStatus } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";
import { shortDate } from "@/lib/labels";
import { CAMPAIGN_STATUS_OPTIONS, campaignMetrics } from "@/lib/marketing";

const num = (n: number) => n.toLocaleString("pt-BR");
const money = (n: number | null) => (n == null ? "—" : brl(n));

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function CampaignCard({ c }: { c: Campaign }) {
  const { patch, remove } = useCrmMutations("campaigns");
  const { openCampaign } = useMarketingDialogs();
  const m = campaignMetrics(c);
  const period = [c.start_date && shortDate(c.start_date), c.end_date && shortDate(c.end_date)].filter(Boolean).join(" → ");
  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading font-semibold">{c.name}</p>
          <p className="text-xs text-muted-foreground">{[c.platform, c.objective, period].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="w-32"><SimpleSelect<CampaignStatus> value={c.status} onChange={(v) => patch.mutate({ id: c.id, values: { status: v } })} options={CAMPAIGN_STATUS_OPTIONS} /></div>
        <Button variant="ghost" size="icon" aria-label={`Editar ${c.name}`} onClick={() => openCampaign(c)}><Pencil className="size-4" /></Button>
        <Button variant="ghost" size="icon" aria-label={`Excluir ${c.name}`} onClick={() => remove.mutate(c.id)}><Trash2 className="size-4" /></Button>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        <Stat label="Investido" value={brl(Number(c.spend))} />
        <Stat label="Leads" value={num(c.leads)} />
        <Stat label="CPL" value={money(m.cpl)} />
        <Stat label="Vendas" value={num(c.sales)} />
        <Stat label="Receita" value={brl(Number(c.revenue))} />
        <Stat label="ROAS" value={m.roas == null ? "—" : `${m.roas.toFixed(1)}x`} />
      </div>
    </Card>
  );
}

export function CampaignsTab() {
  const { data: campaigns = [] } = useCampaigns();
  const { openCampaign } = useMarketingDialogs();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-xl font-semibold">Campanhas</h2>
          <p className="text-sm text-muted-foreground">Tráfego pago e ações orgânicas, com investimento e resultado.</p>
        </div>
        <Button variant="outline" size="sm" asChild><Link to="/marketing/campanhas-dashboard"><BarChart3 className="size-4" />Ver dashboard</Link></Button>
      </div>
      {campaigns.length
        ? <div className="grid gap-3 xl:grid-cols-2">{campaigns.map((c) => <CampaignCard key={c.id} c={c} />)}</div>
        : <EmptyState icon={Megaphone} title="Nenhuma campanha ainda" description="Cadastre suas campanhas para acompanhar CPL, vendas e ROAS."
            action={<Button size="sm" onClick={() => openCampaign()}><Plus className="size-4" />Nova campanha</Button>} />}
    </div>
  );
}
