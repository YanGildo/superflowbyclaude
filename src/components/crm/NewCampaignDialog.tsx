import { useEffect, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Loader2, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { useCampaigns } from "@/hooks/useCampaigns";
import type { Pipeline, PipelineStage } from "@/integrations/supabase/types";
import { DEFAULT_STAGES, nextCampaignPrefix, stageDrafts, type StageDraft } from "@/lib/leadImport";
import { useWorkspace } from "@/lib/workspace";

type Template = "padrao" | "copiar" | "custom";
const TEMPLATES: { value: Template; label: string }[] = [
  { value: "padrao", label: "Leads (padrão)" },
  { value: "copiar", label: "Copiar etapas de uma campanha existente" },
  { value: "custom", label: "Personalizado" },
];

/** Lista de etapas: adicionar, renomear, reordenar e remover. */
function StageEditor({ names, onChange }: { names: string[]; onChange: (n: string[]) => void }) {
  const swap = (i: number, j: number) => { const n = [...names]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return (
    <div className="space-y-1.5">
      {names.map((n, i) => (
        <div key={i} className="flex items-center gap-1">
          <span className="w-5 text-right text-xs text-muted-foreground">{i + 1}</span>
          <Input value={n} aria-label={`Etapa ${i + 1}`} className="h-8" onChange={(e) => onChange(names.map((x, k) => (k === i ? e.target.value : x)))} />
          <Button type="button" size="icon" variant="ghost" className="size-8" disabled={i === 0} onClick={() => swap(i, i - 1)} aria-label={`Subir etapa ${i + 1}`}><ArrowUp className="size-4" /></Button>
          <Button type="button" size="icon" variant="ghost" className="size-8" disabled={i === names.length - 1} onClick={() => swap(i, i + 1)} aria-label={`Descer etapa ${i + 1}`}><ArrowDown className="size-4" /></Button>
          <Button type="button" size="icon" variant="ghost" className="size-8" onClick={() => onChange(names.filter((_, k) => k !== i))} aria-label={`Remover etapa ${i + 1}`}><X className="size-4" /></Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...names, ""])}><Plus className="size-4" />Adicionar etapa</Button>
      <p className="text-xs text-muted-foreground">"Ganho" vira etapa de venda fechada e "Perdido" de negócio perdido.</p>
    </div>
  );
}

function draftsFor(t: Template, names: string[], copyFrom: string | null, allStages: PipelineStage[]): StageDraft[] {
  if (t === "copiar") {
    return allStages.filter((s) => s.pipeline_id === copyFrom)
      .map((s) => ({ name: s.name, outcome: s.outcome, set_contact_status: s.set_contact_status, color: s.color }));
  }
  return stageDrafts(t === "padrao" ? DEFAULT_STAGES : names);
}

export function NewCampaignDialog({ open, onOpenChange, pipelines, stages, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; pipelines: Pipeline[]; stages: PipelineStage[]; onCreated: (id: string) => void;
}) {
  const { businesses, businessFilter } = useWorkspace();
  const { create } = useCampaigns();
  const [name, setName] = useState("");
  const [business, setBusiness] = useState<string | null>(null);
  const [tpl, setTpl] = useState<Template>("padrao");
  const [copyFrom, setCopyFrom] = useState<string | null>(null);
  const [names, setNames] = useState<string[]>(DEFAULT_STAGES);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(nextCampaignPrefix(pipelines.map((p) => p.name)));
    setBusiness(businessFilter === "all" ? businesses[0]?.id ?? null : businessFilter);
    setTpl("padrao"); setCopyFrom(pipelines[0]?.id ?? null); setNames(DEFAULT_STAGES); setError(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const preview = draftsFor(tpl, names, copyFrom, stages);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.replace(/Campanha [A-Z] ·\s*$/, "").trim()) return setError("Dê um nome para a campanha.");
    if (!preview.length) return setError("A campanha precisa de pelo menos uma etapa.");
    const position = Math.max(0, ...pipelines.map((p) => p.position)) + 1;
    const id = await create.mutateAsync({ name, businessId: business, position, stages: preview });
    onCreated(id); onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Nova campanha</DialogTitle>
          <DialogDescription>Cria um funil novo. As campanhas que já existem não são alteradas.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="camp-name">Nome da campanha *</Label>
            <Input id="camp-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camp-biz">Negócio</Label>
            <RefSelect id="camp-biz" value={business} onChange={setBusiness} options={businesses} placeholder="Sem negócio" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camp-tpl">Modelo de etapas</Label>
            <SimpleSelect id="camp-tpl" value={tpl} onChange={(v) => { setTpl(v); if (v === "custom") setNames(preview.map((s) => s.name)); }} options={TEMPLATES} />
          </div>
          {tpl === "copiar" && (
            <div className="space-y-1.5">
              <Label htmlFor="camp-copy">Copiar de</Label>
              <RefSelect id="camp-copy" value={copyFrom} onChange={setCopyFrom} options={pipelines} placeholder="Escolha a campanha" />
            </div>
          )}
          {tpl === "custom"
            ? <StageEditor names={names} onChange={setNames} />
            : <p className="rounded-lg border bg-muted/40 p-2.5 text-xs text-muted-foreground">{preview.map((s) => s.name).join(" › ") || "Sem etapas."}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="size-4 animate-spin" />}Criar campanha</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
