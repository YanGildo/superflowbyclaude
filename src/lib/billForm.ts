// Regras do formulário de conta a pagar/receber (BillDialog).
import type { BillRecurrence, Payable, Receivable } from "@/integrations/supabase/types";
import { localISODate, moneyInput, parseMoney } from "@/lib/format";

export const BILL_RECURRENCE: Record<BillRecurrence, string> = { none: "Não repete", weekly: "Toda semana", monthly: "Todo mês", yearly: "Todo ano" };

export type BillKind = "pagar" | "receber";
export type BillForm = {
  title: string; amount: string; date: string; recurrence: BillRecurrence; category_id: string | null;
  account_id: string | null; card_id: string | null; method: string; business_id: string | null; notes: string;
};

function fromBill(bill: Payable | Receivable): BillForm {
  const pay = "due_date" in bill ? (bill as Payable) : null;
  return {
    title: bill.title, amount: moneyInput(bill.amount), date: pay ? pay.due_date : (bill as Receivable).expected_date,
    recurrence: bill.recurrence, category_id: bill.category_id, account_id: bill.account_id,
    card_id: pay ? pay.card_id : null, method: pay ? pay.method ?? "Pix" : "Pix",
    business_id: bill.business_id, notes: bill.notes ?? "",
  };
}

export function initialBillForm(
  bill: Payable | Receivable | null | undefined,
  ctx: { businessFilter: string; firstAccountId: string | null },
): BillForm {
  if (bill) return fromBill(bill);
  return { title: "", amount: "", date: localISODate(), recurrence: "none", category_id: null, account_id: ctx.firstAccountId,
    card_id: null, method: "Pix", business_id: ctx.businessFilter === "all" ? null : ctx.businessFilter, notes: "" };
}

export function validateBillForm(f: BillForm, kind: BillKind): string | null {
  if (!f.title.trim()) return kind === "pagar" ? "O que é essa conta? (ex.: Aluguel)" : "O que vai receber? (ex.: Mensalidade cliente X)";
  const amount = parseMoney(f.amount);
  if (amount === null || amount <= 0) return "Informe um valor maior que zero.";
  if (!f.date) return "Informe a data.";
  return null;
}

/** Registro a salvar. Chame só depois de validateBillForm devolver null. */
export function billPayload(f: BillForm, kind: BillKind, id: string | undefined) {
  const common = { id, title: f.title.trim(), amount: parseMoney(f.amount) as number, recurrence: f.recurrence, category_id: f.category_id,
    account_id: f.account_id, business_id: f.business_id, notes: f.notes || null };
  return kind === "pagar"
    ? { ...common, due_date: f.date, method: f.card_id ? "Cartão de crédito" : f.method, card_id: f.card_id }
    : { ...common, expected_date: f.date };
}

/** Textos que mudam entre "pagar" e "receber". */
export const BILL_TEXT: Record<BillKind, { done: string; titlePh: string; dateLabel: string; accLabel: string; cat: "saida" | "entrada" }> = {
  pagar: { done: "paga", titlePh: "Ex.: Aluguel, Internet, Ferramentas", dateLabel: "Vencimento", accLabel: "Sai da conta", cat: "saida" },
  receber: { done: "recebida", titlePh: "Ex.: Mensalidade Padaria Pão Bom", dateLabel: "Previsto para", accLabel: "Entra na conta", cat: "entrada" },
};
