import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Mascot } from "@/components/central/Mascot";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAssistantSettings } from "@/hooks/useCentral";
import { DEFAULT_TEMPLATES, HOURS, SOURCE_KEYS, SOURCE_LABEL, type AssistantSettings, type MascotShape } from "@/lib/assistant";
import { cn } from "@/lib/utils";

type Set = (p: Partial<AssistantSettings>) => void;
const SHAPES: { v: MascotShape; label: string }[] = [{ v: "esfera", label: "Esfera" }, { v: "robo", label: "Robô" }, { v: "gato", label: "Gato" }];

function MascotCard({ s, set }: { s: AssistantSettings; set: Set }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Mascote</CardTitle></CardHeader>
      <CardContent className="flex flex-wrap items-center gap-6">
        <div className="flex gap-3"><Mascot shape={s.forma} count={0} size={64} name={s.nome} /><Mascot shape={s.forma} count={3} size={64} name={s.nome} /></div>
        <div className="space-y-1.5"><Label htmlFor="as-name" className="text-xs">Nome</Label>
          <Input id="as-name" value={s.nome} onChange={(e) => set({ nome: e.target.value || "Flow" })} className="h-9 w-48" /></div>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Forma do mascote">
          {SHAPES.map((x) => (
            <button key={x.v} type="button" role="radio" aria-checked={s.forma === x.v} onClick={() => set({ forma: x.v })}
              className={cn("rounded-lg border px-3 py-1.5 text-sm", s.forma === x.v ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}>{x.label}</button>
          ))}
        </div>
        <p className="w-full text-xs text-muted-foreground">Dormindo = nada urgente. Acordado = tem coisa esperando (com a contagem). Ele fica no topo do menu.</p>
      </CardContent>
    </Card>
  );
}

function ScanCard({ s, set }: { s: AssistantSettings; set: Set }) {
  const toggle = (h: string) => set({ horarios: s.horarios.includes(h) ? s.horarios.filter((x) => x !== h) : [...s.horarios, h].sort() });
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Varreduras</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <label className="flex items-center gap-2 text-sm"><Switch checked={s.ativo} onCheckedChange={(c) => set({ ativo: c })} aria-label="Varreduras automáticas" />Varreduras automáticas ligadas</label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Horários das varreduras">
          {HOURS.map((h) => (
            <button key={h} type="button" aria-pressed={s.horarios.includes(h)} onClick={() => toggle(h)}
              className={cn("w-12 rounded-md border py-1 text-xs tabular-nums", s.horarios.includes(h) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}>{h}h</button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Horário de Brasília. Em cada varredura o sistema prepara os rascunhos novos e guarda o resumo. Três por dia funciona melhor que tempo real: evita interrupção.</p>
        <div className="space-y-1.5"><Label htmlFor="as-days" className="text-xs">Proposta parada depois de quantos dias sem resposta?</Label>
          <Input id="as-days" type="number" min={1} max={60} value={s.diasProposta} onChange={(e) => set({ diasProposta: Math.max(1, Number(e.target.value) || 3) })} className="h-9 w-24" /></div>
      </CardContent>
    </Card>
  );
}

function SourcesCard({ s, set }: { s: AssistantSettings; set: Set }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">O que entra na Central</CardTitle></CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2">
        {SOURCE_KEYS.map((k) => (
          <label key={k} className="flex items-start gap-2 rounded-lg border p-2.5 text-sm">
            <Switch checked={s.fontes[k]} onCheckedChange={(c) => set({ fontes: { ...s.fontes, [k]: c } })} aria-label={SOURCE_LABEL[k].label} />
            <span><span className="font-medium">{SOURCE_LABEL[k].label}</span><span className="block text-[11px] text-muted-foreground">{SOURCE_LABEL[k].hint}</span></span>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

function TemplatesCard({ s, set }: { s: AssistantSettings; set: Set }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">Modelos dos rascunhos</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5"><Label htmlFor="as-fu" className="text-xs">Follow-up — variáveis: [nome], [empresa]</Label>
          <Textarea id="as-fu" rows={2} value={s.modelos.followup} placeholder={DEFAULT_TEMPLATES.followup} onChange={(e) => set({ modelos: { ...s.modelos, followup: e.target.value } })} /></div>
        <div className="space-y-1.5"><Label htmlFor="as-pr" className="text-xs">Proposta parada — variáveis: [nome], [proposta]</Label>
          <Textarea id="as-pr" rows={2} value={s.modelos.proposta} placeholder={DEFAULT_TEMPLATES.proposta} onChange={(e) => set({ modelos: { ...s.modelos, proposta: e.target.value } })} /></div>
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs"><b>Regra fixa:</b> o assistente prepara tudo, mas nunca envia, responde ou marca nada sem você aprovar.</p>
      </CardContent>
    </Card>
  );
}

/** Regras do assistente da Central do dia. */
export function AssistantTab() {
  const { settings, save } = useAssistantSettings();
  const [s, setS] = useState(settings);
  useEffect(() => setS(settings), [JSON.stringify(settings)]); // eslint-disable-line react-hooks/exhaustive-deps
  const set: Set = (p) => setS((c) => ({ ...c, ...p }));
  return (
    <div className="space-y-4">
      <MascotCard s={s} set={set} />
      <ScanCard s={s} set={set} />
      <SourcesCard s={s} set={set} />
      <TemplatesCard s={s} set={set} />
      <Button onClick={() => save.mutate(s)} disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Salvar assistente</Button>
    </div>
  );
}
