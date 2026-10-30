import { useState, type FormEvent } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefSelect } from "@/components/common/RefSelect";
import { TaskCheck } from "@/components/tasks/TaskRow";
import { useContacts, useCrmMutations, useJourney } from "@/hooks/useCrm";
import type { Contact, JourneyItem, JourneyMoment } from "@/integrations/supabase/types";
import { JOURNEY } from "@/lib/crm";
import { shortDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

type Moment = (typeof JOURNEY)[number];

function JourneyRow({ item, contact }: { item: JourneyItem; contact?: Contact }) {
  const { patch, remove } = useCrmMutations("journey_items");
  return (
    <div className="group flex items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-accent/50">
      <TaskCheck done={item.done} onToggle={() => patch.mutate({ id: item.id, values: { done: !item.done } })} label={item.title} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", item.done && "text-muted-foreground line-through")}>{item.title}</p>
        {(contact || item.due_date) && (
          <p className="text-[11px] text-muted-foreground">{[contact?.name, item.due_date && shortDate(item.due_date)].filter(Boolean).join(" · ")}</p>
        )}
      </div>
      <button type="button" aria-label={`Remover ${item.title}`} onClick={() => remove.mutate(item.id)}
        className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"><Trash2 className="size-3.5" /></button>
    </div>
  );
}

function AddItem({ moment, contactId, nextPos }: { moment: JourneyMoment; contactId: string | null; nextPos: number }) {
  const { save } = useCrmMutations("journey_items");
  const [title, setTitle] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    save.mutate({ moment, title: title.trim(), contact_id: contactId, position: nextPos });
    setTitle("");
  };
  return (
    <form onSubmit={submit} className="flex items-center gap-1.5 rounded-md border border-dashed px-2">
      <Plus className="size-4 shrink-0 text-primary" />
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Novo processo" aria-label={`Novo processo em ${moment}`}
        className="h-8 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0" />
    </form>
  );
}

function MomentColumn({ m, items, contacts, contactId }: { m: Moment; items: JourneyItem[]; contacts: Map<string, Contact>; contactId: string | null }) {
  const { save } = useCrmMutations("journey_items");
  const pending = items.filter((i) => !i.done).length;
  const useTemplate = () => {
    const have = new Set(items.map((i) => i.title));
    m.template.filter((t) => !have.has(t)).forEach((title, i) => save.mutate({ moment: m.id, title, contact_id: contactId, position: items.length + i }));
  };
  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-heading font-semibold">{m.title}</h3>
          <p className="text-xs text-muted-foreground">{m.hint}</p>
        </div>
        <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold">{pending} pendente{pending === 1 ? "" : "s"}</span>
      </header>
      <div className="flex-1 space-y-0.5">
        {items.length === 0 && <p className="rounded-md border border-dashed py-5 text-center text-xs text-muted-foreground">Nenhum processo ainda.</p>}
        {items.map((i) => <JourneyRow key={i.id} item={i} contact={i.contact_id ? contacts.get(i.contact_id) : undefined} />)}
      </div>
      <AddItem moment={m.id} contactId={contactId} nextPos={items.length} />
      {items.length < m.template.length && (
        <Button variant="ghost" size="sm" className="justify-start text-xs" onClick={useTemplate}><Sparkles className="size-3.5 text-primary" />Usar modelo sugerido</Button>
      )}
    </section>
  );
}

export function JourneyTab() {
  const { data: items = [] } = useJourney();
  const { data: contacts = [] } = useContacts();
  const [contactId, setContactId] = useState<string | null>(null);
  const byId = new Map(contacts.map((c) => [c.id, c]));
  const scoped = items.filter((i) => (contactId ? i.contact_id === contactId : true));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">Jornada do Cliente</h2>
          <p className="text-sm text-muted-foreground">Processos organizados em 4 momentos: antes de fechar, onboarding, execução mensal e revisão.</p>
        </div>
        <div className="w-64">
          <RefSelect value={contactId} onChange={setContactId} options={contacts.filter((c) => c.status !== "perdido")} placeholder="Todos os clientes" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {JOURNEY.map((m) => (
          <MomentColumn key={m.id} m={m} items={scoped.filter((i) => i.moment === m.id)} contacts={byId} contactId={contactId} />
        ))}
      </div>
    </div>
  );
}
