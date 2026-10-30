import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { useCrmMutations, useServices } from "@/hooks/useCrm";
import type { Contact, ContactStatus, Temperature } from "@/integrations/supabase/types";
import { useWorkspace } from "@/lib/workspace";
import { CONTACT_STATUS, SOURCES, TEMPERATURE } from "@/lib/crm";
import { contactForm, contactPayload, validateContact, type ContactForm } from "@/lib/contactForm";
import { cn } from "@/lib/utils";

type SetField = <K extends keyof ContactForm>(k: K, v: ContactForm[K]) => void;

const STATUS_OPTIONS = (Object.keys(CONTACT_STATUS) as ContactStatus[]).map((v) => ({ value: v, label: CONTACT_STATUS[v].label }));

function Field({ id, label, children, wide }: { id?: string; label: string; children: React.ReactNode; wide?: boolean }) {
  return <div className={cn("space-y-1.5", wide && "sm:col-span-2")}><Label htmlFor={id}>{label}</Label>{children}</div>;
}

function TextField({ id, label, f, k, set, wide, ...rest }: {
  id: string; label: string; f: ContactForm; k: keyof ContactForm; set: SetField; wide?: boolean; placeholder?: string; type?: string;
}) {
  return (
    <Field id={id} label={label} wide={wide}>
      <Input id={id} value={f[k] as string} onChange={(e) => set(k, e.target.value as never)} {...rest} />
    </Field>
  );
}

/** Serviços contratados: chips liga/desliga a partir do catálogo. */
function ServicesPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { data: services = [] } = useServices();
  const toggle = (n: string) => onChange(value.includes(n) ? value.filter((x) => x !== n) : [...value, n]);
  return (
    <div className="flex flex-wrap gap-1.5">
      {services.filter((s) => s.active).map((s) => (
        <button key={s.id} type="button" onClick={() => toggle(s.name)} aria-pressed={value.includes(s.name)}
          className={cn("rounded-full border px-2.5 py-1 text-xs transition-colors",
            value.includes(s.name) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent")}>
          {s.name}
        </button>
      ))}
    </div>
  );
}

function TemperaturePicker({ value, onChange }: { value: Temperature | null; onChange: (v: Temperature | null) => void }) {
  return (
    <div className="flex gap-1.5">
      {(Object.keys(TEMPERATURE) as Temperature[]).map((t) => (
        <button key={t} type="button" aria-pressed={value === t} onClick={() => onChange(value === t ? null : t)}
          className={cn("flex-1 rounded-md border px-2 py-1.5 text-xs font-medium", value === t ? TEMPERATURE[t].tone + " border-current" : "hover:bg-accent")}>
          {TEMPERATURE[t].label}
        </button>
      ))}
    </div>
  );
}

function ContactFields({ f, set }: { f: ContactForm; set: SetField }) {
  const { businesses } = useWorkspace();
  return (
    <>
      <TextField id="ct-name" label="Nome *" f={f} k="name" set={set} wide />
      <TextField id="ct-company" label="Empresa" f={f} k="company" set={set} />
      <TextField id="ct-person" label="Pessoa de contato" f={f} k="contact_person" set={set} />
      <TextField id="ct-phone" label="WhatsApp / telefone" f={f} k="phone" set={set} placeholder="(11) 99999-9999" />
      <TextField id="ct-email" label="E-mail" f={f} k="email" set={set} type="email" />
      <TextField id="ct-insta" label="Instagram" f={f} k="instagram" set={set} placeholder="@perfil" />
      <TextField id="ct-site" label="Site" f={f} k="website" set={set} />
      <TextField id="ct-city" label="Cidade" f={f} k="city" set={set} />
      <TextField id="ct-segment" label="Segmento" f={f} k="segment" set={set} placeholder="Ex.: Restaurante, Clínica" />
      <Field id="ct-source" label="Origem">
        <RefSelect id="ct-source" value={f.source} onChange={(v) => set("source", v)} options={SOURCES.map((s) => ({ id: s, name: s }))} placeholder="Selecione" />
      </Field>
      <Field id="ct-status" label="Situação">
        <SimpleSelect id="ct-status" value={f.status} onChange={(v) => set("status", v)} options={STATUS_OPTIONS} />
      </Field>
      <Field label="Temperatura" wide><TemperaturePicker value={f.temperature} onChange={(v) => set("temperature", v)} /></Field>
      <TextField id="ct-plan" label="Plano" f={f} k="plan_name" set={set} placeholder="Ex.: Pacote Growth" />
      <Field id="ct-monthly" label="Mensalidade">
        <MoneyInput id="ct-monthly" value={f.monthly_value} onChange={(e) => set("monthly_value", e.target.value)} />
      </Field>
      <TextField id="ct-start" label="Cliente desde" f={f} k="start_date" set={set} type="date" />
      <Field id="ct-biz" label="Negócio">
        <RefSelect id="ct-biz" value={f.business_id} onChange={(v) => set("business_id", v)} options={businesses} placeholder="Sem negócio" />
      </Field>
      <Field label="Serviços contratados" wide><ServicesPicker value={f.services} onChange={(v) => set("services", v)} /></Field>
      <TextField id="ct-next" label="Próxima ação" f={f} k="next_action" set={set} placeholder="Ex.: Enviar relatório" />
      <TextField id="ct-next-at" label="Data da próxima ação" f={f} k="next_contact_at" set={set} type="date" />
      <Field id="ct-notes" label="Observações" wide>
        <Textarea id="ct-notes" rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </Field>
    </>
  );
}

export function ContactDialog({ open, onOpenChange, contact, defaultStatus = "cliente_ativo" }: {
  open: boolean; onOpenChange: (o: boolean) => void; contact?: Contact | null; defaultStatus?: ContactStatus;
}) {
  const { businessFilter } = useWorkspace();
  const { save } = useCrmMutations("contacts");
  const [f, setF] = useState<ContactForm>(() => contactForm(null, { status: defaultStatus, businessId: null }));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(contactForm(contact, { status: defaultStatus, businessId: businessFilter === "all" ? null : businessFilter }));
  }, [open, contact]); // eslint-disable-line react-hooks/exhaustive-deps

  const set: SetField = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateContact(f);
    if (problem) return setError(problem);
    await save.mutateAsync(contactPayload(f, contact?.id));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">{contact ? "Editar cadastro" : "Novo cliente"}</DialogTitle>
          <DialogDescription>Contato, plano, serviços contratados e próxima ação.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
          <ContactFields f={f} set={set} />
          {error && <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
