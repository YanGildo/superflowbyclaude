import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { useContacts, useCrmMutations, useProposalItems, useSaveProposalItems, useServices } from "@/hooks/useCrm";
import { useCrmFlows } from "@/hooks/useCrmFlows";
import type { Proposal } from "@/integrations/supabase/types";
import { formTotals, parsedItems, proposalForm, proposalPayload, validateProposal, type ProposalForm } from "@/lib/proposalForm";
import { ProposalItemsEditor } from "./ProposalItemsEditor";

type SetField = <K extends keyof ProposalForm>(k: K, v: ProposalForm[K]) => void;
const STATUS = [{ value: "rascunho", label: "Rascunho" }, { value: "enviada", label: "Enviada" }, { value: "em_negociacao", label: "Em negociação" }] as const;

/** No formulário só se escolhe até "em negociação"; aprovar/recusar é feito na lista. */
const editableStatus = (s: ProposalForm["status"]) => (["aprovada", "recusada", "expirada"].includes(s) ? "em_negociacao" : s) as (typeof STATUS)[number]["value"];

/** A proposta acabou de ser marcada como enviada (para registrar a conversão uma vez só). */
const justSent = (f: ProposalForm, before?: Proposal | null) => f.status === "enviada" && before?.status !== "enviada" && Boolean(f.contact_id);

function TermsFields({ f, set }: { f: ProposalForm; set: SetField }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="pr-day">Dia de cobrança</Label>
        <Input id="pr-day" type="number" min={1} max={28} value={f.billing_day} onChange={(e) => set("billing_day", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pr-term">Prazo mínimo (meses)</Label>
        <Input id="pr-term" type="number" min={1} value={f.min_term_months} onChange={(e) => set("min_term_months", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pr-pay">Forma de pagamento</Label>
        <Input id="pr-pay" value={f.payment_method} onChange={(e) => set("payment_method", e.target.value)} placeholder="Pix, boleto, cartão" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pr-valid">Válida até</Label>
        <Input id="pr-valid" type="date" value={f.valid_until} onChange={(e) => set("valid_until", e.target.value)} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="pr-notes">Observações</Label>
        <Textarea id="pr-notes" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
      </div>
    </>
  );
}

export function ProposalDialog({ open, onOpenChange, proposal, contactId = null }: {
  open: boolean; onOpenChange: (o: boolean) => void; proposal?: Proposal | null; contactId?: string | null;
}) {
  const { data: contacts = [] } = useContacts();
  const { data: services = [] } = useServices();
  const { data: items = [], isFetched } = useProposalItems(proposal?.id ?? null);
  const { save } = useCrmMutations("proposals");
  const saveItems = useSaveProposalItems();
  const { logConversion } = useCrmFlows();
  const [f, setF] = useState<ProposalForm>(() => proposalForm(null, [], contactId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(proposalForm(proposal, items, contactId));
  }, [open, proposal, isFetched]); // eslint-disable-line react-hooks/exhaustive-deps

  const set: SetField = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const busy = save.isPending || saveItems.isPending;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateProposal(f);
    if (problem) return setError(problem);
    const id = await save.mutateAsync(proposalPayload(f, proposal?.id));
    await saveItems.mutateAsync({ proposalId: id, items: parsedItems(f) });
    if (justSent(f, proposal)) await logConversion("Proposta enviada", f.contact_id as string, formTotals(f).monthly || formTotals(f).oneOff);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">{proposal ? "Editar proposta" : "Nova proposta"}</DialogTitle>
          <DialogDescription>Ao aprovar, o contato vira cliente ativo e a mensalidade entra em Pagar e receber.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="pr-contact">Lead / cliente</Label>
            <RefSelect id="pr-contact" value={f.contact_id} onChange={(v) => set("contact_id", v)} options={contacts} placeholder="Escolha" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pr-status">Situação</Label>
            <SimpleSelect id="pr-status" value={editableStatus(f.status)} onChange={(v) => set("status", v)} options={[...STATUS]} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="pr-title">Título</Label>
            <Input id="pr-title" value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Gestão de tráfego + social media" />
          </div>
          <ProposalItemsEditor items={f.items} onChange={(v) => set("items", v)} services={services} totals={formTotals(f)} />
          <TermsFields f={f} set={set} />
          {error && <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
