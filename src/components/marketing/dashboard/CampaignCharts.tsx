import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Campaign } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";
import { byPlatform } from "@/lib/marketing";
import { compactNumber } from "@/lib/overview";

const TOOLTIP = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 };
const TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex gap-4 px-6 pb-4 text-xs text-muted-foreground">
      {items.map(([label, color]) => <span key={label} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm" style={{ background: color }} />{label}</span>)}
    </div>
  );
}

const SPEND = "hsl(var(--brand-blue))";
const REVENUE = "hsl(var(--success))";
const LEADS = "hsl(var(--brand-cyan))";

/** Investimento x receita por campanha e leads por plataforma. */
export function CampaignCharts({ campaigns }: { campaigns: Campaign[] }) {
  const perCampaign = campaigns.slice(0, 8).map((c) => ({
    nome: c.name.length > 18 ? `${c.name.slice(0, 17)}…` : c.name, Investido: Number(c.spend), Receita: Number(c.revenue),
  }));
  const perPlatform = byPlatform(campaigns).map((p) => ({ plataforma: p.platform, Leads: p.leads, Vendas: p.sales }));
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader className="pb-2"><CardTitle className="text-base">Investido x receita por campanha</CardTitle></CardHeader>
        <CardContent className="h-64 pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perCampaign} barGap={4} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="nome" tickLine={false} axisLine={false} tick={TICK} interval={0} />
              <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={compactNumber} tick={TICK} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(v: number) => brl(v)} contentStyle={TOOLTIP} />
              <Bar dataKey="Investido" fill={SPEND} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Receita" fill={REVENUE} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
        <Legend items={[["Investido", SPEND], ["Receita", REVENUE]]} />
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-base">Leads e vendas por plataforma</CardTitle></CardHeader>
        <CardContent className="h-64 pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={perPlatform} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
              <XAxis type="number" tickLine={false} axisLine={false} tick={TICK} allowDecimals={false} />
              <YAxis type="category" dataKey="plataforma" tickLine={false} axisLine={false} width={84} tick={TICK} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} contentStyle={TOOLTIP} />
              <Bar dataKey="Leads" fill={LEADS} radius={[0, 4, 4, 0]} maxBarSize={18} />
              <Bar dataKey="Vendas" fill={REVENUE} radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
        <Legend items={[["Leads", LEADS], ["Vendas", REVENUE]]} />
      </Card>
    </div>
  );
}
