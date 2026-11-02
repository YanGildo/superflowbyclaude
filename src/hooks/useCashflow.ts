// Fluxo de caixa: junta saldo das contas, contas a pagar/receber e faturas e calcula o mês.
import { useMemo } from "react";
import { toast } from "sonner";
import { useAccounts, useAllPaidTransactions, useCards, useFinMutations, usePayables, useReceivables } from "@/hooks/useFinance";
import { cashMonth } from "@/lib/cashflow";
import { accountBalance, cardInvoice } from "@/lib/finance";

export function useCashflow(ym: string) {
  const { data: accounts = [] } = useAccounts();
  const { data: paid = [], isLoading } = useAllPaidTransactions();
  const { data: cards = [] } = useCards();
  const { data: payables = [] } = usePayables();
  const { data: receivables = [] } = useReceivables();
  return useMemo(() => {
    const startBalance = accounts.reduce((a, acc) => a + accountBalance(acc, paid), 0);
    const invoices = cards.map((card) => ({ card, total: cardInvoice(card, paid).total }));
    return { loading: isLoading, accountCount: accounts.length, ...cashMonth({ startBalance, payables, receivables, invoices }, ym) };
  }, [accounts, paid, cards, payables, receivables, ym, isLoading]);
}

/** Marcar como pago/recebido direto do calendário (o lançamento é criado sozinho, como em Pagar e receber).
 *  Sem conta definida na conta a pagar/receber, usa a conta escolhida no detalhe do dia (para o saldo mexer). */
export function useSettleBill() {
  const pay = useFinMutations("payables");
  const rec = useFinMutations("receivables");
  return (id: string, kind: "pagar" | "receber", accountId: string | null) => {
    const m = kind === "pagar" ? pay : rec;
    const values: Record<string, unknown> = { status: kind === "pagar" ? "pago" : "recebido" };
    if (accountId) values.account_id = accountId;
    m.patch.mutate({ id, values }, {
      onSuccess: () => toast.success(kind === "pagar" ? "Conta paga e lançada no financeiro." : "Recebimento lançado no financeiro."),
    });
  };
}
