import { useMemo, useState } from "react";
import { Archive, Plus, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useContacts, useCrmMutations, useDeals, usePipelines, useStages } from "@/hooks/useCrm";
import { useCrmFlows } from "@/hooks/useCrmFlows";
import type { Contact, Deal, Pipeline } from "@/integrations/supabase/types";
import { applyView, DEFAULT_VIEW, downloadText, leadsCsv, slug, type ViewOpts } from "@/lib/pipelineView";
import { cn } from "@/lib/utils";
import { CampaignActions } from "./CampaignActions";
import { ContactSheet } from "./ContactSheet";
import { LeadDialog } from "./LeadDialog";
import { NewCampaignDialog } from "./NewCampaignDialog";
import { PipelineViewBar } from "./PipelineViewBar";
import { PipelineBoard } from "./PipelineBoard";

const matches = (d: Deal, c: Contact | undefined, q: string) =>
  !q || [d.title, c?.name, c?.company, c?.phone, c?.email].some((v) => v?.toLowerCase().includes(q.toLowerCase()));

const PIPE_KEY = "superflow:pipeline";
const VIEW_KEY = "superflow:pipeline-view";
const readView = (): ViewOpts => { try { return { ...DEFAULT_VIEW, ...JSON.parse(localStorage.getItem(VIEW_KEY) ?? "{}") }; } catch { return DEFAULT_VIEW; } };
const readPipe = () => { try { return localStorage.getItem(PIPE_KEY); } catch { return null; } };

/** Funil escolhido (lembrado neste navegador) com os contatos indexados por id. */
function usePipelineData(chosen: string | null) {
  const { data: pipelines = [], isLoading: lp } = usePipelines();
  const { data: allStages = [] } = useStages();
  const { data: deals = [], isLoading: ld } = useDeals();
  const { data: contacts = [] } = useContacts();
  const pipeline = pipelines.find((p) => p.id === chosen) ?? pipelines.find((p) => !p.archived_at) ?? pipelines[0];
  const stages = allStages.filter((s) => s.pipeline_id === pipeline?.id);
  const byId = useMemo(() => new Map(contacts.map((c) => [c.id, c])), [contacts]);
  return { pipelines, pipeline, allStages, stages, deals: deals.filter((d) => d.pipeline_id === pipeline?.id), byId, loading: lp || ld };
}

/** Abas para trocar de funil, "+ Nova campanha" e as arquivadas escondidas por padrão. */
function PipelinePicker({ pipelines, current, onPick, onNew }: { pipelines: Pipeline[]; current: string | undefined; onPick: (id: string) => void; onNew: () => void }) {
  const [showArchived, setShowArchived] = useState(false);
  const archived = pipelines.filter((p) => p.archived_at);
  const shown = pipelines.filter((p) => showArchived || !p.archived_at || p.id === current);
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Funis">
      {shown.map((p) => (
        <button key={p.id} type="button" role="tab" aria-selected={p.id === current} onClick={() => onPick(p.id)}
          className={cn("rounded-full border px-3 py-1 text-xs font-medium", p.id === current ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent", p.archived_at && "border-dashed opacity-70")}>
          {p.archived_at && <Archive className="mr-1 inline size-3" />}{p.name}
        </button>
      ))}
      <button type="button" onClick={onNew} className="rounded-full border border-dashed px-3 py-1 text-xs font-medium text-primary hover:bg-accent">
        <Plus className="mr-0.5 inline size-3" />Nova campanha
      </button>
      {archived.length > 0 && (
        <button type="button" onClick={() => setShowArchived((x) => !x)} className="px-2 py-1 text-xs text-muted-foreground hover:underline">
          {showArchived ? "Esconder arquivadas" : `Arquivadas (${archived.length})`}
        </button>
      )}
    </div>
  );
}

export function PipelineTab() {
  const [chosen, setChosen] = useState<string | null>(readPipe);
  const { pipelines, pipeline, allStages, stages, deals, byId, loading } = usePipelineData(chosen);
  const [newCamp, setNewCamp] = useState(false);
  const [view, setViewState] = useState<ViewOpts>(readView);
  const setView = (v: ViewOpts) => { setViewState(v); try { localStorage.setItem(VIEW_KEY, JSON.stringify(v)); } catch { /* sem storage */ } };
  const pick = (id: string) => { setChosen(id); try { localStorage.setItem(PIPE_KEY, id); } catch { /* sem storage */ } };
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
  const visible = applyView(deals.filter((d) => matches(d, byId.get(d.contact_id), q)), byId, view);
  const exportCsv = () => downloadText(leadsCsv(visible, byId, stages), `leads-${slug(pipeline.name)}-${new Date().toISOString().slice(0, 10)}.csv`);
  const active = deals.find((d) => d.id === openDeal);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">{pipeline.name === "Comercial" ? "Pipeline Comercial" : pipeline.name}</h2>
          <p className="text-sm text-muted-foreground">Do lead ao cliente ativo. Clique numa etapa para abrir ou arraste os cards.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar lead" aria-label="Buscar lead" className="h-9 pl-9" />
          </div>
          <CampaignActions pipeline={pipeline} stages={stages} dealCount={deals.length}
            onRemoved={() => pick(pipelines.find((p) => p.id !== pipeline.id && !p.archived_at)?.id ?? "")} />
          <Button onClick={() => setLead({ open: true })}><UserPlus className="size-4" />Novo lead</Button>
        </div>
      </div>

      <PipelinePicker pipelines={pipelines} current={pipeline.id} onPick={pick} onNew={() => setNewCamp(true)} />
      {pipeline.archived_at && <p className="rounded-lg border border-dashed p-2.5 text-xs text-muted-foreground">Campanha arquivada. Os negócios continuam aqui; restaure pelo menu "⋯" para voltar a usar.</p>}

      {deals.length === 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          Comece adicionando seu primeiro lead. Clique numa etapa para expandir ou arraste os cards entre as etapas.
          <Button size="sm" onClick={() => setLead({ open: true })}><Plus className="size-4" />Novo lead</Button>
        </div>
      )}

      <PipelineViewBar view={view} setView={setView} shown={visible.length} total={deals.length} onExport={exportCsv} />

      <PipelineBoard stages={stages} deals={visible} contacts={byId} onMove={move} sort={view.sort}
        onAdd={(stageId) => setLead({ open: true, stageId })} onOpen={(d) => setOpenDeal(d.id)} />

      <LeadDialog open={lead.open} onOpenChange={(o) => setLead((l) => ({ ...l, open: o }))} stages={stages}
        pipelineId={pipeline.id} initialStageId={lead.stageId} />
      <NewCampaignDialog open={newCamp} onOpenChange={setNewCamp} pipelines={pipelines} stages={allStages} onCreated={pick} />
      <ContactSheet contact={active ? byId.get(active.contact_id) ?? null : null} deal={active} stages={stages} onClose={() => setOpenDeal(null)} />
    </div>
  );
}
