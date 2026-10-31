// Dados do painel financeiro já calculados (indicadores, gráficos e listas).
import { useMemo } from "react";
import {
  useAccounts, useAllPaidTransactions, useCategories, useDebts, usePayables, useReceivables, useReserves, useTransactionsRange,
} from "@/hooks/useFinance";
import { accountBalance } from "@/lib/finance";
import {
  billStats, billsFlow, categoryAllocation, filterTx, withoutInternal, monthFlow, proLaboreInMonth, reserveStats, type OriginFilter, type UseFilter,
} from "@/lib/finPanel";
import { shiftMonth } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export function useFinPanel(ym: string, use: UseFilter, origin: OriginFilter) {
  const first = shiftMonth(ym, -5);
  const range = useTransactionsRange(first, ym);
  const { data: allPaid = [] } = useAllPaidTransactions();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { data: payables = [] } = usePayables();
  const { data: receivables = [] } = useReceivables();
  const { data: debts = [] } = useDebts();
  const { data: reserves = [] } = useReserves();
  const { businessFilter } = useWorkspace();

  return useMemo(() => {
    const filtered = filterTx(range.data ?? [], use, origin);
    const txs = use === "todos" && businessFilter === "all" ? withoutInternal(filtered) : filtered;
    const cur = txs.filter((t) => t.date.startsWith(ym));
    const curAll = filtered.filter((t) => t.date.startsWith(ym));
    const prev = txs.filter((t) => t.date.startsWith(shiftMonth(ym, -1)));
    return {
      loading: range.isLoading, txs, cur, curAll, categories,
      flow: monthFlow(cur), prevFlow: monthFlow(prev),
      reserves: reserveStats(reserves, ym),
      bills: billStats(payables, debts, ym),
      proLabore: proLaboreInMonth(curAll, categories),
      allocation: categoryAllocation(cur, categories),
      billsFlow: billsFlow(payables, receivables, ym),
      balance: accounts.reduce((a, acc) => a + accountBalance(acc, allPaid), 0),
      accountCount: accounts.length, payables, receivables,
    };
  }, [range.data, range.isLoading, use, origin, ym, businessFilter, allPaid, accounts, categories, payables, receivables, debts, reserves]);
}
