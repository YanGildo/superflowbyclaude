import { useState } from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCrmMutations } from "@/hooks/useCrm";
import { useTrends } from "@/hooks/useContent";
import type { TrendItem } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { Choice, Empty, LinkOut } from "./ContentBits";

const TAGS = [
  { value: "potencial", label: "Potencial de gancho", tone: "bg-success/15 text-success" },
  { value: "explicar", label: "Explicar", tone: "bg-info/15 text-info" },
  { value: "pular", label: "Pular", tone: "bg-muted text-muted-foreground" },
];

/** Em alta (manual por enquanto): link, fonte, resumo e etiqueta; "Virar ideia" cria peça em Produção. */
export function TrendsTab() {
  const { data: trends = [] } = useTrends();
  const { save, patch, remove } = useCrmMutations("trend_items");
  const items = useCrmMutations("content_items");
  const [f, setF] = useState({ summary: "", link: "", source: "", tag: "potencial" });
  const [showSkip, setShowSkip] = useState(false);
  const add = () => save.mutate({ summary: f.summary.trim(), link: f.link.trim() || null, source: f.source.trim() || null, tag: f.tag }, { onSuccess: () => setF({ ...f, summary: "", link: "", source: "" }) });
  const idea = (t: TrendItem) => items.save.mutate({ title: t.summary.slice(0, 90), notes: [t.source, t.link].filter(Boolean).join(" · ") || null, stage: "ideia", kind: "Reels", channel: "Instagram" },
    { onSuccess: () => toast.success("Virou ideia em Produção.") });
  const list = trends.filter((t) => showSkip || t.tag !== "pular");
  const top = new Set(list.filter((t) => t.tag === "potencial").slice(0, 5).map((t) => t.id));

  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); if (f.summary.trim()) add(); }} className="grid gap-2 rounded-lg border bg-card p-3 sm:grid-cols-[1fr_200px_160px_190px_auto]">
        <Input value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} placeholder="Resumo de 1 linha" aria-label="Resumo" />
        <Input value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="Link" aria-label="Link" />
        <Input value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="Fonte" aria-label="Fonte" />
        <Choice id="tr-tag" value={f.tag} onChange={(v) => setF({ ...f, tag: v })} options={TAGS} />
        <Button type="submit" disabled={!f.summary.trim()}><Plus className="size-4" />Adicionar</Button>
      </form>
      <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={showSkip} onChange={(e) => setShowSkip(e.target.checked)} />Mostrar os marcados "Pular"</label>
      {list.length === 0 ? <Empty>Nada em alta ainda. A busca automática diária em fontes está nas pendências.</Empty> : list.map((t) => {
        const tag = TAGS.find((x) => x.value === t.tag) ?? TAGS[0];
        return (
          <div key={t.id} className={cn("flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3", top.has(t.id) && "border-primary/50")}>
            {top.has(t.id) && <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">TOP 5</span>}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t.summary}</p>
              <p className="text-xs text-muted-foreground">{[t.source, t.found_on.split("-").reverse().join("/")].filter(Boolean).join(" · ")}</p>
            </div>
            <LinkOut href={t.link}>Abrir</LinkOut>
            <div className="w-44"><Choice id={`tr-${t.id}`} value={t.tag} onChange={(v) => patch.mutate({ id: t.id, values: { tag: v } })} options={TAGS} /></div>
            <span className={cn("hidden rounded-full px-2 py-0.5 text-[11px] sm:inline", tag.tone)}>{tag.label}</span>
            <Button size="sm" variant="outline" onClick={() => idea(t)}>Virar ideia<ArrowRight className="size-4" /></Button>
            <Button size="icon" variant="ghost" className="size-8 hover:text-destructive" aria-label={`Apagar ${t.summary}`} onClick={() => remove.mutate(t.id)}><Trash2 className="size-4" /></Button>
          </div>
        );
      })}
    </div>
  );
}
