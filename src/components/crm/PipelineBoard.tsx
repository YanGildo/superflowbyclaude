import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Contact, Deal, PipelineStage } from "@/integrations/supabase/types";
import { stageColor } from "@/lib/crm";
import { cn } from "@/lib/utils";
import { DealCard } from "./DealCard";

interface BoardProps {
  stages: PipelineStage[];
  deals: Deal[];
  contacts: Map<string, Contact>;
  onMove: (dealId: string, stageId: string) => void;
  onAdd: (stageId: string) => void;
  onOpen: (deal: Deal) => void;
}

/** Resumo no topo: quantidade e % de cada etapa; clique foca a etapa. */
function StageStrip({ stages, counts, total, focus, setFocus }: {
  stages: PipelineStage[]; counts: Map<string, number>; total: number; focus: string; setFocus: (id: string) => void;
}) {
  return (
    <div className="mb-3 flex gap-1 overflow-x-auto rounded-xl border bg-card p-1.5">
      {stages.map((s) => {
        const n = counts.get(s.id) ?? 0;
        return (
          <button key={s.id} type="button" onClick={() => setFocus(s.id)}
            className={cn("min-w-[104px] flex-1 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent",
              focus === s.id && "bg-primary/10 ring-1 ring-primary/40")}>
            <p className="flex items-start gap-1.5 text-[11px] leading-tight text-muted-foreground">
              <span className="mt-[3px] size-2 shrink-0 rounded-full" style={{ background: stageColor(s) }} />{s.name}
            </p>
            <p className="font-heading text-sm font-semibold">{n} <span className="text-[10px] font-normal text-muted-foreground">· {total ? Math.round((n / total) * 100) : 0}%</span></p>
          </button>
        );
      })}
    </div>
  );
}

function useDropTarget(stageId: string, onMove: BoardProps["onMove"]) {
  const [over, setOver] = useState(false);
  return {
    over,
    handlers: {
      onDragOver: (e: DragEvent) => { e.preventDefault(); setOver(true); },
      onDragLeave: () => setOver(false),
      onDrop: (e: DragEvent) => {
        e.preventDefault(); setOver(false);
        const id = e.dataTransfer.getData("text/deal");
        if (id) onMove(id, stageId);
      },
    },
  };
}

/** Etapa recolhida: coluna fina com nome, contador e "+"; clique abre a etapa. */
function NarrowColumn({ stage, count, onFocus, onAdd, onMove }: {
  stage: PipelineStage; count: number; onFocus: () => void; onAdd: () => void; onMove: BoardProps["onMove"];
}) {
  const { over, handlers } = useDropTarget(stage.id, onMove);
  return (
    <div {...handlers} onClick={onFocus} role="button" tabIndex={0} aria-label={`Abrir etapa ${stage.name}`}
      onKeyDown={(e) => e.key === "Enter" && onFocus()}
      className={cn("flex w-[78px] shrink-0 cursor-pointer flex-col items-center gap-2 rounded-xl border bg-card px-1.5 py-3 text-center transition-colors hover:border-primary/40",
        over && "border-primary bg-primary/5")}>
      <span className="h-1 w-8 rounded-full" style={{ background: stageColor(stage) }} />
      <p className="text-[10px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">{stage.name}</p>
      <span className="rounded-full border px-2 text-[11px] font-semibold">{count}</span>
      <button type="button" aria-label={`Adicionar em ${stage.name}`} onClick={(e) => { e.stopPropagation(); onAdd(); }}
        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"><Plus className="size-4" /></button>
    </div>
  );
}

/** Etapa aberta: coluna larga com os cards. */
function WideColumn({ stage, deals, contacts, onAdd, onOpen, onMove }: {
  stage: PipelineStage; deals: Deal[]; contacts: Map<string, Contact>; onAdd: () => void; onOpen: (d: Deal) => void; onMove: BoardProps["onMove"];
}) {
  const { over, handlers } = useDropTarget(stage.id, onMove);
  return (
    <section {...handlers} className={cn("flex min-w-[340px] flex-1 flex-col rounded-xl border bg-card/60 p-3", over && "border-primary bg-primary/5")}>
      <header className="mb-3 flex items-center gap-2">
        <span className="size-2 rounded-full" style={{ background: stageColor(stage) }} />
        <h3 className="font-heading text-sm font-semibold uppercase tracking-wide">{stage.name}</h3>
        <span className="rounded-full border px-2 text-[11px] font-semibold">{deals.length}</span>
        <Button size="icon" variant="ghost" className="ml-auto size-7" aria-label={`Adicionar em ${stage.name}`} onClick={onAdd}><Plus className="size-4" /></Button>
      </header>
      {deals.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          <p>Nenhum lead nesta etapa.<br />Arraste um card para cá ou adicione.</p>
          <Button size="sm" variant="outline" onClick={onAdd}><Plus className="size-4" />Adicionar</Button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2">
          {deals.map((d) => <DealCard key={d.id} deal={d} contact={contacts.get(d.contact_id)} onOpen={() => onOpen(d)} />)}
        </div>
      )}
    </section>
  );
}

export function PipelineBoard({ stages, deals, contacts, onMove, onAdd, onOpen }: BoardProps) {
  const byStage = useMemo(() => {
    const m = new Map<string, Deal[]>();
    deals.forEach((d) => m.set(d.stage_id, [...(m.get(d.stage_id) ?? []), d]));
    return m;
  }, [deals]);
  const counts = useMemo(() => new Map([...byStage].map(([k, v]) => [k, v.length])), [byStage]);
  const [focus, setFocus] = useState<string>("");
  const current = stages.find((s) => s.id === focus) ?? stages.find((s) => counts.get(s.id)) ?? stages[0];
  // Fixa a etapa aberta: arrastar um card para outra etapa não muda a que está aberta.
  useEffect(() => { if (!focus && current) setFocus(current.id); }, [focus, current]);
  if (!current) return null;

  return (
    <div>
      <StageStrip stages={stages} counts={counts} total={deals.length} focus={current.id} setFocus={setFocus} />
      <div className="flex gap-2 overflow-x-auto pb-2">
        {stages.map((s) => s.id === current.id
          ? <WideColumn key={s.id} stage={s} deals={byStage.get(s.id) ?? []} contacts={contacts} onAdd={() => onAdd(s.id)} onOpen={onOpen} onMove={onMove} />
          : <NarrowColumn key={s.id} stage={s} count={counts.get(s.id) ?? 0} onFocus={() => setFocus(s.id)} onAdd={() => onAdd(s.id)} onMove={onMove} />)}
      </div>
    </div>
  );
}
