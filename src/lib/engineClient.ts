// Conversa com o motor de prospecção (API REST do gosom/google-maps-scraper atrás do "porteiro" com senha).
// Roda no navegador: o motor fica no PC do usuário (localhost) ou num servidor dele.
import { geocodeUrl, parseGeocode, type Geo } from "@/lib/mapsEngine";

export interface EngineConfig { url: string; key: string }

export class EngineError extends Error {}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const base = (cfg: EngineConfig) => cfg.url.trim().replace(/\/+$/, "");

/** Mensagem clara para cada falha comum (motor desligado, senha errada, origem não liberada…). */
function explain(status: number, body: string): string {
  if (status === 401) return "Senha do motor incorreta. Confira a MOTOR_SENHA do arquivo .env.";
  if (status === 403) return "O motor recusou este site. Libere o endereço do Superflow em MOTOR_ORIGENS no .env.";
  if (status === 422) return `O motor recusou a busca: ${body.slice(0, 160)}`;
  if (status >= 500) return "O motor está iniciando ou travou. Espere alguns segundos ou rode: docker restart superflow-motor";
  return `O motor respondeu ${status}: ${body.slice(0, 160)}`;
}

export async function engineRequest(cfg: EngineConfig, path: string, init: RequestInit = {}): Promise<string> {
  if (!cfg.url.trim()) throw new EngineError("Configure o endereço do motor em Prospecção → Configurações.");
  let res: Response;
  try {
    res = await fetch(base(cfg) + path, {
      ...init,
      headers: { "Content-Type": "application/json", "X-API-Key": cfg.key, ...(init.headers ?? {}) },
    });
  } catch {
    throw new EngineError(`Não consegui falar com o motor em ${base(cfg)}. O Docker Desktop está aberto e o motor ligado (docker compose up -d)? Se o Chrome perguntar sobre a rede local, clique em Permitir.`);
  }
  const text = await res.text();
  if (!res.ok) throw new EngineError(explain(res.status, text));
  return text;
}

/** Teste de conexão: lista os jobs do motor. */
export async function testEngine(cfg: EngineConfig): Promise<{ jobs: number }> {
  const raw = await engineRequest(cfg, "/api/v1/jobs");
  const list = JSON.parse(raw || "[]") as unknown;
  return { jobs: Array.isArray(list) ? list.length : 0 };
}

export async function createJob(cfg: EngineConfig, body: Record<string, unknown>): Promise<string> {
  const raw = await engineRequest(cfg, "/api/v1/jobs", { method: "POST", body: JSON.stringify(body) });
  const j = JSON.parse(raw) as { id?: string; ID?: string };
  const id = j.id ?? j.ID;
  if (!id) throw new EngineError("O motor não devolveu o id da busca.");
  return id;
}

export async function jobStatus(cfg: EngineConfig, id: string): Promise<string> {
  const raw = await engineRequest(cfg, `/api/v1/jobs/${encodeURIComponent(id)}`);
  const j = JSON.parse(raw) as { Status?: string; status?: string };
  return (j.Status ?? j.status ?? "").toLowerCase();
}

/** CSV do job (o motor grava as linhas enquanto trabalha, então serve até para job inacabado). */
export async function downloadJob(cfg: EngineConfig, id: string): Promise<string> {
  try {
    return await engineRequest(cfg, `/api/v1/jobs/${encodeURIComponent(id)}/download`, { headers: { Accept: "text/csv" } });
  } catch {
    return "";
  }
}

export async function deleteJob(cfg: EngineConfig, id: string) {
  await engineRequest(cfg, `/api/v1/jobs/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => undefined);
}

/** Cidade -> coordenadas e contorno (OpenStreetMap, ~1 consulta por segundo). */
export async function geocode(place: string): Promise<Geo | null> {
  try {
    const res = await fetch(geocodeUrl(place), { headers: { Accept: "application/json" } });
    return res.ok ? parseGeocode(await res.json()) : null;
  } catch {
    return null;
  }
}

export type JobOutcome = "ok" | "failed" | "timeout" | "canceled";

/** Espera o job terminar, conferindo a cada 5 s até o tempo máximo da busca (+2 min de folga). */
export async function waitJob(cfg: EngineConfig, id: string, maxSeconds: number, opts: { canceled: () => boolean; tick: (status: string) => void; every?: number }): Promise<JobOutcome> {
  const deadline = Date.now() + (maxSeconds + 120) * 1000;
  while (Date.now() < deadline) {
    if (opts.canceled()) return "canceled";
    const st = await jobStatus(cfg, id).catch(() => "erro");
    if (st === "ok") return "ok";
    if (st === "failed") return "failed";
    opts.tick(st);
    await sleep(opts.every ?? 5000);
  }
  return "timeout";
}
