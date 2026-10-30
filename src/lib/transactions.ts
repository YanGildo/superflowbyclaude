// Totais e agrupamentos de lançamentos (telas do financeiro).
import type { Transaction, TxType } from "@/integrations/supabase/types";

export const sumAmount = (l: Transaction[]) => l.reduce((a, t) => a + Number(t.amount), 0);
export const ofType = (l: Transaction[], type: TxType) => l.filter((t) => t.type === type);

/** Entradas/saídas pagas e saldo pendente (entradas − saídas ainda não pagas). */
export function monthTotals(txs: Transaction[]) {
  const paid = txs.filter((t) => t.status === "pago");
  const entradas = sumAmount(ofType(paid, "entrada"));
  const saidas = sumAmount(ofType(paid, "saida"));
  const pendente = txs.filter((t) => t.status === "pendente" && t.type !== "transferencia")
    .reduce((a, t) => a + (t.type === "entrada" ? 1 : -1) * Number(t.amount), 0);
  return { entradas, saidas, pendente };
}

export interface TxFilter { type: "todos" | TxType; cat: string | null; q: string }

export function matchesTx(t: Transaction, f: TxFilter): boolean {
  if (f.type !== "todos" && t.type !== f.type) return false;
  if (f.cat && t.category_id !== f.cat) return false;
  return !f.q || t.description.toLowerCase().includes(f.q.toLowerCase());
}

/** Lançamentos agrupados por data, na ordem em que chegaram. */
export function groupByDate(txs: Transaction[]): [string, Transaction[]][] {
  const m = new Map<string, Transaction[]>();
  txs.forEach((t) => m.set(t.date, [...(m.get(t.date) ?? []), t]));
  return [...m.entries()];
}
