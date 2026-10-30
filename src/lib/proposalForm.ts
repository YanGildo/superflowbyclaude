// Formulário de proposta: itens, totais, validação e texto pronto para enviar.
import type { Contact, Proposal, ProposalItem, ProposalStatus } from "@/integrations/supabase/types";
import { brl, moneyInput, parseMoney } from "@/lib/format";
import { proposalTotals } from "@/lib/crm";

export type ItemRow = { service_id: string | null; description: string; quantity: string; unit_price: string; recurring: boolean };

export type ProposalForm = {
  contact_id: string | null; title: string; status: ProposalStatus; billing_day: string; valid_until: string;
  min_term_months: string; payment_method: string; notes: string; items: ItemRow[];
};

export const emptyItem = (): ItemRow => ({ service_id: null, description: "", quantity: "1", unit_price: "", recurring: true });

export function proposalForm(p: Proposal | null | undefined, items: ProposalItem[], contactId: string | null): ProposalForm {
  if (!p) {
    return { contact_id: contactId, title: "", status: "rascunho", billing_day: "10", valid_until: "", min_term_months: "3",
      payment_method: "Pix", notes: "", items: [emptyItem()] };
  }
  return {
    contact_id: p.contact_id, title: p.title, status: p.status, billing_day: p.billing_day?.toString() ?? "",
    valid_until: p.valid_until ?? "", min_term_months: p.min_term_months?.toString() ?? "", payment_method: p.payment_method ?? "",
    notes: p.notes ?? "",
    items: items.length ? items.map((i) => ({ service_id: i.service_id, description: i.description, quantity: String(i.quantity),
      unit_price: moneyInput(i.unit_price), recurring: i.recurring })) : [emptyItem()],
  };
}

/** Itens válidos (com descrição), já com números. */
export function parsedItems(f: ProposalForm) {
  return f.items.filter((i) => i.description.trim()).map((i) => ({
    service_id: i.service_id, description: i.description.trim(), quantity: Number(i.quantity.replace(",", ".")) || 1,
    unit_price: parseMoney(i.unit_price) ?? 0, recurring: i.recurring, position: 0,
  }));
}

export const formTotals = (f: ProposalForm) => proposalTotals(parsedItems(f));

export function validateProposal(f: ProposalForm): string | null {
  if (!f.contact_id) return "Escolha o lead ou cliente.";
  if (!f.title.trim()) return "Dê um título à proposta.";
  if (parsedItems(f).length === 0) return "Adicione pelo menos um item.";
  const day = Number(f.billing_day);
  if (f.billing_day && (!Number.isInteger(day) || day < 1 || day > 28)) return "Dia de cobrança: de 1 a 28.";
  return null;
}

const intOrNull = (s: string) => (s.trim() ? Number(s) : null);

export function proposalPayload(f: ProposalForm, id: string | undefined) {
  const t = formTotals(f);
  return {
    id, contact_id: f.contact_id, title: f.title.trim(), status: f.status, monthly_value: t.monthly, setup_fee: t.oneOff,
    billing_day: intOrNull(f.billing_day), valid_until: f.valid_until || null, min_term_months: intOrNull(f.min_term_months),
    payment_method: f.payment_method.trim() || null, notes: f.notes.trim() || null,
  };
}

/** Texto da proposta para copiar e mandar no WhatsApp. */
export function proposalText(p: Proposal, items: ProposalItem[], contact?: Contact): string {
  const first = (contact?.contact_person || contact?.name || "").split(" ")[0];
  const line = (i: ProposalItem) => `• ${i.description}${Number(i.quantity) > 1 ? ` (x${i.quantity})` : ""} — ${brl(Number(i.quantity) * Number(i.unit_price))}${i.recurring ? "/mês" : ""}`;
  return [
    `Olá${first ? `, ${first}` : ""}! Segue a proposta *${p.title}*:`,
    "",
    ...items.map(line),
    "",
    Number(p.monthly_value) > 0 ? `*Mensalidade:* ${brl(Number(p.monthly_value))}` : null,
    Number(p.setup_fee) > 0 ? `*Investimento inicial:* ${brl(Number(p.setup_fee))}` : null,
    p.min_term_months ? `Prazo mínimo: ${p.min_term_months} meses` : null,
    p.payment_method ? `Pagamento: ${p.payment_method}${p.billing_day ? `, todo dia ${p.billing_day}` : ""}` : null,
    p.valid_until ? `Válida até ${new Date(p.valid_until + "T12:00:00").toLocaleDateString("pt-BR")}` : null,
    "",
    "Qualquer dúvida, é só me chamar. Podemos começar?",
  ].filter((l) => l !== null).join("\n");
}
