import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { useAccounts } from "@/hooks/useFinance";
import type { PartialPay } from "@/hooks/usePartialPayments";
import { brl, localISODate, parseMoney } from "@/lib/format";

const NONE = "__none";

/** Pagar uma parte (amortizar): valor, data e de qual conta saiu o dinheiro. */
export function PartialPayDialog({ open, onOpenChange, title, owed, busy, onConfirm }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; owed: number; busy?: boolean;
  onConfirm: (p: PartialPay) => void;
}) {
  const { data: accounts = [] } = useAccounts();
  const [value, setValue] = useState("");
  const [date, setDate] = useState(localISODate());
  const [account, setAccount] = useState(NONE);
  useEffect(() => { if (open) { setValue(""); setDate(localISODate()); setAccount(accounts[0]?.id ?? NONE); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const amount = parseMoney(value);
  const invalid = !amount || amount <= 0 || amount > owed + 0.001;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Pagar uma parte · {title}</DialogTitle>
          <DialogDescription>Falta pagar <b>{brl(owed)}</b>. O valor vira um lançamento de saída e abate do que falta.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label htmlFor="pp-value">Quanto você pagou</Label>
            <MoneyInput id="pp-value" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
            {amount != null && amount > owed + 0.001 && <p className="text-xs text-destructive">Passa do que falta ({brl(owed)}).</p>}
            {amount != null && amount > 0 && !invalid && <p className="text-xs text-muted-foreground">Depois disso falta {brl(owed - amount)}.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label htmlFor="pp-date">Data</Label><Input id="pp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Saiu da conta</Label>
              <Select value={account} onValueChange={setAccount}>
                <SelectTrigger aria-label="Saiu da conta"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sem conta</SelectItem>
                  {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={invalid || busy} onClick={() => amount && onConfirm({ amount, date, accountId: account === NONE ? null : account })}>Registrar pagamento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
