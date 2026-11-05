import { ArrowRight, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/common/PageHeader";
import type { ActionPlan, ActionPlanStep } from "@/integrations/supabase/types";
import { nextStep, planProgress } from "@/lib/actionPlans";

const STATUS: Record<ActionPlan["status"], string> = { ativo: "Ativo", pausado: "Pausado", concluido: "Concluído" };

function PlanCard({ p, steps, onOpen }: { p: ActionPlan; steps: ActionPlanStep[]; onOpen: () => void }) {
  const prog = planProgress(steps);
  const next = nextStep(steps);
  return (
    <Card className="cursor-pointer transition hover:border-primary/50 hover:shadow-sm" onClick={onOpen} role="button" aria-label={`Abrir plano ${p.title}`}>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-heading font-semibold">{p.title}</p>
          <Badge variant="secondary" className="shrink-0">{STATUS[p.status]}</Badge>
        </div>
        {p.goal && <p className="text-sm text-muted-foreground">{p.goal}</p>}
        <div className="space-y-1">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">{prog.done}/{prog.total} etapas</span><span className="font-semibold">{prog.pct}%</span></div>
          <Progress value={prog.pct} className="h-2" />
        </div>
        {next && <p className="flex items-center gap-1.5 text-xs"><ArrowRight className="size-3.5 text-primary" /><span className="text-muted-foreground">Próximo:</span><span className="truncate font-medium">{next.title}</span></p>}
      </CardContent>
    </Card>
  );
}

export function PlanList({ plans, steps, onOpen, onNew }: { plans: ActionPlan[]; steps: ActionPlanStep[]; onOpen: (id: string) => void; onNew: () => void }) {
  if (plans.length === 0) {
    return <EmptyState icon={Rocket} title="Nenhum plano de ação ainda" description="Crie um plano com etapas, scripts e prompts para executar em ordem." action={<button className="text-sm font-medium text-primary underline" onClick={onNew}>Criar plano</button>} />;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {plans.map((p) => <PlanCard key={p.id} p={p} steps={steps.filter((s) => s.plan_id === p.id)} onOpen={() => onOpen(p.id)} />)}
    </div>
  );
}
