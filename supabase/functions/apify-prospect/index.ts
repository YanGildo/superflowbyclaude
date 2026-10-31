// Edge Function: Prospecção via Apify (Google Maps).
// Ações: "test" (confere o token), "start" (inicia uma busca), "sync" (busca o resultado e grava os prospects).
// O token fica só no servidor (secret APIFY_TOKEN); o navegador nunca vê.
// Gravações usam o login do usuário, então as regras de acesso (RLS) do banco valem aqui também.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ACTOR = "compass~crawler-google-places";
const API = "https://api.apify.com/v2";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function apify(path: string, token: string, init?: RequestInit) {
  const sep = path.includes("?") ? "&" : "?";
  const r = await fetch(`${API}${path}${sep}token=${token}`, init);
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error?.message ?? `Apify respondeu ${r.status}`);
  return body;
}

type Filters = { terms?: string[]; city?: string; state?: string; country?: string; neighborhood?: string; limit?: number; language?: string };

function runInput(f: Filters) {
  const where = [f.neighborhood, f.city, f.state, f.country].filter(Boolean).join(", ");
  return {
    searchStringsArray: (f.terms ?? []).filter(Boolean),
    locationQuery: where || "Brasil",
    maxCrawledPlacesPerSearch: Math.min(Math.max(Number(f.limit) || 50, 1), 500),
    language: (f.language ?? "pt-BR").split("-")[0],
    skipClosedPlaces: true,
  };
}

// deno-lint-ignore no-explicit-any
function toProspect(it: any, ws: string, searchId: string) {
  const insta = (it.instagrams ?? [])[0] ?? null;
  return {
    workspace_id: ws, search_id: searchId, place_id: it.placeId ?? it.cid ?? `${it.title}-${it.address}`,
    name: it.title ?? "(sem nome)", category: it.categoryName ?? null, address: it.address ?? null,
    neighborhood: it.neighborhood ?? null, city: it.city ?? null, state: it.state ?? null, country: it.countryCode ?? null,
    latitude: it.location?.lat ?? null, longitude: it.location?.lng ?? null, phone: it.phone ?? null,
    whatsapp: it.phoneUnformatted ?? null, email: (it.emails ?? [])[0] ?? null, website: it.website ?? null,
    instagram: insta, maps_url: it.url ?? null, rating: it.totalScore ?? null, reviews_count: it.reviewsCount ?? null,
    raw_data: it,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const token = Deno.env.get("APIFY_TOKEN");
    const { action, workspaceId, searchId, filters, name } = await req.json();
    if (!token) return json({ ok: false, error: "Token da Apify não configurado no servidor (APIFY_TOKEN)." }, 200);
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    if (action === "test") {
      const me = await apify("/users/me", token);
      return json({ ok: true, account: me.data?.username, plan: me.data?.plan?.id ?? me.data?.plan ?? "—", actor: ACTOR });
    }

    if (action === "start") {
      const input = runInput(filters ?? {});
      if (!input.searchStringsArray.length) return json({ ok: false, error: "Informe pelo menos um nicho ou termo." });
      const run = await apify(`/acts/${ACTOR}/runs`, token, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const { data, error } = await db.from("prospect_searches").insert({
        workspace_id: workspaceId, name: name ?? input.searchStringsArray.join(", "), filters: filters ?? {}, status: "running",
        provider_run_id: run.data.id, dataset_id: run.data.defaultDatasetId, location: input.locationQuery,
        requested_limit: input.maxCrawledPlacesPerSearch, started_at: new Date().toISOString(),
      }).select("id").single();
      if (error) throw error;
      return json({ ok: true, searchId: data.id });
    }

    if (action === "sync") {
      const { data: s, error } = await db.from("prospect_searches").select("*").eq("id", searchId).single();
      if (error) throw error;
      const run = await apify(`/actor-runs/${s.provider_run_id}`, token);
      const status = run.data.status as string;
      if (status === "RUNNING" || status === "READY") return json({ ok: true, status: "running" });
      if (status !== "SUCCEEDED") {
        await db.from("prospect_searches").update({ status: "failed", error_message: status, finished_at: new Date().toISOString() }).eq("id", searchId);
        return json({ ok: true, status: "failed" });
      }
      const items = await apify(`/datasets/${s.dataset_id}/items?clean=true&format=json&limit=1000`, token);
      const rows = (items as unknown[]).map((it) => toProspect(it, s.workspace_id, s.id));
      const before = await db.from("prospects").select("place_id").eq("workspace_id", s.workspace_id).in("place_id", rows.map((r) => r.place_id));
      const known = new Set((before.data ?? []).map((r: { place_id: string }) => r.place_id));
      const fresh = rows.filter((r) => !known.has(r.place_id));
      if (fresh.length) {
        const ins = await db.from("prospects").insert(fresh);
        if (ins.error) throw ins.error;
      }
      await db.from("prospect_searches").update({
        status: "done", result_count: rows.length, new_count: fresh.length, duplicate_count: rows.length - fresh.length,
        finished_at: new Date().toISOString(),
      }).eq("id", searchId);
      return json({ ok: true, status: "done", total: rows.length, novos: fresh.length });
    }

    return json({ ok: false, error: "Ação desconhecida." }, 400);
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 200);
  }
});
