import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { useFinMutations } from "@/hooks/useFinance";
import { localISODate, moneyInput, parseMoney } from "@/lib/format";

export function DebtDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { save } = useFinMutations("debts");
  const [f, setF] = useState({ name: "", creditor: "", total: "", n: "1", installment: "", first: localISODate(), interest: "" });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setError(null); setF({ name: "", creditor: "", total: "", n: "1", installment: "", first: localISODate(), interest: "" }); } }, [open]);
  const total = parseMoney(f.total), n = Number(f.n);
  const suggested = total && n > 0 ? Math.round((total / n) * 100) / 100 : null;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return setError("O que é essa dívida? (ex.: Notebook, Empréstimo)");
    if (!total || total <= 0) return setError("Informe o valor total.");
    if (!Number.isInteger(n) || n < 1 || n > 360) return setError("Parcelas: de 1 a 360.");
    const inst = f.installment.trim() ? parseMoney(f.installment) : suggested;
    if (!inst || inst <= 0) return setError("Valor da parcela inválido.");
    await save.mutateAsync({ name: f.name.trim(), creditor: f.creditor || null, total_amount: total, installments_total: n,
      installment_amount: inst, first_due_date: f.first, interest_rate: f.interest ? Number(f.interest.replace(",", ".")) : null });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-heading">Nova dívida</DialogTitle>
          <DialogDescription>As parcelas são criadas sozinhas em "Pagar e receber", uma por mês.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3" noValidate>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="debt-name">Descrição</Label><Input id="debt-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="debt-cred">Credor</Label><Input id="debt-cred" value={f.creditor} onChange={(e) => setF({ ...f, creditor: e.target.value })} placeholder="Banco, loja, pessoa" /></div>
          <div className="space-y-1.5"><Label htmlFor="debt-total">Valor total</Label><MoneyInput id="debt-total" value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="debt-n">Parcelas</Label><Input id="debt-n" type="number" min={1} max={360} value={f.n} onChange={(e) => setF({ ...f, n: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="debt-inst">Valor da parcela</Label>
            <MoneyInput id="debt-inst" value={f.installment} onChange={(e) => setF({ ...f, installment: e.target.value })} placeholder={suggested ? moneyInput(suggested) : "0,00"} /></div>
          <div className="space-y-1.5"><Label htmlFor="debt-first">1º vencimento</Label><Input id="debt-first" type="date" value={f.first} onChange={(e) => setF({ ...f, first: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="debt-int">Juros ao mês (%) — opcional</Label><Input id="debt-int" inputMode="decimal" value={f.interest} onChange={(e) => setF({ ...f, interest: e.target.value })} /></div>
          {error && <p className="col-span-2 text-sm text-destructive" role="alert">{error}</p>}
          <DialogFooter className="col-span-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Criar com {Number.isInteger(n) && n > 0 ? n : 1} parcela(s)</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
