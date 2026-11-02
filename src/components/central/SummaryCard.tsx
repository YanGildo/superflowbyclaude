import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AssistantDigest } from "@/integrations/supabase/types";
import type { AssistantSettings } from "@/lib/assistant";
import { Mascot } from "./Mascot";

function lastScanText(d: AssistantDigest | null) {
  if (!d) return "Ainda não houve varredura.";
  const when = new Date(d.created_at).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  return `Última varredura: ${when}${d.slot === "manual" ? " (manual)" : ""}`;
}

/** Topo da Central: mascote + resumo do dia em até 3 linhas + varrer agora. */
export function SummaryCard({ s, count, lines, last, onScan, scanning }: {
  s: AssistantSettings; count: number; lines: string[]; last: AssistantDigest | null; onScan: () => void; scanning: boolean;
}) {
  return (
    <Card className="flex flex-wrap items-center gap-5 bg-gradient-to-br from-brand-cyan/10 via-card to-primary/5 p-5">
      <Mascot shape={s.forma} count={count} size={84} name={s.nome} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.nome} · {count ? "acordado" : "dormindo"}</p>
        <div aria-label="Resumo do dia" className="space-y-0.5">
          {lines.filter(Boolean).map((l, i) => <p key={l} className={i === 0 ? "font-heading text-lg font-semibold" : "text-sm text-muted-foreground"}>{l}</p>)}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <Button variant="outline" size="sm" onClick={onScan} disabled={scanning}>
          {scanning ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Varrer agora
        </Button>
        <p className="text-[11px] text-muted-foreground">{lastScanText(last)}</p>
        <p className="text-[11px] text-muted-foreground">Varreduras: {s.horarios.map((h) => `${h}h`).join(", ") || "desligadas"}</p>
      </div>
    </Card>
  );
}
