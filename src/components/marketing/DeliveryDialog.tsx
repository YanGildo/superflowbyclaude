import { useEffect, useState } from "react";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { useContacts, useCrmMutations } from "@/hooks/useCrm";
import { useMemberOptions } from "@/hooks/useMarketing";
import type { Delivery } from "@/integrations/supabase/types";
import { DELIVERY_STATUS_OPTIONS, DELIVERY_TYPES } from "@/lib/marketing";
import { deliveryForm, deliveryPayload, validateDelivery, type DeliveryForm } from "@/lib/marketingForms";
import { AreaField, Field, FormShell, TextField } from "./FormShell";
import { opts } from "./options";

type SetField = <K extends keyof DeliveryForm>(k: K, v: DeliveryForm[K]) => void;

function DeliveryFields({ f, set }: { f: DeliveryForm; set: SetField }) {
  const { data: contacts = [] } = useContacts();
  const members = useMemberOptions();
  return (
    <>
      <TextField id="dl-title" label="Título *" value={f.title} onChange={(v) => set("title", v)} wide autoFocus placeholder="Ex.: 8 posts de novembro" />
      <Field id="dl-contact" label="Cliente">
        <RefSelect id="dl-contact" value={f.contact_id} onChange={(v) => set("contact_id", v)} options={contacts} placeholder="Sem cliente" />
      </Field>
      <Field id="dl-type" label="Tipo">
        <RefSelect id="dl-type" value={f.type} onChange={(v) => set("type", v)} options={opts(DELIVERY_TYPES)} placeholder="Selecione" />
      </Field>
      <TextField id="dl-due" label="Prazo" type="date" value={f.due_date} onChange={(v) => set("due_date", v)} />
      <Field id="dl-status" label="Status">
        <SimpleSelect id="dl-status" value={f.status} onChange={(v) => set("status", v)} options={DELIVERY_STATUS_OPTIONS} />
      </Field>
      <Field id="dl-resp" label="Responsável" wide>
        <RefSelect id="dl-resp" value={f.responsible_id} onChange={(v) => set("responsible_id", v)} options={members} placeholder="Ninguém" />
      </Field>
    </>
  );
}

export function DeliveryDialog({ open, onOpenChange, delivery }: { open: boolean; onOpenChange: (o: boolean) => void; delivery?: Delivery | null }) {
  const { save } = useCrmMutations("deliveries");
  const [f, setF] = useState<DeliveryForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(deliveryForm(delivery));
  }, [open, delivery]);

  if (!f) return null;
  const set: SetField = (k, v) => setF((p) => (p ? { ...p, [k]: v } : p));
  const submit = async () => {
    const problem = validateDelivery(f);
    if (problem) return setError(problem);
    await save.mutateAsync(deliveryPayload(f, delivery?.id));
    onOpenChange(false);
  };

  return (
    <FormShell open={open} onOpenChange={onOpenChange} onSubmit={submit} error={error} pending={save.isPending}
      title={delivery ? "Editar entrega" : "Nova entrega"} description="O que vai para o cliente, com prazo e aprovação.">
      <DeliveryFields f={f} set={set} />
      <AreaField id="dl-links" label="Links" value={f.links} onChange={(v) => set("links", v)} placeholder="Um link por linha" />
      <AreaField id="dl-client" label="Comentários do cliente" value={f.client_comments} onChange={(v) => set("client_comments", v)} />
      <AreaField id="dl-notes" label="Observações internas" value={f.notes} onChange={(v) => set("notes", v)} />
    </FormShell>
  );
}
