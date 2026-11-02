import { useState } from "react";
import { Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Donut3D, Legend } from "@/components/finance/panel/Donut3D";
import { useFinMutations } from "@/hooks/useFinance";
import { useNetWorth } from "@/hooks/useNetWorth";
import type { FinAsset } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";
import { shortDate } from "@/lib/labels";
import { ASSET_KIND, historySeries, type NetWorth } from "@/lib/netWorth";
import { compactNumber } from "@/lib/overview";
import { cn } from "@/lib/utils";
import { AssetDialog } from "./AssetDialog";

const TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };

function Hero({ nw, onRecord, recording }: { nw: NetWorth; onRecord: () => void; recording: boolean }) {
  const rows: [string, number, string][] = [
    ["Contas", nw.accounts, ""], ["Bens", nw.goods, ""], ["Parcelas de dívidas", -nw.installments || 0, nw.installments ? "text-destructive" : ""], ["Fatura atual dos cartões", -nw.cards || 0, nw.cards ? "text-destructive" : ""],
  ];
  return (
    <Card className="flex flex-wrap items-center gap-6 bg-gradient-to-br from-success/10 via-card to-primary/5 p-5">
      <div className="min-w-[220px] flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patrimônio líquido</p>
        <p className={cn("font-heading text-4xl font-semibold tabular-nums", nw.net < 0 && "text-destructive")}>{brl(nw.net)}</p>
        <p className="text-xs text-muted-foreground">Ativos {brl(nw.assetsTotal)} − dívidas {brl(nw.debtsTotal)}{nw.reserved > 0 && ` · dos quais ${brl(nw.reserved)} reservados`}</p>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {rows.map(([l, v, tone]) => <div key={l} className="contents"><span className="text-muted-foreground">{l}</span><span className={cn("text-right font-medium tabular-nums", tone)}>{brl(v)}</span></div>)}
      </div>
      <Button variant="outline" size="sm" onClick={onRecord} disabled={recording}>{recording ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Registrar agora</Button>
    </Card>
  );
}

function AssetRow({ a, onEdit }: { a: FinAsset; onEdit: () => void }) {
  const { remove } = useFinMutations("fin_assets");
  return (
    <div className="group flex items-center gap-3 border-b px-3 py-2 last:border-0">
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{a.name}</p><p className="text-[11px] text-muted-foreground">{ASSET_KIND[a.kind]} · valor de {shortDate(a.value_date)}</p></div>
      <span className="text-sm font-semibold tabular-nums">{brl(Number(a.value))}</span>
      <Button size="icon" variant="ghost" className="size-8" aria-label={`Editar ${a.name}`} onClick={onEdit}><Pencil className="size-4" /></Button>
      <Button size="icon" variant="ghost" className="size-8 hover:text-destructive" aria-label={`Remover ${a.name}`} onClick={() => remove.mutate(a.id)}><Trash2 className="size-4" /></Button>
    </div>
  );
}

function HistoryChart({ data }: { data: ReturnType<typeof historySeries> }) {
  return (
    <Card>
      <CardHeader className="pb-1"><CardTitle className="text-base">Evolução mês a mês</CardTitle></CardHeader>
      <CardContent className="h-64 pl-0">
        {data.length < 2 ? <p className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">O registro de cada mês é guardado sozinho. A linha aparece a partir do segundo mês ({data.length ? "1 mês registrado" : "nenhum ainda"}).</p> : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={TICK} />
              <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={compactNumber} tick={TICK} />
              <Tooltip formatter={(v: number) => brl(v)} contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="Patrimônio" stroke="#0D47A1" strokeWidth={3} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Dívidas" stroke="#E11D48" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/** Patrimônio líquido: número grande, gráficos, bens fora do banco e histórico mensal. */
export function NetWorthTab() {
  const { nw, history, assets, record, recording } = useNetWorth();
  const [dlg, setDlg] = useState<{ open: boolean; asset: FinAsset | null }>({ open: false, asset: null });
  return (
    <div className="space-y-4">
      <Hero nw={nw} onRecord={record} recording={recording} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader className="pb-1"><CardTitle className="text-base">Onde está o patrimônio</CardTitle></CardHeader>
          <CardContent className="space-y-2"><Donut3D id="nw-assets" data={nw.assetSlices} empty="Sem ativos" center={<span className="font-heading text-lg font-semibold">{brl(nw.assetsTotal)}</span>} /><Legend items={nw.assetSlices} /></CardContent></Card>
        <Card><CardHeader className="pb-1"><CardTitle className="text-base">Ativos x dívidas</CardTitle></CardHeader>
          <CardContent className="space-y-2"><Donut3D id="nw-split" data={nw.splitSlices} empty="Sem dados" center={<span className={cn("font-heading text-lg font-semibold", nw.net < 0 && "text-destructive")}>{brl(nw.net)}</span>} /><Legend items={nw.splitSlices} /></CardContent></Card>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">Bens fora do banco</CardTitle>
          <Button size="sm" onClick={() => setDlg({ open: true, asset: null })}><Plus className="size-4" />Novo bem</Button>
        </CardHeader>
        <CardContent className="p-0">
          {assets.length === 0 ? <p className="px-6 pb-5 text-sm text-muted-foreground">Investimentos, imóvel, carro… Cadastre com o valor atual.</p>
            : assets.map((a) => <AssetRow key={a.id} a={a} onEdit={() => setDlg({ open: true, asset: a })} />)}
        </CardContent>
      </Card>
      <HistoryChart data={historySeries(history)} />
      <AssetDialog open={dlg.open} asset={dlg.asset} onOpenChange={(o) => setDlg((d) => ({ ...d, open: o }))} />
    </div>
  );
}
