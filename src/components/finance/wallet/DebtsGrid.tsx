import { useState } from "react";
import { HandCoins, Trash2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PartialPayDialog } from "@/components/finance/PartialPayDialog";
import { useDebtPay, usePayablePayments, useUndoPayment } from "@/hooks/usePartialPayments";
import type { Debt, Payable, PayablePayment } from "@/integrations/supabase/types";
import { debtStatus } from "@/lib/debts";
import { openAmount } from "@/lib/finance";
import { brl } from "@/lib/format";
import { shortDate } from "@/lib/labels";

function PaymentsList({ list, onUndo }: { list: PayablePayment[]; onUndo: (id: string) => void }) {
  if (!list.length) return null;
  return (
    <div className="space-y-1 border-t pt-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Pagamentos feitos</p>
      {list.slice(0, 5).map((p) => (
        <div key={p.id} className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{shortDate(p.date)}</span>
          <span className="flex items-center gap-1 font-medium tabular-nums">{brl(Number(p.amount))}
            <Button size="icon" variant="ghost" className="size-6" aria-label={`Desfazer pagamento de ${brl(Number(p.amount))}`} onClick={() => onUndo(p.id)}><Undo2 className="size-3" /></Button>
          </span>
        </div>
      ))}
    </div>
  );
}

function DebtCard({ d, payables, payments, onRemove, onPay, onUndo }: {
  d: Debt; payables: Payable[]; payments: PayablePayment[]; onRemove: () => void; onPay: () => void; onUndo: (id: string) => void;
}) {
  const s = debtStatus(d, payables);
  return (
    <Card className="group">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div><p className="font-heading font-semibold">{d.name}</p><p className="text-xs text-muted-foreground">{d.creditor ?? "Sem credor"}{d.interest_rate ? ` · ${d.interest_rate}% a.m.` : ""}</p></div>
          <div className="flex items-center gap-1">
            {s.quitada && <Badge className="bg-success text-success-foreground">Quitada</Badge>}
            <Button size="icon" variant="ghost" className="size-8 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
              aria-label={`Excluir ${d.name}`} onClick={onRemove}><Trash2 className="size-4" /></Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Pago {brl(s.paidValue)} · {s.paidCount}/{d.installments_total} parcelas</span><span className="font-medium">{s.pct}%</span></div>
          <Progress value={s.pct} className="h-2" />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><p className="text-xs text-muted-foreground">Falta pagar</p><p className="font-semibold tabular-nums">{brl(s.owed)}</p></div>
          <div><p className="text-xs text-muted-foreground">Próxima parcela</p><p className="font-semibold tabular-nums">{s.next ? `${brl(openAmount(s.next))} · ${shortDate(s.next.due_date)}` : "—"}</p></div>
        </div>
        {!s.quitada && <Button size="sm" variant="outline" className="w-full" onClick={onPay}><HandCoins className="size-4" />Amortizar (pagar uma parte)</Button>}
        <PaymentsList list={payments} onUndo={onUndo} />
      </CardContent>
    </Card>
  );
}

export function DebtsGrid({ debts, payables, onRemove }: { debts: Debt[]; payables: Payable[]; onRemove: (d: Debt) => void }) {
  const { data: payments = [] } = usePayablePayments();
  const pay = useDebtPay();
  const undo = useUndoPayment();
  const [paying, setPaying] = useState<Debt | null>(null);
  const ofDebt = (d: Debt) => {
    const ids = new Set(payables.filter((p) => p.debt_id === d.id).map((p) => p.id));
    return payments.filter((p) => ids.has(p.payable_id));
  };
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {debts.map((d) => <DebtCard key={d.id} d={d} payables={payables} payments={ofDebt(d)} onRemove={() => onRemove(d)}
          onPay={() => setPaying(d)} onUndo={(id) => undo.mutate(id)} />)}
      </div>
      <PartialPayDialog open={Boolean(paying)} onOpenChange={(o) => { if (!o) setPaying(null); }} title={paying?.name ?? ""}
        owed={paying ? debtStatus(paying, payables).owed : 0} busy={pay.isPending}
        onConfirm={(p) => paying && pay.mutate({ debtId: paying.id, ...p }, { onSuccess: () => setPaying(null) })} />
    </>
  );
}
