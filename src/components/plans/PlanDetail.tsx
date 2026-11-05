import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, Pencil, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AssetCard } from "@/components/plans/AssetCard";
import { CheckinsTab } from "@/components/plans/CheckinsTab";
import { Markdown } from "@/components/plans/Markdown";
import { AssetDialog, PlanDialog, StepDialog } from "@/components/plans/PlanDialogs";
import { StepsBoard } from "@/components/plans/StepsBoard";
import { usePlanAssets, usePlanMutations } from "@/hooks/useActionPlans";
import type { ActionPlan, ActionPlanAsset, ActionPlanStep } from "@/integrations/supabase/types";
import { nextStep, phasesOf, planProgress } from "@/lib/actionPlans";
import { cn } from "@/lib/utils";

const TABS = [{ id: "passos", label: "Passo a passo" }, { id: "scripts", label: "Scripts e prompts" }, { id: "numeros", label: "Números da semana" }] as const;
type Tab = (typeof TABS)[number]["id"];

function DocSheet({ plan, open, onOpenChange }: { plan: ActionPlan; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader><SheetTitle className="font-heading">{plan.title}</SheetTitle></SheetHeader>
        {plan.doc_url && <a className="mt-1 inline-flex items-center gap-1 text-sm text-primary underline" href={plan.doc_url} target="_blank" rel="noreferrer"><ExternalLink className="size-3.5" />Abrir o documento original</a>}
        <div className="mt-4">{plan.document ? <Markdown>{plan.document}</Markdown> : <p className="text-sm text-muted-foreground">Sem documento. Cole o plano completo em "Editar plano".</p>}</div>
      </SheetContent>
    </Sheet>
  );
}

function Header({ plan, steps, onBack, onEdit, onDoc }: { plan: ActionPlan; steps: ActionPlanStep[]; onBack: () => void; onEdit: () => void; onDoc: () => void }) {
  const prog = planProgress(steps);
  const next = nextStep(steps);
  return (
    <Card className="brand-hero mb-4 border-0"><CardContent className="space-y-3 p-5 text-white">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" className="-ml-2 text-white/80 hover:bg-white/10 hover:text-white" onClick={onBack}><ArrowLeft className="size-4" />Planos</Button>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" onClick={onDoc}><BookOpen className="size-4" />Ver plano completo</Button>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={onEdit}><Pencil className="size-4" />Editar plano</Button>
        </div>
      </div>
      <h1 className="font-heading text-2xl font-semibold">{plan.title}</h1>
      {plan.goal && <p className="text-sm text-brand-cyan">Meta: {plan.goal}</p>}
      {plan.summary && <Markdown className="text-white/80 [&_a]:text-brand-cyan [&_strong]:text-white">{plan.summary}</Markdown>}
      <div className="flex items-center gap-3"><Progress value={prog.pct} className="h-2 flex-1 bg-white/15" /><span className="text-sm font-semibold">{prog.pct}% · {prog.done}/{prog.total}</span></div>
      {next && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white/10 p-3 text-sm" aria-label="Próximo passo">
          <ArrowRight className="size-4 text-brand-cyan" /><span className="text-white/70">Próximo passo:</span><span className="font-medium">{next.title}</span>
          {next.link_path && <Button size="sm" variant="secondary" className="ml-auto" asChild><Link to={next.link_path}>{next.link_label ?? "Abrir"}</Link></Button>}
        </div>
      )}
    </CardContent></Card>
  );
}

function AssetsTab({ assets, onAdd, onEdit, onRemove }: { assets: ActionPlanAsset[]; onAdd: () => void; onEdit: (a: ActionPlanAsset) => void; onRemove: (a: ActionPlanAsset) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-end"><Button size="sm" variant="outline" onClick={onAdd}><Plus className="size-4" />Script, prompt ou nota</Button></div>
      {assets.map((a) => <AssetCard key={a.id} a={a} onEdit={() => onEdit(a)} onRemove={() => onRemove(a)} />)}
    </div>
  );
}

type StepState = { open: boolean; step: ActionPlanStep | null; phase?: string };

export function PlanDetail({ plan, steps, onBack }: { plan: ActionPlan; steps: ActionPlanStep[]; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("passos");
  const [doc, setDoc] = useState(false);
  const [editPlan, setEditPlan] = useState(false);
  const [stepDlg, setStepDlg] = useState<StepState>({ open: false, step: null });
  const [assetDlg, setAssetDlg] = useState<{ open: boolean; asset: ActionPlanAsset | null }>({ open: false, asset: null });
  const { data: assets = [] } = usePlanAssets(plan.id);
  const stepM = usePlanMutations("action_plan_steps");
  const assetM = usePlanMutations("action_plan_assets");
  const next = nextStep(steps);
  return (
    <div>
      <Header plan={plan} steps={steps} onBack={onBack} onEdit={() => setEditPlan(true)} onDoc={() => setDoc(true)} />
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg border bg-card p-1" role="tablist" aria-label="Seções do plano">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={cn("shrink-0 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors", tab === t.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "passos" && <StepsBoard steps={steps} assets={assets} nextId={next?.id ?? null}
        act={{ edit: (s) => setStepDlg({ open: true, step: s }), remove: (s) => stepM.remove.mutate(s.id), add: (phase) => setStepDlg({ open: true, step: null, phase }) }} />}
      {tab === "passos" && <Button className="mt-4" variant="outline" size="sm" onClick={() => setStepDlg({ open: true, step: null })}><Plus className="size-4" />Nova etapa</Button>}
      {tab === "scripts" && <AssetsTab assets={assets} onAdd={() => setAssetDlg({ open: true, asset: null })} onEdit={(a) => setAssetDlg({ open: true, asset: a })} onRemove={(a) => assetM.remove.mutate(a.id)} />}
      {tab === "numeros" && <CheckinsTab planId={plan.id} />}
      <DocSheet plan={plan} open={doc} onOpenChange={setDoc} />
      <PlanDialog open={editPlan} onOpenChange={setEditPlan} plan={plan} />
      <StepDialog open={stepDlg.open} onOpenChange={(o) => setStepDlg((s) => ({ ...s, open: o }))} planId={plan.id} step={stepDlg.step} phase={stepDlg.phase}
        phases={phasesOf(steps).map((g) => g.phase)} position={steps.reduce((m, s) => Math.max(m, s.position), 0) + 1} />
      <AssetDialog open={assetDlg.open} onOpenChange={(o) => setAssetDlg((s) => ({ ...s, open: o }))} planId={plan.id} asset={assetDlg.asset} steps={steps} />
    </div>
  );
}
