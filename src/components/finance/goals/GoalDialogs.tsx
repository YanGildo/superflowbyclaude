import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { useFinGoals, useFinMutations } from "@/hooks/useFinance";
import type { FinGoal } from "@/integrations/supabase/types";
import { localISODate, moneyInput, parseMoney } from "@/lib/format";
import { GOAL_KIND_LABEL } from "@/lib/finPanel";

const KIND_OPTIONS = (Object.keys(GOAL_KIND_LABEL) as FinGoal["kind"][]).map((k) => ({ value: k, label: GOAL_KIND_LABEL[k] }));
type GoalForm = { name: string; kind: FinGoal["kind"]; target: string; deadline: string };
const goalForm = (g?: FinGoal | null): GoalForm =>
  ({ name: g?.name ?? "", kind: g?.kind ?? "reserva", target: g ? moneyInput(Number(g.target)) : "", deadline: g?.deadline ?? "" });

function Footer({ onCancel, pending, label }: { onCancel: () => void; pending: boolean; label: string }) {
  return (
    <DialogFooter><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
      <Button type="submit" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />}{label}</Button></DialogFooter>
  );
}

/** Criar ou editar uma meta financeira. */
export function GoalDialog({ open, onOpenChange, goal }: { open: boolean; onOpenChange: (o: boolean) => void; goal?: FinGoal | null }) {
  const { save } = useFinMutations("fin_goals");
  const [f, setF] = useState<GoalForm>(goalForm());
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setError(null); setF(goalForm(goal)); } }, [open, goal]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return setError("Dê um nome (ex.: Viagem, Reserva de emergência, Faturar 20 mil).");
    const target = parseMoney(f.target);
    if (!target || target <= 0) return setError("Informe o valor-alvo.");
    await save.mutateAsync({ id: goal?.id, name: f.name.trim(), kind: f.kind, target, deadline: f.deadline || null, period: f.kind === "faturamento" ? "mensal" : "unico" });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-heading">{goal ? "Editar meta" : "Nova meta financeira"}</DialogTitle>
          <DialogDescription>Reservas você alimenta guardando dinheiro. Metas de faturamento somam as entradas do mês sozinhas.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="space-y-1.5"><Label htmlFor="fg-kind">Tipo</Label>
            <SimpleSelect id="fg-kind" value={f.kind} onChange={(v) => setF({ ...f, kind: v })} options={KIND_OPTIONS} /></div>
          <div className="space-y-1.5"><Label htmlFor="fg-name">Nome</Label><Input id="fg-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="fg-target">{f.kind === "faturamento" ? "Meta por mês" : "Valor-alvo"}</Label>
              <MoneyInput id="fg-target" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} /></div>
            {f.kind !== "faturamento" && <div className="space-y-1.5"><Label htmlFor="fg-deadline">Até quando</Label>
              <Input id="fg-deadline" type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></div>}
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Footer onCancel={() => onOpenChange(false)} pending={save.isPending} label={goal ? "Salvar" : "Criar meta"} />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Guardar (ou retirar, com valor negativo) dinheiro numa meta ou reserva livre. */
export function ReserveDialog({ open, onOpenChange, goalId = null }: { open: boolean; onOpenChange: (o: boolean) => void; goalId?: string | null }) {
  const { save } = useFinMutations("reserves");
  const { data: goals = [] } = useFinGoals();
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
          <Footer onCancel={() => onOpenChange(false)} pending={save.isPending} label="Guardar" />
        </form>
      </DialogContent>
    </Dialog>
  );
}
