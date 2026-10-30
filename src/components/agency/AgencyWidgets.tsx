import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Contact, Deal, PipelineStage } from "@/integrations/supabase/types";
import { stageColor } from "@/lib/crm";
import { shortDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

export interface AgencyKpi { label: string; value: string | number; icon: LucideIcon; tone?: "good" | "bad" | "default"; to?: string }

const TONE: Record<NonNullable<AgencyKpi["tone"]>, string> = {
  good: "bg-success/10 text-success", bad: "bg-destructive/10 text-destructive", default: "bg-primary/10 text-primary",
};

function KpiCard({ k }: { k: AgencyKpi }) {
  const body = (
    <Card className="h-full transition-shadow hover:shadow-md">
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{k.label}</p>
          <p className={cn("mt-1 font-heading text-2xl font-semibold tabular-nums", k.tone === "bad" && "text-destructive")}>{k.value}</p>
        </div>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", TONE[k.tone ?? "default"])}><k.icon className="size-[18px]" /></span>
      </CardContent>
    </Card>
  );
  return k.to ? <Link to={k.to} className="block">{body}</Link> : body;
}

export function KpiSection({ title, kpis, loading }: { title: string; kpis: AgencyKpi[]; loading: boolean }) {
  return (
    <section className="space-y-3">
      <h2 className="brand-eyebrow">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => loading ? <Skeleton key={k.label} className="h-[88px] rounded-xl" /> : <KpiCard key={k.label} k={k} />)}
      </div>
    </section>
  );
}

/** Barras horizontais simples (serviços, demandas). */
export function RankCard({ title, empty, rows }: { title: string; empty: string; rows: { label: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2.5">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : rows.map((r) => (
          <div key={r.label} className="space-y-1">
            <div className="flex justify-between text-sm"><span className="truncate">{r.label}</span><span className="tabular-nums text-muted-foreground">{r.n}</span></div>
            <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${(r.n / max) * 100}%` }} /></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Funil resumido: quantas oportunidades em cada etapa aberta. */
export function FunnelCard({ stages, deals }: { stages: PipelineStage[]; deals: Deal[] }) {
  const open = stages.filter((s) => s.outcome !== "lost");
  const max = Math.max(1, ...open.map((s) => deals.filter((d) => d.stage_id === s.id).length));
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Funil comercial</CardTitle>
        <Link to="/comercial?aba=pipeline" className="text-xs text-primary hover:underline">Abrir pipeline</Link>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {open.map((s) => {
          const n = deals.filter((d) => d.stage_id === s.id).length;
          return (
            <div key={s.id} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 truncate text-muted-foreground">{s.name}</span>
              <div className="h-5 flex-1 rounded bg-muted/60">
                {n > 0 && <div className="flex h-full items-center rounded px-1.5 text-[10px] font-semibold text-white" style={{ width: `${Math.max(8, (n / max) * 100)}%`, background: stageColor(s) }}>{n}</div>}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/** Clientes e leads com próxima ação marcada, do mais urgente para o menos. */
export function NextActionsCard({ contacts }: { contacts: Contact[] }) {
  const list = contacts.filter((c) => c.next_action && c.status !== "perdido")
    .sort((a, b) => (a.next_contact_at ?? "9999").localeCompare(b.next_contact_at ?? "9999")).slice(0, 8);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Próximas ações</CardTitle>
        <Link to="/comercial?aba=clientes" className="text-xs text-primary hover:underline">Ver clientes</Link>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {list.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma próxima ação marcada.</p> : list.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate"><b className="font-medium">{c.name}</b> · {c.next_action}</span>
            {c.next_contact_at && <span className="shrink-0 text-xs text-muted-foreground">{shortDate(c.next_contact_at.slice(0, 10))}</span>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
