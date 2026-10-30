import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefSelect } from "@/components/common/RefSelect";
import { useCrmMutations } from "@/hooks/useCrm";
import type { Script, ScriptSegment } from "@/integrations/supabase/types";

const CHANNELS = ["WhatsApp", "Instagram", "E-mail", "Telefone", "Telegram", "Outro"];
type Form = { title: string; segment_id: string | null; category: string | null; channel: string; moment: string; body: string; tags: string };

const EMPTY: Omit<Form, "segment_id"> = { title: "", category: null, channel: "WhatsApp", moment: "", body: "", tags: "" };

function toForm(s: Script | null | undefined, segmentId: string | null): Form {
  if (!s) return { ...EMPTY, segment_id: segmentId };
  return { title: s.title, segment_id: s.segment_id, category: s.category, channel: s.channel, moment: s.moment ?? "", body: s.body, tags: s.tags.join(", ") };
}

export function ScriptDialog({ open, onOpenChange, script, segments, segmentId }: {
  open: boolean; onOpenChange: (o: boolean) => void; script?: Script | null; segments: ScriptSegment[]; segmentId: string | null;
}) {
  const { save } = useCrmMutations("scripts");
  const [f, setF] = useState<Form>(() => toForm(null, segmentId));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setError(null); setF(toForm(script, segmentId)); } }, [open, script]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));
  const categories = segments.find((g) => g.id === f.segment_id)?.categories ?? [];
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return setError("Dê um título ao script.");
    if (!f.body.trim()) return setError("Escreva o texto do script.");
    await save.mutateAsync({
      id: script?.id, title: f.title.trim(), segment_id: f.segment_id, category: f.category, channel: f.channel,
      moment: f.moment.trim() || null, body: f.body, tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{script ? "Editar script" : "Novo script"}</DialogTitle>
          <DialogDescription>Use variáveis entre colchetes: [nome], [pacote], [valor], [prazo]…</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sc-title">Título</Label>
            <Input id="sc-title" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Cliente escolheu o pacote" autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-seg">Segmento</Label>
            <RefSelect id="sc-seg" value={f.segment_id} onChange={(v) => set("segment_id", v)} options={segments} placeholder="Sem segmento" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-cat">Categoria</Label>
            <RefSelect id="sc-cat" value={f.category} onChange={(v) => set("category", v)} options={categories.map((c) => ({ id: c, name: c }))} placeholder="Sem categoria" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-channel">Canal</Label>
            <RefSelect id="sc-channel" value={f.channel} onChange={(v) => set("channel", v ?? "WhatsApp")} options={CHANNELS.map((c) => ({ id: c, name: c }))} placeholder="Canal" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sc-moment">Momento da conversa</Label>
            <Input id="sc-moment" value={f.moment} onChange={(e) => set("moment", e.target.value)} placeholder="Quando usar este script" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sc-body">Texto do script</Label>
            <Textarea id="sc-body" rows={9} value={f.body} onChange={(e) => set("body", e.target.value)} placeholder="Olá, [nome]! …" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="sc-tags">Tags (separadas por vírgula)</Label>
            <Input id="sc-tags" value={f.tags} onChange={(e) => set("tags", e.target.value)} placeholder="pagamento, fechamento" />
          </div>
          {error && <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}{script ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
