import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { currentYM, monthLabel, shiftMonth } from "@/lib/format";

export function MonthNav({ value, onChange }: { value: string; onChange: (ym: string) => void }) {
  const isCurrent = value === currentYM();
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5">
      <Button size="icon" variant="ghost" className="size-8" aria-label="Mês anterior" onClick={() => onChange(shiftMonth(value, -1))}>
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-[132px] text-center text-sm font-medium" aria-live="polite">{monthLabel(value)}</span>
      <Button size="icon" variant="ghost" className="size-8" aria-label="Próximo mês" onClick={() => onChange(shiftMonth(value, 1))}>
        <ChevronRight className="size-4" />
      </Button>
      {!isCurrent && (
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => onChange(currentYM())}>Hoje</Button>
      )}
    </div>
  );
}
