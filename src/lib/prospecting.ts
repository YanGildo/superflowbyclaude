// Prospecção: status, configurações padrão e score (0–100) de cada empresa encontrada.
import type { Prospect } from "@/integrations/supabase/types";

export const PROSPECT_STATUS = ["Novo", "Para abordar", "Abordado", "Respondeu", "Sem resposta", "Virou lead", "Descartado"] as const;

export const STATUS_TONE: Record<string, string> = {
  Novo: "bg-muted text-muted-foreground", "Para abordar": "bg-primary/10 text-primary", Abordado: "bg-info/10 text-info",
  Respondeu: "bg-warning/15 text-warning", "Sem resposta": "bg-muted text-muted-foreground",
  "Virou lead": "bg-success/10 text-success", Descartado: "bg-destructive/10 text-destructive",
};

export interface ScoreWeights {
  semSite: number; temTelefone: number; avaliacaoAlta: number; muitasAvaliacoes: number;
  nichoCompativel: number; cidadeAlvo: number; semInstagram: number; observacao: number;
}

export interface ProspectSettings {
  limit: number; country: string; language: string; defaultStage: string; scriptSegment: string | null; campaign: string | null;
  targetCities: string[]; targetNiches: string[]; weights: ScoreWeights;
}

export const WEIGHT_LABELS: Record<keyof ScoreWeights, string> = {
  semSite: "Sem site", temTelefone: "Tem telefone", avaliacaoAlta: "Avaliação alta (4,5+)", muitasAvaliacoes: "Muitas avaliações (50+)",
  nichoCompativel: "Nicho compatível", cidadeAlvo: "Cidade alvo", semInstagram: "Sem Instagram", observacao: "Observação manual",
};

export const DEFAULT_SETTINGS: ProspectSettings = {
  limit: 50, country: "Brasil", language: "pt-BR", defaultStage: "Novo lead", scriptSegment: null, campaign: null,
  targetCities: [], targetNiches: [],
  weights: { semSite: 20, temTelefone: 10, avaliacaoAlta: 10, muitasAvaliacoes: 10, nichoCompativel: 20, cidadeAlvo: 10, semInstagram: 10, observacao: 10 },
};

/** Junta o que está salvo no workspace com os padrões (campos novos ganham o valor padrão). */
export function readSettings(raw: unknown): ProspectSettings {
  const s = (raw ?? {}) as Partial<ProspectSettings>;
  return { ...DEFAULT_SETTINGS, ...s, weights: { ...DEFAULT_SETTINGS.weights, ...(s.weights ?? {}) } };
}

const has = (v: string | null | undefined) => Boolean(v && v.trim());
const inList = (v: string | null | undefined, list: string[]) => has(v) && list.some((x) => (v as string).toLowerCase().includes(x.toLowerCase()));

/** Regras do score: cada regra que bate soma o peso configurado. Quanto maior, melhor a oportunidade. */
const RULES: { key: keyof ScoreWeights; test: (p: Prospect, s: ProspectSettings) => boolean }[] = [
  { key: "semSite", test: (p) => !has(p.website) },
  { key: "temTelefone", test: (p) => has(p.phone) || has(p.whatsapp) },
  { key: "avaliacaoAlta", test: (p) => Number(p.rating ?? 0) >= 4.5 },
  { key: "muitasAvaliacoes", test: (p) => Number(p.reviews_count ?? 0) >= 50 },
  { key: "nichoCompativel", test: (p, s) => s.targetNiches.length > 0 && (inList(p.category, s.targetNiches) || inList(p.niche, s.targetNiches)) },
  { key: "cidadeAlvo", test: (p, s) => s.targetCities.length > 0 && inList(p.city, s.targetCities) },
  { key: "semInstagram", test: (p) => !has(p.instagram) },
  { key: "observacao", test: (p) => has(p.notes) },
];

export function scoreProspect(p: Prospect, s: ProspectSettings): { score: number; reasons: string[] } {
  const hits = RULES.filter((r) => r.test(p, s));
  return {
    score: Math.min(100, hits.reduce((a, r) => a + s.weights[r.key], 0)),
    reasons: hits.map((r) => WEIGHT_LABELS[r.key]),
  };
}

export function opportunity(score: number | null): { label: string; tone: string } {
  if ((score ?? 0) >= 70) return { label: "Alta", tone: "bg-success/10 text-success" };
  if ((score ?? 0) >= 50) return { label: "Média", tone: "bg-warning/15 text-warning" };
  return { label: "Baixa", tone: "bg-muted text-muted-foreground" };
}

/** Linhas de um CSV simples (separador , ou ;) com cabeçalho. */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = lines[0].includes(";") ? ";" : ",";
  const split = (l: string) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
  const head = split(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((c, i) => [head[i], c])));
}

/** Converte uma linha importada (CSV/JSON, inclusive export da Apify) em prospect. */
export function importedRow(r: Record<string, unknown>): Partial<Prospect> | null {
  const pick = (...k: string[]) => { for (const key of k) { const v = r[key]; if (v != null && String(v).trim()) return String(v).trim(); } return null; };
  const name = pick("name", "nome", "empresa", "title");
  if (!name) return null;
  return {
    name, category: pick("category", "categoria", "categoryname"), city: pick("city", "cidade"), state: pick("state", "estado", "uf"),
    phone: pick("phone", "telefone"), website: pick("website", "site"), instagram: pick("instagram"), email: pick("email", "e-mail"),
    address: pick("address", "endereco", "endereço"), maps_url: pick("maps_url", "url"), place_id: pick("place_id", "placeid") ?? `import-${name}-${pick("phone", "telefone") ?? ""}`,
    latitude: Number(pick("latitude", "lat")) || null, longitude: Number(pick("longitude", "lng", "lon")) || null,
    rating: Number(pick("rating", "avaliacao", "totalscore")) || null, reviews_count: Number(pick("reviews_count", "reviewscount", "avaliacoes")) || null,
  };
}

/** CSV para baixar (Excel abre direto). */
export function toCsv(rows: Prospect[]): string {
  const cols: (keyof Prospect)[] = ["name", "category", "city", "state", "phone", "website", "instagram", "email", "rating", "reviews_count", "score", "status", "maps_url"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\n");
}
