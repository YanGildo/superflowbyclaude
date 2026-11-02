// Patrimônio líquido: calcula com o que já existe (contas, cartões, dívidas, bens) e guarda o registro do mês.
import { useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useAccounts, useAllPaidTransactions, useAssets, useCards, useDebts, useNetWorthHistory, usePayables, useReserves,
} from "@/hooks/useFinance";
import { useScope } from "@/hooks/useScope";
import { accountBalance, cardInvoice } from "@/lib/finance";
import { currentYM } from "@/lib/format";
import { computeNetWorth, snapshotChanged, type NetWorth } from "@/lib/netWorth";
import { activeReserves } from "@/lib/finPanel";

function useSnapshot() {
  const qc = useQueryClient();
  const scope = useScope();
  return useMutation({
    mutationFn: async (n: NetWorth) => {
      const { error } = await supabase.from("net_worth_snapshots").upsert({
        workspace_id: scope.wsId, month: currentYM(), accounts: n.accounts, goods: n.goods, debts: n.debtsTotal, net: n.net,
        updated_at: new Date().toISOString(),
      }, { onConflict: "workspace_id,month" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fin", "net_worth_snapshots"] }),
  });
}

export function useNetWorth() {
  const accounts = useAccounts();
  const { data: paid = [], isLoading } = useAllPaidTransactions();
  const { data: cards = [] } = useCards();
  const { data: debts = [] } = useDebts();
  const { data: payables = [] } = usePayables();
  const { data: assets = [] } = useAssets();
  const { data: reserves = [] } = useReserves();
  const history = useNetWorthHistory();
  const snap = useSnapshot();

  const nw = useMemo(() => computeNetWorth({
    accountBalances: (accounts.data ?? []).map((a) => accountBalance(a, paid)), assets, payables, debts,
    cardInvoices: cards.map((c) => cardInvoice(c, paid).total), reserved: activeReserves(reserves).reduce((a, r) => a + Number(r.amount), 0),
  }), [accounts.data, paid, assets, payables, debts, cards, reserves]);

  const ready = !isLoading && !accounts.isLoading && history.isSuccess;
  const current = history.data?.find((s) => s.month === currentYM());
  // Histórico automático: o registro do mês acompanha o patrimônio (um por mês).
  useEffect(() => {
    if (ready && !snap.isPending && snapshotChanged(current, nw) && (nw.assetsTotal || nw.debtsTotal || current)) snap.mutate(nw);
  }, [ready, nw, current]); // eslint-disable-line react-hooks/exhaustive-deps

  const record = () => snap.mutate(nw, { onSuccess: () => toast.success("Patrimônio do mês registrado.") });
  return { nw, history: history.data ?? [], assets, loading: !ready, record, recording: snap.isPending };
}
