import type { ChatThread, Contact } from "@/integrations/supabase/types";
import { CONTACT_STATUS } from "@/lib/crm";
import { cn } from "@/lib/utils";

const hour = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export function ThreadList({ threads, contacts, activeId, onSelect }: {
  threads: ChatThread[]; contacts: Map<string, Contact>; activeId: string | null; onSelect: (id: string) => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col rounded-xl border bg-card">
      <p className="border-b px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Conversas ({threads.length})</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {threads.length === 0 && <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma conversa ainda.</p>}
        {threads.map((t) => {
          const c = contacts.get(t.contact_id);
          const st = c ? CONTACT_STATUS[c.status] : null;
          return (
            <button key={t.id} type="button" onClick={() => onSelect(t.id)}
              className={cn("w-full border-b px-3 py-2.5 text-left transition-colors hover:bg-accent/60", activeId === t.id && "bg-primary/10")}>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{c?.name ?? "Contato removido"}</p>
                <span className="shrink-0 text-[10px] text-muted-foreground">{hour(t.last_message_at)}</span>
              </div>
              {st && <span className={cn("mt-0.5 inline-block rounded-full px-1.5 py-px text-[10px] font-medium", st.tone)}>{st.label}</span>}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
