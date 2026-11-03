// Dívidas (sem React).
import type { Debt, Payable } from "@/integrations/supabase/types";
import { openAmount } from "@/lib/finance";

/** Situação de uma dívida pelas parcelas (contando os pagamentos parciais). */
export function debtStatus(d: Debt, payables: Payable[]) {
  const parts = payables.filter((p) => p.debt_id === d.id);
  const open = parts.filter((p) => p.status !== "pago");
  const owed = Math.round(open.reduce((a, p) => a + openAmount(p), 0) * 100) / 100;
  const total = parts.reduce((a, p) => a + Number(p.amount), 0) || Number(d.total_amount);
  const paidValue = Math.round((total - owed) * 100) / 100;
  const next = [...open].sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  return {
    paidCount: parts.length - open.length, paidValue, owed, next,
    pct: total ? Math.round((paidValue / total) * 100) : 0, quitada: parts.length > 0 && open.length === 0,
  };
}
