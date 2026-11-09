import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefSelect } from "@/components/common/RefSelect";
import { useSiteFormActions } from "@/hooks/useSiteForms";
import { SITE_URL, blankContent, nextSlug, slugError, slugify, type SiteForm } from "@/lib/siteForms";

/** Novo formulário: em branco ou copiando um existente. Cada um ganha o seu endereço (/diagnostico-2, /videos...). */
export function NewFormDialog({ open, onOpenChange, forms, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; forms: SiteForm[]; onCreated: (f: SiteForm) => void }) {
  const { create } = useSiteFormActions();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [from, setFrom] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const taken = forms.map((f) => f.slug);

  useEffect(() => {
    if (!open) return;
    setName(""); setTouched(false); setError(null);
    const base = forms[0]?.id ?? null; setFrom(base); setSlug(nextSlug(forms[0]?.slug ?? "formulario", taken));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickCopy = (id: string | null) => { setFrom(id); if (!touched) setSlug(nextSlug(forms.find((f) => f.id === id)?.slug ?? "formulario", taken)); };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err = slugError(slug, taken) ?? (name.trim() ? null : "Dê um nome ao formulário.");
    if (err) return setError(err);
    const src = forms.find((f) => f.id === from);
    const created = await create.mutateAsync({
      slug, name, content: src ? structuredClone(src.content) : blankContent(),
      pipelineId: src?.pipeline_id ?? null, stageId: src?.stage_id ?? null, source: src?.source ?? "Site / Landing page",
    });
    onOpenChange(false); onCreated(created);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader><DialogTitle>Novo formulário</DialogTitle><DialogDescription>Ele ganha uma página própria no site, pronta para ser o destino de um anúncio.</DialogDescription></DialogHeader>
          <div className="space-y-1.5"><Label htmlFor="nf-name">Nome (só você vê)</Label>
            <Input id="nf-name" autoFocus value={name} placeholder="Ex.: Diagnóstico · Campanha de vídeos" onChange={(e) => { setName(e.target.value); setError(null); if (!touched) setSlug(nextSlug(slugify(e.target.value) || "formulario", taken)); }} /></div>
          <div className="space-y-1.5"><Label>Começar a partir de</Label><RefSelect value={from} onChange={pickCopy} options={forms.map((f) => ({ id: f.id, name: `Cópia de ${f.name}` }))} placeholder="Formulário em branco" /></div>
          <div className="space-y-1.5"><Label htmlFor="nf-slug">Endereço da página</Label>
            <div className="flex items-center gap-1 text-sm"><span className="text-muted-foreground">{SITE_URL.replace("https://", "")}/</span><Input id="nf-slug" value={slug} onChange={(e) => { setTouched(true); setSlug(slugify(e.target.value)); setError(null); }} /></div></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending}>{create.isPending && <Loader2 className="size-4 animate-spin" />}Criar formulário</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
