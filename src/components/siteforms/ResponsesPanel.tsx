import { useState } from "react";
import { Download, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/PageHeader";
import { useFormResponses } from "@/hooks/useSiteForms";
import type { FormResponse, SiteForm } from "@/lib/siteForms";

const fmt = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

function exportCsv(form: SiteForm, rows: FormResponse[]) {
  const qs = [...new Set(rows.flatMap((r) => r.answers.map((a) => a.q)))];
  const head = ["Data", "Concluído", "Nome", "WhatsApp", "Anúncio", ...qs];
  const body = rows.map((r) => [fmt(r.created_at), r.done ? "sim" : "não", r.name ?? "", r.whatsapp ?? "", r.utm.utm_content ?? "", ...qs.map((q) => r.answers.find((a) => a.q === q)?.a ?? "")]);
  const csv = [head, ...body].map((l) => l.map(csvCell).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = `respostas-${form.slug}.csv`; a.click(); URL.revokeObjectURL(url);
}

/** Quem preencheu este formulário, com as respostas e a origem do anúncio. */
export function ResponsesPanel({ form }: { form: SiteForm }) {
  const { data: rows = [], isLoading } = useFormResponses(form.id);
  const [open, setOpen] = useState<string | null>(null);
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!rows.length) return <EmptyState icon={Inbox} title="Ainda sem respostas" description="Quando alguém começar o formulário, aparece aqui (e vira lead no funil escolhido)." />;
  const done = rows.filter((r) => r.done).length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{rows.length} pessoas começaram · {done} terminaram ({Math.round((done / rows.length) * 100)}%)</p>
        <Button type="button" size="sm" variant="outline" onClick={() => exportCsv(form, rows)}><Download className="size-4" />Baixar planilha (CSV)</Button>
      </div>
      <ul className="divide-y rounded-xl border bg-card">
        {rows.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/40" aria-expanded={open === r.id}>
              <span className="min-w-0"><b>{r.name ?? "Sem nome"}</b> <span className="text-sm text-muted-foreground">{r.whatsapp}</span></span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">{r.utm.utm_content && <Badge variant="secondary">{r.utm.utm_content}</Badge>}{fmt(r.created_at)}<Badge variant={r.done ? "default" : "outline"}>{r.done ? "concluído" : "parou no meio"}</Badge></span>
            </button>
            {open === r.id && (
              <dl className="grid gap-x-6 gap-y-1 border-t bg-muted/30 px-4 py-3 text-sm sm:grid-cols-2">
                {r.answers.map((a, i) => <div key={i} className="flex gap-2"><dt className="shrink-0 font-medium">{a.q}:</dt><dd className="min-w-0 break-words text-muted-foreground">{a.a}</dd></div>)}
                {Object.entries(r.utm).map(([k, v]) => <div key={k} className="flex gap-2"><dt className="shrink-0 font-medium">{k}:</dt><dd className="text-muted-foreground">{v}</dd></div>)}
              </dl>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
