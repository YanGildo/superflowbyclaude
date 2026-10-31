import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlarmClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Business } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";
import { shortDate } from "@/lib/labels";
import { compactNumber, type MonthPoint } from "@/lib/overview";
import { cn } from "@/lib/utils";

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
