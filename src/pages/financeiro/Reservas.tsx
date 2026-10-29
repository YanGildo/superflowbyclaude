import { useEffect, useState, type FormEvent } from "react";
import { CalendarDays, Loader2, PiggyBank, Plus, Trash2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { useFinGoals, useFinMutations, useReserves, useTransactions } from "@/hooks/useFinance";
import type { FinGoal } from "@/integrations/supabase/types";
import { brl, currentYM, localISODate, monthLabel, parseMoney } from "@/lib/format";
import { shortDate } from "@/lib/labels";

const KIND_LABEL: Record<FinGoal["kind"], string> = {
  reserva: "Reserva para um objetivo", emergencia: "Reserva de emergência", faturamento: "Meta de faturamento", independencia: "Independência financeira",
};

function GoalDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { save } = useFinMutations("fin_goals");
  const [f, setF] = useState({ name: "", kind: "reserva" as FinGoal["kind"], target: "", deadline: "" });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setError(null); setF({ name: "", kind: "reserva", target: "", deadline: "" }); } }, [open]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return setError("Dê um nome (ex.: Viagem, Reserva de emergência, Faturar 20 mil).");
    const target = parseMoney(f.target);
    if (!target || target <= 0) return setError("Informe o valor-alvo.");
    await save.mutateAsync({ name: f.name.trim(), kind: f.kind, target, deadline: f.deadline || null, period: f.kind === "faturamento" ? "mensal" : "unico" });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-heading">Nova meta financeira</DialogTitle>
          <DialogDescription>Reservas você alimenta guardando dinheiro. Metas de faturamento somam as entradas do mês sozinhas.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="space-y-1.5"><Label htmlFor="fg-kind">Tipo</Label>
            <SimpleSelect id="fg-kind" value={f.kind} onChange={(v) => setF({ ...f, kind: v })}
              options={(Object.keys(KIND_LABEL) as FinGoal["kind"][]).map((k) => ({ value: k, label: KIND_LABEL[k] }))} /></div>
          <div className="space-y-1.5"><Label htmlFor="fg-name">Nome</Label><Input id="fg-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="fg-target">{f.kind === "faturamento" ? "Meta por mês" : "Valor-alvo"}</Label>
              <MoneyInput id="fg-target" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} /></div>
            {f.kind !== "faturamento" && <div className="space-y-1.5"><Label htmlFor="fg-deadline">Até quando</Label>
              <Input id="fg-deadline" type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></div>}
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Criar meta</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReserveDialog({ open, onOpenChange, goals, goalId }: { open: boolean; onOpenChange: (o: boolean) => void; goals: FinGoal[]; goalId: string | null }) {
  const { save } = useFinMutations("reserves");
  const [f, setF] = useState({ goal: goalId, amount: "", date: localISODate(), name: "" });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setError(null); setF({ goal: goalId, amount: "", date: localISODate(), name: "" }); } }, [open, goalId]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseMoney(f.amount);
    if (amount === null || amount === 0) return setError("Informe o valor. Use valor negativo para retirar.");
    const goal = goals.find((g) => g.id === f.goal);
    await save.mutateAsync({ goal_id: f.goal, amount, date: f.date, name: f.name.trim() || (goal ? `Guardado: ${goal.name}` : "Reserva") });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle className="font-heading">Guardar dinheiro</DialogTitle>
          <DialogDescription>Registre quanto separou. Valor negativo = retirada.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="space-y-1.5"><Label htmlFor="rs-goal">Para</Label>
            <RefSelect id="rs-goal" value={f.goal} onChange={(v) => setF({ ...f, goal: v })} options={goals.filter((g) => g.kind !== "faturamento")} placeholder="Reserva livre" /></div>
          <div className="space-y-1.5"><Label htmlFor="rs-amount">Valor</Label><MoneyInput id="rs-amount" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} autoFocus /></div>
          <div className="space-y-1.5"><Label htmlFor="rs-date">Data</Label><Input id="rs-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="rs-name">Observação</Label><Input id="rs-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Guardar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
      <ReserveDialog open={resDlg.open} goalId={resDlg.goalId} goals={goals} onOpenChange={(o) => setResDlg((d) => ({ ...d, open: o }))} />
    </div>
  );
}
