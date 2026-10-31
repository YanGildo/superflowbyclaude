import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface Kpi { label: string; value: string | number; icon: LucideIcon; tone?: string; hint?: string }

export function KpiGrid({ items, className }: { items: Kpi[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {items.map((k) => (
        <Card key={k.label} className="flex items-center gap-3 p-4">
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary", k.tone)}><k.icon className="size-5" /></span>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="font-heading text-xl font-semibold tabular-nums">{k.value}</p>
            {k.hint && <p className="truncate text-[11px] text-muted-foreground">{k.hint}</p>}
          </div>
        </Card>
      ))}
    </div>
  );
}
