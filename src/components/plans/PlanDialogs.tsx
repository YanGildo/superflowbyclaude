import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { usePlanMutations } from "@/hooks/useActionPlans";
import type { ActionPlan, ActionPlanAsset, ActionPlanStep } from "@/integrations/supabase/types";
import { ASSET_KIND } from "@/lib/actionPlans";

type Form = Record<string, string | boolean>;

function useForm(open: boolean, initial: () => Form) {
  const [f, setF] = useState<Form>(initial);
  useEffect(() => { if (open) setF(initial()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const field = (k: string) => ({ id: `pf-${k}`, value: String(f[k] ?? ""), onChange: (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value })) });
  return { f, setF, field };
}

/** Campos de texto de um registro para o formulário ("" quando vazio). */
const fromRow = (row: object | null, keys: string[]): Form =>
  Object.fromEntries(keys.map((k) => [k, String((row as Record<string, unknown> | null)?.[k] ?? "")]));

const nul = (v: string | boolean) => (typeof v === "string" ? v.trim() || null : v);

function Shell({ open, onOpenChange, title, busy, valid, onSave, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; busy: boolean; valid: boolean; onSave: () => void; children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="font-heading">{title}</DialogTitle></DialogHeader>
        <div className="grid gap-3">{children}</div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!valid || busy} onClick={onSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const F = ({ k, label, children }: { k: string; label: string; children: ReactNode }) => (
  <div className="grid gap-1.5"><Label htmlFor={`pf-${k}`}>{label}</Label>{children}</div>
);

export function PlanDialog({ open, onOpenChange, plan, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; plan: ActionPlan | null; onCreated?: () => void }) {
  const { save } = usePlanMutations("action_plans");
  const { f, field } = useForm(open, () => ({ title: plan?.title ?? "", goal: plan?.goal ?? "", summary: plan?.summary ?? "", document: plan?.document ?? "", doc_url: plan?.doc_url ?? "" }));
  const submit = () => save.mutate({ id: plan?.id, ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, nul(v)])) }, { onSuccess: () => { onOpenChange(false); if (!plan) onCreated?.(); } });
  return (
    <Shell open={open} onOpenChange={onOpenChange} title={plan ? "Editar plano" : "Novo plano de ação"} busy={save.isPending} valid={Boolean(String(f.title).trim())} onSave={submit}>
      <F k="title" label="Nome do plano"><Input {...field("title")} placeholder="Ex.: Vídeos motion para clientes em Portugal" /></F>
      <F k="goal" label="Meta"><Input {...field("goal")} placeholder="Ex.: 5 clientes pagantes em 30 dias" /></F>
      <F k="summary" label="Resumo (aparece no topo)"><Textarea rows={3} {...field("summary")} /></F>
      <F k="document" label="Plano completo (texto ou markdown, abre no painel lateral)"><Textarea rows={8} {...field("document")} placeholder="Cole aqui o documento inteiro" /></F>
      <F k="doc_url" label="Link do documento original"><Input {...field("doc_url")} placeholder="https://…" /></F>
    </Shell>
  );
}

export function StepDialog({ open, onOpenChange, planId, step, phase, phases, position }: {
  open: boolean; onOpenChange: (o: boolean) => void; planId: string; step: ActionPlanStep | null; phase?: string; phases: string[];
  /** Posição de uma etapa nova (no fim da fase). */
  position: number;
}) {
  const { save } = usePlanMutations("action_plan_steps");
  const { f, setF, field } = useForm(open, () => ({
    ...fromRow(step, ["title", "details", "link_path", "link_label", "due_date"]),
    phase: step?.phase ?? phase ?? phases[0] ?? "Etapas", repeat: Boolean(step?.repeat),
  }));
  const submit = () => save.mutate({ id: step?.id, plan_id: planId, ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, nul(v)])), phase: String(f.phase).trim() || "Etapas", position: step ? undefined : position }, { onSuccess: () => onOpenChange(false) });
  return (
    <Shell open={open} onOpenChange={onOpenChange} title={step ? "Editar etapa" : "Nova etapa"} busy={save.isPending} valid={Boolean(String(f.title).trim())} onSave={submit}>
      <F k="title" label="O que fazer"><Input {...field("title")} /></F>
      <div className="grid gap-3 sm:grid-cols-2">
        <F k="phase" label="Fase"><Input {...field("phase")} list="pf-phases" /><datalist id="pf-phases">{phases.map((p) => <option key={p} value={p} />)}</datalist></F>
        <F k="due_date" label="Prazo"><Input type="date" {...field("due_date")} /></F>
      </div>
      <F k="details" label="Como fazer (opcional)"><Textarea rows={5} {...field("details")} /></F>
      <div className="grid gap-3 sm:grid-cols-2">
        <F k="link_path" label="Tela do Superflow (opcional)"><Input {...field("link_path")} placeholder="/prospeccao?aba=buscar" /></F>
        <F k="link_label" label="Texto do botão"><Input {...field("link_label")} placeholder="Abrir Prospecção" /></F>
      </div>
      <label className="flex items-center gap-2 text-sm"><Switch checked={Boolean(f.repeat)} onCheckedChange={(c) => setF((x) => ({ ...x, repeat: c }))} />Rotina que se repete (não marca como feita)</label>
    </Shell>
  );
}

export function AssetDialog({ open, onOpenChange, planId, asset, steps }: {
  open: boolean; onOpenChange: (o: boolean) => void; planId: string; asset: ActionPlanAsset | null; steps: ActionPlanStep[];
}) {
  const { save } = usePlanMutations("action_plan_assets");
  const { f, setF, field } = useForm(open, () => ({ kind: asset?.kind ?? "script", title: asset?.title ?? "", body: asset?.body ?? "", url: asset?.url ?? "", step_id: asset?.step_id ?? "" }));
  const submit = () => save.mutate({ id: asset?.id, plan_id: planId, ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, nul(v)])) }, { onSuccess: () => onOpenChange(false) });
  return (
    <Shell open={open} onOpenChange={onOpenChange} title={asset ? "Editar" : "Novo script, prompt ou nota"} busy={save.isPending} valid={Boolean(String(f.title).trim())} onSave={submit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <F k="kind" label="Tipo">
          <Select value={String(f.kind)} onValueChange={(v) => setF((x) => ({ ...x, kind: v }))}>
            <SelectTrigger id="pf-kind"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(ASSET_KIND).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
          </Select>
        </F>
        <F k="step_id" label="Ligar à etapa (opcional)">
          <Select value={String(f.step_id) || "none"} onValueChange={(v) => setF((x) => ({ ...x, step_id: v === "none" ? "" : v }))}>
            <SelectTrigger id="pf-step_id"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="none">Nenhuma</SelectItem>{steps.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}</SelectContent>
          </Select>
        </F>
      </div>
      <F k="title" label="Título"><Input {...field("title")} /></F>
      <F k="body" label="Texto"><Textarea rows={10} {...field("body")} /></F>
      <F k="url" label="Link (opcional)"><Input {...field("url")} placeholder="https://…" /></F>
    </Shell>
  );
}
