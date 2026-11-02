import type { CashDay } from "@/lib/cashflow";
import { compactNumber } from "@/lib/overview";
import { localISODate } from "@/lib/format";
import { cn } from "@/lib/utils";

const WEEK = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function Day({ d, onOpen }: { d: CashDay; onOpen: (d: CashDay) => void }) {
  const negative = d.balance != null && d.balance < 0;
  const today = d.date === localISODate();
  return (
    <button type="button" onClick={() => onOpen(d)} aria-label={`Dia ${Number(d.date.slice(8))}${negative ? ", saldo negativo" : ""}`}
      className={cn("flex min-h-24 flex-col items-stretch gap-0.5 p-1.5 text-left transition hover:bg-accent/60",
        d.inMonth ? "bg-card" : "bg-muted/40 text-muted-foreground", negative && d.inMonth && "bg-destructive/10 hover:bg-destructive/15",
        today && "ring-2 ring-inset ring-primary")}>
      <span className={cn("text-[11px] font-semibold", today ? "text-primary" : "text-muted-foreground")}>{Number(d.date.slice(8))}</span>
      {d.in > 0 && <span className="text-[11px] font-medium tabular-nums text-success">+{compactNumber(d.in)}</span>}
      {d.out > 0 && <span className="text-[11px] font-medium tabular-nums text-destructive">−{compactNumber(d.out)}</span>}
      {d.balance != null && (
        <span className={cn("mt-auto text-xs font-semibold tabular-nums", negative ? "text-destructive" : "text-foreground")}>
          {compactNumber(d.balance)}
        </span>
      )}
    </button>
  );
}

/** Calendário do mês: entradas e saídas de cada dia e o saldo projetado no fim do dia. */
export function CashCalendar({ weeks, onOpen }: { weeks: CashDay[][]; onOpen: (d: CashDay) => void }) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[700px] grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border" role="grid" aria-label="Calendário de fluxo de caixa">
        {WEEK.map((w) => <p key={w} className="bg-muted px-2 py-1.5 text-center text-[11px] font-semibold uppercase text-muted-foreground">{w}</p>)}
        {weeks.flat().map((d) => <Day key={d.date} d={d} onOpen={onOpen} />)}
      </div>
    </div>
  );
}
