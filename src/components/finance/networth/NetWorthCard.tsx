import { Link } from "react-router-dom";
import { Landmark } from "lucide-react";
import { useNetWorth } from "@/hooks/useNetWorth";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Card da Visão geral: patrimônio líquido e a variação contra o mês anterior. */
export function NetWorthCard() {
  const { nw, history } = useNetWorth();
  const prev = history.length >= 2 ? Number(history[history.length - 2].net) : null;
  const delta = prev == null ? null : nw.net - prev;
  return (
    <Link to="/financeiro/carteira?aba=patrimonio" aria-label="Patrimônio líquido"
      className="block rounded-xl border bg-gradient-to-br from-primary/10 to-card p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Patrimônio líquido</p>
        <span className="flex size-8 items-center justify-center rounded-lg border bg-card text-primary shadow-sm"><Landmark className="size-4" /></span>
      </div>
      <p className={cn("font-heading text-2xl font-semibold tabular-nums", nw.net < 0 && "text-destructive")}>{brl(nw.net)}</p>
      <p className="text-[11px] text-muted-foreground">Ativos {brl(nw.assetsTotal)} · dívidas {brl(nw.debtsTotal)}</p>
      {delta != null && <p className={cn("text-[11px] font-medium", delta >= 0 ? "text-success" : "text-destructive")}>{delta >= 0 ? "+" : "−"}{brl(Math.abs(delta))} vs mês anterior</p>}
    </Link>
  );
}
