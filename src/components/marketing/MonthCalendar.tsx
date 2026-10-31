import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentYM, localISODate, monthLabel, shiftMonth } from "@/lib/format";
import { WEEKDAYS, groupByDate, monthGrid, type CalendarEvent } from "@/lib/marketing";
import { cn } from "@/lib/utils";

function DayCell({ day, events, today }: { day: string | null; events: CalendarEvent[]; today: string }) {
  if (!day) return <div className="min-h-24 bg-muted/30" />;
  return (
    <div className={cn("min-h-24 space-y-1 bg-card p-1.5", day === today && "ring-2 ring-inset ring-primary")}>
      <p className={cn("text-[11px] font-semibold", day === today ? "text-primary" : "text-muted-foreground")}>{Number(day.slice(8))}</p>
      {events.slice(0, 4).map((e) => (
        <button key={e.id} type="button" onClick={e.onOpen} title={`${e.kind}: ${e.title}`}
          className="block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium text-white hover:opacity-90"
          style={{ background: e.color }}>
          {e.title}
        </button>
      ))}
      {events.length > 4 && <p className="px-1 text-[10px] text-muted-foreground">+{events.length - 4}</p>}
    </div>
  );
}

/** Calendário mensal simples: cada evento é uma etiqueta colorida no dia. */
export function MonthCalendar({ events, legend }: { events: CalendarEvent[]; legend?: { label: string; color: string }[] }) {
  const [ym, setYm] = useState(currentYM());
  const byDate = groupByDate(events);
  const today = localISODate();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => setYm(shiftMonth(ym, -1))}><ChevronLeft className="size-4" /></Button>
          <p className="min-w-36 text-center font-heading font-semibold capitalize">{monthLabel(ym)}</p>
          <Button variant="ghost" size="icon" aria-label="Próximo mês" onClick={() => setYm(shiftMonth(ym, 1))}><ChevronRight className="size-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setYm(currentYM())}>Hoje</Button>
        </div>
        {legend && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {legend.map((l) => <span key={l.label} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ background: l.color }} />{l.label}</span>)}
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border">
          {WEEKDAYS.map((w) => <p key={w} className="bg-muted px-2 py-1.5 text-center text-[11px] font-semibold uppercase text-muted-foreground">{w}</p>)}
          {monthGrid(ym).flat().map((d, i) => <DayCell key={d ?? `x${i}`} day={d} events={d ? byDate.get(d) ?? [] : []} today={today} />)}
        </div>
      </div>
    </div>
  );
}
