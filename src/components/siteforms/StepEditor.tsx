import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SimpleSelect } from "@/components/common/RefSelect";
import { CONTACT_FIELDS, type ContactField, type FormStep } from "@/lib/siteForms";

const lines = (s: string) => s.split("\n");

type WhenProps = { step: FormStep; before: FormStep[]; onChange: (p: Partial<FormStep>) => void };

/** Condição: a pergunta só aparece dependendo de uma resposta anterior. */
function WhenEditor({ step, before, onChange }: WhenProps) {
  const when = step.when;
  const cond = when ? before.find((s) => s.id === when.step) : undefined;
  return (
    <div className="space-y-1.5 rounded-lg bg-muted/40 p-3">
      <div className="flex items-center gap-2"><Switch id={`w-${step.id}`} checked={Boolean(when)} disabled={!before.length}
        onCheckedChange={(on) => onChange({ when: on ? { step: before[0].id, in: [before[0].options?.[0] ?? ""] } : undefined })} />
        <Label htmlFor={`w-${step.id}`}>Mostrar só dependendo de uma resposta anterior</Label></div>
      {when && (
        <div className="grid gap-3 pt-2 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Pergunta que decide</Label>
            <SimpleSelect value={when.step} onChange={(s) => onChange({ when: { ...when, step: s, in: [] } })} options={before.map((b) => ({ value: b.id, label: b.label || b.q }))} /></div>
          <div className="space-y-1.5"><Label>{when.not ? "Mostrar se a resposta NÃO for" : "Mostrar se a resposta for"}</Label>
            <Textarea rows={3} value={when.in.join("\n")} placeholder={(cond?.options ?? []).join("\n")} onChange={(e) => onChange({ when: { ...when, in: lines(e.target.value).map((x) => x.trim()).filter(Boolean) } })} /></div>
          <div className="flex items-center gap-2 sm:col-span-2"><Switch id={`n-${step.id}`} checked={Boolean(when.not)} onCheckedChange={(not) => onChange({ when: { ...when, not } })} /><Label htmlFor={`n-${step.id}`}>Inverter (mostrar quando for qualquer outra resposta)</Label></div>
        </div>
      )}
    </div>
  );
}

/** Opções (resposta de escolha) ou formato do campo (texto livre). */
function AnswerEditor({ step, onChange }: { step: FormStep; onChange: (p: Partial<FormStep>) => void }) {
  if (step.kind === "options") {
    return (
      <div className="space-y-1.5"><Label htmlFor={`o-${step.id}`}>Opções <span className="font-normal text-muted-foreground">(uma por linha)</span></Label>
        <Textarea id={`o-${step.id}`} rows={Math.min(8, (step.options?.length ?? 2) + 1)} value={(step.options ?? []).join("\n")} onChange={(e) => onChange({ options: lines(e.target.value) })} /></div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5"><Label>Formato do campo</Label>
        <SimpleSelect value={step.input ?? "text"} onChange={(input) => onChange({ input })} options={[{ value: "text", label: "Texto" }, { value: "tel", label: "Telefone / WhatsApp" }, { value: "email", label: "E-mail" }]} /></div>
      <div className="space-y-1.5"><Label htmlFor={`p-${step.id}`}>Texto de exemplo no campo</Label>
        <Input id={`p-${step.id}`} value={step.placeholder ?? ""} onChange={(e) => onChange({ placeholder: e.target.value })} /></div>
    </div>
  );
}

/** Mapa opção = valor, usado quando a resposta vira temperatura ou segmento do contato. */
function ValueMap({ step, onChange }: { step: FormStep; onChange: (p: Partial<FormStep>) => void }) {
  return (
    <div className="space-y-1.5"><Label htmlFor={`v-${step.id}`}>Valor guardado para cada opção <span className="font-normal text-muted-foreground">(opção = valor, uma por linha; temperatura aceita frio, morno, quente)</span></Label>
      <Textarea id={`v-${step.id}`} rows={3} value={(step.options ?? []).map((o) => `${o} = ${step.values?.[o] ?? ""}`).join("\n")}
        onChange={(e) => onChange({ values: Object.fromEntries(lines(e.target.value).map((l) => l.split("=").map((x) => x.trim())).filter(([k, v]) => k && v)) })} /></div>
  );
}

/** Uma pergunta do formulário: texto, tipo, opções, condição e o campo do contato que ela preenche. */
export function StepEditor({ step, index, total, all, onChange, onMove, onRemove }: {
  step: FormStep; index: number; total: number; all: FormStep[];
  onChange: (s: FormStep) => void; onMove: (dir: -1 | 1) => void; onRemove: () => void;
}) {
  const set = (p: Partial<FormStep>) => onChange({ ...step, ...p });
  const before = all.slice(0, index).filter((s) => s.kind === "options");
  const valueMap = step.map === "temperature" || step.map === "segment";

  return (
    <div className="space-y-3 rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-heading text-sm font-semibold">Pergunta {index + 1}</p>
        <div className="flex gap-1">
          <Button type="button" size="icon" variant="ghost" className="size-8" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Subir pergunta"><ArrowUp className="size-4" /></Button>
          <Button type="button" size="icon" variant="ghost" className="size-8" disabled={index === total - 1} onClick={() => onMove(1)} aria-label="Descer pergunta"><ArrowDown className="size-4" /></Button>
          <Button type="button" size="icon" variant="ghost" className="size-8 text-destructive" onClick={onRemove} aria-label="Apagar pergunta"><Trash2 className="size-4" /></Button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`q-${step.id}`}>Texto da pergunta <span className="font-normal text-muted-foreground">(use {"{nome}"} para o primeiro nome)</span></Label>
        <Input id={`q-${step.id}`} value={step.q} onChange={(e) => set({ q: e.target.value })} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Tipo de resposta</Label>
          <SimpleSelect value={step.kind} onChange={(kind) => set({ kind, options: kind === "options" ? (step.options?.length ? step.options : ["Opção 1", "Opção 2"]) : undefined })}
            options={[{ value: "options", label: "Escolher uma opção" }, { value: "text", label: "Texto livre" }]} /></div>
        <div className="space-y-1.5"><Label htmlFor={`l-${step.id}`}>Nome curto (aparece nas respostas)</Label>
          <Input id={`l-${step.id}`} value={step.label} onChange={(e) => set({ label: e.target.value })} /></div>
      </div>
      <AnswerEditor step={step} onChange={set} />
      <div className="space-y-1.5"><Label htmlFor={`h-${step.id}`}>Dica embaixo da pergunta (opcional)</Label>
        <Input id={`h-${step.id}`} value={step.hint ?? ""} onChange={(e) => set({ hint: e.target.value || undefined })} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Onde a resposta é guardada no CRM</Label>
          <SimpleSelect value={(step.map ?? "") as ContactField | ""} onChange={(map) => set({ map: map || undefined, values: undefined })} options={CONTACT_FIELDS} /></div>
        {step.kind === "text" && (
          <div className="flex items-end gap-2 pb-2"><Switch id={`opt-${step.id}`} checked={Boolean(step.optional)} onCheckedChange={(optional) => set({ optional })} /><Label htmlFor={`opt-${step.id}`}>Pode pular</Label></div>
        )}
      </div>
      {valueMap && step.kind === "options" && <ValueMap step={step} onChange={set} />}
      <WhenEditor step={step} before={before} onChange={set} />
    </div>
  );
}
