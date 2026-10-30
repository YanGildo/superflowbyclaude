// Formulário de cliente/contato: estado inicial, validação e registro salvo.
import type { Contact, ContactStatus, Temperature } from "@/integrations/supabase/types";
import { moneyInput, parseMoney } from "@/lib/format";

export type ContactForm = {
  name: string; company: string; contact_person: string; phone: string; email: string; instagram: string; website: string;
  city: string; state: string; segment: string; source: string | null; status: ContactStatus; temperature: Temperature | null;
  plan_name: string; monthly_value: string; start_date: string; services: string[]; next_action: string;
  next_contact_at: string; notes: string; business_id: string | null;
};

/** Campos de texto que vêm direto do contato (null vira ""). */
const TEXT_KEYS = ["name", "company", "contact_person", "email", "instagram", "website", "city", "state", "segment",
  "plan_name", "start_date", "next_action", "notes"] as const;

function emptyForm(ctx: { status: ContactStatus; businessId: string | null }): ContactForm {
  return {
    name: "", company: "", contact_person: "", phone: "", email: "", instagram: "", website: "", city: "", state: "",
    segment: "", source: null, status: ctx.status, temperature: null, plan_name: "", monthly_value: "", start_date: "",
    services: [], next_action: "", next_contact_at: "", notes: "", business_id: ctx.businessId,
  };
}

export function contactForm(c: Contact | null | undefined, ctx: { status: ContactStatus; businessId: string | null }): ContactForm {
  const f = emptyForm(ctx);
  if (!c) return f;
  for (const k of TEXT_KEYS) f[k] = c[k] ?? "";
  return {
    ...f, phone: c.whatsapp ?? c.phone ?? "", source: c.source, status: c.status, temperature: c.temperature,
    monthly_value: c.monthly_value != null ? moneyInput(c.monthly_value) : "", services: c.services ?? [],
    next_contact_at: c.next_contact_at?.slice(0, 10) ?? "", business_id: c.business_id,
  };
}

export function validateContact(f: ContactForm): string | null {
  if (!f.name.trim()) return "Informe o nome.";
  if (f.monthly_value.trim() && parseMoney(f.monthly_value) === null) return "Mensalidade inválida.";
  if (f.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim())) return "E-mail inválido.";
  return null;
}

const orNull = (v: string) => (v.trim() ? v.trim() : null);

export function contactPayload(f: ContactForm, id: string | undefined) {
  return {
    id, name: f.name.trim(), company: orNull(f.company), contact_person: orNull(f.contact_person),
    phone: orNull(f.phone), whatsapp: orNull(f.phone), email: orNull(f.email), instagram: orNull(f.instagram),
    website: orNull(f.website), city: orNull(f.city), state: orNull(f.state), segment: orNull(f.segment), source: f.source,
    status: f.status, temperature: f.temperature, plan_name: orNull(f.plan_name),
    monthly_value: f.monthly_value.trim() ? parseMoney(f.monthly_value) : null, start_date: f.start_date || null,
    services: f.services, next_action: orNull(f.next_action), next_contact_at: f.next_contact_at || null,
    notes: orNull(f.notes), business_id: f.business_id, kind: f.company.trim() ? "empresa" : "pessoa",
  };
}
