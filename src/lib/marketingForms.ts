// Formulários de Marketing: conteúdo, campanha e entrega (estado inicial, validação e registro salvo).
import type {
  Campaign, CampaignStatus, ContentItem, ContentStage, Delivery, DeliveryStatus, Priority,
} from "@/integrations/supabase/types";
import { moneyInput, parseMoney } from "@/lib/format";

const orNull = (v: string) => (v.trim() ? v.trim() : null);
const str = (v: string | null | undefined) => v ?? "";

/* ------------------------------ Conteúdo ------------------------------ */

export type ContentForm = {
  title: string; kind: string; channel: string | null; stage: ContentStage; priority: Priority;
  campaign_id: string | null; contact_id: string | null; responsible_id: string | null; objective: string;
  recording_at: string; due_date: string; publish_at: string; script: string; caption: string; file_url: string; notes: string;
};

export type ContentDefaults = Partial<Pick<ContentForm, "kind" | "stage">>;

const CONTENT_TEXT = ["title", "objective", "recording_at", "due_date", "script", "caption", "file_url", "notes"] as const;

export function contentForm(c: ContentItem | null | undefined, d: ContentDefaults = {}): ContentForm {
  const f: ContentForm = {
    title: "", kind: d.kind ?? "Post", channel: "Instagram", stage: d.stage ?? "ideia", priority: "media",
    campaign_id: null, contact_id: null, responsible_id: null, objective: "", recording_at: "", due_date: "",
    publish_at: "", script: "", caption: "", file_url: "", notes: "",
  };
  if (!c) return f;
  for (const k of CONTENT_TEXT) f[k] = str(c[k]);
  return {
    ...f, kind: c.kind, channel: c.channel, stage: c.stage, priority: c.priority, campaign_id: c.campaign_id,
    contact_id: c.contact_id, responsible_id: c.responsible_id, publish_at: str(c.publish_at?.slice(0, 10)),
  };
}

export const validateContent = (f: ContentForm) => (f.title.trim() ? null : "Informe o título.");

export function contentPayload(f: ContentForm, id?: string) {
  return {
    id, title: f.title.trim(), kind: f.kind, channel: f.channel, stage: f.stage, priority: f.priority,
    campaign_id: f.campaign_id, contact_id: f.contact_id, responsible_id: f.responsible_id, objective: orNull(f.objective),
    recording_at: f.recording_at || null, due_date: f.due_date || null,
    publish_at: f.publish_at ? `${f.publish_at}T12:00:00` : null, script: orNull(f.script), caption: orNull(f.caption),
    file_url: orNull(f.file_url), notes: orNull(f.notes),
  };
}

/* ------------------------------ Campanha ------------------------------ */

const MONEY_KEYS = ["daily_budget", "total_budget", "spend", "revenue"] as const;
const INT_KEYS = ["impressions", "clicks", "leads", "sales"] as const;

export type CampaignForm = Record<(typeof MONEY_KEYS)[number] | (typeof INT_KEYS)[number], string> & {
  name: string; platform: string; objective: string; status: CampaignStatus; contact_id: string | null;
  start_date: string; end_date: string; landing_page: string; region: string; notes: string;
};

const moneyOrBlank = (n: number | null | undefined) => (n ? moneyInput(Number(n)) : "");
const CAMPAIGN_TEXT = ["name", "start_date", "end_date", "landing_page", "region", "notes"] as const;

export function campaignForm(c: Campaign | null | undefined): CampaignForm {
  const f = { platform: "Meta Ads", objective: "Leads", status: "planejada", contact_id: null } as CampaignForm;
  for (const k of CAMPAIGN_TEXT) f[k] = str(c?.[k]);
  for (const k of MONEY_KEYS) f[k] = moneyOrBlank(c?.[k]);
  for (const k of INT_KEYS) f[k] = c?.[k] ? String(c[k]) : "";
  if (!c) return f;
  return { ...f, platform: c.platform, objective: c.objective ?? "", status: c.status, contact_id: c.contact_id };
}

export function validateCampaign(f: CampaignForm): string | null {
  if (!f.name.trim()) return "Informe o nome da campanha.";
  if (MONEY_KEYS.some((k) => f[k].trim() && parseMoney(f[k]) === null)) return "Algum valor em R$ está inválido.";
  if (INT_KEYS.some((k) => f[k].trim() && !/^\d+$/.test(f[k].trim()))) return "Impressões, cliques, leads e vendas são números inteiros.";
  if (f.start_date && f.end_date && f.end_date < f.start_date) return "O fim vem antes do início.";
  return null;
}

export function campaignPayload(f: CampaignForm, id?: string) {
  const row: Record<string, unknown> = {
    id, name: f.name.trim(), platform: f.platform, objective: f.objective, status: f.status, contact_id: f.contact_id,
    start_date: f.start_date || null, end_date: f.end_date || null, landing_page: orNull(f.landing_page),
    region: orNull(f.region), notes: orNull(f.notes),
  };
  for (const k of MONEY_KEYS) row[k] = f[k].trim() ? parseMoney(f[k]) : k.endsWith("budget") ? null : 0;
  for (const k of INT_KEYS) row[k] = f[k].trim() ? Number(f[k]) : 0;
  return row;
}

/* ------------------------------ Entrega ------------------------------ */

export type DeliveryForm = {
  title: string; contact_id: string | null; type: string | null; due_date: string; status: DeliveryStatus;
  responsible_id: string | null; links: string; client_comments: string; notes: string;
};

const DELIVERY_TEXT = ["title", "due_date", "links", "client_comments", "notes"] as const;

export function deliveryForm(d: Delivery | null | undefined): DeliveryForm {
  const f = { contact_id: null, type: null, status: "pendente", responsible_id: null } as DeliveryForm;
  for (const k of DELIVERY_TEXT) f[k] = str(d?.[k]);
  if (!d) return f;
  return { ...f, contact_id: d.contact_id, type: d.type, status: d.status, responsible_id: d.responsible_id };
}

export const validateDelivery = (f: DeliveryForm) => (f.title.trim() ? null : "Informe o título.");

export function deliveryPayload(f: DeliveryForm, id?: string) {
  return {
    id, title: f.title.trim(), contact_id: f.contact_id, type: f.type, due_date: f.due_date || null, status: f.status,
    responsible_id: f.responsible_id, links: orNull(f.links), client_comments: orNull(f.client_comments), notes: orNull(f.notes),
  };
}
