// Regras do formulário de lançamento (TransactionDialog): estado inicial,
// validação e montagem do registro salvo. Sem React, sem UI.
import type { Business, Transaction, TxType, UseType } from "@/integrations/supabase/types";
import { localISODate, moneyInput, parseMoney } from "@/lib/format";

export type TxForm = {
  type: TxType; amount: string; date: string; description: string; category_id: string | null;
  account_id: string | null; card_id: string | null; to_account_id: string | null; method: string;
  status: "pago" | "pendente"; essential: boolean; use_type: UseType; business_id: string | null; notes: string;
};

const CARD = "Cartão de crédito";

export const DESC_PLACEHOLDER: Record<TxType, string> = {
  entrada: "Ex.: Mensalidade Padaria Pão Bom",
  saida: "Ex.: Meta Ads",
  transferencia: "Ex.: Reserva do mês",
};

function fromTransaction(tx: Transaction): TxForm {
  return {
    type: tx.type, amount: moneyInput(tx.amount), date: tx.date, description: tx.description,
    category_id: tx.category_id, account_id: tx.account_id, card_id: tx.card_id, to_account_id: tx.to_account_id,
    method: tx.method ?? "Pix", status: tx.status, essential: tx.essential, use_type: tx.use_type,
    business_id: tx.business_id, notes: tx.notes ?? "",
  };
}

export function initialTxForm(
  tx: Transaction | null | undefined,
  ctx: { defaultType: TxType; businessFilter: string; businesses: Business[]; firstAccountId: string | null },
): TxForm {
  if (tx) return fromTransaction(tx);
  const biz = ctx.businessFilter === "all" ? null : ctx.businessFilter;
  const personal = ctx.businesses.find((b) => b.id === biz)?.kind === "pessoal";
  return {
    type: ctx.defaultType, amount: "", date: localISODate(), description: "", category_id: null,
    account_id: ctx.firstAccountId, card_id: null, to_account_id: null, method: "Pix", status: "pago",
    essential: false, use_type: personal ? "pessoal" : "negocio", business_id: biz, notes: "",
  };
}

/** Mensagem de erro para o usuário, ou null se o formulário está ok. */
export function validateTxForm(f: TxForm): string | null {
  const amount = parseMoney(f.amount);
  if (amount === null || amount <= 0) return "Informe um valor maior que zero.";
  if (!f.description.trim()) return "Escreva uma descrição (ex.: Mercado, Cliente X).";
  const isTransfer = f.type === "transferencia";
  if (isTransfer && (!f.account_id || !f.to_account_id)) return "Escolha a conta de origem e a de destino.";
  if (isTransfer && f.account_id === f.to_account_id) return "Origem e destino precisam ser contas diferentes.";
  return null;
}

/** Registro a salvar. Chame só depois de validateTxForm devolver null. */
export function txPayload(f: TxForm, id: string | undefined) {
  const isTransfer = f.type === "transferencia";
  const isOut = f.type === "saida";
  return {
    id, type: f.type, amount: parseMoney(f.amount) as number, date: f.date, description: f.description.trim(),
    category_id: isTransfer ? null : f.category_id,
    account_id: f.card_id ? null : f.account_id, card_id: isOut ? f.card_id : null,
    to_account_id: isTransfer ? f.to_account_id : null,
    method: f.card_id ? CARD : f.method, status: f.status, essential: isOut && f.essential,
    use_type: f.use_type, business_id: f.business_id, notes: f.notes || null,
  };
}

/** Mostra o seletor de cartão em vez da conta? */
export function showsCard(f: TxForm, hasCards: boolean): boolean {
  return f.type === "saida" && (f.method === CARD || Boolean(f.card_id)) && hasCards;
}

export function statusLabel(f: TxForm): string {
  if (f.status !== "pago") return "Pendente";
  return f.type === "entrada" ? "Recebido" : "Pago";
}
