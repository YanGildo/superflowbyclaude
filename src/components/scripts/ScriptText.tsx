import { splitVars } from "@/lib/scripts";
import { cn } from "@/lib/utils";

/** Texto do script com as variáveis [assim] destacadas. */
export function ScriptText({ body, className }: { body: string; className?: string }) {
  return (
    <p className={cn("whitespace-pre-wrap text-sm leading-relaxed", className)}>
      {splitVars(body).map((p, i) => p.isVar
        ? <mark key={i} className="rounded bg-primary/10 px-1 text-primary">{p.text}</mark>
        : <span key={i}>{p.text}</span>)}
    </p>
  );
}
