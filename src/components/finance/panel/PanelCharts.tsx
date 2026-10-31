import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brl } from "@/lib/format";
import { shade, type FlowPoint, type Slice } from "@/lib/finPanel";
import { compactNumber } from "@/lib/overview";
import { cn } from "@/lib/utils";
import { Donut3D, Legend } from "./Donut3D";

const TOOLTIP = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 };
const TICK = { fontSize: 11, fill: "hsl(var(--muted-foreground))" };
const IN = "#059669";
const OUT = "#E11D48";

function ChartCard({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-1">
        <CardTitle className="text-base">{title}</CardTitle>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </CardHeader>
      <CardContent className="space-y-2">{children}</CardContent>
    </Card>
  );
}

/** Quanto sobrou do que entrou: parte gasta x restante. */
export function RemainingCard({ entradas, saidas }: { entradas: number; saidas: number }) {
  const restante = entradas - saidas;
  const data: Slice[] = restante >= 0
    ? [{ name: "Gasto", value: saidas, color: OUT }, { name: "Restante", value: restante, color: IN }]
    : [{ name: "Entradas", value: entradas, color: IN }, { name: "Acima do que entrou", value: -restante, color: OUT }];
  const pct = entradas > 0 ? Math.round((restante / entradas) * 100) : null;
  return (
    <ChartCard title="Restante para gastar" hint="Entradas x saídas">
      <Donut3D id="remaining" data={entradas || saidas ? data : []} center={(
        <>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Restante</span>
          <span className={cn("font-heading text-xl font-semibold tabular-nums", restante < 0 ? "text-destructive" : "text-success")}>{brl(restante)}</span>
          <span className="text-[11px] text-muted-foreground">{pct == null ? "Sem dados" : `${pct}% das entradas`}</span>
        </>
      )} />
      <Legend items={[{ name: "Entradas", value: entradas, color: IN }, { name: "Saídas", value: saidas, color: OUT }]} />
    </ChartCard>
  );
}

/** Colunas com "volume": a face e uma lateral mais escura. */
function Bar3D(props: { x?: number; y?: number; width?: number; height?: number; fill?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, fill = "#000" } = props;
  if (height <= 0) return null;
  const d = Math.min(6, width / 3);
  return (
    <g>
      <path d={`M${x + width},${y} l${d},${-d} v${height} l${-d},${d} z`} fill={shade(fill, 0.35)} />
      <path d={`M${x},${y} l${d},${-d} h${width} l${-d},${d} z`} fill={shade(fill, -0.15)} opacity={0.9} />
      <rect x={x} y={y} width={width} height={height} fill={fill} />
    </g>
  );
}

const FLOW: [keyof FlowPoint, string][] = [["A pagar (previsto)", "#FDA4AF"], ["Pago", OUT], ["A receber (previsto)", "#6EE7B7"], ["Recebido", IN]];

export function BillsFlowCard({ data }: { data: FlowPoint[] }) {
  const empty = data.every((p) => FLOW.every(([k]) => !p[k]));
  return (
    <ChartCard title="Fluxo de contas" hint="Planejado x real">
      {empty ? <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">Cadastre contas a pagar ou a receber para ver.</p> : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={3} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={TICK} />
              <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={compactNumber} tick={TICK} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(v: number) => brl(v)} contentStyle={TOOLTIP} />
              {FLOW.map(([k, c]) => <Bar key={k} dataKey={k} fill={c} maxBarSize={14} shape={<Bar3D />} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <Legend items={FLOW.map(([k, c]) => ({ name: k, value: data.reduce((a, p) => a + Number(p[k] || 0), 0), color: c }))} />
    </ChartCard>
  );
}

export function AllocationCard({ data }: { data: Slice[] }) {
  const total = data.reduce((a, s) => a + s.value, 0);
  return (
    <ChartCard title="Alocação por categoria" hint={`Top ${Math.min(data.length, 6)}`}>
      <Donut3D id="alloc" data={data} empty="Sem saídas" center={(
        <>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Saídas</span>
          <span className="font-heading text-xl font-semibold tabular-nums">{brl(total)}</span>
        </>
      )} />
      <div className="space-y-1">
        {data.map((s) => (
          <div key={s.name} className="flex items-center gap-2 text-xs">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="flex-1 truncate">{s.name}</span>
            <span className="tabular-nums text-muted-foreground">{Math.round((s.value / total) * 100)}%</span>
            <span className="w-24 text-right font-medium tabular-nums">{brl(s.value)}</span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
