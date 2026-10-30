// Números da Visão geral do financeiro (sem React).
import type { Business, FinCategory, Transaction } from "@/integrations/supabase/types";
import { ofType, sumAmount } from "@/lib/transactions";

export const monthShort = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
};

export const compactNumber = (n: number) =>
  (Math.abs(n) >= 1000 ? `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil` : n.toLocaleString("pt-BR"));

export interface MonthPoint { ym: string; mes: string; Entradas: number; Saídas: number }

/** Entradas e saídas de cada mês (para o gráfico). */
export function monthSeries(months: string[], txs: Transaction[]): MonthPoint[] {
  return months.map((m) => {
    const inM = txs.filter((t) => t.date.startsWith(m));
    return { ym: m, mes: monthShort(m), Entradas: sumAmount(ofType(inM, "entrada")), Saídas: sumAmount(ofType(inM, "saida")) };
  });
}

/** As 6 categorias com mais saídas no mês. */
export function spendByCategory(monthTx: Transaction[], categories: FinCategory[]) {
  const m = new Map<string, number>();
  ofType(monthTx, "saida").forEach((t) => m.set(t.category_id ?? "—", (m.get(t.category_id ?? "—") ?? 0) + Number(t.amount)));
  return [...m.entries()]
    .map(([id, v]) => ({ name: categories.find((c) => c.id === id)?.name ?? "Sem categoria", v }))
    .sort((a, b) => b.v - a.v).slice(0, 6);
}

/** Entradas, saídas e resultado do mês por negócio (só os que tiveram movimento). */
export function businessResults(businesses: Business[], monthTx: Transaction[]) {
  return businesses.map((b) => {
    const l = monthTx.filter((t) => t.business_id === b.id);
    const e = sumAmount(ofType(l, "entrada"));
    const s = sumAmount(ofType(l, "saida"));
    return { b, e, s, r: e - s };
  }).filter((x) => x.e || x.s);
}
