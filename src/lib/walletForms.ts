// Formulário de cartão de crédito (Carteira): estado inicial, validação e registro salvo.
import type { CreditCard } from "@/integrations/supabase/types";
import { WALLET_COLORS } from "@/lib/finance";
import { moneyInput, parseMoney } from "@/lib/format";

export type CardForm = { name: string; brand: string; last: string; limit: string; closing: string; due: string; color: string };

export function cardForm(card: CreditCard | null | undefined): CardForm {
  if (!card) return { name: "", brand: "", last: "", limit: "", closing: "", due: "", color: WALLET_COLORS[6] };
  return {
    name: card.name, brand: card.brand ?? "", last: card.last_digits ?? "", limit: moneyInput(card.credit_limit),
    closing: card.closing_day?.toString() ?? "", due: card.due_day?.toString() ?? "", color: card.color ?? WALLET_COLORS[6],
  };
}

const day = (s: string) => (s.trim() === "" ? null : Number(s));
const limitOf = (f: CardForm) => (f.limit.trim() ? parseMoney(f.limit) : 0);
const badDay = (d: number | null) => d !== null && (!Number.isInteger(d) || d < 1 || d > 31);

export function validateCardForm(f: CardForm): string | null {
  if (!f.name.trim()) return "Dê um nome ao cartão (ex.: Nubank roxinho).";
  if (f.last && !/^\d{4}$/.test(f.last)) return "Últimos dígitos: exatamente 4 números.";
  const limit = limitOf(f);
  if (limit === null || limit < 0) return "Limite inválido.";
  if ([day(f.closing), day(f.due)].some(badDay)) return "Dias precisam estar entre 1 e 31.";
  return null;
}

/** Registro a salvar. Chame só depois de validateCardForm devolver null. */
export function cardPayload(f: CardForm, id: string | undefined) {
  return {
    id, name: f.name.trim(), brand: f.brand || null, last_digits: f.last || null, credit_limit: limitOf(f) as number,
    closing_day: day(f.closing), due_day: day(f.due), color: f.color,
  };
}
