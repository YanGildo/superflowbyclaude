// Edge Function: recebe leads do Formulário instantâneo do Meta (webhook "leadgen") e grava na campanha certa.
// GET  = verificação do webhook (hub.verify_token = META_VERIFY_TOKEN).
// POST = aviso de lead novo: busca os dados na Graph API com META_PAGE_TOKEN e importa pela import_campaign_leads_core.
// Segredos: META_VERIFY_TOKEN, META_PAGE_TOKEN (token de página de longa duração com leads_retrieval), META_APP_SECRET (confere a assinatura).
// A rota (formulário/página → campanha) fica na tabela meta_lead_routes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const GRAPH = "https://graph.facebook.com/v21.0";
const text = (body: string, status = 200) => new Response(body, { status });
const KNOWN: Record<string, string> = {
  full_name: "name", nome_completo: "name", first_name: "first_name", last_name: "last_name",
  phone_number: "phone", numero_de_telefone: "phone", telefone: "phone", whatsapp: "phone",
  email: "email", "e-mail": "email", city: "city", cidade: "city", country: "country", pais: "country",
};
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const keyOf = (h: string) => fold(h).replace(/[\s-]+/g, "_");
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const pretty = (v: string) => (/\s/.test(v.trim()) ? v.trim() : cap(v.replace(/_/g, " ").replace(/\s+/g, " ").trim()));
const cleanPhone = (v: string) => {
  const p = v.replace(/^\s*p:\s*/i, "").replace(/[^\d+]/g, "");
  return p && !p.startsWith("+") && /^\d{10,11}$/.test(p) ? `+55${p}` : p;
};

type Rules = { rules: { temperature: string; contains: string[] }[]; fallback: string };
const DEFAULT_RULES: Rules = {
  rules: [
    { temperature: "quente", contains: ["30 dias", "1 a 3 meses"] },
    { temperature: "morno", contains: ["3 a 6 meses"] },
    { temperature: "frio", contains: ["mais de 6 meses", "pesquisando"] },
  ],
  fallback: "morno",
};
function temperature(answers: string[], cfg: Rules) {
  const all = fold(answers.join(" | "));
  return cfg.rules.find((r) => r.contains.some((t) => t.trim() && all.includes(fold(t.trim()))))?.temperature ?? cfg.fallback;
}

async function sig(body: string, header: string | null) {
  const secret = Deno.env.get("META_APP_SECRET");
  if (!secret) return true;
  if (!header?.startsWith("sha256=")) return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(body)));
  return header.slice(7) === [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function graph(path: string, token: string) {
  const r = await fetch(`${GRAPH}/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`);
  const b = await r.json();
  if (!r.ok) throw new Error(b?.error?.message ?? `Graph ${r.status}`);
  return b;
}

// deno-lint-ignore no-explicit-any
function toRow(lead: any, formName: string, source: string, rules: Rules) {
  const fields: Record<string, string> = {};
  const respostas: { pergunta: string; resposta: string }[] = [];
  for (const f of lead.field_data ?? []) {
    const v = (f.values ?? []).join(", ");
    const k = KNOWN[keyOf(f.name)];
    if (k) fields[k] = v; else if (v) respostas.push({ pergunta: cap(String(f.name).replace(/_/g, " ").trim()), resposta: pretty(v) });
  }
  const name = fields.name || [fields.first_name, fields.last_name].filter(Boolean).join(" ");
  return {
    line: lead.id, name: name || null, phone: fields.phone ? cleanPhone(fields.phone) : null, email: fields.email?.toLowerCase() || null,
    city: fields.city || null, country: fields.country || null, respostas,
    temperature: temperature(respostas.map((r) => r.resposta), rules),
    source: source.replace(/\{form_name\}/g, formName).trim(),
    meta: {
      meta_lead_id: `l:${lead.id}`, created_time: lead.created_time ?? null, campaign_name: lead.campaign_name ?? null,
      adset_name: lead.adset_name ?? null, ad_name: lead.ad_name ?? null, form_name: formName, platform: lead.platform ?? null,
      is_organic: lead.is_organic != null ? String(lead.is_organic) : null,
    },
  };
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "GET") {
    const ok = url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === Deno.env.get("META_VERIFY_TOKEN");
    return ok ? text(url.searchParams.get("hub.challenge") ?? "") : text("forbidden", 403);
  }
  const raw = await req.text();
  if (!(await sig(raw, req.headers.get("x-hub-signature-256")))) return text("assinatura inválida", 401);
  const token = Deno.env.get("META_PAGE_TOKEN");
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const payload = JSON.parse(raw || "{}");
  // deno-lint-ignore no-explicit-any
  const changes = (payload.entry ?? []).flatMap((e: any) => (e.changes ?? []).filter((c: any) => c.field === "leadgen").map((c: any) => c.value));

  for (const ch of changes) {
    const log = { leadgen_id: String(ch.leadgen_id ?? ""), page_id: String(ch.page_id ?? ""), form_id: String(ch.form_id ?? "") };
    try {
      if (!token) throw new Error("META_PAGE_TOKEN não configurado");
      const { data: routes } = await db.from("meta_lead_routes").select("*").eq("active", true)
        .in("page_id", [log.page_id, "*"]).in("form_id", [log.form_id, "*"]);
      const route = (routes ?? []).sort((a, b) => Number(b.form_id !== "*") - Number(a.form_id !== "*") || Number(b.page_id !== "*") - Number(a.page_id !== "*"))[0];
      if (!route) throw new Error("Nenhuma campanha ligada a este formulário (meta_lead_routes)");
      const lead = await graph(`${log.leadgen_id}?fields=id,created_time,field_data,ad_name,adset_name,campaign_name,form_id,platform,is_organic`, token);
      const form = await graph(`${log.form_id}?fields=name`, token).catch(() => ({ name: log.form_id }));
      const { data: pl } = await db.from("pipelines").select("id, temperature_rules").eq("id", route.pipeline_id).single();
      let stage = route.stage_id;
      if (!stage) {
        const { data: st } = await db.from("pipeline_stages").select("id").eq("pipeline_id", route.pipeline_id).order("position").limit(1).single();
        stage = st?.id;
      }
      const row = toRow(lead, form.name ?? "", route.source, (pl?.temperature_rules as Rules) ?? DEFAULT_RULES);
      const { data: result, error } = await db.rpc("import_campaign_leads_core", { _pipeline: route.pipeline_id, _stage: stage, _rows: [row] });
      if (error) throw error;
      await db.from("meta_lead_events").insert({ ...log, status: "importado", detail: result });
    } catch (e) {
      await db.from("meta_lead_events").insert({ ...log, status: "erro", detail: { erro: String((e as Error).message ?? e) } });
    }
  }
  return text("ok");
});
