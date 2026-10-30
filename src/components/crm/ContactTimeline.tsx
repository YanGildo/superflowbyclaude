import { CalendarClock, MessageSquare, Trophy } from "lucide-react";
import { useContactActivities } from "@/hooks/useCrm";
import { ACTIVITY_STATUS } from "@/lib/crm";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** Histórico do contato: registros de contato e conversões, do mais novo para o mais antigo. */
export function ContactTimeline({ contactId }: { contactId: string }) {
  const { data: items = [], isLoading } = useContactActivities(contactId);
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>;
  return (
    <ol className="relative space-y-3 border-l pl-4">
      {items.map((a) => {
        const Icon = a.category === "conversao" ? Trophy : MessageSquare;
        const st = a.outcome ? ACTIVITY_STATUS[a.outcome] : undefined;
        return (
          <li key={a.id} className="relative">
            <span className="absolute -left-[25px] top-0.5 flex size-[18px] items-center justify-center rounded-full border bg-card">
              <Icon className={cn("size-2.5", a.category === "conversao" ? "text-success" : "text-primary")} />
            </span>
            <p className="text-sm font-medium">{a.type}{a.channel && <span className="font-normal text-muted-foreground"> · {a.channel}</span>}</p>
            {a.summary && <p className="text-sm text-muted-foreground">{a.summary}</p>}
            <p className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
              <span>{when(a.at)}</span>
              {a.value != null && <span className="font-medium text-foreground">{brl(Number(a.value))}</span>}
              {st && a.category === "contato" && <span className={st.tone}>{st.label}</span>}
              {a.next_follow_up_at && <span className="inline-flex items-center gap-1"><CalendarClock className="size-3" />follow-up {new Date(a.next_follow_up_at + "T12:00:00").toLocaleDateString("pt-BR")}</span>}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
