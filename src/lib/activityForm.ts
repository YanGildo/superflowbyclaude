// Formulário de registro de contato / conversão.
import type { Activity } from "@/integrations/supabase/types";
import { moneyInput, parseMoney } from "@/lib/format";

export type ActivityForm = {
  category: Activity["category"]; contact_id: string | null; type: string; channel: string | null; at: string;
  summary: string; notes: string; outcome: string; value: string; next_follow_up_at: string; campaign_id: string | null;
};

/** "yyyy-mm-ddThh:mm" no fuso local, para <input type="datetime-local">. */
export function localDateTime(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function activityForm(a: Activity | null | undefined, ctx: { category: Activity["category"]; contactId: string | null; type: string }): ActivityForm {
  if (!a) {
    return { category: ctx.category, contact_id: ctx.contactId, type: ctx.type, channel: null, at: localDateTime(), summary: "",
      notes: "", outcome: ctx.category === "contato" ? "pendente" : "fechado", value: "", next_follow_up_at: "", campaign_id: null };
  }
  return {
    category: a.category, contact_id: a.contact_id, type: a.type, channel: a.channel, at: localDateTime(new Date(a.at)),
    summary: a.summary ?? "", notes: a.notes ?? "", outcome: a.outcome ?? "pendente",
    value: a.value != null ? moneyInput(a.value) : "", next_follow_up_at: a.next_follow_up_at?.slice(0, 10) ?? "",
    campaign_id: a.campaign_id,
  };
}

export function validateActivity(f: ActivityForm): string | null {
  if (!f.type) return "Escolha o tipo.";
  if (!f.at) return "Informe a data.";
  if (f.value.trim() && parseMoney(f.value) === null) return "Valor inválido.";
  return null;
}

export function activityPayload(f: ActivityForm, id: string | undefined) {
  return {
    id, category: f.category, contact_id: f.contact_id, type: f.type, channel: f.channel, at: new Date(f.at).toISOString(),
    summary: f.summary.trim() || null, notes: f.notes.trim() || null, outcome: f.outcome,
    value: f.value.trim() ? parseMoney(f.value) : null, next_follow_up_at: f.next_follow_up_at || null, campaign_id: f.campaign_id,
    origin: "manual",
  };
}
