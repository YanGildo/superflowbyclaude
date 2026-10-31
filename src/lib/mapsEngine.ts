// Motor próprio de prospecção (gosom/google-maps-scraper, via google-maps-scraper-kit): lógica sem React.
// Monta os jobs, divide a cidade em grade, lê o CSV do motor e converte cada linha em prospect.
import type { Prospect } from "@/integrations/supabase/types";

/* ------------------------------ Busca ------------------------------ */

export interface EngineFilters { minRating: number; minReviews: number; noWebsite: boolean; hasPhone: boolean }
export interface EnrichChoice { emails: boolean; deep: boolean; socials: boolean; tech: boolean; verify: boolean }

export interface EngineSearch {
  keywords: string[]; cities: string[]; depth: number; grid: number; lang: string; maxMinutes: number;
  proxies: string[]; filters: EngineFilters; enrich: EnrichChoice; campaignId: string | null;
}

export const DEFAULT_ENRICH: EnrichChoice = { emails: true, deep: true, socials: true, tech: true, verify: false };
export const NO_FILTERS: EngineFilters = { minRating: 0, minReviews: 0, noWebsite: false, hasPhone: false };

export const GRID_OPTIONS = [
  { value: "1", label: "Desligada (1 busca)" }, { value: "2", label: "2 × 2 (4 buscas)" }, { value: "3", label: "3 × 3 (9 buscas)" },
  { value: "4", label: "4 × 4 (16 buscas)" }, { value: "5", label: "5 × 5 (25 buscas)" },
];
export const LANG_OPTIONS = [{ value: "pt", label: "Português" }, { value: "en", label: "Inglês" }, { value: "es", label: "Espanhol" }];

export const splitList = (s: string, sep: RegExp = /[,\n]/) => [...new Set(s.split(sep).map((x) => x.trim()).filter(Boolean))];

/** Quantos jobs a busca vai criar (cidades × quadrados). */
export const jobCount = (s: Pick<EngineSearch, "cities" | "grid">) => Math.max(1, s.cities.length) * Math.max(1, s.grid) ** 2;

/** Aviso do próprio kit: busca grande sem proxy pode fazer o Google limitar seu IP por um tempo. */
export const isLargeSearch = (s: EngineSearch) =>
  !s.proxies.length && (s.depth >= 15 || s.keywords.length >= 10 || s.grid >= 2 || s.cities.length >= 3);

/** O termo leva a cidade junto ("dentista em Campinas, SP"), como o kit recomenda. */
export function termsFor(keywords: string[], city: string) {
  return keywords.map((k) => (city && !k.toLowerCase().includes(city.split(",")[0].toLowerCase()) ? `${k} em ${city}` : k));
}

/* ------------------------------ Mapa e grade ------------------------------ */

export type BBox = [number, number, number, number]; // sul, norte, oeste, leste
export interface Spot { lat: string; lon: string; radius?: number; zoom?: number }
export interface Geo { lat: string; lon: string; bbox: BBox | null }

export const geocodeUrl = (place: string) =>
  `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(place)}`;

export function parseGeocode(hits: unknown): Geo | null {
  const h = Array.isArray(hits) ? (hits[0] as { lat?: string; lon?: string; boundingbox?: string[] } | undefined) : undefined;
  if (!h?.lat || !h.lon) return null;
  const bb = h.boundingbox?.map(Number);
  return { lat: String(h.lat), lon: String(h.lon), bbox: bb && bb.length === 4 && bb.every(Number.isFinite) ? (bb as BBox) : null };
}

/**
 * Divide a cidade em n × n quadrados. Cada busca começa olhando para o próprio quadrado:
 * raio = 1,15 × meia diagonal (mín. 1 km) e zoom do Maps proporcional à largura (11 a 17).
 */
export function gridCells(bbox: BBox, n: number): Spot[] {
  const [s, north, w, e] = bbox;
  const dlat = (north - s) / n, dlon = (e - w) / n;
  const mPerDeg = (6371000 * Math.PI) / 180;
  const cells: Spot[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const lat = s + (i + 0.5) * dlat, lon = w + (j + 0.5) * dlon;
      const cos = Math.cos((lat * Math.PI) / 180);
      const width = Math.max(1, dlon * mPerDeg * cos);
      const diag = Math.hypot(dlat * mPerDeg, width);
      const zoom = Math.round(Math.log2((156543.03 * cos * 1000) / width));
      cells.push({ lat: lat.toFixed(6), lon: lon.toFixed(6), radius: Math.max(1000, Math.ceil((1.15 * diag) / 2)), zoom: Math.min(17, Math.max(11, zoom)) });
    }
  }
  return cells;
}

/** A linha está dentro da cidade (com 10% de folga)? Sem coordenada, fica. */
export function inBbox(row: { latitude?: number | null; longitude?: number | null }, bbox: BBox, margin = 0.1) {
  const lat = Number(row.latitude), lon = Number(row.longitude);
  if (!row.latitude || !row.longitude || !Number.isFinite(lat) || !Number.isFinite(lon)) return true;
  const [s, n, w, e] = bbox;
  const my = (n - s) * margin, mx = (e - w) * margin;
  return lat >= s - my && lat <= n + my && lon >= w - mx && lon <= e + mx;
}

/** Corpo do job no formato da API do motor (POST /api/v1/jobs). */
export function jobBody(terms: string[], spot: Spot, s: EngineSearch, name: string) {
  return {
    name: name.slice(0, 80), keywords: terms, lang: s.lang, lat: spot.lat, lon: spot.lon,
    zoom: spot.zoom ?? 15, radius: spot.radius ?? 10000, depth: s.depth, fast_mode: false,
    // E-mails: o enriquecimento do Superflow visita os sites depois (mais rápido e acha mais que o motor).
    email: false, max_time: Math.max(180, s.maxMinutes * 60),
    ...(s.proxies.length ? { proxies: s.proxies } : {}),
  };
}

/* ------------------------------ CSV do motor ------------------------------ */

const CSV_TOKEN = /("(?:[^"]|"")*"|[^,"\r\n]*)(,|\r\n|\n|\r|$)/g;
const BOM = String.fromCharCode(0xfeff);

/** CSV com aspas, vírgulas e quebras de linha dentro dos campos (o motor grava JSON em várias colunas). */
export function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  for (const m of text.replace(BOM, "").matchAll(CSV_TOKEN)) {
    row.push(m[1].startsWith('"') ? m[1].slice(1, -1).replace(/""/g, '"') : m[1]);
    if (m[2] === ",") continue;
    rows.push(row);
    row = [];
    if (m[2] === "") break;
  }
  return rows.filter((r) => r.some((x) => x.trim()));
}

export function parseEngineCsv(text: string): Record<string, string>[] {
  const [head, ...body] = csvRows(text);
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ""])));
}

const json = <T>(v: string | undefined): T | null => {
  if (!v) return null;
  try { return JSON.parse(v) as T; } catch { return null; }
};
const num = (v: string | undefined) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) && v !== "" ? n : null; };
const str = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

const TRACKING = ["utm_", "gclid", "fbclid", "msclkid", "mc_cid", "mc_eid"];

/** Tira utm_* e companhia do site (o Google Business Profile coloca em ~1 de cada 4). */
export function cleanWebsite(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `http://${url}`);
    const keys = [...u.searchParams.keys()];
    if (!keys.some((k) => TRACKING.some((t) => k.toLowerCase().startsWith(t)))) return url;
    keys.forEach((k) => { if (TRACKING.some((t) => k.toLowerCase().startsWith(t))) u.searchParams.delete(k); });
    return u.toString();
  } catch {
    return url;
  }
}

type Address = { borough?: string; street?: string; city?: string; postal_code?: string; state?: string; country?: string };

/** Campos grandes que não precisam ir para o banco (avaliações completas, fotos). */
const HEAVY = ["user_reviews", "user_reviews_extended", "images", "reviews_per_rating", "popular_times", "about", "descriptions"];

/** Uma linha do CSV do motor -> prospect (só os campos úteis; o resto vai enxuto em raw_data). */
export function engineRowToProspect(r: Record<string, string>, ctx: { niche: string | null; city: string | null; searchId: string | null; campaignId: string | null }): Partial<Prospect> | null {
  const name = str(r.title);
  if (!name) return null;
  const addr = json<Address>(r.complete_address) ?? {};
  const emails = (r.emails ?? "").split(",").map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")).slice(0, 3);
  const raw = Object.fromEntries(Object.entries(r).filter(([k, v]) => v && !HEAVY.includes(k)));
  return {
    place_id: str(r.place_id) ?? str(r.cid) ?? str(r.link) ?? `${name}|${r.address ?? ""}`,
    name, category: str(r.category), niche: ctx.niche, address: str(r.address),
    neighborhood: str(addr.borough), city: str(addr.city) ?? ctx.city, state: str(addr.state), country: str(addr.country),
    latitude: num(r.latitude), longitude: num(r.longitude), phone: str(r.phone), whatsapp: null,
    website: cleanWebsite(str(r.website)), maps_url: str(r.link), rating: num(r.review_rating), reviews_count: num(r.review_count),
    email: emails[0] ?? null, emails, opening_hours: json<Record<string, string[]>>(r.open_hours), price_range: str(r.price_range),
    source: "motor", search_id: ctx.searchId, campaign_id: ctx.campaignId, raw_data: raw,
  } as Partial<Prospect>;
}

/* ------------------------------ Limpeza ------------------------------ */

const keysOf = (p: Partial<Prospect>) =>
  [p.place_id && `p:${p.place_id}`, p.maps_url && `l:${p.maps_url}`, `n:${p.name}|${p.address ?? ""}`].filter(Boolean) as string[];

/** Uma linha por empresa (a mesma empresa aparece em vários termos e quadrados). */
export function dedupe<T extends Partial<Prospect>>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    const ks = keysOf(r);
    if (ks.some((k) => seen.has(k))) return false;
    ks.forEach((k) => seen.add(k));
    return true;
  });
}

/** Filtros da busca (aplicados antes de gravar). Sem nota ou avaliações conta como 0. */
export function keepRow(p: Partial<Prospect>, f: EngineFilters) {
  if (f.minRating && Number(p.rating ?? 0) < f.minRating) return false;
  if (f.minReviews && Number(p.reviews_count ?? 0) < f.minReviews) return false;
  if (f.noWebsite && p.website) return false;
  return !(f.hasPhone && !p.phone);
}
