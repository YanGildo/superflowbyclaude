// Edge Function: enriquece prospects visitando o site de cada empresa (e-mails, redes, pixels, MX, intenção).
// Recebe { ids: string[], options }. Processa no máximo 25 por chamada (o app chama em lotes).
// Usa o login de quem chamou, então só lê e grava prospects do próprio workspace (RLS).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { enrichOne, pool, type EnrichOptions, type ProspectIn } from "./enrich.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const MAX_PER_CALL = 25;
const DEFAULTS: EnrichOptions = { emails: true, deep: true, socials: true, tech: true, verify: false };
const COLUMNS = "id, website, email, emails, rating, reviews_count, instagram, facebook, tech";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { ids, options } = await req.json() as { ids?: string[]; options?: Partial<EnrichOptions> };
    if (!Array.isArray(ids) || !ids.length) return json({ ok: false, error: "Nenhum prospect enviado." });
    const opts = { ...DEFAULTS, ...(options ?? {}) };
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data, error } = await db.from("prospects").select(COLUMNS).in("id", ids.slice(0, MAX_PER_CALL));
    if (error) throw error;
    const rows = (data ?? []) as ProspectIn[];
    const results = await pool(rows, 8, async (p) => {
      const patch = await enrichOne(p, opts);
      const { error: e } = await db.from("prospects").update(patch).eq("id", p.id);
      return { id: p.id, ok: !e, emails: patch.emails?.length ?? 0, site: !patch.enrich_error };
    });
    return json({
      ok: true, processed: results.length,
      withEmail: results.filter((r) => r.emails > 0).length,
      sitesOpened: results.filter((r) => r.site).length,
      failed: results.filter((r) => !r.ok).length,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) });
  }
});
