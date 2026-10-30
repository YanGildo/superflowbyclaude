import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { useCampaignOptions, useContacts, useCrmMutations } from "@/hooks/useCrm";
import type { Activity } from "@/integrations/supabase/types";
import { ACTIVITY_STATUS, CHANNELS, CONTACT_TYPES, CONVERSION_TYPES } from "@/lib/crm";
import { activityForm, activityPayload, validateActivity, type ActivityForm } from "@/lib/activityForm";

type SetField = <K extends keyof ActivityForm>(k: K, v: ActivityForm[K]) => void;
const opts = (l: string[]) => l.map((x) => ({ id: x, name: x }));
const STATUS_OPTIONS = Object.entries(ACTIVITY_STATUS).map(([value, s]) => ({ value, label: s.label }));

function ActivityFields({ f, set }: { f: ActivityForm; set: SetField }) {
  const { data: contacts = [] } = useContacts();
  const { data: campaigns = [] } = useCampaignOptions();
  const isConversion = f.category === "conversao";
  return (
    <>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="act-contact">Lead / cliente</Label>
        <RefSelect id="act-contact" value={f.contact_id} onChange={(v) => set("contact_id", v)} options={contacts} placeholder="Sem vínculo" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="act-type">Tipo</Label>
        <RefSelect id="act-type" value={f.type || null} onChange={(v) => set("type", v ?? "")}
          options={opts(isConversion ? CONVERSION_TYPES : CONTACT_TYPES)} placeholder="Selecione" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="act-channel">Canal / origem</Label>
        <RefSelect id="act-channel" value={f.channel} onChange={(v) => set("channel", v)} options={opts(CHANNELS)} placeholder="Selecione" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="act-at">Data e hora</Label>
        <Input id="act-at" type="datetime-local" value={f.at} onChange={(e) => set("at", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="act-status">Status</Label>
        <SimpleSelect id="act-status" value={f.outcome} onChange={(v) => set("outcome", v)} options={STATUS_OPTIONS} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="act-value">Valor {isConversion ? "" : "(opcional)"}</Label>
        <MoneyInput id="act-value" value={f.value} onChange={(e) => set("value", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="act-campaign">Campanha</Label>
        <RefSelect id="act-campaign" value={f.campaign_id} onChange={(v) => set("campaign_id", v)} options={campaigns} placeholder="Nenhuma" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="act-summary">Resumo</Label>
        <Input id="act-summary" value={f.summary} onChange={(e) => set("summary", e.target.value)} placeholder="Ex.: Pediu orçamento de tráfego" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="act-notes">Observações</Label>
        <Textarea id="act-notes" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
      {!isConversion && (
        <div className="space-y-1.5">
          <Label htmlFor="act-follow">Próximo follow-up</Label>
          <Input id="act-follow" type="date" value={f.next_follow_up_at} onChange={(e) => set("next_follow_up_at", e.target.value)} />
        </div>
      )}
    </>
  );
}

export function ActivityDialog({ open, onOpenChange, category, activity, contactId = null, defaultType = "" }: {
  open: boolean; onOpenChange: (o: boolean) => void; category: Activity["category"];
  activity?: Activity | null; contactId?: string | null; defaultType?: string;
}) {
  const { save } = useCrmMutations("activities");
  const [f, setF] = useState<ActivityForm>(() => activityForm(null, { category, contactId, type: defaultType }));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(activityForm(activity, { category, contactId, type: defaultType }));
  }, [open, activity]); // eslint-disable-line react-hooks/exhaustive-deps

  const set: SetField = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateActivity(f);
    if (problem) return setError(problem);
    await save.mutateAsync(activityPayload(f, activity?.id));
    onOpenChange(false);
  };
  const title = category === "conversao" ? (activity ? "Editar conversão" : "Nova conversão") : (activity ? "Editar registro" : "Novo registro de contato");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{title}</DialogTitle>
          <DialogDescription>Fica no histórico do lead/cliente e entra nos números do comercial.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
          <ActivityFields f={f} set={set} />
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
