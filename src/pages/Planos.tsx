import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImportPlanDialog } from "@/components/plans/ImportPlanDialog";
import { PlanDetail } from "@/components/plans/PlanDetail";
import { PlanDialog } from "@/components/plans/PlanDialogs";
import { PlanList } from "@/components/plans/PlanList";
import { useAllSteps, usePlans } from "@/hooks/useActionPlans";

/** Planos de ação: um fluxo único com etapas, scripts, prompts e números, ligando as outras abas. */
export default function Planos() {
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const { data: plans = [], isLoading } = usePlans();
  const { data: steps = [] } = useAllSteps();
  const open = (id: string | null) => setParams((p) => { if (id) p.set("plano", id); else p.delete("plano"); return p; });
  const plan = plans.find((p) => p.id === params.get("plano"));
  if (plan) return <PlanDetail plan={plan} steps={steps.filter((s) => s.plan_id === plan.id)} onBack={() => open(null)} />;
  return (
    <div>
      <PageHeader eyebrow="Geral" title="Planos de ação" description="Siga um plano em etapas, com os scripts, prompts e telas certas em cada passo."
        actions={<div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImporting(true)}><Sparkles className="size-4" />Criar com IA</Button>
          <Button onClick={() => setCreating(true)}><Plus className="size-4" />Novo plano</Button>
        </div>} />
      {isLoading ? <Skeleton className="h-40 rounded-xl" /> : <PlanList plans={plans} steps={steps} onOpen={open} onNew={() => setCreating(true)} />}
      <PlanDialog open={creating} onOpenChange={setCreating} plan={null} />
      <ImportPlanDialog open={importing} onOpenChange={setImporting} onCreated={(id) => open(id)} />
    </div>
  );
}
