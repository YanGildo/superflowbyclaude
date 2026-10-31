import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RefSelect } from "@/components/common/RefSelect";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { useAccounts } from "@/hooks/useFinance";
import { useProLabore } from "@/hooks/useProLabore";
import { localISODate, moneyInput, parseMoney } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

type Side = { business: string | null; account: string | null };

function SideFields({ prefix, title, side, set }: { prefix: string; title: string; side: Side; set: (s: Side) => void }) {
  const { businesses } = useWorkspace();
  const { data: accounts = [] } = useAccounts();
  return (
    <fieldset className="space-y-2 rounded-lg border p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</legend>
      <div className="space-y-1.5"><Label htmlFor={`${prefix}-biz`}>Negócio</Label>
        <RefSelect id={`${prefix}-biz`} value={side.business} onChange={(v) => set({ ...side, business: v })} options={businesses} placeholder="Sem negócio" /></div>
      <div className="space-y-1.5"><Label htmlFor={`${prefix}-acc`}>Conta</Label>
        <RefSelect id={`${prefix}-acc`} value={side.account} onChange={(v) => set({ ...side, account: v })} options={accounts} placeholder="Sem conta" /></div>
    </fieldset>
  );
}

/** Registra o pró-labore: sai do negócio (despesa da empresa) e entra no pessoal (renda). */
export function ProLaboreDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { settings, register } = useProLabore();
  const { businesses } = useWorkspace();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(localISODate());
  const [from, setFrom] = useState<Side>({ business: null, account: null });
  const [to, setTo] = useState<Side>({ business: null, account: null });
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const personal = businesses.find((b) => b.kind === "pessoal")?.id ?? null;
    const company = businesses.find((b) => b.kind !== "pessoal")?.id ?? null;
    setAmount(settings.amount ? moneyInput(settings.amount) : "");
    setDate(localISODate());
    setFrom({ business: settings.fromBusiness ?? company, account: settings.fromAccount });
    setTo({ business: settings.toBusiness ?? personal, account: settings.toAccount });
    setError(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const v = parseMoney(amount);
    if (!v || v <= 0) return setError("Informe o valor do pró-labore.");
    if (from.business && from.business === to.business) return setError("Escolha negócios diferentes (ex.: da agência para o Pessoal).");
    await register.mutateAsync({
      input: { amount: v, date, fromBusiness: from.business, toBusiness: to.business, fromAccount: from.account, toAccount: to.account },
      remember,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Pró-labore</DialogTitle>
          <DialogDescription>Seu salário como dono. Vira uma saída no negócio e uma entrada no pessoal — assim o lucro da empresa e o seu orçamento ficam certos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="pl-amount">Valor</Label><MoneyInput id="pl-amount" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></div>
            <div className="space-y-1.5"><Label htmlFor="pl-date">Data</Label><Input id="pl-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
            <SideFields prefix="pl-from" title="Sai de" side={from} set={setFrom} />
            <ArrowRight className="mx-auto hidden size-5 text-muted-foreground sm:block" />
            <SideFields prefix="pl-to" title="Entra em" side={to} set={setTo} />
          </div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={remember} onCheckedChange={setRemember} />Lembrar como padrão</label>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={register.isPending}>{register.isPending && <Loader2 className="size-4 animate-spin" />}Registrar pró-labore</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
