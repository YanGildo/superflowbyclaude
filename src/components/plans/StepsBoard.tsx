import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { AssetCard } from "@/components/plans/AssetCard";
import { Markdown } from "@/components/plans/Markdown";
import { useToggleStep } from "@/hooks/useActionPlans";
import type { ActionPlanAsset, ActionPlanStep } from "@/integrations/supabase/types";
import { phasesOf } from "@/lib/actionPlans";
import { shortDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

export interface StepActions { edit: (s: ActionPlanStep) => void; remove: (s: ActionPlanStep) => void; add: (phase: string) => void }

function StepMeta({ s, next, count }: { s: ActionPlanStep; next: boolean; count: number }) {
  return (
    <p className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
      {next && <span className="font-semibold text-primary">Próximo passo</span>}
      {s.due_date && <span>até {shortDate(s.due_date)}</span>}
      {count > 0 && <span>{count} script(s)/prompt(s)</span>}
      {s.done_at && <span>feito em {shortDate(s.done_at.slice(0, 10))}</span>}
    </p>
  );
}

function StepButtons({ s, act }: { s: ActionPlanStep; act: StepActions }) {
  return (
    <>
      {s.link_path && <Button size="sm" variant="outline" asChild><Link to={s.link_path}>{s.link_label ?? "Abrir"}<ArrowRight className="size-4" /></Link></Button>}
      <div className="flex opacity-0 group-hover:opacity-100">
        <Button size="icon" variant="ghost" className="size-8" aria-label={`Editar ${s.title}`} onClick={() => act.edit(s)}><Pencil className="size-4" /></Button>
        <Button size="icon" variant="ghost" className="size-8 hover:text-destructive" aria-label={`Excluir ${s.title}`} onClick={() => act.remove(s)}><Trash2 className="size-4" /></Button>
      </div>
    </>
  );
}

function StepMark({ s, n }: { s: ActionPlanStep; n: number }) {
  const toggle = useToggleStep();
  if (s.repeat) return <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">{n}</span>;
  return <Checkbox className="mt-0.5" checked={Boolean(s.done_at)} onCheckedChange={(c) => toggle.mutate({ id: s.id, done: Boolean(c) })} aria-label={`Feito: ${s.title}`} />;
}

function StepRow({ s, n, assets, next, act }: { s: ActionPlanStep; n: number; assets: ActionPlanAsset[]; next: boolean; act: StepActions }) {
  const [open, setOpen] = useState(next);
  const hasMore = Boolean(s.details) || assets.length > 0;
  return (
    <div className={cn("group rounded-lg border bg-card", next && "border-primary ring-1 ring-primary/30")}>
      <div className="flex items-start gap-3 p-3">
        <StepMark s={s} n={n} />
        <button className="min-w-0 flex-1 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open} disabled={!hasMore}>
          <p className={cn("text-sm font-medium", s.done_at && "text-muted-foreground line-through")}>
            {s.title}{hasMore && <ChevronDown className={cn("ml-1 inline size-3.5 transition-transform", open && "rotate-180")} />}
          </p>
          <StepMeta s={s} next={next} count={assets.length} />
        </button>
        <StepButtons s={s} act={act} />
      </div>
      {open && hasMore && (
        <div className="space-y-2 border-t px-3 py-3 sm:pl-11">
          {s.details && <Markdown>{s.details}</Markdown>}
          {assets.map((a) => <AssetCard key={a.id} a={a} compact />)}
        </div>
      )}
    </div>
  );
}

/** Passo a passo por fase, com o próximo passo destacado e aberto. */
export function StepsBoard({ steps, assets, nextId, act }: { steps: ActionPlanStep[]; assets: ActionPlanAsset[]; nextId: string | null; act: StepActions }) {
  return (
    <div className="space-y-6">
      {phasesOf(steps).map((g) => (
        <section key={g.phase} className="space-y-2" aria-label={g.phase}>
          <div className="flex items-center gap-3">
            <h2 className="flex items-center gap-1.5 font-heading text-sm font-semibold">{g.routine && <Repeat className="size-4 text-primary" />}{g.phase}</h2>
            {g.routine ? <span className="text-xs text-muted-foreground">rotina que se repete</span>
              : <><Progress value={g.pct} className="h-1.5 w-24" /><span className="text-xs text-muted-foreground">{g.done}/{g.total}</span></>}
            <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={() => act.add(g.phase)}><Plus className="size-3.5" />Etapa</Button>
          </div>
          <div className="space-y-1.5">
            {g.steps.map((s, i) => <StepRow key={s.id} s={s} n={i + 1} assets={assets.filter((a) => a.step_id === s.id)} next={s.id === nextId} act={act} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
