import { useState } from "react";
import { CalendarCheck, Flame, Package, Plus, ShoppingCart, Target, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Bar, Stat } from "@/components/personal/Bits";
import { useTtsDays, useTtsProducts, useTtsSettings, useTtsVideos } from "@/hooks/usePersonal";
import { brl } from "@/lib/format";
import { n1 } from "@/lib/formFields";
import { lastDays, monthPace, postingStreak, productRanking, TTS_DEFAULTS, todayISO } from "@/lib/tiktokShop";
import { cn } from "@/lib/utils";
import { TtsDayDialog } from "./TtsDayDialog";

function Chart({ data }: { data: ReturnType<typeof lastDays> }) {
  const max = Math.max(1, ...data.map((d) => d.commission));
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="mb-3 text-sm font-medium">Comissão dos últimos 14 dias</p>
      <div className="flex h-32 items-end gap-1" aria-label="Gráfico de comissão por dia">
        {data.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1" title={`${d.label}: ${brl(d.commission)} · ${d.videos} vídeo(s)`}>
            <div className={cn("w-full rounded-t bg-primary/80", d.commission === 0 && "bg-muted")} style={{ height: `${Math.max(4, (d.commission / max) * 100)}%` }} />
            <span className="text-[9px] text-muted-foreground">{d.label.slice(0, 2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Bottom({ top, queue, perDayGoal, go }: { top: ReturnType<typeof productRanking>; queue: number; perDayGoal: number; go: (t: string) => void }) {
  const s = { videos_per_day_goal: perDayGoal };
  return (
    <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-2 text-sm font-medium">Produtos que mais deram comissão</p>
          {top.length === 0 ? <p className="text-sm text-muted-foreground">Lance as vendas nos vídeos para ver quais produtos puxam mais.</p> : (
            <ul className="divide-y text-sm">{top.map((r) => (
              <li key={r.product.id} className="flex justify-between gap-2 py-1.5"><span className="truncate">{r.product.name}</span><span className="shrink-0 text-muted-foreground">{r.orders} venda(s) · {brl(r.commission)}</span></li>
            ))}</ul>
          )}
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => go("produtos")}>Ver produtos</Button>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-2 text-sm font-medium">Fila de vídeos</p>
          <p className="text-sm text-muted-foreground">{queue} vídeo(s) entre ideia e edição. Para postar {s.videos_per_day_goal}/dia, tenha pelo menos {s.videos_per_day_goal * 3} na fila (3 dias de folga).</p>
          <Bar pct={(queue / Math.max(1, s.videos_per_day_goal * 3)) * 100} className={queue < s.videos_per_day_goal * 3 ? "bg-warning" : "bg-success"} />
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => go("videos")}>Ver vídeos</Button>
        </div>
    </div>
  );
}

/** Painel: meta do mês, quanto falta por dia e o que precisa fazer hoje. */
export function TtsPanel({ go }: { go: (tab: string) => void }) {
  const { q } = useTtsSettings();
  const days = useTtsDays().data ?? [];
  const products = useTtsProducts().data ?? [];
  const videos = useTtsVideos().data ?? [];
  const [open, setOpen] = useState(false);
  const s = q.data ?? { ...TTS_DEFAULTS, workspace_id: "" };
  const p = monthPace(days, s);
  const streak = postingStreak(days);
  const today = days.find((d) => d.day === todayISO());
  const ahead = p.done >= p.expectedByToday;
  const top = productRanking(products, videos).filter((r) => r.commission > 0 || r.orders > 0).slice(0, 5);
  const queue = videos.filter((v) => v.status !== "postado").length;
  const todayText = today ? `Lançado hoje: ${today.videos_posted} vídeo(s), ${brl(Number(today.commission))} de comissão.` : "Você ainda não lançou o dia de hoje.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-primary/5 p-4">
        <div>
          <p className="font-heading text-lg font-semibold">Hoje: {n1(Math.ceil(p.videosPerDay), 0)} vídeo(s) e {n1(p.ordersPerDay)} venda(s) para ficar no ritmo</p>
          <p className="text-sm text-muted-foreground">{todayText} Meta de postagem: {s.videos_per_day_goal} vídeo(s)/dia.</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="size-4" />Lançar o dia</Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Target} label="Meta do mês (comissão)" value={brl(p.done)} hint={`de ${brl(p.goal)} · ${n1(p.pct, 0)}%`}>
          <Bar pct={p.pct} />
          <p className={cn("mt-1.5 text-xs", ahead ? "text-success" : "text-warning")}>{ahead ? "No ritmo ou à frente" : `Atrás do ritmo: deveria ter ${brl(p.expectedByToday)}`}</p>
        </Stat>
        <Stat icon={CalendarCheck} label="Falta por dia" value={brl(p.perDay)} hint={`${p.daysLeft} dia(s) restantes · falta ${brl(p.remaining)}`} />
        <Stat icon={ShoppingCart} label="Vendas por dia" value={n1(p.ordersPerDay)} hint={`${brl(p.commissionPerOrder)} de comissão por venda ${p.orders > 0 ? "(sua média)" : "(estimativa)"}`} />
        <Stat icon={Video} label="Vídeos por dia" value={n1(p.videosPerDay)} hint={`${n1(p.ordersPerVideo, 2)} venda(s) por vídeo ${p.videos >= 10 ? "(sua média)" : "(estimativa)"}`} />
      </div>
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Chart data={lastDays(days)} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Stat icon={Flame} label="Sequência postando" value={`${streak} dia(s)`} hint={`${p.activeDays} dia(s) ativos no mês`} tone={streak >= 3 ? "good" : undefined} />
          <Stat icon={Package} label="Mês até agora" value={brl(p.gmv)} hint={`vendido · ${p.orders} venda(s) · ${p.videos} vídeo(s) · ${p.lives} live(s)`} />
        </div>
      </div>
      <Bottom top={top} queue={queue} perDayGoal={s.videos_per_day_goal} go={go} />
      <TtsDayDialog open={open} onOpenChange={setOpen} day={today ?? null} days={days} />
    </div>
  );
}
