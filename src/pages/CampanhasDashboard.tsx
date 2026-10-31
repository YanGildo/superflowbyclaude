import { useState } from "react";
import { BarChart3, DollarSign, Eye, MousePointerClick, Plus, ShoppingCart, Sparkles, TrendingUp, Users, X } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/common/PageHeader";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { Button } from "@/components/ui/button";
import { CampaignCharts } from "@/components/marketing/dashboard/CampaignCharts";
import { CampaignTable } from "@/components/marketing/dashboard/CampaignTable";
import { ConnectionsBar } from "@/components/marketing/dashboard/ConnectionsBar";
import { KpiGrid, type Kpi } from "@/components/marketing/Kpis";
import { MarketingDialogsProvider } from "@/components/marketing/MarketingDialogs";
import { opts } from "@/components/marketing/options";
import { useContacts } from "@/hooks/useCrm";
import { useCampaigns, useDemoCampaigns } from "@/hooks/useMarketing";
import { useMarketingDialogs } from "@/hooks/useMarketingDialogs";
import type { Campaign } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";
import { DEMO_TAG, PERIOD_OPTIONS, PLATFORMS, campaignMetrics, campaignTotals, inPeriod, type Period } from "@/lib/marketing";

const num = (n: number) => n.toLocaleString("pt-BR");
const money = (n: number | null) => (n == null ? "—" : brl(n));

function kpis(list: Campaign[]): Kpi[] {
  const t = campaignTotals(list);
  const m = campaignMetrics(t);
  return [
    { label: "Investido", value: brl(t.spend), icon: DollarSign },
    { label: "Impressões", value: num(t.impressions), icon: Eye, hint: `CTR ${m.ctr == null ? "—" : `${m.ctr.toFixed(2)}%`}` },
    { label: "Cliques", value: num(t.clicks), icon: MousePointerClick, hint: `CPC ${money(m.cpc)}` },
    { label: "Leads", value: num(t.leads), icon: Users, tone: "bg-info/10 text-info", hint: `CPL ${money(m.cpl)}` },
    { label: "Vendas", value: num(t.sales), icon: ShoppingCart, tone: "bg-success/10 text-success", hint: `CPA ${money(m.cpa)}` },
    { label: "Receita", value: brl(t.revenue), icon: TrendingUp, tone: "bg-success/10 text-success" },
    { label: "ROAS", value: m.roas == null ? "—" : `${m.roas.toFixed(2)}x`, icon: BarChart3, hint: "Receita ÷ investido" },
    { label: "Campanhas", value: list.length, icon: Sparkles, hint: `${list.filter((c) => c.status === "ativa").length} ativas` },
  ];
}

function useFilters() {
  const [period, setPeriod] = useState<Period>("tudo");
  const [platform, setPlatform] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const keep = (c: Campaign) => inPeriod(c, period) && (!platform || c.platform === platform) && (!account || c.contact_id === account);
  return { period, setPeriod, platform, setPlatform, account, setAccount, keep };
}

function Header({ hasDemo }: { hasDemo: boolean }) {
  const demo = useDemoCampaigns();
  const { openCampaign } = useMarketingDialogs();
  return (
    <PageHeader eyebrow="Marketing" title="Dashboard de Campanhas" description="Investimento, leads, vendas e retorno das suas campanhas."
      actions={(
        <>
          {hasDemo
            ? <Button variant="ghost" size="sm" onClick={() => demo.clear.mutate()}><X className="size-4" />Remover demonstração</Button>
            : <Button variant="outline" size="sm" onClick={() => demo.load.mutate()} disabled={demo.load.isPending}><Sparkles className="size-4" />Carregar demonstração</Button>}
          <Button size="sm" onClick={() => openCampaign()}><Plus className="size-4" />Nova campanha</Button>
        </>
      )} />
  );
}

function Dashboard() {
  const { data: all = [] } = useCampaigns();
  const { data: contacts = [] } = useContacts();
  const f = useFilters();
  const list = all.filter(f.keep);
  return (
    <div className="space-y-4">
      <Header hasDemo={all.some((c) => c.notes === DEMO_TAG)} />
      <ConnectionsBar />
      <div className="flex flex-wrap gap-2">
        <div className="w-44"><SimpleSelect<Period> value={f.period} onChange={f.setPeriod} options={PERIOD_OPTIONS} /></div>
        <div className="w-52"><RefSelect value={f.platform} onChange={f.setPlatform} options={opts(PLATFORMS)} placeholder="Todas as plataformas" /></div>
        <div className="w-52"><RefSelect value={f.account} onChange={f.setAccount} options={contacts} placeholder="Todas as contas" /></div>
      </div>
      {list.length ? (
        <>
          <KpiGrid items={kpis(list)} />
          <CampaignCharts campaigns={list} />
          <CampaignTable campaigns={list} />
        </>
      ) : (
        <EmptyState icon={BarChart3} title="Nenhuma campanha neste filtro"
          description="Cadastre uma campanha ou carregue a demonstração para ver o dashboard funcionando." />
      )}
    </div>
  );
}

export default function CampanhasDashboard() {
  return <MarketingDialogsProvider><Dashboard /></MarketingDialogsProvider>;
}
