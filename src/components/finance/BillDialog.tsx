import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { MoneyInput } from "./MoneyInput";
import type { BillRecurrence, CreditCard, FinAccount, Payable, Receivable } from "@/integrations/supabase/types";
import { useAccounts, useCards, useCategories, useFinMutations } from "@/hooks/useFinance";
import { useWorkspace } from "@/lib/workspace";
import { METHODS } from "@/lib/finance";
import {
  BILL_RECURRENCE, BILL_TEXT, billPayload, initialBillForm, validateBillForm, type BillForm, type BillKind,
} from "@/lib/billForm";

type SetField = <K extends keyof BillForm>(k: K, v: BillForm[K]) => void;

const RECURRENCE_OPTIONS = (Object.keys(BILL_RECURRENCE) as BillRecurrence[]).map((r) => ({ value: r, label: BILL_RECURRENCE[r] }));
const METHOD_OPTIONS = METHODS.map((x) => ({ value: x, label: x }));

/** Forma de pagamento (só "pagar") + cartão ou conta. */
function PaymentFields({ f, set, kind, accounts, cards }: {
  f: BillForm; set: SetField; kind: BillKind; accounts: FinAccount[]; cards: CreditCard[];
}) {
  const isPay = kind === "pagar";
  const useCard = isPay && f.method === "Cartão de crédito" && cards.length > 0;
  return (
    <>
      {isPay && (
        <div className="space-y-1.5">
          <Label htmlFor="bill-method">Forma de pagamento</Label>
          <SimpleSelect id="bill-method" value={f.method} onChange={(v) => { set("method", v); if (v !== "Cartão de crédito") set("card_id", null); }}
            options={METHOD_OPTIONS} />
        </div>
      )}
      {useCard ? (
        <div className="space-y-1.5">
          <Label htmlFor="bill-card">Cartão</Label>
          <RefSelect id="bill-card" value={f.card_id} onChange={(v) => set("card_id", v)} options={cards} placeholder="Escolha o cartão" />
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="bill-acc">{BILL_TEXT[kind].accLabel}</Label>
          <RefSelect id="bill-acc" value={f.account_id} onChange={(v) => set("account_id", v)} options={accounts} placeholder="Sem conta" />
        </div>
      )}
    </>
  );
}

export function BillDialog({
  open, onOpenChange, kind, bill,
}: { open: boolean; onOpenChange: (o: boolean) => void; kind: BillKind; bill?: Payable | Receivable | null }) {
  const { businesses, businessFilter } = useWorkspace();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const payM = useFinMutations("payables");
  const recM = useFinMutations("receivables");
  const m = kind === "pagar" ? payM : recM;
  const text = BILL_TEXT[kind];
  const [f, setF] = useState<BillForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(initialBillForm(bill, { businessFilter, firstAccountId: accounts[0]?.id ?? null }));
  }, [open, bill]); // eslint-disable-line react-hooks/exhaustive-deps

  const cats = useMemo(() => categories.filter((c) => c.kind === "ambos" || c.kind === BILL_TEXT[kind].cat), [categories, kind]);
  if (!f) return null;
  const set: SetField = (k, v) => setF((p) => (p ? { ...p, [k]: v } : p));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateBillForm(f, kind);
    if (problem) return setError(problem);
    await m.save.mutateAsync(billPayload(f, kind, bill?.id));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{bill ? "Editar" : "Nova"} conta a {kind}</DialogTitle>
          <DialogDescription>
            Ao marcar como {text.done}, o lançamento é criado sozinho. Se repetir, a próxima também.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bill-title">Descrição</Label>
            <Input id="bill-title" value={f.title} onChange={(e) => set("title", e.target.value)} autoFocus placeholder={text.titlePh} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-amount">Valor</Label>
            <MoneyInput id="bill-amount" value={f.amount} onChange={(e) => set("amount", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-date">{text.dateLabel}</Label>
            <Input id="bill-date" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-rec">Repetir</Label>
            <SimpleSelect id="bill-rec" value={f.recurrence} onChange={(v) => set("recurrence", v)} options={RECURRENCE_OPTIONS} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-cat">Categoria</Label>
            <RefSelect id="bill-cat" value={f.category_id} onChange={(v) => set("category_id", v)} options={cats} placeholder="Sem categoria" />
          </div>
          <PaymentFields f={f} set={set} kind={kind} accounts={accounts} cards={cards} />
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bill-biz">Negócio</Label>
            <RefSelect id="bill-biz" value={f.business_id} onChange={(v) => set("business_id", v)} options={businesses} placeholder="Sem negócio" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bill-notes">Observações</Label>
            <Textarea id="bill-notes" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive sm:col-span-2" role="alert">{error}</p>}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={m.save.isPending}>{m.save.isPending && <Loader2 className="size-4 animate-spin" />}Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
