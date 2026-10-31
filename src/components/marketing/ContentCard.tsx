import { CalendarDays, Trash2, Video } from "lucide-react";
import { useCrmMutations } from "@/hooks/useCrm";
import { useMarketingDialogs } from "@/hooks/useMarketingDialogs";
import type { ContentItem } from "@/integrations/supabase/types";
import { PRIORITY, shortDate } from "@/lib/labels";
import { CONTENT_STAGE, contentDate, isVideo } from "@/lib/marketing";
import { cn } from "@/lib/utils";

export function StageBadge({ item }: { item: Pick<ContentItem, "stage"> }) {
  const s = CONTENT_STAGE[item.stage];
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", s.tone)}>{s.label}</span>;
}

function Meta({ item, clientName }: { item: ContentItem; clientName?: string }) {
  const date = contentDate(item);
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
      <span className="font-medium text-foreground/80">{item.kind}</span>
      {item.channel && <span>· {item.channel}</span>}
      {clientName && <span>· {clientName}</span>}
      {date && <span className="flex items-center gap-1">· <CalendarDays className="size-3" />{shortDate(date)}</span>}
    </p>
  );
}

/** Cartão de conteúdo (kanban) — arrastável entre etapas. */
export function ContentCard({ item, clientName }: { item: ContentItem; clientName?: string }) {
  const { openContent } = useMarketingDialogs();
  return (
    <button type="button" draggable onDragStart={(e) => e.dataTransfer.setData("text/content-id", item.id)}
      onClick={() => openContent(item)} aria-label={`Abrir ${item.title}`}
      className="w-full space-y-1.5 rounded-lg border bg-card p-2.5 text-left shadow-sm transition hover:border-primary/40 hover:shadow">
      <div className="flex items-start gap-1.5">
        {isVideo(item) && <Video className="mt-0.5 size-3.5 shrink-0 text-primary" />}
        <p className="flex-1 text-sm font-medium leading-snug">{item.title}</p>
        <span className={cn("mt-1 size-2 shrink-0 rounded-full", PRIORITY[item.priority].dot)} title={`Prioridade ${PRIORITY[item.priority].label}`} />
      </div>
      <Meta item={item} clientName={clientName} />
    </button>
  );
}

/** Linha de conteúdo (lista). */
export function ContentRow({ item, clientName }: { item: ContentItem; clientName?: string }) {
  const { openContent } = useMarketingDialogs();
  const { remove } = useCrmMutations("content_items");
  return (
    <div className="group flex items-center gap-3 border-b px-3 py-2.5 last:border-0 hover:bg-accent/40">
      <button type="button" onClick={() => openContent(item)} className="min-w-0 flex-1 space-y-0.5 text-left">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <Meta item={item} clientName={clientName} />
      </button>
      <StageBadge item={item} />
      <button type="button" aria-label={`Excluir ${item.title}`} onClick={() => remove.mutate(item.id)}
        className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100 focus:opacity-100">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
