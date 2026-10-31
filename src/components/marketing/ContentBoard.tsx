import { useState, type DragEvent } from "react";
import { Megaphone, Plus } from "lucide-react";
import { EmptyState } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useContacts, useCrmMutations } from "@/hooks/useCrm";
import { useMarketingDialogs } from "@/hooks/useMarketingDialogs";
import type { ContentItem, ContentStage } from "@/integrations/supabase/types";
import { CONTENT_STAGE, contentDate, type CalendarEvent } from "@/lib/marketing";
import type { ContentDefaults } from "@/lib/marketingForms";
import { cn } from "@/lib/utils";
import { ContentCard, ContentRow } from "./ContentCard";
import { MonthCalendar } from "./MonthCalendar";
import { ViewSwitch, type BoardView } from "./ViewSwitch";

type Names = Map<string, string>;

function Column({ stage, items, names, defaults }: { stage: ContentStage; items: ContentItem[]; names: Names; defaults?: ContentDefaults }) {
  const { patch } = useCrmMutations("content_items");
  const { openContent } = useMarketingDialogs();
  const [over, setOver] = useState(false);
  const s = CONTENT_STAGE[stage];
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const id = e.dataTransfer.getData("text/content-id");
    if (id && !items.some((i) => i.id === id)) patch.mutate({ id, values: { stage } });
  };
  return (
    <section aria-label={`Etapa ${s.label}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}
      className={cn("flex w-64 shrink-0 flex-col gap-2 rounded-xl border bg-muted/40 p-2", over && "border-primary bg-primary/5")}>
      <header className="flex items-center gap-2 px-1">
        <span className="size-2.5 rounded-full" style={{ background: s.color }} />
        <h3 className="flex-1 text-sm font-semibold">{s.label}</h3>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </header>
      <div className="flex min-h-16 flex-col gap-2">
        {items.map((i) => <ContentCard key={i.id} item={i} clientName={i.contact_id ? names.get(i.contact_id) : undefined} />)}
      </div>
      <Button variant="ghost" size="sm" className="justify-start text-xs text-muted-foreground"
        onClick={() => openContent(null, { ...defaults, stage })}><Plus className="size-3.5" />Adicionar</Button>
    </section>
  );
}

function ListView({ items, names }: { items: ContentItem[]; names: Names }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      {items.map((i) => <ContentRow key={i.id} item={i} clientName={i.contact_id ? names.get(i.contact_id) : undefined} />)}
    </div>
  );
}

/** Conteúdos em Lista, Kanban (por etapa) ou Calendário. */
export function ContentBoard({
  items, stages, defaults, dateOf = contentDate, calendarLabel, emptyText = "Nada por aqui ainda.",
}: {
  items: ContentItem[]; stages: ContentStage[]; defaults?: ContentDefaults;
  dateOf?: (c: ContentItem) => string | null; calendarLabel?: string; emptyText?: string;
}) {
  const [view, setView] = useState<BoardView>("kanban");
  const { data: contacts = [] } = useContacts();
  const { openContent } = useMarketingDialogs();
  const names: Names = new Map(contacts.map((c) => [c.id, c.name]));
  const events: CalendarEvent[] = items.flatMap((c) => {
    const date = dateOf(c);
    return date ? [{ id: c.id, date, title: c.title, color: CONTENT_STAGE[c.stage].color, kind: c.kind, onOpen: () => openContent(c) }] : [];
  });

  return (
    <div className="space-y-3">
      <ViewSwitch value={view} onChange={setView} calendarLabel={calendarLabel} />
      {view === "kanban" && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {stages.map((s) => <Column key={s} stage={s} items={items.filter((i) => i.stage === s)} names={names} defaults={defaults} />)}
        </div>
      )}
      {view === "lista" && (items.length
        ? <ListView items={items} names={names} />
        : <EmptyState icon={Megaphone} title={emptyText} action={<Button size="sm" onClick={() => openContent(null, defaults)}><Plus className="size-4" />Adicionar</Button>} />)}
      {view === "calendario" && <MonthCalendar events={events} legend={stages.map((s) => ({ label: CONTENT_STAGE[s].label, color: CONTENT_STAGE[s].color }))} />}
    </div>
  );
}
