import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { MoneyInput } from "./MoneyInput";
import type { BillRecurrence, Payable, Receivable } from "@/integrations/supabase/types";
import { useAccounts, useCards, useCategories, useFinMutations } from "@/hooks/useFinance";
import { useWorkspace } from "@/lib/workspace";
import { localISODate, moneyInput, parseMoney } from "@/lib/format";
import { METHODS } from "./TransactionDialog";

export const BILL_RECURRENCE: Record<BillRecurrence, string> = { none: "Não repete", weekly: "Toda semana", monthly: "Todo mês", yearly: "Todo ano" };

type Kind = "pagar" | "receber";
type Form = {
  title: string; amount: string; date: string; recurrence: BillRecurrence; category_id: string | null;
  account_id: string | null; card_id: string | null; method: string; business_id: string | null; notes: string;
};

export function BillDialog({
  open, onOpenChange, kind, bill,
}: { open: boolean; onOpenChange: (o: boolean) => void; kind: Kind; bill?: Payable | Receivable | null }) {
  const { businesses, businessFilter } = useWorkspace();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const payM = useFinMutations("payables");
  const recM = useFinMutations("receivables");
  const m = kind === "pagar" ? payM : recM;
  const [f, setF] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (bill) {
      const isPay = "due_date" in bill;
      setF({
        title: bill.title, amount: moneyInput(bill.amount), date: isPay ? (bill as Payable).due_date : (bill as Receivable).expected_date,
        recurrence: bill.recurrence, category_id: bill.category_id, account_id: bill.account_id,
        card_id: isPay ? (bill as Payable).card_id : null, method: isPay ? (bill as Payable).method ?? "Pix" : "Pix",
        business_id: bill.business_id, notes: bill.notes ?? "",
      });
    } else {
      setF({ title: "", amount: "", date: localISODate(), recurrence: "none", category_id: null, account_id: accounts[0]?.id ?? null,
        card_id: null, method: "Pix", business_id: businessFilter === "all" ? null : businessFilter, notes: "" });
    }
  }, [open, bill]); // eslint-disable-line react-hooks/exhaustive-deps

  const cats = useMemo(() => categories.filter((c) => c.kind === "ambos" || c.kind === (kind === "pagar" ? "saida" : "entrada")), [categories, kind]);
  if (!f) return null;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => (p ? { ...p, [k]: v } : p));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseMoney(f.amount);
    if (!f.title.trim()) return setError(kind === "pagar" ? "O que é essa conta? (ex.: Aluguel)" : "O que vai receber? (ex.: Mensalidade cliente X)");
    if (amount === null || amount <= 0) return setError("Informe um valor maior que zero.");
    if (!f.date) return setError("Informe a data.");
    const common = { id: bill?.id, title: f.title.trim(), amount, recurrence: f.recurrence, category_id: f.category_id,
      account_id: f.account_id, business_id: f.business_id, notes: f.notes || null };
    await m.save.mutateAsync(kind === "pagar"
      ? { ...common, due_date: f.date, method: f.card_id ? "Cartão de crédito" : f.method, card_id: f.card_id }
      : { ...common, expected_date: f.date });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{bill ? "Editar" : "Nova"} conta a {kind}</DialogTitle>
          <DialogDescription>
            Ao marcar como {kind === "pagar" ? "paga" : "recebida"}, o lançamento é criado sozinho. Se repetir, a próxima também.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2" noValidate>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="bill-title">Descrição</Label>
            <Input id="bill-title" value={f.title} onChange={(e) => set("title", e.target.value)} autoFocus
              placeholder={kind === "pagar" ? "Ex.: Aluguel, Internet, Ferramentas" : "Ex.: Mensalidade Padaria Pão Bom"} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-amount">Valor</Label>
            <MoneyInput id="bill-amount" value={f.amount} onChange={(e) => set("amount", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-date">{kind === "pagar" ? "Vencimento" : "Previsto para"}</Label>
            <Input id="bill-date" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-rec">Repetir</Label>
            <SimpleSelect id="bill-rec" value={f.recurrence} onChange={(v) => set("recurrence", v)}
              options={(Object.keys(BILL_RECURRENCE) as BillRecurrence[]).map((r) => ({ value: r, label: BILL_RECURRENCE[r] }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bill-cat">Categoria</Label>
            <RefSelect id="bill-cat" value={f.category_id} onChange={(v) => set("category_id", v)} options={cats} placeholder="Sem categoria" />
          </div>
          {kind === "pagar" && (
            <div className="space-y-1.5">
              <Label htmlFor="bill-method">Forma de pagamento</Label>
              <SimpleSelect id="bill-method" value={f.method} onChange={(v) => { set("method", v); if (v !== "Cartão de crédito") set("card_id", null); }}
                options={METHODS.map((x) => ({ value: x, label: x }))} />
            </div>
          )}
          {kind === "pagar" && f.method === "Cartão de crédito" && cards.length > 0 ? (
            <div className="space-y-1.5">
              <Label htmlFor="bill-card">Cartão</Label>
              <RefSelect id="bill-card" value={f.card_id} onChange={(v) => set("card_id", v)} options={cards} placeholder="Escolha o cartão" />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="bill-acc">{kind === "pagar" ? "Sai da conta" : "Entra na conta"}</Label>
              <RefSelect id="bill-acc" value={f.account_id} onChange={(v) => set("account_id", v)} options={accounts} placeholder="Sem conta" />
            </div>
          )}
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
