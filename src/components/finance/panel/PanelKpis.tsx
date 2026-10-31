import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface PanelKpi {
  label: string; value: number; hint?: string; prev?: number; icon: LucideIcon; tone: Tone; to?: string; wide?: boolean;
}
export type Tone = "green" | "red" | "blue" | "cyan" | "violet" | "amber";

const TONES: Record<Tone, { card: string; icon: string }> = {
  green:  { card: "from-success/15 border-success/20",           icon: "text-success" },
  red:    { card: "from-destructive/12 border-destructive/20",   icon: "text-destructive" },
  blue:   { card: "from-primary/12 border-primary/20",           icon: "text-primary" },
  cyan:   { card: "from-brand-cyan/15 border-brand-cyan/25",     icon: "text-brand-cyan" },
  violet: { card: "from-violet-500/12 border-violet-500/20",     icon: "text-violet-500" },
  amber:  { card: "from-warning/15 border-warning/25",           icon: "text-warning" },
};


function Trend({ now, prev }: { now: number; prev: number }) {
  if (!prev) return <span className="text-[11px] text-muted-foreground">Mês anterior: {brl(prev)}</span>;
  const pct = Math.round(((now - prev) / Math.abs(prev)) * 100);
  return <span className="text-[11px] text-muted-foreground">Mês anterior: {brl(prev)} · <b className="text-foreground">{pct > 0 ? "+" : ""}{pct}%</b></span>;
}

function KpiCard({ k, loading }: { k: PanelKpi; loading: boolean }) {
  const t = TONES[k.tone];
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{k.label}</p>
        <span className={cn("flex size-8 items-center justify-center rounded-lg border bg-card shadow-sm", t.icon)}><k.icon className="size-4" /></span>
      </div>
      {loading ? <Skeleton className="h-7 w-28" /> : <p className={cn("font-heading text-2xl font-semibold tabular-nums", k.value < 0 && "text-destructive")}>{brl(k.value)}</p>}
      {k.hint && <p className="text-[11px] text-muted-foreground">{k.hint}</p>}
      {k.prev !== undefined && <Trend now={k.value} prev={k.prev} />}
    </>
  );
  const cls = cn("flex flex-col gap-1 rounded-xl border bg-gradient-to-br to-card p-4 shadow-sm transition", t.card, k.wide && "sm:col-span-2", k.to && "hover:shadow-md");
  return k.to ? <Link to={k.to} className={cls} aria-label={k.label}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function PanelKpis({ items, loading }: { items: PanelKpi[]; loading: boolean }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{items.map((k) => <KpiCard key={k.label} k={k} loading={loading} />)}</div>;
}
