// Edge Function: envia os e-mails da fila notification_outbox (aviso de lead novo) pelo Resend.
// Chamada a cada 2 minutos pelo pg_cron. Sem a chave RESEND_API_KEY, não faz nada (os avisos ficam na fila).
// Segredos: RESEND_API_KEY (obrigatório para enviar) e RESEND_FROM (opcional, ex.: "Superflow <avisos@seudominio.com>").
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async () => {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return json({ ok: true, skipped: "RESEND_API_KEY não configurada; avisos continuam na fila." });
  const from = Deno.env.get("RESEND_FROM") ?? "Superflow <onboarding@resend.dev>";
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: rows, error } = await db.from("notification_outbox").select("*").eq("status", "pendente").lt("attempts", 5)
    .order("created_at").limit(30);
  if (error) return json({ ok: false, error: error.message }, 500);

  let sent = 0;
  for (const r of rows ?? []) {
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap">${esc(r.body)}</div>`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: r.to_emails, subject: r.subject, text: r.body, html }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      sent += 1;
      await db.from("notification_outbox").update({ status: "enviado", sent_at: new Date().toISOString(), attempts: r.attempts + 1, error: null }).eq("id", r.id);
    } else {
      const failed = r.attempts + 1 >= 5;
      await db.from("notification_outbox").update({ status: failed ? "falhou" : "pendente", attempts: r.attempts + 1, error: String(body?.message ?? res.status) }).eq("id", r.id);
    }
  }
  return json({ ok: true, sent, pending: (rows?.length ?? 0) - sent });
});
