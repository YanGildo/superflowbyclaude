import { useMemo, useState } from "react";
import { ExternalLink, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefSelect } from "@/components/common/RefSelect";
import { StepEditor } from "@/components/siteforms/StepEditor";
import { TextsTab } from "@/components/siteforms/TextsTab";
import { ResponsesPanel } from "@/components/siteforms/ResponsesPanel";
import { usePipelines, useStages } from "@/hooks/useCrm";
import { useSiteFormActions } from "@/hooks/useSiteForms";
import { SITE_URL, emptyStep, validateContent, type FormContent, type SiteForm } from "@/lib/siteForms";

/** Edição completa de um formulário: perguntas, textos, funil de destino e respostas. */
export function FormEditor({ form, initialTab = "perguntas" }: { form: SiteForm; initialTab?: string }) {
  const { update } = useSiteFormActions();
  const { data: pipelines = [] } = usePipelines();
  const { data: stages = [] } = useStages();
  const [name, setName] = useState(form.name);
  const [active, setActive] = useState(form.active);
  const [content, setContent] = useState<FormContent>(form.content);
  const [pipeline, setPipeline] = useState<string | null>(form.pipeline_id);
  const [stage, setStage] = useState<string | null>(form.stage_id);
  const [source, setSource] = useState(form.source);
  const stageOptions = useMemo(() => stages.filter((s) => s.pipeline_id === pipeline), [stages, pipeline]);
  const dirty = JSON.stringify([name, active, content, pipeline, stage, source]) !== JSON.stringify([form.name, form.active, form.content, form.pipeline_id, form.stage_id, form.source]);

  const setSteps = (steps: FormContent["steps"]) => setContent({ ...content, steps });
  const move = (i: number, dir: -1 | 1) => { const s = [...content.steps]; [s[i], s[i + dir]] = [s[i + dir], s[i]]; setSteps(s); };

  const save = () => {
    const problem = validateContent(content);
    if (problem) return toast.error(problem);
    if (!name.trim()) return toast.error("Dê um nome ao formulário.");
    update.mutate({ id: form.id, patch: { name: name.trim(), active, content, pipeline_id: pipeline, stage_id: stage, source: source.trim() || "Site / Landing page" } });
  };
  const url = `${SITE_URL}/${form.slug}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-[220px] flex-1 space-y-1.5"><Label htmlFor="f-name">Nome (só você vê)</Label><Input id="f-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="flex items-center gap-2 pb-2"><Switch id="f-active" checked={active} onCheckedChange={setActive} /><Label htmlFor="f-active">{active ? "No ar" : "Desligado (a página dá 404)"}</Label></div>
        <Button type="button" variant="outline" asChild><a href={url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" />Abrir {form.slug}</a></Button>
        <Button type="button" onClick={save} disabled={!dirty || update.isPending}>{update.isPending && <Loader2 className="size-4 animate-spin" />}{dirty ? "Salvar alterações" : "Salvo"}</Button>
      </div>
      <Tabs defaultValue={initialTab}>
        <TabsList><TabsTrigger value="perguntas">Perguntas ({content.steps.length})</TabsTrigger><TabsTrigger value="textos">Textos e botão final</TabsTrigger><TabsTrigger value="funil">Funil do CRM</TabsTrigger><TabsTrigger value="respostas">Respostas</TabsTrigger></TabsList>
        <TabsContent value="perguntas" className="space-y-3">
          {content.steps.map((s, i) => (
            <StepEditor key={s.id} step={s} index={i} total={content.steps.length} all={content.steps}
              onChange={(n) => setSteps(content.steps.map((x, j) => (j === i ? n : x)))} onMove={(d) => move(i, d)}
              onRemove={() => { if (window.confirm(`Apagar a pergunta “${s.q}”?`)) setSteps(content.steps.filter((_, j) => j !== i)); }} />
          ))}
          <Button type="button" variant="outline" onClick={() => setSteps([...content.steps, emptyStep(content.steps)])}><Plus className="size-4" />Adicionar pergunta</Button>
        </TabsContent>
        <TabsContent value="textos"><TextsTab content={content} onChange={setContent} /></TabsContent>
        <TabsContent value="funil" className="max-w-xl space-y-3">
          <p className="text-sm text-muted-foreground">Cada pessoa que preencher vira um contato e uma oportunidade neste funil, na etapa escolhida. Quem desiste no meio também fica salvo.</p>
          <div className="space-y-1.5"><Label>Funil</Label><RefSelect value={pipeline} onChange={(p) => { setPipeline(p); setStage(stages.find((s) => s.pipeline_id === p)?.id ?? null); }} options={pipelines} placeholder="Não criar oportunidade" /></div>
          {pipeline && <div className="space-y-1.5"><Label>Etapa inicial</Label><RefSelect value={stage} onChange={setStage} options={stageOptions} placeholder="Escolha a etapa" /></div>}
          <div className="space-y-1.5"><Label htmlFor="f-src">Origem registrada no contato</Label><Input id="f-src" value={source} onChange={(e) => setSource(e.target.value)} /></div>
        </TabsContent>
        <TabsContent value="respostas"><ResponsesPanel form={form} /></TabsContent>
      </Tabs>
    </div>
  );
}
