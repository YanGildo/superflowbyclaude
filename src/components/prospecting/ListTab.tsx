import { useMemo, useRef, useState } from "react";
import { Calculator, Download, Search, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/PageHeader";
import { useConvertProspect } from "@/hooks/useConvertProspect";
import { useProspectActions, useProspectCampaigns, useProspects } from "@/hooks/useProspects";
import type { Prospect } from "@/integrations/supabase/types";
import { importedRow, parseCsv, toCsv } from "@/lib/prospecting";
import { cn } from "@/lib/utils";
import { ProspectRow } from "./ProspectRow";

const CHIPS: { id: string; label: string; test: (p: Prospect) => boolean }[] = [
  { id: "semsite", label: "Sem site", test: (p) => !p.website },
  { id: "tel", label: "Com telefone", test: (p) => Boolean(p.phone || p.whatsapp) },
  { id: "alta", label: "Oportunidade alta", test: (p) => (p.score ?? 0) >= 70 },
  { id: "aval", label: "Avaliação 4+", test: (p) => Number(p.rating ?? 0) >= 4 },
  { id: "novo", label: "Novos", test: (p) => p.status === "Novo" },
  { id: "abordar", label: "Para abordar", test: (p) => p.status === "Para abordar" },
  { id: "abordado", label: "Já abordado", test: (p) => p.status === "Abordado" },
  { id: "resp", label: "Respondeu", test: (p) => p.status === "Respondeu" },
  { id: "semresp", label: "Sem resposta", test: (p) => p.status === "Sem resposta" },
  { id: "lead", label: "Viraram lead", test: (p) => p.status === "Virou lead" },
  { id: "obs", label: "Com observações", test: (p) => Boolean(p.notes) },
];

const text = (p: Prospect, q: string) => !q || [p.name, p.city, p.phone, p.website, p.category].some((v) => v?.toLowerCase().includes(q.toLowerCase()));

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob(["﻿" + content], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

/** Importa CSV ou JSON (inclusive export da Apify). */
function useImporter() {
  const { importRows } = useProspectActions();
  return async (file: File) => {
    const raw = await file.text();
    let rows: Record<string, unknown>[] = [];
    try { rows = file.name.endsWith(".json") ? JSON.parse(raw) : parseCsv(raw); } catch { return toast.error("Arquivo inválido."); }
    const ok = rows.map((r) => importedRow(Object.fromEntries(Object.entries(r).map(([k, v]) => [k.toLowerCase(), v])))).filter(Boolean) as Partial<Prospect>[];
    if (!ok.length) return toast.error("Não encontrei empresas no arquivo (precisa de uma coluna name/nome).");
    importRows.mutate(ok);
  };
}

function Toolbar({ list, onImport }: { list: Prospect[]; onImport: (f: File) => void }) {
  const { rescore } = useProspectActions();
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={async () => toast.success(`Score recalculado em ${await rescore(list, true)} prospect(s).`)}><Calculator className="size-4" />Recalcular score</Button>
      <Button size="sm" variant="outline" onClick={() => download("prospects.csv", toCsv(list), "text/csv")}><Download className="size-4" />CSV</Button>
      <Button size="sm" variant="outline" onClick={() => download("prospects.json", JSON.stringify(list, null, 2), "application/json")}><Download className="size-4" />JSON</Button>
      <Button size="sm" onClick={() => file.current?.click()}><Upload className="size-4" />Importar</Button>
      <input ref={file} type="file" accept=".csv,.json" className="hidden" aria-label="Arquivo para importar"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }} />
    </div>
  );
}

export function ListTab() {
  const { data: prospects = [], isLoading } = useProspects();
  const { data: campaigns = [] } = useProspectCampaigns();
  const convert = useConvertProspect();
  const onImport = useImporter();
  const [q, setQ] = useState("");
  const [on, setOn] = useState<string[]>([]);
  const toggle = (id: string) => setOn((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const list = useMemo(() => prospects.filter((p) => text(p, q) && CHIPS.filter((c) => on.includes(c.id)).every((c) => c.test(p)))
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1)), [prospects, q, on]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por empresa, cidade, telefone, site…" aria-label="Buscar prospect" className="h-9 pl-9" />
        </div>
        <Toolbar list={list} onImport={onImport} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map((c) => (
          <button key={c.id} type="button" aria-pressed={on.includes(c.id)} onClick={() => toggle(c.id)}
            className={cn("rounded-full border px-2.5 py-1 text-xs", on.includes(c.id) ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-accent")}>{c.label}</button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{list.length} prospect(s)</p>
      {isLoading ? <Skeleton className="h-60 rounded-xl" /> : list.length === 0 ? (
        <EmptyState icon={Search} title={prospects.length ? "Ninguém com esses filtros" : "Nenhum prospect ainda"}
          description="Faça uma busca na Apify ou importe um CSV/JSON (dá para importar o export da Apify direto)." />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-[980px]">
            <thead><tr className="border-b text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              {["Empresa", "Cidade", "Telefone", "Site", "Avaliação", "Oportunidade", "Status", ""].map((h) => <th key={h} className="px-3 py-2 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>{list.map((p) => <ProspectRow key={p.id} p={p} campaigns={campaigns} onConvert={() => void convert(p)} />)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
