import type { CreditCard, FinAccount, Transaction } from "@/integrations/supabase/types";
import { localISODate } from "@/lib/format";

/** Saldo atual de uma conta = saldo inicial + entradas − saídas ± transferências (só lançamentos pagos). */
export function accountBalance(acc: FinAccount, txs: Transaction[]) {
  let b = Number(acc.initial_balance);
  for (const t of txs) {
    if (t.status !== "pago") continue;
    const v = Number(t.amount);
    if (t.type === "entrada" && t.account_id === acc.id) b += v;
    else if (t.type === "saida" && t.account_id === acc.id && !t.card_id) b -= v;
    else if (t.type === "transferencia") {
      if (t.account_id === acc.id) b -= v;
      if (t.to_account_id === acc.id) b += v;
    }
  }
  return Math.round(b * 100) / 100;
}

/**
 * Ciclo da fatura atual de um cartão: do dia seguinte ao último fechamento até o próximo fechamento.
 * Sem dia de fechamento, usa o mês corrente.
 */
export function cardCycle(card: CreditCard, today = new Date()) {
  const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
  const close = card.closing_day;
  if (!close) {
    return { start: localISODate(new Date(y, m, 1)), end: localISODate(new Date(y, m + 1, 0)) };
  }
  const clamp = (yy: number, mm: number) => Math.min(close, new Date(yy, mm + 1, 0).getDate());
  // fechamento deste mês já passou? então o ciclo atual vai até o fechamento do mês que vem
  const endMonth = d > clamp(y, m) ? m + 1 : m;
  const end = new Date(y, endMonth, clamp(y, endMonth));
  const prevEnd = new Date(y, endMonth - 1, clamp(y, endMonth - 1));
  const start = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() + 1);
  return { start: localISODate(start), end: localISODate(end) };
}

export function cardInvoice(card: CreditCard, txs: Transaction[], today = new Date()) {
  const { start, end } = cardCycle(card, today);
  const total = txs
    .filter((t) => t.card_id === card.id && t.type === "saida" && t.date >= start && t.date <= end)
    .reduce((a, t) => a + Number(t.amount), 0);
  return { start, end, total: Math.round(total * 100) / 100 };
}

export const ACCOUNT_TYPES: { value: FinAccount["type"]; label: string }[] = [
  { value: "corrente", label: "Conta corrente" },
  { value: "carteira_digital", label: "Carteira digital" },
  { value: "gateway", label: "Gateway de pagamento" },
  { value: "reserva", label: "Conta reserva" },
  { value: "investimento", label: "Investimento" },
  { value: "dinheiro", label: "Dinheiro em espécie" },
  { value: "outro", label: "Outro" },
];
