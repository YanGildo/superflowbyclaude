import { useMemo, useState } from "react";
import { Plus, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useContacts, useCrmMutations, useDeals, usePipelines, useStages } from "@/hooks/useCrm";
import { useCrmFlows } from "@/hooks/useCrmFlows";
import type { Contact, Deal } from "@/integrations/supabase/types";
import { ContactSheet } from "./ContactSheet";
import { LeadDialog } from "./LeadDialog";
import { PipelineBoard } from "./PipelineBoard";

const matches = (d: Deal, c: Contact | undefined, q: string) =>
  !q || [d.title, c?.name, c?.company, c?.phone, c?.email].some((v) => v?.toLowerCase().includes(q.toLowerCase()));

/** Dados do pipeline principal (o primeiro) com os contatos indexados por id. */
function usePipelineData() {
  const { data: pipelines = [], isLoading: lp } = usePipelines();
  const { data: allStages = [] } = useStages();
  const { data: deals = [], isLoading: ld } = useDeals();
  const { data: contacts = [] } = useContacts();
  const pipeline = pipelines[0];
  const stages = allStages.filter((s) => s.pipeline_id === pipeline?.id);
  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  return { pipeline, stages, deals: deals.filter((d) => d.pipeline_id === pipeline?.id), byId, loading: lp || ld };
}

export function PipelineTab() {
  const { pipeline, stages, deals, byId, loading } = usePipelineData();
  const dealM = useCrmMutations("deals");
  const { logConversion } = useCrmFlows();
  const [q, setQ] = useState("");
  const [lead, setLead] = useState<{ open: boolean; stageId?: string }>({ open: false });
  const [openDeal, setOpenDeal] = useState<string | null>(null);

  const move = (dealId: string, stageId: string) => {
    const d = deals.find((x) => x.id === dealId);
    if (!d || d.stage_id === stageId) return;
    const target = stages.find((s) => s.id === stageId);
    dealM.patch.mutate({ id: dealId, values: { stage_id: stageId } }, {
      onSuccess: () => { if (target?.outcome === "won" && d.status !== "won") void logConversion("Negócio fechado", d.contact_id, d.recurring_value ?? d.value); },
    });
  };

  if (loading) return <Skeleton className="h-80 rounded-xl" />;
  if (!pipeline) return <p className="text-sm text-muted-foreground">Nenhum pipeline encontrado neste workspace.</p>;
  const visible = deals.filter((d) => matches(d, byId.get(d.contact_id), q));
  const active = deals.find((d) => d.id === openDeal);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">Pipeline Comercial</h2>
          <p className="text-sm text-muted-foreground">Do lead ao cliente ativo. Clique numa etapa para abrir ou arraste os cards.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lead" aria-label="Buscar lead" className="h-9 pl-9" />
          </div>
          <Button onClick={() => setLead({ open: true })}><UserPlus className="size-4" />Novo lead</Button>
        </div>
      </div>

      {deals.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Comece adicionando seu primeiro lead. Clique numa etapa para expandir ou arraste os cards entre as etapas.
          <Button size="sm" onClick={() => setLead({ open: true })}><Plus className="size-4" />Novo lead</Button>
        </div>
      )}

      <PipelineBoard stages={stages} deals={visible} contacts={byId} onMove={move}
        onAdd={(stageId) => setLead({ open: true, stageId })} onOpen={(d) => setOpenDeal(d.id)} />

      <LeadDialog open={lead.open} onOpenChange={(o) => setLead((l) => ({ ...l, open: o }))} stages={stages}
        pipelineId={pipeline.id} initialStageId={lead.stageId} />
      <ContactSheet contact={active ? byId.get(active.contact_id) ?? null : null} deal={active} stages={stages} onClose={() => setOpenDeal(null)} />
    </div>
  );
}
