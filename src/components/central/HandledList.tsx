import { CheckCircle2 } from "lucide-react";
import { SOURCE_TAG, type ItemSource } from "@/lib/central";
import { cn } from "@/lib/utils";

/** "Já tratado hoje": o que saiu da sua frente no dia. */
export function HandledList({ items }: { items: { id: string; title: string; source: ItemSource }[] }) {
  if (!items.length) return null;
  return (
    <section className="space-y-2" aria-label="Já tratado hoje">
      <h2 className="flex items-center gap-2 font-heading font-semibold text-success"><CheckCircle2 className="size-4" />Já tratado hoje <span className="text-sm font-normal text-muted-foreground">· {items.length}</span></h2>
      <div className="flex flex-wrap gap-1.5">
        {items.map((i) => (
          <span key={i.id} className={cn("inline-flex max-w-full items-center gap-1.5 truncate rounded-full border bg-card px-2.5 py-1 text-xs")}>
            <span className={cn("rounded-full px-1.5 text-[10px] font-semibold", SOURCE_TAG[i.source].tone)}>{SOURCE_TAG[i.source].label}</span>
            <span className="truncate line-through decoration-muted-foreground/50">{i.title}</span>
          </span>
        ))}
      </div>
    </section>
  );
}
