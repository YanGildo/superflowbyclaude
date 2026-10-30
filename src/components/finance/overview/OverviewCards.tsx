import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlarmClock, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Business } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";
import { shortDate } from "@/lib/labels";
import { compactNumber, type MonthPoint } from "@/lib/overview";
import { cn } from "@/lib/utils";

export function Delta({ now, before, inverse }: { now: number; before: number; inverse?: boolean }) {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  if (!pct) return <span className="text-xs text-muted-foreground">igual ao mês anterior</span>;
  const up = pct > 0, good = inverse ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", good ? "text-success" : "text-destructive")}><Icon className="size-3.5" />{Math.abs(pct)}% vs mês anterior</span>;
}

export interface OverviewKpi { label: string; v: number; extra: ReactNode; tone: string }

export function KpiRow({ kpis, loading }: { kpis: OverviewKpi[]; loading: boolean }) {
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => (
        <Card key={k.label}><CardContent className="space-y-1 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{k.label}</p>
          {loading ? <Skeleton className="h-7 w-28" /> : <p className={cn("font-heading text-2xl font-semibold tabular-nums", k.tone)}>{brl(k.v)}</p>}
          {k.extra}
        </CardContent></Card>
      ))}
    </div>
  );
}

export function TrendChart({ series }: { series: MonthPoint[] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-2"><CardTitle className="text-base">Entradas x saídas · 6 meses</CardTitle></CardHeader>
      <CardContent className="h-64 pl-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} barGap={4} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="mes" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={compactNumber} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(v: number) => brl(v)}
              contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="Entradas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Saídas" fill="hsl(var(--brand-blue))" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
      <div className="flex gap-4 px-6 pb-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-success" />Entradas</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-brand-blue" />Saídas</span>
      </div>
    </Card>
  );
}

export function CategoryBreakdown({ items, totalOut, essential }: { items: { name: string; v: number }[]; totalOut: number; essential: number }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Para onde foi o dinheiro</CardTitle></CardHeader>
      <CardContent className="space-y-2.5">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">Sem saídas neste mês.</p> : items.map((c) => (
          <div key={c.name} className="space-y-1">
            <div className="flex justify-between text-sm"><span className="truncate">{c.name}</span><span className="tabular-nums text-muted-foreground">{brl(c.v)}</span></div>
            <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(c.v / items[0].v) * 100}%` }} /></div>
          </div>
        ))}
        {totalOut > 0 && <p className="pt-1 text-xs text-muted-foreground">Gastos essenciais: {brl(essential)} ({Math.round((essential / totalOut) * 100)}% das saídas)</p>}
      </CardContent>
    </Card>
  );
}

export function BusinessResults({ items }: { items: { b: Business; e: number; s: number; r: number }[] }) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader className="pb-2"><CardTitle className="text-base">Resultado por negócio</CardTitle></CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ b, e, s, r }) => (
          <div key={b.id} className="rounded-lg border p-3">
            <p className="flex items-center gap-2 text-sm font-medium"><span className="size-2 rounded-full" style={{ background: b.color ?? "currentColor" }} />{b.name}</p>
            <p className={cn("mt-1 font-heading text-lg font-semibold tabular-nums", r < 0 ? "text-destructive" : "text-success")}>{brl(r)}</p>
            <p className="text-xs text-muted-foreground">+{brl(e)} / −{brl(s)}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export interface DueItem { id: string; title: string; date: string; amount: number }

/** Lista curta do que vence/entra nos próximos 7 dias. */
export function UpcomingCard({ title, link, empty, items, today, amountTone, className }: {
  title: string; link: string; empty: string; items: DueItem[]; today: string; amountTone: string; className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <Link to={link} className="text-xs text-primary hover:underline">Ver tudo</Link>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : items.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-1.5 truncate">{p.date < today && <AlarmClock className="size-3.5 shrink-0 text-destructive" />}{p.title}</span>
            <span className={cn("shrink-0 tabular-nums", amountTone)}>{shortDate(p.date)} · {brl(p.amount)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
