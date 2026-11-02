import { Link } from "react-router-dom";
import { Settings2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AgendaCard } from "@/components/central/AgendaCard";
import { DraftsList } from "@/components/central/DraftsList";
import { HandledList } from "@/components/central/HandledList";
import { NeedsList } from "@/components/central/NeedsList";
import { SummaryCard } from "@/components/central/SummaryCard";
import { TodayTasks } from "@/components/central/TodayTasks";
import { useCentral, useDraftActions } from "@/hooks/useCentral";

/** Central do dia: uma lista só do que precisa de você, rascunhos para aprovar, agenda e tarefas. */
export default function Hoje() {
  const c = useCentral();
  const { scan } = useDraftActions();
  const count = c.items.length + c.pending.length;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        eyebrow={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        title="Central do dia"
        description="Tudo que precisa de você, de todas as áreas, numa lista só. O sistema prepara; você aprova."
        actions={<Button asChild variant="ghost" size="sm"><Link to="/configuracoes?aba=assistente"><Settings2 className="size-4" />Regras do assistente</Link></Button>}
      />
      <SummaryCard s={c.settings} count={count} lines={c.summary} last={c.lastScan} onScan={() => scan.mutate()} scanning={scan.isPending} />
      {c.loading ? <Skeleton className="h-48 rounded-xl" /> : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <NeedsList items={c.items} />
            <DraftsList drafts={c.pending} contacts={c.contacts} />
            <HandledList items={c.handled} />
          </div>
          <div className="space-y-6">
            <AgendaCard list={c.appointments} />
          </div>
        </div>
      )}
      <div className="border-t pt-6"><TodayTasks /></div>
    </div>
  );
}
