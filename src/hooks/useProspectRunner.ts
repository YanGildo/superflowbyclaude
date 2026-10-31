// Executor das buscas no motor próprio e do enriquecimento, com progresso visível em qualquer aba.
// Fica fora do React (um só por vez): trocar de aba dentro do Superflow não interrompe a busca.
import { useSyncExternalStore } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Prospect } from "@/integrations/supabase/types";
import {
  createJob, deleteJob, downloadJob, geocode, sleep, waitJob, type EngineConfig, type JobOutcome,
} from "@/lib/engineClient";
import {
  dedupe, engineRowToProspect, gridCells, inBbox, jobBody, jobCount, keepRow, parseEngineCsv, termsFor,
  type BBox, type EngineSearch, type EnrichChoice, type Spot,
} from "@/lib/mapsEngine";

/* ------------------------------ Estado ------------------------------ */

export interface RunState {
  kind: "busca" | "enriquecer" | null; phase: "idle" | "running" | "done" | "error" | "canceled";
  title: string; step: string; done: number; total: number; log: string[];
  result: { found: number; fresh: number; duplicates: number; withEmail: number; enriched: number } | null;
}

const IDLE: RunState = { kind: null, phase: "idle", title: "", step: "", done: 0, total: 0, log: [], result: null };
let state: RunState = IDLE;
let cancelFlag = false;
const listeners = new Set<() => void>();

function set(patch: Partial<RunState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}
const log = (line: string) => set({ log: [...state.log.slice(-40), `${new Date().toLocaleTimeString("pt-BR")} · ${line}`] });

export function useRunState(): RunState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}
export const cancelRun = () => { cancelFlag = true; log("Cancelando…"); };
export const clearRun = () => { if (state.phase !== "running") set(IDLE); };
export const isRunning = () => state.phase === "running";

/* ------------------------------ Banco ------------------------------ */

type Ctx = { cfg: EngineConfig; ws: string; qc: QueryClient };

async function newSearchRow(ws: string, s: EngineSearch): Promise<string> {
  const { data, error } = await supabase.from("prospect_searches").insert({
    workspace_id: ws, name: s.keywords.join(", "), filters: s, provider: "motor", status: "running",
    location: s.cities.join(" · "), requested_limit: s.depth, started_at: new Date().toISOString(),
  }).select("id").single();
  if (error) throw error;
  return (data as { id: string }).id;
}

async function updateSearch(id: string, values: Record<string, unknown>) {
  const { error } = await supabase.from("prospect_searches").update(values).eq("id", id);
  if (error) throw error;
}

function chunks<T>(list: T[], n: number): T[][] {
  return Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));
}

/** Grava só quem ainda não existe no workspace (mesmo place_id) e devolve os ids novos. */
async function saveFresh(ws: string, rows: Partial<Prospect>[]): Promise<{ ids: string[]; duplicates: number }> {
  const known = new Set<string>();
  for (const part of chunks(rows.map((r) => r.place_id as string), 150)) {
    const { data, error } = await supabase.from("prospects").select("place_id").eq("workspace_id", ws).in("place_id", part);
    if (error) throw error;
    (data ?? []).forEach((d: { place_id: string }) => known.add(d.place_id));
  }
  const fresh = rows.filter((r) => !known.has(r.place_id as string));
  const ids: string[] = [];
  for (const part of chunks(fresh, 200)) {
    const { data, error } = await supabase.from("prospects").insert(part.map((r) => ({ ...r, workspace_id: ws }))).select("id");
    if (error) throw error;
    ids.push(...(data ?? []).map((d: { id: string }) => d.id));
  }
  return { ids, duplicates: rows.length - fresh.length };
}

/* ------------------------------ Motor ------------------------------ */

interface Place { city: string; spots: Spot[]; bbox: BBox | null }

async function placesFor(s: EngineSearch): Promise<Place[]> {
  const out: Place[] = [];
  for (const city of s.cities) {
    if (cancelFlag) break;
    set({ step: `Localizando ${city} no mapa…` });
    const geo = await geocode(city);
    await sleep(1100); // política do OpenStreetMap: ~1 consulta por segundo
    if (!geo) { log(`Não achei "${city}" no mapa. Escreva como "Cidade, UF" ou "Cidade, País".`); continue; }
    const grid = s.grid > 1 && geo.bbox;
    out.push({ city, bbox: grid ? geo.bbox : null, spots: grid ? gridCells(geo.bbox as BBox, s.grid) : [{ lat: geo.lat, lon: geo.lon }] });
    log(`${city}: ${grid ? `grade ${s.grid}×${s.grid}` : "1 busca"}.`);
  }
  return out;
}

/** Um job: cria, espera e baixa. Se o Google falhar, tenta mais uma vez depois de 30 s (como o kit). */
async function runSpot(cfg: EngineConfig, body: Record<string, unknown>, onJob: (id: string) => void): Promise<string> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const id = await createJob(cfg, body);
    onJob(id);
    const out: JobOutcome = await waitJob(cfg, id, Number(body.max_time), { canceled: () => cancelFlag, tick: (st) => set({ step: `${state.step.split(" · ")[0]} · ${st === "pending" ? "na fila" : "buscando"}` }) });
    if (out === "canceled") { await deleteJob(cfg, id); return ""; }
    if (out !== "failed") {
      if (out === "timeout") log("Tempo máximo atingido: guardando o que o motor já achou.");
      return downloadJob(cfg, id);
    }
    log(attempt === 1 ? "O Google recusou esta busca. Tentando de novo em 30 s…" : "Falhou de novo: pulando. Pode ser limite do Google; espere ou use proxies.");
    if (attempt === 1) await sleep(30000);
  }
  return "";
}

async function scrape(ctx: Ctx, s: EngineSearch, searchId: string): Promise<Partial<Prospect>[]> {
  const places = await placesFor(s);
  const total = places.reduce((a, p) => a + p.spots.length, 0);
  set({ total, done: 0 });
  const rows: Partial<Prospect>[] = [];
  const jobIds: string[] = [];
  for (const place of places) {
    for (const spot of place.spots) {
      if (cancelFlag) return rows;
      set({ step: `${place.city} · busca ${state.done + 1} de ${total}` });
      const body = jobBody(termsFor(s.keywords, place.city), spot, s, `${s.keywords[0]} @ ${place.city}`);
      const csv = await runSpot(ctx.cfg, body, (id) => { jobIds.push(id); void updateSearch(searchId, { job_ids: jobIds, progress: { etapa: "motor", feitos: state.done, total } }); });
      const mapped = parseEngineCsv(csv).map((r) => engineRowToProspect(r, { niche: s.keywords.join(", "), city: place.city, searchId, campaignId: s.campaignId }))
        .filter((p): p is Partial<Prospect> => Boolean(p) && (!place.bbox || inBbox(p as Partial<Prospect>, place.bbox)));
      rows.push(...mapped);
      set({ done: state.done + 1 });
      log(`${place.city}: +${mapped.length} empresas (${dedupe(rows).length} únicas até agora).`);
    }
  }
  return rows;
}

/* ------------------------------ Enriquecimento ------------------------------ */

type EnrichSummary = { processed: number; withEmail: number };

async function enrichBatches(ids: string[], options: EnrichChoice): Promise<EnrichSummary> {
  const sum = { processed: 0, withEmail: 0 };
  set({ total: ids.length, done: 0, step: "Visitando os sites (e-mails, redes, pixels)…" });
  for (const part of chunks(ids, 25)) {
    if (cancelFlag) break;
    const { data, error } = await supabase.functions.invoke("enrich-prospects", { body: { ids: part, options } });
    const r = data as { ok?: boolean; error?: string; processed?: number; withEmail?: number } | null;
    if (error || !r?.ok) {
      log(`Enriquecimento falhou: ${r?.error ?? error?.message ?? "sem resposta"}. A função enrich-prospects está publicada no Supabase?`);
      break;
    }
    sum.processed += r.processed ?? 0;
    sum.withEmail += r.withEmail ?? 0;
    set({ done: Math.min(ids.length, state.done + part.length) });
  }
  log(`Enriquecidos ${sum.processed}: ${sum.withEmail} com e-mail.`);
  return sum;
}

const wantsEnrich = (o: EnrichChoice) => o.emails || o.socials || o.tech || o.verify;

/* ------------------------------ Execuções ------------------------------ */

function start(kind: RunState["kind"], title: string) {
  if (isRunning()) throw new Error("Já tem uma busca rodando. Espere terminar ou cancele.");
  cancelFlag = false;
  set({ ...IDLE, kind, phase: "running", title });
}

function finish(qc: QueryClient, result: RunState["result"], err?: unknown) {
  qc.invalidateQueries({ queryKey: ["prospect"] });
  if (err) { log(err instanceof Error ? err.message : String(err)); set({ phase: "error", step: "Parou com erro." }); return; }
  set({ phase: cancelFlag ? "canceled" : "done", step: cancelFlag ? "Cancelada." : "Concluída.", result });
}

/** Processa linhas já baixadas: limpa, filtra, grava e (se pedido) enriquece. */
async function store(ctx: Ctx, s: EngineSearch, searchId: string, rows: Partial<Prospect>[]) {
  const unique = dedupe(rows).filter((r) => keepRow(r, s.filters));
  set({ step: "Gravando na lista de prospects…" });
  const { ids, duplicates } = await saveFresh(ctx.ws, unique);
  log(`${unique.length} empresas depois dos filtros: ${ids.length} novas, ${duplicates} já estavam na lista.`);
  await updateSearch(searchId, {
    status: cancelFlag ? "failed" : "done", result_count: unique.length, new_count: ids.length, duplicate_count: duplicates,
    finished_at: new Date().toISOString(), progress: { etapa: "fim" }, error_message: cancelFlag ? "Cancelada" : null,
  });
  ctx.qc.invalidateQueries({ queryKey: ["prospect"] });
  const enr = !cancelFlag && ids.length && wantsEnrich(s.enrich) ? await enrichBatches(ids, s.enrich) : { processed: 0, withEmail: 0 };
  return { found: unique.length, fresh: ids.length, duplicates, withEmail: enr.withEmail, enriched: enr.processed };
}

/** Busca completa no motor próprio. */
export async function runEngineSearch(ctx: Ctx, s: EngineSearch) {
  start("busca", `${s.keywords.join(", ")} · ${s.cities.join(" · ")}`);
  log(`${jobCount(s)} busca(s) no motor, profundidade ${s.depth}.`);
  let searchId = "";
  try {
    searchId = await newSearchRow(ctx.ws, s);
    const rows = await scrape(ctx, s, searchId);
    finish(ctx.qc, await store(ctx, s, searchId, rows));
  } catch (e) {
    if (searchId) await updateSearch(searchId, { status: "failed", error_message: e instanceof Error ? e.message : String(e) }).catch(() => undefined);
    finish(ctx.qc, null, e);
  }
}

/** Recupera uma busca interrompida (página fechada no meio): baixa o que os jobs do motor já têm. */
export async function resumeEngineSearch(ctx: Ctx, search: { id: string; job_ids: string[]; filters: unknown }) {
  const s = search.filters as EngineSearch;
  start("busca", `Recuperando: ${s.keywords?.join(", ") ?? "busca"}`);
  try {
    const rows: Partial<Prospect>[] = [];
    set({ total: search.job_ids.length });
    for (const id of search.job_ids) {
      const csv = await downloadJob(ctx.cfg, id);
      rows.push(...parseEngineCsv(csv).map((r) => engineRowToProspect(r, { niche: s.keywords.join(", "), city: null, searchId: search.id, campaignId: s.campaignId }))
        .filter((p): p is Partial<Prospect> => Boolean(p)));
      set({ done: state.done + 1 });
    }
    log(`${rows.length} linhas recuperadas de ${search.job_ids.length} job(s).`);
    finish(ctx.qc, await store(ctx, s, search.id, rows));
  } catch (e) {
    finish(ctx.qc, null, e);
  }
}

/** Enriquecimento avulso (qualquer origem: motor, Apify ou CSV). */
export async function runEnrich(qc: QueryClient, ids: string[], options: EnrichChoice) {
  start("enriquecer", `Enriquecer ${ids.length} prospect(s)`);
  try {
    const r = await enrichBatches(ids, options);
    finish(qc, { found: ids.length, fresh: 0, duplicates: 0, withEmail: r.withEmail, enriched: r.processed });
  } catch (e) {
    finish(qc, null, e);
  }
}
