// Relatórios de anúncios (Gerenciador de Anúncios do Meta, Google Ads, TikTok…) em CSV:
// reconhece colunas em português e inglês, descobre o nível (campanha, conjunto, anúncio) e o período,
// e cruza com os leads do CRM pelos nomes de campanha/conjunto/anúncio.
import type { Contact } from "@/integrations/supabase/types";
import { parseMoney } from "@/lib/format";
import type { ParsedFile } from "@/lib/leadImport";

export type AdLevel = "campanha" | "conjunto" | "anuncio";
export const LEVEL_LABEL: Record<AdLevel, string> = { campanha: "Campanha", conjunto: "Conjunto de anúncios", anuncio: "Anúncio" };
export const AD_PLATFORMS = ["Meta Ads", "Google Ads", "TikTok Ads", "LinkedIn Ads", "YouTube"];

export const AD_FIELDS = [
  { value: "campaign_name", label: "Campanha" }, { value: "adset_name", label: "Conjunto (público)" }, { value: "ad_name", label: "Anúncio" },
  { value: "campaign_ext", label: "ID da campanha" }, { value: "adset_ext", label: "ID do conjunto" }, { value: "ad_ext", label: "ID do anúncio" },
  { value: "day", label: "Dia" }, { value: "date_start", label: "Início do período" }, { value: "date_end", label: "Fim do período" },
  { value: "spend", label: "Valor usado (R$)" }, { value: "impressions", label: "Impressões" }, { value: "reach", label: "Alcance" },
  { value: "clicks", label: "Cliques (todos)" }, { value: "link_clicks", label: "Cliques no link" }, { value: "results", label: "Resultados" },
  { value: "result_type", label: "Tipo de resultado" }, { value: "leads", label: "Leads" }, { value: "purchases", label: "Compras" },
  { value: "revenue", label: "Valor de conversão (R$)" }, { value: "ignore", label: "Ignorar" },
] as const;
export type AdField = (typeof AD_FIELDS)[number]["value"];

const norm = (h: string) => h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/** Regras por prefixo/igualdade do cabeçalho normalizado. A primeira que bater vence. */
const RULES: [RegExp, AdField][] = [
  [/^(nome_da_campanha|campaign_name|campanha|campaign)$/, "campaign_name"],
  [/^(nome_do_conjunto_de_anuncios|ad_set_name|adset_name|conjunto_de_anuncios|grupo_de_anuncios|ad_group(_name)?|ad_group)$/, "adset_name"],
  [/^(nome_do_anuncio|ad_name|anuncio|ad)$/, "ad_name"],
  [/^(identificacao_da_campanha|id_da_campanha|campaign_id)$/, "campaign_ext"],
  [/^(identificacao_do_conjunto_de_anuncios|id_do_conjunto_de_anuncios|ad_set_id|adset_id|ad_group_id)$/, "adset_ext"],
  [/^(identificacao_do_anuncio|id_do_anuncio|ad_id)$/, "ad_ext"],
  [/^(dia|day|data|date)$/, "day"],
  [/^(inicio_dos_relatorios|reporting_starts|inicio)$/, "date_start"],
  [/^(termino_dos_relatorios|reporting_ends|termino|fim)$/, "date_end"],
  [/^(valor_usado(_[a-z]{3})?|amount_spent(_[a-z]{3})?|gasto|investimento|custo|cost|spend)$/, "spend"],
  [/^(impressoes|impressions|impr)$/, "impressions"],
  [/^(alcance|reach)$/, "reach"],
  [/^(cliques_todos|clicks_all|cliques|clicks)$/, "clicks"],
  [/^(cliques_no_link|link_clicks)$/, "link_clicks"],
  [/^(resultados|results)$/, "results"],
  [/^(tipo_de_resultado|indicador_de_resultado|result_type|result_indicator)$/, "result_type"],
  [/^(leads|cadastros|leads_no_meta|leads_formulario|on_facebook_leads|conversoes|conversions)$/, "leads"],
  [/^(compras|purchases)$/, "purchases"],
  [/^(valor_de_conversao_de_compras|purchases_conversion_value|valor_conv|conv_value|valor_de_conversao)/, "revenue"],
];

export function autoMapAds(headers: string[]): AdField[] {
  const used = new Set<AdField>();
  return headers.map((h) => {
    const k = norm(h);
    const hit = RULES.find(([re, f]) => re.test(k) && !used.has(f))?.[1];
    if (hit) { used.add(hit); return hit; }
    return "ignore";
  });
}

export function detectLevel(map: AdField[]): AdLevel {
  if (map.includes("ad_name") || map.includes("ad_ext")) return "anuncio";
  if (map.includes("adset_name") || map.includes("adset_ext")) return "conjunto";
  return "campanha";
}

/** "2026-11-16", "16/11/2026", "16/11/26" → ISO. */
export function parseDate(v: string): string | null {
  const t = v.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/.exec(t);
  if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}
const num = (v: string | undefined) => (v && v.trim() && v.trim() !== "-" ? parseMoney(v.replace(/%/g, "")) ?? 0 : 0);

export interface AdRow {
  line: number; platform: string; level: AdLevel; date_start: string; date_end: string;
  campaign_name: string; adset_name: string | null; ad_name: string | null; campaign_ext: string | null; adset_ext: string | null; ad_ext: string | null;
  spend: number; impressions: number; reach: number; clicks: number; link_clicks: number; results: number; result_type: string | null;
  leads: number; purchases: number; revenue: number;
}

type Opt = { platform: string; level: AdLevel; from: string; to: string };
type Getter = (k: AdField) => string;

function period(get: Getter, opt: Opt) {
  const day = parseDate(get("day"));
  return { date_start: day ?? parseDate(get("date_start")) ?? opt.from, date_end: day ?? parseDate(get("date_end")) ?? opt.to };
}
function names(get: Getter, level: AdLevel) {
  const inSet = level !== "campanha";
  const inAd = level === "anuncio";
  return {
    adset_name: inSet ? get("adset_name") || null : null, ad_name: inAd ? get("ad_name") || null : null,
    campaign_ext: get("campaign_ext") || null, adset_ext: inSet ? get("adset_ext") || null : null, ad_ext: inAd ? get("ad_ext") || null : null,
  };
}
function numbers(get: Getter, hasLeads: boolean) {
  const resultType = get("result_type") || null;
  const results = num(get("results"));
  const leads = hasLeads ? num(get("leads")) : /lead|cadastro|formul/i.test(resultType ?? "") ? results : 0;
  return {
    spend: num(get("spend")), impressions: Math.round(num(get("impressions"))), reach: Math.round(num(get("reach"))),
    clicks: Math.round(num(get("clicks"))), link_clicks: Math.round(num(get("link_clicks"))), results, result_type: resultType,
    leads, purchases: num(get("purchases")), revenue: num(get("revenue")),
  };
}

/** Linhas prontas para o banco. Linhas de total ("Total", "Resultados de…") e sem campanha ficam de fora. */
export function buildAdRows(f: ParsedFile, map: AdField[], opt: Opt) {
  const rows: AdRow[] = []; const skipped: number[] = [];
  const hasLeads = map.includes("leads");
  f.rows.forEach((cells, i) => {
    const get: Getter = (k) => { const j = map.indexOf(k); return j >= 0 ? (cells[j] ?? "").trim() : ""; };
    const campaign = get("campaign_name");
    if (!campaign || /^(total|resultados? d|results? from)/i.test(campaign)) { skipped.push(i + 2); return; }
    rows.push({ line: i + 2, platform: opt.platform, level: opt.level, campaign_name: campaign, ...period(get, opt), ...names(get, opt.level), ...numbers(get, hasLeads) });
  });
  return { rows, skipped };
}

/* ------------------------------ Árvore com os leads do CRM ------------------------------ */

export interface AdMetric {
  id: string; platform: string; level: AdLevel; date_start: string; date_end: string; campaign_name: string; adset_name: string | null; ad_name: string | null;
  spend: number; impressions: number; reach: number; clicks: number; link_clicks: number; results: number; leads: number; purchases: number; revenue: number;
}
export interface Totals { spend: number; impressions: number; clicks: number; leads: number; purchases: number; revenue: number; crm: number; hot: number }
export interface Node { key: string; name: string; level: AdLevel; totals: Totals; children: Node[] }

const zero = (): Totals => ({ spend: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0, revenue: 0, crm: 0, hot: 0 });
const lc = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
const addM = (t: Totals, m: AdMetric) => {
  t.spend += Number(m.spend); t.impressions += Number(m.impressions); t.clicks += Number(m.link_clicks) || Number(m.clicks);
  t.leads += Number(m.leads); t.purchases += Number(m.purchases); t.revenue += Number(m.revenue);
};

function str(meta: Record<string, unknown> | null | undefined, k: string) {
  const v = meta?.[k];
  return typeof v === "string" ? v : null;
}
/** Campanha/conjunto/anúncio de onde o lead veio (CSV/webhook do Meta ou UTM do site). */
export function leadOrigin(c: Contact) {
  const utm = (c.meta?.utm ?? {}) as Record<string, unknown>;
  return {
    campaign: lc(str(c.meta, "campaign_name") ?? str(utm, "utm_campaign")),
    adset: lc(str(c.meta, "adset_name") ?? str(utm, "utm_term")),
    ad: lc(str(c.meta, "ad_name") ?? str(utm, "utm_content")),
    date: (str(c.meta, "created_time") ?? c.created_at).slice(0, 10),
  };
}

/** Monta Campanha › Conjunto › Anúncio com o nível mais completo de cada campanha e conta os leads do CRM em cada nó. */
export function buildTree(metrics: AdMetric[], contacts: Contact[], from: string, to: string): Node[] {
  const inRange = metrics.filter((m) => m.date_end >= from && m.date_start <= to);
  const camps = new Map<string, Node>();
  const levelOf = new Map<string, AdLevel>();
  inRange.forEach((m) => {
    const k = lc(m.campaign_name); const cur = levelOf.get(k);
    const rank = { campanha: 0, conjunto: 1, anuncio: 2 } as const;
    if (!cur || rank[m.level] > rank[cur]) levelOf.set(k, m.level);
  });
  const child = (parent: Node, key: string, name: string, level: AdLevel) => {
    let n = parent.children.find((c) => c.key === key);
    if (!n) { n = { key, name, level, totals: zero(), children: [] }; parent.children.push(n); }
    return n;
  };
  inRange.forEach((m) => {
    const ck = lc(m.campaign_name);
    if (m.level !== levelOf.get(ck)) return;
    let c = camps.get(ck);
    if (!c) { c = { key: ck, name: m.campaign_name, level: "campanha", totals: zero(), children: [] }; camps.set(ck, c); }
    addM(c.totals, m);
    if (m.level === "campanha") return;
    const s = child(c, lc(m.adset_name), m.adset_name ?? "(sem conjunto)", "conjunto");
    addM(s.totals, m);
    if (m.level === "anuncio") addM(child(s, lc(m.ad_name), m.ad_name ?? "(sem anúncio)", "anuncio").totals, m);
  });
  contacts.forEach((ct) => {
    const o = leadOrigin(ct);
    if (!o.campaign || o.date < from || o.date > to) return;
    const c = camps.get(o.campaign);
    if (!c) return;
    const hot = ct.temperature === "quente" ? 1 : 0;
    const bump = (n: Node) => { n.totals.crm += 1; n.totals.hot += hot; };
    bump(c);
    const s = c.children.find((x) => x.key === o.adset);
    if (s) { bump(s); const a = s.children.find((x) => x.key === o.ad); if (a) bump(a); }
  });
  const sortRec = (list: Node[]): Node[] => list.sort((a, b) => b.totals.spend - a.totals.spend).map((n) => ({ ...n, children: sortRec(n.children) }));
  return sortRec([...camps.values()]);
}

export const div = (a: number, b: number) => (b > 0 ? a / b : null);
