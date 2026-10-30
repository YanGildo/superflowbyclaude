import { Card, CardContent } from "@/components/ui/card";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Linha de 4 totais em R$ no topo das telas do financeiro. */
export function Summary({ items }: { items: { label: string; value: number; tone?: "good" | "bad" | "muted"; hint?: string }[] }) {
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((i) => (
        <Card key={i.label}><CardContent className="p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{i.label}</p>
          <p className={cn("mt-1 font-heading text-xl font-semibold tabular-nums",
            i.tone === "good" && "text-success", i.tone === "bad" && "text-destructive", i.tone === "muted" && "text-muted-foreground")}>
            {brl(i.value)}
          </p>
          {i.hint && <p className="text-xs text-muted-foreground">{i.hint}</p>}
        </CardContent></Card>
      ))}
    </div>
  );
}
