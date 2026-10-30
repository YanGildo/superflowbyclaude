import { useEffect, useState, type FormEvent } from "react";
import { Archive, Plus, Star, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCrmMutations } from "@/hooks/useCrm";
import type { ScriptSegment } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Form = { name: string; description: string; service_type: string; categories: string[] };
const DEFAULT_CATEGORIES = ["Abordagem inicial", "Qualificação", "Proposta", "Fechamento", "Pagamento", "Objeções", "Follow-up", "Pós-venda"];

function CategoriesEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const c = draft.trim();
    if (c && !value.includes(c)) onChange([...value, c]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((c) => (
          <span key={c} className="inline-flex items-center gap-1 rounded-full border bg-muted/50 py-0.5 pl-2.5 pr-1 text-xs">
            {c}<button type="button" aria-label={`Remover categoria ${c}`} onClick={() => onChange(value.filter((x) => x !== c))} className="rounded-full p-0.5 hover:bg-accent"><X className="size-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Nova categoria" aria-label="Nova categoria" className="h-8" />
        <Button type="button" size="sm" variant="outline" onClick={add}>Adicionar</Button>
      </div>
    </div>
  );
}

function SegmentForm({ segment, onSaved }: { segment: ScriptSegment | null; onSaved: (id: string) => void }) {
  const { save } = useCrmMutations("script_segments");
  const [f, setF] = useState<Form>({ name: "", description: "", service_type: "", categories: DEFAULT_CATEGORIES });
  useEffect(() => {
    setF(segment ? { name: segment.name, description: segment.description ?? "", service_type: segment.service_type ?? "", categories: segment.categories }
      : { name: "", description: "", service_type: "", categories: DEFAULT_CATEGORIES });
  }, [segment]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    const id = await save.mutateAsync({ id: segment?.id, name: f.name.trim(), description: f.description.trim() || null, service_type: f.service_type.trim() || null, categories: f.categories });
    onSaved(id);
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5"><Label htmlFor="seg-name">Nome do segmento</Label><Input id="seg-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex.: Clínicas de estética" /></div>
      <div className="space-y-1.5"><Label htmlFor="seg-type">Tipo de serviço</Label><Input id="seg-type" value={f.service_type} onChange={(e) => setF({ ...f, service_type: e.target.value })} placeholder="Ex.: Agência digital" /></div>
      <div className="space-y-1.5"><Label htmlFor="seg-desc">Descrição</Label><Textarea id="seg-desc" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      <div className="space-y-1.5"><Label>Categorias (etapas da conversa)</Label><CategoriesEditor value={f.categories} onChange={(categories) => setF({ ...f, categories })} /></div>
      <Button type="submit" disabled={save.isPending || !f.name.trim()}>{segment ? "Salvar segmento" : "Criar segmento"}</Button>
    </form>
  );
}

/** Lista de segmentos à esquerda; edição do selecionado (ou criação) à direita. */
export function SegmentsDialog({ open, onOpenChange, segments, startNew, onSelect }: {
  open: boolean; onOpenChange: (o: boolean) => void; segments: ScriptSegment[]; startNew?: boolean; onSelect: (id: string) => void;
}) {
  const m = useCrmMutations("script_segments");
  const [editing, setEditing] = useState<string | "new">("new");
  useEffect(() => { if (open) setEditing(startNew ? "new" : segments[0]?.id ?? "new"); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = segments.find((s) => s.id === editing) ?? null;
  const makeDefault = (s: ScriptSegment) => segments.forEach((g) => m.patch.mutate({ id: g.id, values: { is_default: g.id === s.id } }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-heading">Segmentos de scripts</DialogTitle>
          <DialogDescription>Cada segmento é um tipo de serviço, com as próprias categorias e scripts.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[230px_1fr]">
          <div className="space-y-1">
            {segments.map((s) => (
              <div key={s.id} className={cn("flex items-center gap-1 rounded-md pr-1", editing === s.id && "bg-accent")}>
                <button type="button" onClick={() => setEditing(s.id)} className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-sm">{s.name}</button>
                <button type="button" aria-label={`Tornar ${s.name} padrão`} onClick={() => makeDefault(s)} className={cn("rounded p-1", s.is_default ? "text-warning" : "text-muted-foreground/50 hover:text-warning")}><Star className={cn("size-3.5", s.is_default && "fill-current")} /></button>
                <button type="button" aria-label={`Arquivar ${s.name}`} onClick={() => m.patch.mutate({ id: s.id, values: { archived_at: new Date().toISOString() } })} className="rounded p-1 text-muted-foreground/60 hover:text-destructive"><Archive className="size-3.5" /></button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="mt-2 w-full" onClick={() => setEditing("new")}><Plus className="size-4" />Novo segmento</Button>
          </div>
          <SegmentForm segment={current} onSaved={(id) => { setEditing(id); onSelect(id); }} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
