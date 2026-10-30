import type { DragEvent } from "react";
import { MessageCircle } from "lucide-react";
import type { Contact, Deal } from "@/integrations/supabase/types";
import { TEMPERATURE, waLink } from "@/lib/crm";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 864e5));

function DealValue({ deal }: { deal: Deal }) {
  if (deal.recurring_value) return <span className="font-medium text-foreground">{brl(Number(deal.recurring_value))}/mês</span>;
  if (deal.value) return <span className="font-medium text-foreground">{brl(Number(deal.value))}</span>;
  return null;
}

/** Card de oportunidade: arrastável entre etapas; clique abre a ficha do contato. */
export function DealCard({ deal, contact, onOpen }: { deal: Deal; contact?: Contact; onOpen: () => void }) {
  const wa = waLink(contact?.whatsapp ?? contact?.phone);
  const temp = contact?.temperature ? TEMPERATURE[contact.temperature] : null;
  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("text/deal", deal.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div draggable onDragStart={onDragStart} onClick={onOpen}
      className="group cursor-pointer rounded-lg border bg-card p-3 shadow-sm transition-shadow hover:border-primary/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button type="button" className="block max-w-full truncate text-left text-sm font-semibold hover:underline"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}>{deal.title}</button>
          {contact && contact.name !== deal.title && <p className="truncate text-xs text-muted-foreground">{contact.name}</p>}
        </div>
        {temp && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", temp.tone)}>{temp.label}</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <DealValue deal={deal} />
        {contact?.source && <span>{contact.source}</span>}
        <span>{daysSince(deal.created_at)}d no funil</span>
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} aria-label={`WhatsApp de ${deal.title}`}
            className="ml-auto inline-flex items-center gap-1 text-success hover:underline">
            <MessageCircle className="size-3.5" />WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
