import { Link } from "react-router-dom";
import { ArrowRight, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useAllSteps, usePlans, useToggleStep } from "@/hooks/useActionPlans";
import { nextStep, planProgress } from "@/lib/actionPlans";

/** Central do dia: o próximo passo de cada plano de ação ativo, para marcar sem sair daqui. */
export function PlanNextCard() {
  const { data: plans = [] } = usePlans();
  const { data: steps = [] } = useAllSteps();
  const toggle = useToggleStep();
  const active = plans.filter((p) => p.status === "ativo").map((p) => {
    const mine = steps.filter((s) => s.plan_id === p.id);
    return { p, next: nextStep(mine), prog: planProgress(mine) };
  }).filter((x) => x.next);
  if (active.length === 0) return null;
  return (
    <Card aria-label="Planos de ação"><CardContent className="space-y-4 p-4">
      <p className="flex items-center gap-2 font-heading text-sm font-semibold"><Rocket className="size-4 text-primary" />Planos de ação</p>
      {active.map(({ p, next, prog }) => next && (
        <div key={p.id} className="space-y-2">
          <Link to={`/planos?plano=${p.id}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
            <span className="truncate font-medium">{p.title}</span><Progress value={prog.pct} className="h-1.5 w-16 shrink-0" /><span>{prog.pct}%</span>
          </Link>
          <div className="flex items-start gap-2 rounded-lg border p-2.5">
            <Checkbox className="mt-0.5" checked={false} onCheckedChange={() => toggle.mutate({ id: next.id, done: true })} aria-label={`Feito: ${next.title}`} />
            <p className="min-w-0 flex-1 text-sm">{next.title}</p>
          </div>
          {next.link_path && <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" asChild><Link to={next.link_path}>{next.link_label ?? "Abrir"}<ArrowRight className="size-3.5" /></Link></Button>}
        </div>
      ))}
    </CardContent></Card>
  );
}
