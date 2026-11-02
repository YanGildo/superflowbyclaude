import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { STATUS_INFO, type Integration } from "@/lib/integrations";
import { cn } from "@/lib/utils";

/** Uma integração: o que faz, o que já funciona sem ela, onde aparece e como ligar. */
export function IntegrationCard({ i }: { i: Integration }) {
  const st = STATUS_INFO[i.status];
  return (
    <Card className="flex flex-col gap-2 p-4" aria-label={i.name}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-heading font-semibold leading-snug">{i.name}</p>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", st.tone)}>{st.label}</span>
      </div>
      <p className="text-sm text-muted-foreground">{i.what}</p>
      {i.today && <p className="rounded-md bg-muted/60 px-2 py-1.5 text-xs"><b>Hoje, sem ela:</b> {i.today}</p>}
      {i.steps && i.status !== "ativo" && (
        <ol className="list-decimal space-y-0.5 pl-4 text-xs text-muted-foreground">{i.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      )}
      {i.where.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs">
          {i.where.map((w) => <Link key={w.to + w.label} to={w.to} className="text-primary hover:underline">{w.label} →</Link>)}
        </div>
      )}
    </Card>
  );
}
