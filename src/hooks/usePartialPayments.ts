// Pagamentos parciais (amortização): pagar parte de uma conta ou de uma dívida e desfazer.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { PayablePayment } from "@/integrations/supabase/types";
import { useScope } from "@/hooks/useScope";
import { brl } from "@/lib/format";

export const usePayablePayments = () => {
  const scope = useScope();
  return useQuery({
    queryKey: ["fin", "payable_payments", scope.wsId],
    enabled: scope.ready,
    queryFn: async () => {
      const { data, error } = await supabase.from("payable_payments").select("*").eq("workspace_id", scope.wsId).order("date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PayablePayment[];
    },
  });
};

export interface PartialPay { amount: number; date: string; accountId: string | null }

function useRefresh() {
  const qc = useQueryClient();
  return () => { qc.invalidateQueries({ queryKey: ["fin"] }); qc.invalidateQueries({ queryKey: ["dashboard-kpis"] }); };
}

const clean = (m: string) => m.replace(/^.*?ERROR:\s*/i, "").replace(/\s*\(SQLSTATE.*$/, "");

/** Amortizar uma dívida: o valor abate das parcelas em aberto, da mais antiga para a mais nova. */
export function useDebtPay() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ debtId, ...p }: PartialPay & { debtId: string }) => {
      const { data, error } = await supabase.rpc("debt_pay", { _debt: debtId, _amount: p.amount, _date: p.date, _account: p.accountId });
      if (error) throw error;
      return Number(data ?? 0);
    },
    onSuccess: (left) => { refresh(); toast.success(left > 0 ? `Pagamento registrado. Falta ${brl(left)}.` : "Dívida quitada!"); },
    onError: (e: Error) => toast.error(clean(e.message)),
  });
}

/** Pagar parte de uma conta a pagar. */
export function usePayPart() {
  const refresh = useRefresh();
  const scope = useScope();
  return useMutation({
    mutationFn: async ({ payableId, ...p }: PartialPay & { payableId: string }) => {
      const { error } = await supabase.from("payable_payments")
        .insert({ workspace_id: scope.wsId, payable_id: payableId, amount: p.amount, date: p.date, account_id: p.accountId });
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast.success("Pagamento parcial registrado e lançado."); },
    onError: (e: Error) => toast.error(clean(e.message)),
  });
}

/** Desfazer um pagamento parcial (apaga o lançamento e devolve ao "falta pagar"). */
export function useUndoPayment() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payable_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast("Pagamento desfeito."); },
    onError: (e: Error) => toast.error(clean(e.message)),
  });
}
