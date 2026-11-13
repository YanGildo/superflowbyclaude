// Visão de dentro da campanha: quando cada lead chegou, ordem, filtros, grupos e exportação.
import type { Contact, Deal, PipelineStage } from "@/integrations/supabase/types";
import { formAnswers } from "@/lib/leadImport";

export type SortMode = "temperatura" | "recentes" | "antigos" | "nome";
export type TempFilter = "todas" | "quente" | "morno" | "frio" | "sem";
export type DateFilter = "todas" | "hoje" | "ontem" | "7d" | "30d";

export const SORTS: { value: SortMode; label: string }[] = [
  { value: "temperatura", label: "Quentes primeiro" },
  { value: "recentes", label: "Chegada: mais recentes" },
  { value: "antigos", label: "Chegada: mais antigos" },
  { value: "nome", label: "Nome (A-Z)" },
];
export const TEMP_FILTERS: { value: TempFilter; label: string }[] = [
  { value: "todas", label: "Todas" }, { value: "quente", label: "Quente" }, { value: "morno", label: "Morno" },
  { value: "frio", label: "Frio" }, { value: "sem", label: "Sem temperatura" },
];
export const DATE_FILTERS: { value: DateFilter; label: string }[] = [
  { value: "todas", label: "Qualquer data" }, { value: "hoje", label: "Hoje" }, { value: "ontem", label: "Ontem" },
  { value: "7d", label: "Últimos 7 dias" }, { value: "30d", label: "Últimos 30 dias" },
];

/** Quando o lead chegou: data do lead no Meta (importação) ou quando entrou na campanha. */
export function arrivedAt(deal: Deal, contact?: Contact): Date {
  const meta = contact?.meta?.created_time;
  const d = typeof meta === "string" ? new Date(meta) : null;
  return d && !Number.isNaN(d.getTime()) ? d : new Date(deal.created_at);
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dayDiff = (d: Date, now = new Date()) => Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 864e5);
const hhmm = (d: Date) => d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const ddmm = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const WEEKDAY = (d: Date) => d.toLocaleDateString("pt-BR", { weekday: "long" });

/** "Hoje" / "Ontem" / "terça-feira · 10/11" / "02/10/2026". */
export function dayLabel(d: Date): string {
  const n = dayDiff(d);
  if (n === 0) return "Hoje";
  if (n === 1) return "Ontem";
  if (n > 1 && n < 7) return `${WEEKDAY(d)} · ${ddmm(d)}`;
  return d.toLocaleDateString("pt-BR");
}
/** No card: "Hoje, 14:32" / "Ontem, 09:10" / "10/11, 18:00". */
export const arrivalShort = (d: Date) => {
  const n = dayDiff(d);
  return `${n === 0 ? "Hoje" : n === 1 ? "Ontem" : ddmm(d)}, ${hhmm(d)}`;
};
export const arrivalFull = (d: Date) => d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const TEMP_RANK: Record<string, number> = { quente: 0, morno: 1, frio: 2 };
const rank = (c?: Contact) => (c?.temperature ? TEMP_RANK[c.temperature] ?? 3 : 3);

function passDate(d: Date, f: DateFilter) {
  const n = dayDiff(d);
  if (f === "hoje") return n === 0;
  if (f === "ontem") return n === 1;
  if (f === "7d") return n < 7;
  if (f === "30d") return n < 30;
  return true;
}
const passTemp = (c: Contact | undefined, f: TempFilter) => f === "todas" || (f === "sem" ? !c?.temperature : c?.temperature === f);

export interface ViewOpts { sort: SortMode; temp: TempFilter; date: DateFilter }
export const DEFAULT_VIEW: ViewOpts = { sort: "temperatura", temp: "todas", date: "todas" };

export function applyView(deals: Deal[], contacts: Map<string, Contact>, v: ViewOpts): Deal[] {
  const at = new Map(deals.map((d) => [d.id, arrivedAt(d, contacts.get(d.contact_id)).getTime()]));
  const list = deals.filter((d) => passTemp(contacts.get(d.contact_id), v.temp) && passDate(new Date(at.get(d.id) ?? 0), v.date));
  const byRecent = (a: Deal, b: Deal) => (at.get(b.id) ?? 0) - (at.get(a.id) ?? 0);
  const cmp: Record<SortMode, (a: Deal, b: Deal) => number> = {
    temperatura: (a, b) => rank(contacts.get(a.contact_id)) - rank(contacts.get(b.contact_id)) || byRecent(a, b),
    recentes: byRecent,
    antigos: (a, b) => -byRecent(a, b),
    nome: (a, b) => a.title.localeCompare(b.title, "pt-BR"),
  };
  return [...list].sort(cmp[v.sort]);
}

const TEMP_TITLE: Record<number, string> = { 0: "Quentes", 1: "Mornos", 2: "Frios", 3: "Sem temperatura" };

/** Divide a lista já ordenada em grupos com título (temperatura ou dia de chegada). */
export function groupDeals(deals: Deal[], contacts: Map<string, Contact>, sort: SortMode): { key: string; title: string; deals: Deal[] }[] {
  if (sort === "nome") return [{ key: "all", title: "", deals }];
  const groups: { key: string; title: string; deals: Deal[] }[] = [];
  deals.forEach((d) => {
    const c = contacts.get(d.contact_id);
    const title = sort === "temperatura" ? TEMP_TITLE[rank(c)] : dayLabel(arrivedAt(d, c));
    const last = groups[groups.length - 1];
    if (last?.title === title) last.deals.push(d); else groups.push({ key: `${title}-${groups.length}`, title, deals: [d] });
  });
  return groups;
}

/* ------------------------------ Exportar ------------------------------ */

const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const metaStr = (c: Contact | undefined, k: string) => (typeof c?.meta?.[k] === "string" ? String(c.meta[k]) : "");

/** CSV (separado por ; e com acento certo no Excel) com dados do lead, etapa, chegada e respostas. */
export function leadsCsv(deals: Deal[], contacts: Map<string, Contact>, stages: PipelineStage[]): string {
  const stageName = new Map(stages.map((s) => [s.id, s.name]));
  const qs = [...new Set(deals.flatMap((d) => formAnswers(contacts.get(d.contact_id)?.meta).map((a) => a.pergunta)))];
  const head = ["Nome", "Telefone", "E-mail", "Cidade", "País", "Temperatura", "Etapa", "Chegou em", "Origem", "Formulário", "Campanha do anúncio", "Anúncio", ...qs];
  const body = deals.map((d) => {
    const c = contacts.get(d.contact_id);
    const ans = formAnswers(c?.meta);
    return [c?.name ?? d.title, c?.whatsapp ?? c?.phone, c?.email, c?.city, c?.country, c?.temperature, stageName.get(d.stage_id),
      arrivalFull(arrivedAt(d, c)), c?.source, metaStr(c, "form_name"), metaStr(c, "campaign_name"), metaStr(c, "ad_name"),
      ...qs.map((q) => ans.find((a) => a.pergunta === q)?.resposta)];
  });
  return "﻿" + [head, ...body].map((l) => l.map(cell).join(";")).join("\n");
}

export function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}

export const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
