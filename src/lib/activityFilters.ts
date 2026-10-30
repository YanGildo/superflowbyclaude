// Filtros e números das telas Conversões e Registro de Contatos.
import type { Activity } from "@/integrations/supabase/types";

export interface ActivityFilter { type: string | null; contact: string | null; campaign: string | null; channel: string | null; status: string | null; from: string; to: string }

export const EMPTY_FILTER: ActivityFilter = { type: null, contact: null, campaign: null, channel: null, status: null, from: "", to: "" };

const day = (a: Activity) => a.at.slice(0, 10);

/** Cada filtro vazio deixa passar; os preenchidos precisam bater. */
const CHECKS: ((a: Activity, f: ActivityFilter) => boolean)[] = [
  (a, f) => !f.type || a.type === f.type,
  (a, f) => !f.contact || a.contact_id === f.contact,
  (a, f) => !f.campaign || a.campaign_id === f.campaign,
  (a, f) => !f.channel || a.channel === f.channel,
  (a, f) => !f.status || a.outcome === f.status,
  (a, f) => !f.from || day(a) >= f.from,
  (a, f) => !f.to || day(a) <= f.to,
];

export const matchesActivity = (a: Activity, f: ActivityFilter) => CHECKS.every((c) => c(a, f));

export const isFiltered = (f: ActivityFilter) => Object.values(f).some(Boolean);

const sum = (l: Activity[]) => l.reduce((acc, a) => acc + Number(a.value ?? 0), 0);
const CLOSED_TYPES = ["Negócio fechado", "Venda avulsa", "Upsell", "Renovação"];

export type Kpi = { label: string; value: string | number; tone?: string; money?: boolean };

export function conversionKpis(all: Activity[], ym: string): Kpi[] {
  const month = all.filter((a) => a.at.slice(0, 7) === ym);
  const of = (t: string) => month.filter((a) => a.type === t);
  return [
    { label: "Conversões do mês", value: month.length },
    { label: "Leads gerados", value: of("Lead gerado").length },
    { label: "Propostas enviadas", value: of("Proposta enviada").length },
    { label: "Negócios fechados", value: of("Negócio fechado").length, tone: "text-success" },
    { label: "Valor potencial", value: sum(of("Proposta enviada")), money: true },
    { label: "Valor fechado", value: sum(month.filter((a) => CLOSED_TYPES.includes(a.type))), money: true, tone: "text-success" },
  ];
}

export function contactKpis(all: Activity[]): Kpi[] {
  const by = (s: string) => all.filter((a) => a.outcome === s).length;
  return [
    { label: "Total", value: all.length },
    { label: "Pendentes / abertos", value: by("pendente"), tone: "text-warning" },
    { label: "Fechados", value: by("fechado"), tone: "text-success" },
    { label: "Perdidos", value: by("perdido"), tone: "text-destructive" },
  ];
}
