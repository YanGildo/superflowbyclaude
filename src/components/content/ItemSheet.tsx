import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useCrmMutations } from "@/hooks/useCrm";
import { useFormulas } from "@/hooks/useContent";
import type { ContentItem, ContentStage } from "@/integrations/supabase/types";
import { CHECKLIST, FLOW, FORMATS, PILLARS, SOCIAL, needsChecklist, promptPacote } from "@/lib/content";
import { CONTENT_STAGE } from "@/lib/marketing";
import { Choice, CopyPrompt, Field, HookBadge, LinkOut } from "./ContentBits";

type Form = Record<string, string>;
const KEYS = ["title", "channel", "kind", "pillar", "stage", "hook", "cta", "objective", "script", "caption", "art_url", "video_url"] as const;

function toForm(c: ContentItem): Form {
  const f: Form = Object.fromEntries(KEYS.map((k) => [k, String(c[k] ?? "")]));
  const at = c.publish_at ? new Date(c.publish_at) : null;
  f.date = at ? `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, "0")}-${String(at.getDate()).padStart(2, "0")}` : (c.due_date ?? "");
  f.time = at ? `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}` : "";
  f.formula = c.hook_formula_id ? String(c.hook_formula_id) : "";
  return f;
}

function toRow(f: Form) {
  const row: Record<string, unknown> = Object.fromEntries(KEYS.map((k) => [k, f[k]?.trim() || null]));
  row.title = f.title.trim() || "(sem título)";
  row.publish_at = f.date ? new Date(`${f.date}T${f.time || "09:00"}:00`).toISOString() : null;
  row.hook_formula_id = f.formula ? Number(f.formula) : null;
  return row;
}

/** Painel da peça: o mesmo registro aparece no Calendário e na Produção. */
export function ItemSheet({ item, onClose }: { item: ContentItem | null; onClose: () => void }) {
  const { save, patch } = useCrmMutations("content_items");
  const { data: formulas = [] } = useFormulas();
  const [f, setF] = useState<Form>({});
  const [check, setCheck] = useState<Record<string, boolean>>({});
  useEffect(() => { if (item) { setF(toForm(item)); setCheck(item.checklist ?? {}); } }, [item]);
  if (!item) return <Sheet open={false} />;

  const set = (k: string, v: string) => setF((x) => ({ ...x, [k]: v }));
  const field = (k: string) => ({ id: `ci-${k}`, value: f[k] ?? "", onChange: (e: { target: { value: string } }) => set(k, e.target.value) });
  const allChecked = CHECKLIST.every((c) => check[c.key]);
  const submit = () => {
    if (needsChecklist(f.stage as ContentStage) && !allChecked) return toast.error("Marque todo o checklist antes de aprovar, agendar ou publicar.");
    save.mutate({ id: item.id, ...toRow(f), checklist: check }, { onSuccess: () => { toast.success("Peça salva."); onClose(); } });
  };
  const remove = () => { if (window.confirm("Mandar esta peça para a lixeira?")) patch.mutate({ id: item.id, values: { deleted_at: new Date().toISOString() } }, { onSuccess: onClose }); };

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="text-left">
          <SheetTitle className="font-heading">{item.title}</SheetTitle>
          <SheetDescription>{CONTENT_STAGE[item.stage]?.label} · {item.kind}{item.channel ? ` · ${item.channel}` : ""}</SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field id="ci-title" label="Título" className="sm:col-span-2"><Input {...field("title")} /></Field>
          <Field id="ci-stage" label="Etapa"><Choice id="ci-stage" value={f.stage} onChange={(v) => set("stage", v)} options={[...FLOW, "pausado"].map((s) => ({ value: s, label: CONTENT_STAGE[s as ContentStage].label }))} /></Field>
          <Field id="ci-kind" label="Formato"><Choice id="ci-kind" value={f.kind} onChange={(v) => set("kind", v)} options={FORMATS} /></Field>
          <Field id="ci-channel" label="Plataforma"><Choice id="ci-channel" value={f.channel} onChange={(v) => set("channel", v)} options={SOCIAL} /></Field>
          <Field id="ci-pillar" label="Pilar"><Choice id="ci-pillar" value={f.pillar} onChange={(v) => set("pillar", v)} options={PILLARS} /></Field>
          <Field id="ci-date" label="Data"><Input type="date" {...field("date")} /></Field>
          <Field id="ci-time" label="Hora"><Input type="time" {...field("time")} /></Field>
          <Field id="ci-hook" label="Gancho" className="sm:col-span-2"><Input {...field("hook")} /><HookBadge text={f.hook ?? ""} /></Field>
          <Field id="ci-formula" label="Fórmula do gancho"><Choice id="ci-formula" value={f.formula} onChange={(v) => set("formula", v)} options={formulas.map((x) => ({ value: String(x.id), label: `${x.id}. ${x.name}` }))} /></Field>
          <Field id="ci-objective" label="Objetivo"><Input {...field("objective")} /></Field>
          <Field id="ci-cta" label="Chamada (CTA)" className="sm:col-span-2"><Input {...field("cta")} /></Field>
          <Field id="ci-script" label="Roteiro" className="sm:col-span-2"><Textarea rows={6} {...field("script")} /></Field>
          <Field id="ci-caption" label="Legenda" className="sm:col-span-2"><Textarea rows={4} {...field("caption")} /></Field>
          <Field id="ci-art_url" label="Link da arte (Canva)"><Input {...field("art_url")} placeholder="https://…" /></Field>
          <Field id="ci-video_url" label="Link do vídeo"><Input {...field("video_url")} placeholder="https://…" /></Field>
          <div className="flex gap-3 sm:col-span-2"><LinkOut href={f.art_url}>Abrir arte</LinkOut><LinkOut href={f.video_url}>Abrir vídeo</LinkOut></div>
        </div>
        <section className="mt-4 space-y-2 rounded-lg border p-3" aria-label="Checklist antes de publicar">
          <p className="text-sm font-medium">Checklist antes de publicar {allChecked ? "✓" : `(${CHECKLIST.filter((c) => check[c.key]).length}/${CHECKLIST.length})`}</p>
          {CHECKLIST.map((c) => (
            <label key={c.key} className="flex items-center gap-2 text-sm">
              <Checkbox checked={Boolean(check[c.key])} onCheckedChange={(v) => setCheck((x) => ({ ...x, [c.key]: Boolean(v) }))} />{c.label}
            </label>
          ))}
        </section>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button onClick={submit} disabled={save.isPending}>Salvar</Button>
          <CopyPrompt variant="outline" text={promptPacote(f.title || item.title)} label="Copiar pedido (Etapa 3)" />
          <Button variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive" onClick={remove}><Trash2 className="size-4" />Lixeira</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
