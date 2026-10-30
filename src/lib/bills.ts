// Contas a pagar/receber vistas como uma lista única (tela Pagar e receber).
import type { Payable, Receivable } from "@/integrations/supabase/types";
import type { BillKind } from "@/lib/billForm";
import { shortDate } from "@/lib/labels";

export interface Bill {
  id: string; title: string; amount: number; date: string; done: boolean; recurrence: Payable["recurrence"];
  category_id: string | null; installment?: string; raw: Payable | Receivable;
}

export const toBill = (b: Payable | Receivable): Bill => "due_date" in b
  ? { id: b.id, title: b.title, amount: Number(b.amount), date: b.due_date, done: b.status === "pago", recurrence: b.recurrence, category_id: b.category_id, raw: b }
  : { id: b.id, title: b.title, amount: Number(b.amount), date: b.expected_date, done: b.status === "recebido", recurrence: b.recurrence, category_id: b.category_id, raw: b };

export const sumBills = (l: Bill[]) => l.reduce((a, b) => a + b.amount, 0);

/** Em aberto separadas em atrasadas / próximos 7 dias / depois. */
export function splitOpen(open: Bill[], today: string, in7: string) {
  return {
    late: open.filter((b) => b.date < today),
    week: open.filter((b) => b.date >= today && b.date <= in7),
    later: open.filter((b) => b.date > in7),
  };
}

export function dueLabel(b: Bill, today: string): string {
  if (b.done) return "Concluída";
  if (b.date < today) return `Venceu ${shortDate(b.date)}`;
  if (b.date === today) return "Vence hoje";
  return `Vence ${shortDate(b.date)}`;
}

/** Valores de status ao concluir e ao reabrir. */
export const BILL_STATUS: Record<BillKind, { settle: Record<string, unknown>; reopen: Record<string, unknown> }> = {
  pagar: { settle: { status: "pago" }, reopen: { status: "pendente", paid_date: null } },
  receber: { settle: { status: "recebido" }, reopen: { status: "previsto", received_date: null } },
};

/** Textos que mudam entre "pagar" e "receber" nesta tela. */
export const BILL_PAGE_TEXT: Record<BillKind, {
  action: string; settled: string; monthOpen: string; monthDone: string; emptyHint: string; amountTone: string;
}> = {
  pagar: {
    action: "Pagar", settled: "Paga", monthOpen: "A pagar neste mês", monthDone: "Pago no mês", amountTone: "",
    emptyHint: "Cadastre aluguel, ferramentas, parcelas... Contas mensais se recriam sozinhas.",
  },
  receber: {
    action: "Receber", settled: "Recebida", monthOpen: "A receber neste mês", monthDone: "Recebido no mês", amountTone: "text-success",
    emptyHint: "Propostas aprovadas no Comercial vão gerar as mensalidades aqui.",
  },
};
