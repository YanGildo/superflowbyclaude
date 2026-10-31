import { useEffect, useState } from "react";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { useCampaignOptions, useContacts, useCrmMutations } from "@/hooks/useCrm";
import { useMemberOptions } from "@/hooks/useMarketing";
import type { ContentItem, Priority } from "@/integrations/supabase/types";
import { PRIORITIES, PRIORITY } from "@/lib/labels";
import { CONTENT_KINDS, MKT_CHANNELS, STAGE_OPTIONS, isVideo } from "@/lib/marketing";
import { contentForm, contentPayload, validateContent, type ContentDefaults, type ContentForm } from "@/lib/marketingForms";
import { AreaField, Field, FormShell, TextField } from "./FormShell";
import { opts } from "./options";

type SetField = <K extends keyof ContentForm>(k: K, v: ContentForm[K]) => void;
const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({ value: p, label: PRIORITY[p].label }));

function LinkFields({ f, set }: { f: ContentForm; set: SetField }) {
  const { data: contacts = [] } = useContacts();
  const { data: campaigns = [] } = useCampaignOptions();
  const members = useMemberOptions();
  return (
    <>
      <Field id="ct-campaign" label="Campanha">
        <RefSelect id="ct-campaign" value={f.campaign_id} onChange={(v) => set("campaign_id", v)} options={campaigns} placeholder="Nenhuma" />
      </Field>
      <Field id="ct-contact" label="Cliente">
        <RefSelect id="ct-contact" value={f.contact_id} onChange={(v) => set("contact_id", v)} options={contacts} placeholder="Interno" />
      </Field>
      <Field id="ct-resp" label="Responsável">
        <RefSelect id="ct-resp" value={f.responsible_id} onChange={(v) => set("responsible_id", v)} options={members} placeholder="Ninguém" />
      </Field>
      <TextField id="ct-obj" label="Objetivo" value={f.objective} onChange={(v) => set("objective", v)} placeholder="Ex.: gerar leads do ensaio" />
    </>
  );
}

function MainFields({ f, set }: { f: ContentForm; set: SetField }) {
  return (
    <>
      <TextField id="ct-title" label="Título *" value={f.title} onChange={(v) => set("title", v)} wide autoFocus placeholder="Ex.: Reels antes e depois" />
      <Field id="ct-kind" label="Tipo">
        <RefSelect id="ct-kind" value={f.kind} onChange={(v) => set("kind", v ?? "Post")} options={opts(CONTENT_KINDS)} placeholder="Tipo" />
      </Field>
      <Field id="ct-channel" label="Canal">
        <RefSelect id="ct-channel" value={f.channel} onChange={(v) => set("channel", v)} options={opts(MKT_CHANNELS)} placeholder="Sem canal" />
      </Field>
      <Field id="ct-stage" label="Etapa">
        <SimpleSelect id="ct-stage" value={f.stage} onChange={(v) => set("stage", v)} options={STAGE_OPTIONS} />
      </Field>
      <Field id="ct-prio" label="Prioridade">
        <SimpleSelect<Priority> id="ct-prio" value={f.priority} onChange={(v) => set("priority", v)} options={PRIORITY_OPTIONS} />
      </Field>
    </>
  );
}

function DateFields({ f, set }: { f: ContentForm; set: SetField }) {
  return (
    <>
      {isVideo(f) && <TextField id="ct-rec" label="Gravação" type="date" value={f.recording_at} onChange={(v) => set("recording_at", v)} />}
      <TextField id="ct-due" label="Prazo" type="date" value={f.due_date} onChange={(v) => set("due_date", v)} />
      <TextField id="ct-pub" label="Publicação" type="date" value={f.publish_at} onChange={(v) => set("publish_at", v)} />
    </>
  );
}

export function ContentDialog({ open, onOpenChange, item, defaults }: {
  open: boolean; onOpenChange: (o: boolean) => void; item?: ContentItem | null; defaults?: ContentDefaults;
}) {
  const { save } = useCrmMutations("content_items");
  const [f, setF] = useState<ContentForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(contentForm(item, defaults));
  }, [open, item]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!f) return null;
  const set: SetField = (k, v) => setF((p) => (p ? { ...p, [k]: v } : p));
  const submit = async () => {
    const problem = validateContent(f);
    if (problem) return setError(problem);
    await save.mutateAsync(contentPayload(f, item?.id));
    onOpenChange(false);
  };

  return (
    <FormShell open={open} onOpenChange={onOpenChange} onSubmit={submit} error={error} pending={save.isPending}
      title={item ? "Editar conteúdo" : isVideo(f) ? "Novo vídeo" : "Novo conteúdo"}
      description="Post, vídeo, criativo ou ação. Avance pelas etapas até publicar.">
      <MainFields f={f} set={set} />
      <DateFields f={f} set={set} />
      <LinkFields f={f} set={set} />
      <AreaField id="ct-script" label={isVideo(f) ? "Roteiro" : "Texto / roteiro"} rows={4} value={f.script} onChange={(v) => set("script", v)} />
      <AreaField id="ct-caption" label="Legenda" value={f.caption} onChange={(v) => set("caption", v)} />
      <TextField id="ct-file" label="Link do arquivo" wide value={f.file_url} onChange={(v) => set("file_url", v)} placeholder="Drive, Canva, Frame.io..." />
      <AreaField id="ct-notes" label="Observações" value={f.notes} onChange={(v) => set("notes", v)} />
    </FormShell>
  );
}
