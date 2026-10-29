import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type {
  CreditCard, Debt, FinAccount, FinCategory, FinGoal, Payable, Receivable, Reserve, Transaction,
} from "@/integrations/supabase/types";
import { useScope } from "@/hooks/useScope";
import { ymRange } from "@/lib/format";

/** Tabelas do financeiro e se elas têm coluna business_id (para o filtro de negócio). */
const HAS_BUSINESS: Record<string, boolean> = {
  fin_accounts: true, credit_cards: true, fin_categories: false, transactions: true,
  payables: true, receivables: true, debts: true, fin_goals: true, reserves: false,
};

type Builder = (q: any) => any; // eslint-disable-line @typescript-eslint/no-explicit-any

function useFinList<T>(table: string, extraKey: unknown[], build: Builder, opts?: { allBusinesses?: boolean }) {
  const scope = useScope();
  return useQuery({
    queryKey: ["fin", table, scope.wsId, opts?.allBusinesses ? "all" : scope.businessFilter, ...extraKey],
    enabled: scope.ready,
    queryFn: async () => {
      const { data, error } = await build(
        scope.apply(supabase.from(table).select("*"), { business: HAS_BUSINESS[table] && !opts?.allBusinesses }),
      );
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

/* ------------------------------ Consultas ------------------------------ */

export const useAccounts = () =>
  useFinList<FinAccount>("fin_accounts", [], (q) => q.is("archived_at", null).order("created_at"), { allBusinesses: true });

export const useCards = () =>
  useFinList<CreditCard>("credit_cards", [], (q) => q.is("archived_at", null).order("created_at"), { allBusinesses: true });

export const useCategories = () =>
  useFinList<FinCategory>("fin_categories", [], (q) => q.order("name"));

/** Lançamentos de um mês (yyyy-mm). */
export const useTransactions = (ym: string) => {
  const { start, next } = ymRange(ym);
  return useFinList<Transaction>("transactions", [ym], (q) =>
    q.is("deleted_at", null).gte("date", start).lt("date", next).order("date", { ascending: false }).order("created_at", { ascending: false }));
};

/** Lançamentos de vários meses (para gráficos). */
export const useTransactionsRange = (startYM: string, endYM: string) => {
  const start = ymRange(startYM).start, next = ymRange(endYM).next;
  return useFinList<Transaction>("transactions", ["range", startYM, endYM], (q) =>
    q.is("deleted_at", null).eq("status", "pago").gte("date", start).lt("date", next).limit(5000));
};

/** Todos os lançamentos pagos (para saldo das contas). */
export const useAllPaidTransactions = () =>
  useFinList<Transaction>("transactions", ["all-paid"], (q) => q.is("deleted_at", null).eq("status", "pago").limit(20000), { allBusinesses: true });

export const usePayables = () =>
  useFinList<Payable>("payables", [], (q) => q.neq("status", "cancelado").order("due_date"));

export const useReceivables = () =>
  useFinList<Receivable>("receivables", [], (q) => q.neq("status", "cancelado").order("expected_date"));

export const useDebts = () => useFinList<Debt>("debts", [], (q) => q.order("created_at", { ascending: false }));

export const useFinGoals = () => useFinList<FinGoal>("fin_goals", [], (q) => q.order("created_at"));

export const useReserves = () => useFinList<Reserve>("reserves", [], (q) => q.order("date", { ascending: false }));

/* ------------------------------ Gravações ------------------------------ */

const LABEL: Record<string, string> = {
  fin_accounts: "Conta", credit_cards: "Cartão", fin_categories: "Categoria", transactions: "Lançamento",
  payables: "Conta a pagar", receivables: "Conta a receber", debts: "Dívida", fin_goals: "Meta", reserves: "Reserva",
};

/** Salvar (cria se não tiver id), remover e atualizar campos de qualquer tabela do financeiro. */
export function useFinMutations(table: keyof typeof LABEL) {
  const qc = useQueryClient();
  const scope = useScope();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["fin"] });
    qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
  };

  const save = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { id, ...rest } = row;
      if (id) {
        const { error } = await supabase.from(table).update(rest).eq("id", id as string);
        if (error) throw error;
      } else {
        const base: Record<string, unknown> = { workspace_id: scope.wsId };
        if (HAS_BUSINESS[table] && !("business_id" in rest)) base.business_id = scope.businessIdForNew;
        const { error } = await supabase.from(table).insert({ ...base, ...rest });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(`Não salvou: ${translate(e.message)}`),
  });

  const patch = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Record<string, unknown> }) => {
      const { error } = await supabase.from(table).update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(translate(e.message)),
  });

  /** Lançamentos vão para a lixeira; contas/cartões são arquivados; o resto é apagado. */
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const now = new Date().toISOString();
      const q = table === "transactions" ? supabase.from(table).update({ deleted_at: now })
        : table === "fin_accounts" || table === "credit_cards" ? supabase.from(table).update({ archived_at: now })
        : supabase.from(table).delete();
      const { error } = await q.eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast(`${LABEL[table]} removido(a).`); },
    onError: (e: Error) => toast.error(translate(e.message)),
  });

  return { save, patch, remove };
}

function translate(m: string) {
  if (m.includes("duplicate")) return "Já existe um registro com esse nome.";
  if (m.includes("amount_check") || m.includes("check constraint") && m.includes("amount")) return "O valor precisa ser maior que zero.";
  if (m.includes("last_digits")) return "Os últimos dígitos do cartão precisam ser 4 números.";
  return m;
}
