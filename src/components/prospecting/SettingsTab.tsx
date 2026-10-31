import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, PlugZap, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RefSelect } from "@/components/common/RefSelect";
import { useScriptSegments, useStages } from "@/hooks/useCrm";
import { useProspectActions, useProspectSettings } from "@/hooks/useProspects";
import { WEIGHT_LABELS, type ProspectSettings, type ScoreWeights } from "@/lib/prospecting";
import { EngineCard } from "./EngineCard";

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

function ApifyCard() {
  const { test } = useProspectActions();
  const r = test.data;
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="size-4" />Apify</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {r?.ok && <p className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-success"><CheckCircle2 className="size-4" />Apify conectada · conta {String(r.account)} · plano {String(r.plan)} · actor {String(r.actor)}</p>}
        {r && !r.ok && <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-destructive"><XCircle className="mt-0.5 size-4 shrink-0" />{r.error}</p>}
        <p className="text-xs text-muted-foreground">
          O token da Apify fica guardado só no servidor (Supabase → Edge Functions → Secrets, com o nome <code>APIFY_TOKEN</code>). Ele nunca passa pelo navegador.
          As buscas usam o actor <code>compass/crawler-google-places</code>.
        </p>
        <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending}>{test.isPending ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}Testar conexão</Button>
      </CardContent>
    </Card>
  );
}

function DefaultsCard({ s, set }: { s: ProspectSettings; set: (p: Partial<ProspectSettings>) => void }) {
  const { data: stages = [] } = useStages();
  const { data: segments = [] } = useScriptSegments();
  const stageNames = [...new Set(stages.map((x) => x.name))].map((n) => ({ id: n, name: n }));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Padrões de busca e conversão</CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1.5"><Label htmlFor="pc-limit" className="text-xs">Limite padrão de resultados</Label><Input id="pc-limit" type="number" value={s.limit} onChange={(e) => set({ limit: Number(e.target.value) || 50 })} className="h-9" /></div>
        <div className="space-y-1.5"><Label htmlFor="pc-country" className="text-xs">País padrão</Label><Input id="pc-country" value={s.country} onChange={(e) => set({ country: e.target.value })} className="h-9" /></div>
        <div className="space-y-1.5"><Label htmlFor="pc-lang" className="text-xs">Idioma padrão</Label><Input id="pc-lang" value={s.language} onChange={(e) => set({ language: e.target.value })} className="h-9" /></div>
        <div className="space-y-1.5"><Label htmlFor="pc-stage" className="text-xs">Etapa ao converter em lead</Label><RefSelect id="pc-stage" value={s.defaultStage} onChange={(v) => set({ defaultStage: v ?? "Novo lead" })} options={stageNames} placeholder="Novo lead" /></div>
        <div className="space-y-1.5"><Label htmlFor="pc-seg" className="text-xs">Segmento de script padrão</Label><RefSelect id="pc-seg" value={s.scriptSegment} onChange={(v) => set({ scriptSegment: v })} options={segments} placeholder="Nenhum" /></div>
        <div />
        <div className="space-y-1.5 md:col-span-3"><Label htmlFor="pc-niches" className="text-xs">Nichos que combinam com você (vírgula) — somam no score</Label><Input id="pc-niches" defaultValue={s.targetNiches.join(", ")} onBlur={(e) => set({ targetNiches: list(e.target.value) })} placeholder="engenharia, construtora, clínica" className="h-9" /></div>
        <div className="space-y-1.5 md:col-span-3"><Label htmlFor="pc-cities" className="text-xs">Cidades alvo (vírgula)</Label><Input id="pc-cities" defaultValue={s.targetCities.join(", ")} onBlur={(e) => set({ targetCities: list(e.target.value) })} placeholder="Campinas, Paulínia, Orlando" className="h-9" /></div>
      </CardContent>
    </Card>
  );
}

function WeightsCard({ s, set }: { s: ProspectSettings; set: (p: Partial<ProspectSettings>) => void }) {
  const setW = (k: keyof ScoreWeights, v: number) => set({ weights: { ...s.weights, [k]: v } });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Critérios de score (0–100)</CardTitle></CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(WEIGHT_LABELS) as (keyof ScoreWeights)[]).map((k) => (
          <div key={k} className="space-y-1.5"><Label htmlFor={`w-${k}`} className="text-xs">{WEIGHT_LABELS[k]}</Label>
            <Input id={`w-${k}`} type="number" min={0} max={100} value={s.weights[k]} onChange={(e) => setW(k, Number(e.target.value) || 0)} className="h-9" /></div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SettingsTab() {
  const { settings, save } = useProspectSettings();
  const [s, setS] = useState<ProspectSettings>(settings);
  useEffect(() => setS(settings), [JSON.stringify(settings)]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (p: Partial<ProspectSettings>) => setS((c) => ({ ...c, ...p }));
  return (
    <div className="space-y-4">
      <EngineCard s={s} set={set} />
      <DefaultsCard s={s} set={set} />
      <WeightsCard s={s} set={set} />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => save.mutate(s)} disabled={save.isPending}>Salvar configurações</Button>
        <p className="text-xs text-muted-foreground">Depois de mudar os pesos, use "Recalcular score" na lista de prospects.</p>
      </div>
      {s.provider === "apify" && <ApifyCard />}
    </div>
  );
}
