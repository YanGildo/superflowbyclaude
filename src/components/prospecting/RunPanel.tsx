import { CheckCircle2, Loader2, Square, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cancelRun, clearRun, useRunState } from "@/hooks/useProspectRunner";
import { cn } from "@/lib/utils";

const ICON = { running: Loader2, done: CheckCircle2, error: XCircle, canceled: XCircle, idle: Loader2 };
const ICON_TONE = { running: "animate-spin text-primary", done: "text-success", error: "text-destructive", canceled: "text-destructive", idle: "" };

function Result({ r }: { r: NonNullable<ReturnType<typeof useRunState>["result"]> }) {
  const items = [["Encontradas", r.found], ["Novas na lista", r.fresh], ["Já existiam", r.duplicates], ["Enriquecidas", r.enriched], ["Com e-mail", r.withEmail]] as const;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {items.map(([l, v]) => <div key={l} className="rounded-lg bg-muted/60 px-3 py-2"><p className="text-[11px] text-muted-foreground">{l}</p><p className="font-heading text-lg font-semibold">{v}</p></div>)}
    </div>
  );
}

/** Progresso da busca/enriquecimento em andamento (continua rodando se você trocar de aba). */
export function RunPanel() {
  const s = useRunState();
  if (s.phase === "idle") return null;
  const Icon = ICON[s.phase];
  const pct = s.total ? Math.round((s.done / s.total) * 100) : 0;
  return (
    <Card className={cn(s.phase === "error" && "border-destructive/40")} aria-label="Andamento da busca">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start gap-3">
          <Icon className={cn("mt-0.5 size-5", ICON_TONE[s.phase])} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{s.title}</p>
            <p className="text-sm text-muted-foreground" role="status">{s.step}</p>
          </div>
          {s.phase === "running"
            ? <Button size="sm" variant="outline" onClick={cancelRun}><Square className="size-3.5" />Cancelar</Button>
            : <Button size="icon" variant="ghost" aria-label="Fechar andamento" onClick={clearRun}><X className="size-4" /></Button>}
        </div>
        {s.phase === "running" && s.total > 0 && <div className="space-y-1"><Progress value={pct} className="h-2" /><p className="text-xs text-muted-foreground">{s.done} de {s.total}</p></div>}
        {s.result && <Result r={s.result} />}
        {s.log.length > 0 && (
          <details className="text-xs" open={s.phase === "error"}>
            <summary className="cursor-pointer text-muted-foreground">Detalhes ({s.log.length})</summary>
            <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto font-mono text-[11px] text-muted-foreground">{s.log.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
