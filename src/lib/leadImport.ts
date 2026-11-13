// Importação de leads em CSV (Central de Leads do Meta ou qualquer planilha):
// codificação e separador automáticos, mapeamento de colunas, limpeza e temperatura por regras.
import type { Pipeline, TemperatureRule } from "@/integrations/supabase/types";

/* ------------------------------ Arquivo ------------------------------ */

/** Lê bytes em UTF-8 / UTF-8 com BOM / UTF-16 LE / UTF-16 BE (com ou sem BOM). */
export function decodeBytes(buf: ArrayBuffer): { text: string; encoding: string } {
  const b = new Uint8Array(buf);
  if (b[0] === 0xff && b[1] === 0xfe) return { text: new TextDecoder("utf-16le").decode(b.subarray(2)), encoding: "UTF-16 LE" };
  if (b[0] === 0xfe && b[1] === 0xff) return { text: new TextDecoder("utf-16be").decode(b.subarray(2)), encoding: "UTF-16 BE" };
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return { text: new TextDecoder("utf-8").decode(b.subarray(3)), encoding: "UTF-8 com BOM" };
  const sample = b.subarray(0, Math.min(b.length, 400));
  let zeroOdd = 0; let zeroEven = 0;
  sample.forEach((v, i) => { if (v === 0) { if (i % 2) zeroOdd += 1; else zeroEven += 1; } });
  if (zeroOdd > sample.length / 4) return { text: new TextDecoder("utf-16le").decode(b), encoding: "UTF-16 LE" };
  if (zeroEven > sample.length / 4) return { text: new TextDecoder("utf-16be").decode(b), encoding: "UTF-16 BE" };
  return { text: new TextDecoder("utf-8").decode(b), encoding: "UTF-8" };
}

export function detectSeparator(text: string): string {
  const head = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => head.split(ch).length - 1;
  return [["\t", count("\t")], [";", count(";")], [",", count(",")]].sort((a, b) => Number(b[1]) - Number(a[1]))[0][0] as string;
}

/** CSV com aspas (inclusive quebras de linha dentro de aspas). */
export function parseDelimited(text: string, sep: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cur = ""; let q = false;
  const endRow = () => { row.push(cur); cur = ""; if (row.some((c) => c.trim())) rows.push(row); row = []; };
  const src = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (q && ch === '"' && src[i + 1] === '"') { cur += '"'; i += 1; }
    else if (q) { if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"' && cur === "") q = true;
    else if (ch === sep) { row.push(cur); cur = ""; }
    else if (ch === "\n") endRow();
    else cur += ch;
  }
  endRow();
  return rows.map((r) => r.map((c) => c.trim()));
}

export interface ParsedFile { headers: string[]; rows: string[][]; encoding: string; separator: string }

export function readLeadFile(buf: ArrayBuffer): ParsedFile {
  const { text, encoding } = decodeBytes(buf);
  const separator = detectSeparator(text);
  const [headers = [], ...rows] = parseDelimited(text.replace(/^\uFEFF/, ""), separator);
  return { headers, rows, encoding, separator: separator === "\t" ? "TAB" : separator };
}

/* ------------------------------ Mapeamento ------------------------------ */

export const FIELDS = [
  { value: "name", label: "Nome" }, { value: "first_name", label: "Primeiro nome" }, { value: "last_name", label: "Sobrenome" },
  { value: "phone", label: "Telefone / WhatsApp" }, { value: "email", label: "E-mail" }, { value: "city", label: "Cidade" },
  { value: "country", label: "País" }, { value: "meta_lead_id", label: "ID do lead (Meta)" }, { value: "created_time", label: "Data do lead" },
  { value: "campaign_name", label: "Campanha (anúncio)" }, { value: "adset_name", label: "Conjunto de anúncios" },
  { value: "ad_name", label: "Anúncio" }, { value: "form_name", label: "Formulário" }, { value: "platform", label: "Plataforma (fb/ig)" },
  { value: "is_organic", label: "Orgânico" }, { value: "answer", label: "Resposta do formulário" }, { value: "ignore", label: "Ignorar" },
] as const;
export type Field = (typeof FIELDS)[number]["value"];

const key = (h: string) => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s-]+/g, "_").trim();
const KNOWN: Record<string, Field> = {
  full_name: "name", nome: "name", nome_completo: "name", name: "name", first_name: "first_name", primeiro_nome: "first_name",
  last_name: "last_name", sobrenome: "last_name",
  phone_number: "phone", telefone: "phone", phone: "phone", whatsapp: "phone", celular: "phone", telemovel: "phone",
  email: "email", e_mail: "email", city: "city", cidade: "city", country: "country", pais: "country",
  id: "meta_lead_id", lead_id: "meta_lead_id", created_time: "created_time", campaign_name: "campaign_name", adset_name: "adset_name",
  ad_name: "ad_name", form_name: "form_name", platform: "platform", is_organic: "is_organic",
};
// Colunas técnicas do Meta que não são perguntas.
const IGNORE = new Set(["ad_id", "adset_id", "campaign_id", "form_id", "lead_status", "inbox_url", "is_qualified", "is_quality", "is_converted"]);

export function autoMap(headers: string[]): Field[] {
  return headers.map((h) => KNOWN[key(h)] ?? (IGNORE.has(key(h)) ? "ignore" : "answer"));
}

/* ------------------------------ Limpeza ------------------------------ */

export const cleanPhone = (v: string) => v.replace(/^\s*p:\s*/i, "").replace(/[^\d+]/g, "");
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
/** "quando_pretende_mudar?" → "Quando pretende mudar?" */
export const prettyQuestion = (h: string) => cap(h.replace(/_/g, " ").replace(/\s+/g, " ").trim());
/** "nos_próximos_30_dias" → "Nos próximos 30 dias" (só mexe em respostas sem espaço com "_"). */
export const prettyAnswer = (v: string) => (/_/.test(v) && !/\s/.test(v.trim()) ? cap(v.replace(/_/g, " ").trim()) : v.trim());

export const DEFAULT_RULES: { rules: TemperatureRule[]; fallback: "quente" | "morno" | "frio" } = {
  rules: [
    { temperature: "quente", contains: ["30 dias", "1 a 3 meses"] },
    { temperature: "morno", contains: ["3 a 6 meses"] },
    { temperature: "frio", contains: ["mais de 6 meses", "pesquisando"] },
  ],
  fallback: "morno",
};
export const rulesOf = (p: Pipeline | undefined) => p?.temperature_rules ?? DEFAULT_RULES;

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
export function temperatureFor(answers: string[], cfg = DEFAULT_RULES): "quente" | "morno" | "frio" {
  const all = fold(answers.join(" | "));
  return cfg.rules.find((r) => r.contains.some((t) => t.trim() && all.includes(fold(t.trim()))))?.temperature ?? cfg.fallback;
}

/* ------------------------------ Linhas prontas para o banco ------------------------------ */

export interface LeadRow {
  line: number; name: string | null; phone: string | null; email: string | null; city: string | null; country: string | null;
  temperature: string; source: string; meta: Record<string, string | null>; respostas: { pergunta: string; resposta: string }[];
}

const META_KEYS = ["meta_lead_id", "created_time", "campaign_name", "adset_name", "ad_name", "form_name", "platform", "is_organic"] as const;

export function buildRows(file: ParsedFile, map: Field[], sourceTpl: string, rules = DEFAULT_RULES): { rows: LeadRow[]; skipped: number[] } {
  const rows: LeadRow[] = []; const skipped: number[] = [];
  file.rows.forEach((cells, i) => {
    const get = (f: Field) => map.map((m, j) => (m === f ? cells[j] ?? "" : "")).filter(Boolean).join(" ").trim();
    const name = get("name") || [get("first_name"), get("last_name")].filter(Boolean).join(" ");
    const phone = cleanPhone(get("phone"));
    const email = get("email").toLowerCase();
    const respostas = map.flatMap((m, j) => (m === "answer" && cells[j]?.trim() ? [{ pergunta: prettyQuestion(file.headers[j]), resposta: prettyAnswer(cells[j]) }] : []));
    if (!name && !phone && !email) { skipped.push(i + 2); return; }
    const meta = Object.fromEntries(META_KEYS.map((k) => [k, get(k) || null]));
    rows.push({
      line: i + 2, name: name || null, phone: phone || null, email: email || null, city: get("city") || null, country: get("country") || null,
      temperature: temperatureFor(respostas.map((r) => r.resposta), rules),
      source: sourceTpl.replace(/\{form_name\}/g, meta.form_name ?? "").replace(/\s·\s*$/, "").trim(),
      meta, respostas,
    });
  });
  return { rows, skipped };
}

/* ------------------------------ Campanhas ------------------------------ */

export const DEFAULT_STAGES = ["Novo lead", "Em conversa", "Qualificado", "Proposta enviada", "Ganho", "Perdido"];
export const outcomeOf = (name: string): "open" | "won" | "lost" =>
  /^(ganho|fechado|ganhou)/i.test(name.trim()) ? "won" : /^(perdido|perdeu)/i.test(name.trim()) ? "lost" : "open";

export interface StageDraft { name: string; outcome: "open" | "won" | "lost"; set_contact_status: string | null; color: string | null }

/** Etapas novas no mesmo padrão dos funis atuais (status do contato muda junto). */
export function stageDrafts(names: string[]): StageDraft[] {
  return names.map((n) => n.trim()).filter(Boolean).map((name, i) => {
    const outcome = outcomeOf(name);
    const status = outcome === "won" ? "cliente_ativo" : outcome === "lost" ? "perdido" : /proposta|negocia/i.test(name) ? "em_negociacao" : i === 0 ? "lead" : null;
    return { name, outcome, set_contact_status: status, color: null };
  });
}

/** Próxima letra livre: "Campanha D · ". */
export function nextCampaignPrefix(names: string[]): string {
  const used = new Set(names.map((n) => /^Campanha\s+([A-Z])\b/i.exec(n)?.[1]?.toUpperCase()).filter(Boolean));
  const letter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find((l) => !used.has(l)) ?? "Z";
  return `Campanha ${letter} · `;
}

/** Respostas do formulário guardadas no contato: importação (respostas) ou site (answers). */
export function formAnswers(meta: Record<string, unknown> | null | undefined): { pergunta: string; resposta: string }[] {
  const out: { pergunta: string; resposta: string }[] = [];
  const add = (p: unknown, r: unknown) => { if (typeof p === "string" && r != null && String(r).trim()) out.push({ pergunta: p, resposta: String(r) }); };
  const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
  list(meta?.respostas).forEach((x) => add(x?.pergunta, x?.resposta));
  list(meta?.answers).forEach((x) => add(x?.q, x?.a));
  return out;
}
