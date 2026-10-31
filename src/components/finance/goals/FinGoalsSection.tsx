import { useState } from "react";
import { CalendarDays, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/common/PageHeader";
import { useFinGoals, useFinMutations, useReserves } from "@/hooks/useFinance";
import type { FinGoal, Reserve } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";
import { CHART_COLORS, GOAL_KIND_LABEL, goalStats } from "@/lib/finPanel";
import { shortDate } from "@/lib/labels";
import { GoalDialog, ReserveDialog } from "./GoalDialogs";

const KIND_COLOR: Record<FinGoal["kind"], string> = { emergencia: "#E11D48", independencia: "#059669", reserva: CHART_COLORS[0], faturamento: "#F59E0B" };

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/60 px-2 py-2 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function GoalCard({ g, reserves, ym, monthIncome, onEdit, onSave }: {
  g: FinGoal; reserves: Reserve[]; ym: string; monthIncome: number; onEdit: () => void; onSave: () => void;
}) {
  const { remove } = useFinMutations("fin_goals");
  const s = goalStats(g, reserves, ym, monthIncome);
  const color = g.color ?? KIND_COLOR[g.kind];
  const revenue = g.kind === "faturamento";
  return (
    <Card className="group space-y-3 border-t-4 p-4" style={{ borderTopColor: color }}>
      <div className="flex items-start gap-2">
        <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: color }} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-heading font-semibold">{g.name}</p>
          <p className="text-xs text-muted-foreground">{GOAL_KIND_LABEL[g.kind]} · Meta {brl(s.target)}{revenue ? "/mês" : ""}</p>
        </div>
        <Button size="icon" variant="ghost" className="size-8" aria-label={`Editar ${g.name}`} onClick={onEdit}><Pencil className="size-4" /></Button>
        <Button size="icon" variant="ghost" className="size-8 hover:text-destructive" aria-label={`Excluir ${g.name}`} onClick={() => remove.mutate(g.id)}><Trash2 className="size-4" /></Button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Box label="Este mês" value={brl(s.thisMonth)} />
        <Box label={revenue ? "Faturado" : "Reservado"} value={brl(s.reserved)} />
        <Box label="Faltam" value={brl(s.missing)} />
      </div>
      <div className="space-y-1">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {g.deadline && !revenue ? <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />até {shortDate(g.deadline)}</span> : <span />}
          <span className="font-semibold" style={{ color }}>{s.pct}%</span>
        </div>
      </div>
      {!revenue && <Button size="sm" variant="outline" className="w-full" onClick={onSave}><PiggyBank className="size-4" />Guardar nesta meta</Button>}
    </Card>
  );
}

/** Metas financeiras: este mês, reservado, quanto falta e progresso. */
export function FinGoalsSection({ ym, monthIncome }: { ym: string; monthIncome: number }) {
  const { data: goals = [] } = useFinGoals();
  const { data: reserves = [] } = useReserves();
  const [goalDlg, setGoalDlg] = useState<{ open: boolean; goal: FinGoal | null }>({ open: false, goal: null });
  const [resDlg, setResDlg] = useState<{ open: boolean; goalId: string | null }>({ open: false, goalId: null });
  return (
    <Card className="space-y-4 p-4">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-heading text-lg font-semibold">Metas financeiras</h3>
          <p className="text-sm text-muted-foreground">Acompanhe o progresso das metas pessoais e da empresa.</p>
        </div>
        <Button onClick={() => setGoalDlg({ open: true, goal: null })}><Plus className="size-4" />Nova meta</Button>
      </header>
      {goals.length === 0
        ? <EmptyState icon={PiggyBank} title="Nenhuma meta ainda" description="Ex.: Reserva de emergência de R$ 11 mil ou Independência financeira de R$ 55 mil." />
        : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {goals.map((g) => (
              <GoalCard key={g.id} g={g} reserves={reserves} ym={ym} monthIncome={monthIncome}
                onEdit={() => setGoalDlg({ open: true, goal: g })} onSave={() => setResDlg({ open: true, goalId: g.id })} />
            ))}
          </div>
        )}
      <GoalDialog open={goalDlg.open} goal={goalDlg.goal} onOpenChange={(o) => setGoalDlg((d) => ({ ...d, open: o }))} />
      <ReserveDialog open={resDlg.open} goalId={resDlg.goalId} onOpenChange={(o) => setResDlg((d) => ({ ...d, open: o }))} />
    </Card>
  );
}
