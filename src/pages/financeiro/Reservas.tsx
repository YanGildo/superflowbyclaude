import { useState } from "react";
import { CalendarDays, PiggyBank, Plus, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { GoalDialog, ReserveDialog } from "@/components/finance/goals/GoalDialogs";
import { useFinGoals, useFinMutations, useReserves, useTransactions } from "@/hooks/useFinance";
import { brl, currentYM, monthLabel } from "@/lib/format";
import { GOAL_KIND_LABEL } from "@/lib/finPanel";
import { shortDate } from "@/lib/labels";

const KIND_LABEL = GOAL_KIND_LABEL;

export default function Reservas() {
  const { data: goals = [], isLoading } = useFinGoals();
  const { data: reserves = [] } = useReserves();
  const { data: monthTx = [] } = useTransactions(currentYM());
  const goalM = useFinMutations("fin_goals");
  const resM = useFinMutations("reserves");
  const [goalDlg, setGoalDlg] = useState(false);
  const [resDlg, setResDlg] = useState<{ open: boolean; goalId: string | null }>({ open: false, goalId: null });

  const reservedFor = (id: string | null) => reserves.filter((r) => r.goal_id === id && r.status === "ativa").reduce((a, r) => a + Number(r.amount), 0);
  const totalReserved = reserves.filter((r) => r.status === "ativa").reduce((a, r) => a + Number(r.amount), 0);
  const monthIncome = monthTx.filter((t) => t.type === "entrada" && t.status === "pago").reduce((a, t) => a + Number(t.amount), 0);
  const free = reservedFor(null);

  return (
    <div>
      <PageHeader eyebrow="Financeiro" title="Reservas e metas" description="Quanto você está guardando e quão perto está das metas."
        actions={<>
          <Button variant="outline" onClick={() => setResDlg({ open: true, goalId: null })}><PiggyBank className="size-4" />Guardar</Button>
          <Button onClick={() => setGoalDlg(true)}><Plus className="size-4" />Nova meta</Button>
        </>} />

      <Card className="brand-hero mb-5 border-0"><CardContent className="flex flex-wrap items-end justify-between gap-4 p-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-cyan">Total guardado</p>
          <p className="mt-1 font-heading text-3xl font-semibold tabular-nums text-white">{brl(totalReserved)}</p></div>
        {free !== 0 && <p className="text-sm text-white/70">{brl(free)} em reserva livre</p>}
      </CardContent></Card>

      {isLoading ? <Skeleton className="h-40 rounded-xl" /> : goals.length === 0 ? (
        <EmptyState icon={PiggyBank} title="Nenhuma meta financeira" description="Ex.: Reserva de emergência de R$ 15 mil, ou faturar R$ 20 mil por mês."
          action={<Button onClick={() => setGoalDlg(true)}><Plus className="size-4" />Criar meta</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => {
            const isRevenue = g.kind === "faturamento";
            const value = isRevenue ? monthIncome : reservedFor(g.id);
            const target = Number(g.target);
            const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
            return (
              <Card key={g.id} className="group">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{KIND_LABEL[g.kind]}</p>
                      <p className="font-heading font-semibold">{g.name}</p></div>
                    <Button size="icon" variant="ghost" className="size-8 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                      aria-label={`Excluir ${g.name}`} onClick={() => goalM.remove.mutate(g.id)}><Trash2 className="size-4" /></Button>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between"><span className="font-heading text-lg font-semibold tabular-nums">{brl(value)}</span>
                      <span className="text-xs text-muted-foreground">de {brl(target)} · {pct}%</span></div>
                    <Progress value={pct} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    {isRevenue ? <span className="inline-flex items-center gap-1"><TrendingUp className="size-3.5" />Entradas de {monthLabel(currentYM()).toLowerCase()}</span>
                      : g.deadline ? <span className="inline-flex items-center gap-1"><CalendarDays className="size-3.5" />até {shortDate(g.deadline)}</span> : <span />}
                    {!isRevenue && <Button size="sm" variant="outline" onClick={() => setResDlg({ open: true, goalId: g.id })}><Plus className="size-3.5" />Guardar</Button>}
                    {isRevenue && value < target && <span>Faltam {brl(target - value)}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {reserves.length > 0 && (
        <section className="mt-8">
          <h2 className="brand-eyebrow mb-2">Histórico</h2>
          <div className="space-y-1.5">
            {reserves.slice(0, 30).map((r) => (
              <div key={r.id} className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
                <span className="w-16 text-xs text-muted-foreground">{shortDate(r.date)}</span>
                <span className="flex-1 truncate text-sm">{r.name}</span>
                <span className={Number(r.amount) < 0 ? "text-sm font-semibold text-destructive" : "text-sm font-semibold text-success"}>{brl(Number(r.amount))}</span>
                <Button size="icon" variant="ghost" className="size-7 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                  aria-label={`Excluir reserva ${r.name}`} onClick={() => resM.remove.mutate(r.id)}><Trash2 className="size-3.5" /></Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <GoalDialog open={goalDlg} onOpenChange={setGoalDlg} />
      <ReserveDialog open={resDlg.open} goalId={resDlg.goalId} onOpenChange={(o) => setResDlg((d) => ({ ...d, open: o }))} />
    </div>
  );
}
