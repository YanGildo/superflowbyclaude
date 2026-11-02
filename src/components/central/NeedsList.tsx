import { Link } from "react-router-dom";
import { AlarmClock, ArrowRight, Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/PageHeader";
import { SOURCE_TAG, type CentralItem } from "@/lib/central";
import { shortDate } from "@/lib/labels";
import { useWorkspace } from "@/lib/workspace";
import { cn } from "@/lib/utils";

function dueText(i: CentralItem) {
  if (!i.due) return "sem prazo";
  if (i.due.length > 10) return new Date(i.due).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return shortDate(i.due);
}

function Row({ i, biz }: { i: CentralItem; biz?: { name: string; color: string | null } }) {
  const tag = SOURCE_TAG[i.source];
  return (
    <Link to={i.href} className="group flex items-center gap-3 border-b px-3 py-2.5 last:border-0 hover:bg-accent/40">
      <span className={cn("w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-[11px] font-semibold", tag.tone)}>{tag.label}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{i.title}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {biz && <span className="mr-1.5 inline-flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ background: biz.color ?? "currentColor" }} />{biz.name}</span>}
          {i.detail}
        </p>
      </div>
      <span className={cn("flex shrink-0 items-center gap-1 text-xs tabular-nums", i.late ? "font-semibold text-destructive" : "text-muted-foreground")}>
        {i.late && <AlarmClock className="size-3.5" />}{dueText(i)}
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
    </Link>
  );
}

/** "Precisa de mim": uma lista só, com origem, negócio e prazo. */
export function NeedsList({ items: all }: { items: CentralItem[] }) {
  const { businesses } = useWorkspace();
  const byId = new Map(businesses.map((b) => [b.id, b]));
  // As tarefas aparecem logo abaixo, em "Minhas tarefas de hoje" (com concluir e adicionar): aqui só a contagem.
  const items = all.filter((i) => i.source !== "tarefas");
  const tasks = all.length - items.length;
  return (
    <section className="space-y-2" aria-label="Precisa de mim">
      <h2 className="flex items-center gap-2 font-heading font-semibold"><Inbox className="size-4 text-primary" />Precisa de mim <span className="text-sm font-normal text-muted-foreground">· {all.length}</span></h2>
      {tasks > 0 && <a href="#tarefas-do-dia" className="block text-xs text-primary hover:underline">+ {tasks} tarefa{tasks > 1 ? "s" : ""} em “Minhas tarefas de hoje” ↓</a>}
      {items.length === 0 && !tasks
        ? <EmptyState icon={Inbox} title="Nada esperando por você" description="Quando algo precisar de atenção (tarefa, conta, follow-up, entrega…), aparece aqui." />
        : items.length > 0 && <Card className="overflow-hidden">{items.map((i) => <Row key={i.id} i={i} biz={i.businessId ? byId.get(i.businessId) : undefined} />)}</Card>}
    </section>
  );
}
