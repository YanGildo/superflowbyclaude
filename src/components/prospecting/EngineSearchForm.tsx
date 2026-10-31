import { useState, type FormEvent } from "react";
import { AlertTriangle, Eraser, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { useEngine } from "@/hooks/useEngine";
import { useProspectCampaigns } from "@/hooks/useProspects";
import { useRunState } from "@/hooks/useProspectRunner";
import {
  DEFAULT_ENRICH, GRID_OPTIONS, LANG_OPTIONS, NO_FILTERS, isLargeSearch, jobCount, splitList, type EngineSearch, type EnrichChoice,
} from "@/lib/mapsEngine";
import { EnrichSwitches } from "./EnrichSwitches";

const SAVED = "superflow:motor-busca";

type Form = {
  keywords: string; cities: string; depth: string; grid: string; lang: string; maxMinutes: string; proxies: string;
  minRating: string; minReviews: string; noWebsite: boolean; hasPhone: boolean; enrich: EnrichChoice; campaignId: string | null;
};

const EMPTY: Form = {
  keywords: "", cities: "", depth: "5", grid: "1", lang: "pt", maxMinutes: "10", proxies: "",
  minRating: "", minReviews: "", noWebsite: false, hasPhone: false, enrich: DEFAULT_ENRICH, campaignId: null,
};

function load(): Form {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(SAVED) ?? "{}") }; } catch { return EMPTY; }
}

function toSearch(f: Form): EngineSearch {
  return {
    keywords: splitList(f.keywords), cities: splitList(f.cities, /\n|;/), depth: Math.min(30, Math.max(1, Number(f.depth) || 5)),
    grid: Number(f.grid) || 1, lang: f.lang, maxMinutes: Math.max(3, Number(f.maxMinutes) || 10), proxies: splitList(f.proxies, /\s+/),
    filters: { ...NO_FILTERS, minRating: Number(f.minRating.replace(",", ".")) || 0, minReviews: Number(f.minReviews) || 0, noWebsite: f.noWebsite, hasPhone: f.hasPhone },
    enrich: f.enrich, campaignId: f.campaignId,
  };
}

function Text({ id, label, value, onChange, ph, type = "text" }: { id: string; label: string; value: string; onChange: (v: string) => void; ph?: string; type?: string }) {
  return (
    <div className="space-y-1.5"><Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} className="h-9" /></div>
  );
}

function WhereWhat({ f, set }: { f: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="mt-kw" className="text-xs">Nichos / termos (vírgula ou um por linha)</Label>
        <Textarea id="mt-kw" rows={3} value={f.keywords} onChange={(e) => set("keywords", e.target.value)} placeholder={"dentista, clínica de estética\nacademia"} /></div>
      <div className="space-y-1.5"><Label htmlFor="mt-city" className="text-xs">Cidades (uma por linha)</Label>
        <Textarea id="mt-city" rows={3} value={f.cities} onChange={(e) => set("cities", e.target.value)} placeholder={"Campinas, SP\nPaulínia, SP\nOrlando, FL"} /></div>
    </div>
  );
}

function Options({ f, set }: { f: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void }) {
  const { data: campaigns = [] } = useProspectCampaigns();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Text id="mt-depth" label="Profundidade (5 ≈ 20–40 por termo)" type="number" value={f.depth} onChange={(v) => set("depth", v)} />
      <div className="space-y-1.5"><Label htmlFor="mt-grid" className="text-xs">Grade (passa de ~120 por busca)</Label>
        <SimpleSelect id="mt-grid" value={f.grid} onChange={(v) => set("grid", v)} options={GRID_OPTIONS} /></div>
      <div className="space-y-1.5"><Label htmlFor="mt-lang" className="text-xs">Idioma do Maps</Label>
        <SimpleSelect id="mt-lang" value={f.lang} onChange={(v) => set("lang", v)} options={LANG_OPTIONS} /></div>
      <Text id="mt-time" label="Tempo máx. por busca (min)" type="number" value={f.maxMinutes} onChange={(v) => set("maxMinutes", v)} />
      <div className="space-y-1.5"><Label htmlFor="mt-camp" className="text-xs">Campanha</Label>
        <RefSelect id="mt-camp" value={f.campaignId} onChange={(v) => set("campaignId", v)} options={campaigns} placeholder="Nenhuma" /></div>
    </div>
  );
}

function Filters({ f, set }: { f: Form; set: <K extends keyof Form>(k: K, v: Form[K]) => void }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="w-32"><Text id="mt-minr" label="Nota mínima" value={f.minRating} onChange={(v) => set("minRating", v)} ph="ex.: 4" /></div>
      <div className="w-36"><Text id="mt-minv" label="Mín. de avaliações" type="number" value={f.minReviews} onChange={(v) => set("minReviews", v)} ph="ex.: 10" /></div>
      <label className="flex items-center gap-2 pb-2 text-sm"><Switch checked={f.noWebsite} onCheckedChange={(c) => set("noWebsite", c)} aria-label="Só sem site" />Só quem não tem site</label>
      <label className="flex items-center gap-2 pb-2 text-sm"><Switch checked={f.hasPhone} onCheckedChange={(c) => set("hasPhone", c)} aria-label="Só com telefone" />Só com telefone</label>
    </div>
  );
}

/** Busca no motor próprio (Google Maps Scraper rodando no seu PC ou servidor). */
export function EngineSearchForm() {
  const engine = useEngine();
  const run = useRunState();
  const [f, setF] = useState<Form>(load);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const s = toSearch(f);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!s.keywords.length) return toast.error("Informe pelo menos um nicho (ex.: dentista).");
    if (!s.cities.length) return toast.error("Informe pelo menos uma cidade (ex.: Campinas, SP).");
    try { localStorage.setItem(SAVED, JSON.stringify(f)); } catch { /* sem storage */ }
    void engine.search(s);
  };

  return (
    <Card>
      <CardContent className="p-5">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <WhereWhat f={f} set={set} />
          <Options f={f} set={set} />
          <Filters f={f} set={set} />
          <div className="space-y-1.5"><p className="text-xs font-medium">Depois da busca, visitar os sites e buscar:</p><EnrichSwitches value={f.enrich} onChange={(v) => set("enrich", v)} /></div>
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-muted-foreground">Avançado: proxies</summary>
            <Textarea className="mt-2" rows={2} aria-label="Proxies" value={f.proxies} onChange={(e) => set("proxies", e.target.value)}
              placeholder="http://usuario:senha@host:porta (um por linha). Só para buscas grandes ou repetidas." />
          </details>
          {isLargeSearch(s) && <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs"><AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" />Busca grande sem proxy: o Google pode limitar seu IP por alguns minutos ou horas (sua conta Google não é afetada).</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={run.phase === "running"}><Search className="size-4" />Buscar leads</Button>
            <Button type="button" variant="ghost" onClick={() => setF(EMPTY)}><Eraser className="size-4" />Limpar</Button>
            <span className="text-xs text-muted-foreground">{jobCount(s)} busca(s) no motor · {engine.cfg.url || "motor não configurado"}</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
