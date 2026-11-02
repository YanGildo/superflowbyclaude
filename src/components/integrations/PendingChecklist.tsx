import { CheckCircle2, Circle, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useIntegrations } from "@/hooks/useIntegrations";
import type { PendingItem } from "@/lib/integrations";
import { cn } from "@/lib/utils";

function Item({ p, done, onToggle }: { p: PendingItem; done: boolean; onToggle: () => void }) {
  return (
    <div className={cn("flex gap-3 rounded-lg border p-3", done && "bg-success/5")}>
      <button type="button" onClick={onToggle} disabled={Boolean(p.auto)} aria-pressed={done} aria-label={`${done ? "Desmarcar" : "Marcar como feito"}: ${p.title}`}
        className="mt-0.5 shrink-0 disabled:cursor-default" title={p.auto ? "Marcado sozinho quando estiver configurado" : undefined}>
        {done ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-muted-foreground" />}
      </button>
      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn("text-sm font-medium", done && "text-muted-foreground line-through")}>
          {p.title}{p.optional && <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground no-underline">opcional</span>}
          {p.auto && <span className="ml-2 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-normal text-primary">automático</span>}
        </p>
        <p className="text-xs text-muted-foreground">{p.why}</p>
        {!done && <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">{p.steps.map((s) => <li key={s}>{s}</li>)}</ol>}
      </div>
    </div>
  );
}

/** O que depende de você, com passo a passo e marcação de feito. */
export function PendingChecklist() {
  const { pending, isDone, toggle, doneCount, requiredCount } = useIntegrations();
  const pct = requiredCount ? Math.round((doneCount / requiredCount) * 100) : 100;
  return (
    <Card>
      <CardHeader className="space-y-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="size-4 text-primary" />O que falta fazer (com você)</CardTitle>
        <div className="flex items-center gap-3"><Progress value={pct} className="h-2 flex-1" /><span className="text-xs text-muted-foreground">{doneCount} de {requiredCount} obrigatórios</span></div>
      </CardHeader>
      <CardContent className="space-y-2">
        {pending.map((p) => <Item key={p.id} p={p} done={isDone(p)} onToggle={() => toggle.mutate(p.id)} />)}
      </CardContent>
    </Card>
  );
}
