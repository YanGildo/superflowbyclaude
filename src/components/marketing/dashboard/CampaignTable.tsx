import { Card } from "@/components/ui/card";
import { useMarketingDialogs } from "@/hooks/useMarketingDialogs";
import type { Campaign } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";
import { CAMPAIGN_STATUS, campaignMetrics } from "@/lib/marketing";
import { cn } from "@/lib/utils";

const num = (n: number) => n.toLocaleString("pt-BR");
const money = (n: number | null) => (n == null ? "—" : brl(n));
const pct = (n: number | null) => (n == null ? "—" : `${n.toFixed(2)}%`);
const HEAD = ["Campanha", "Status", "Investido", "Impressões", "Cliques", "CTR", "CPC", "Leads", "CPL", "Vendas", "Receita", "ROAS"];

function Row({ c }: { c: Campaign }) {
  const { openCampaign } = useMarketingDialogs();
  const m = campaignMetrics(c);
  const cells = [brl(Number(c.spend)), num(c.impressions), num(c.clicks), pct(m.ctr), money(m.cpc), num(c.leads), money(m.cpl),
    num(c.sales), brl(Number(c.revenue)), m.roas == null ? "—" : `${m.roas.toFixed(1)}x`];
  return (
    <tr className="border-b last:border-0 hover:bg-accent/40">
      <td className="px-3 py-2">
        <button type="button" onClick={() => openCampaign(c)} className="text-left font-medium hover:underline">{c.name}</button>
        <p className="text-[11px] text-muted-foreground">{c.platform}</p>
      </td>
      <td className="px-3 py-2"><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", CAMPAIGN_STATUS[c.status].tone)}>{CAMPAIGN_STATUS[c.status].label}</span></td>
      {cells.map((v, i) => <td key={HEAD[i + 2]} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{v}</td>)}
    </tr>
  );
}

export function CampaignTable({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-xs text-muted-foreground">
            {HEAD.map((h, i) => <th key={h} className={cn("px-3 py-2 font-medium", i < 2 ? "text-left" : "text-right")}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{campaigns.map((c) => <Row key={c.id} c={c} />)}</tbody>
      </table>
    </Card>
  );
}
