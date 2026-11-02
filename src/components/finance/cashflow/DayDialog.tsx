import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettleBill } from "@/hooks/useCashflow";
import { useAccounts } from "@/hooks/useFinance";
import type { CashDay, CashEvent } from "@/lib/cashflow";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

function EventRow({ e, accountId }: { e: CashEvent; accountId: string | null }) {
  const settle = useSettleBill();
  return (
    <div className="flex items-center gap-3 border-b py-2 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{e.title}</p>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {e.projected && <><Repeat className="size-3" />{e.billKind ? "repetição prevista" : "estimado"}</>}
          {e.late && <span className="font-semibold text-destructive">atrasada (conta hoje)</span>}
        </p>
      </div>
      <span className={cn("text-sm font-semibold tabular-nums", e.kind === "entrada" ? "text-success" : "text-destructive")}>
        {e.kind === "entrada" ? "+" : "−"}{brl(e.amount)}
      </span>
      {e.billId && e.billKind && (
        <Button size="sm" variant="outline" onClick={() => settle(e.billId as string, e.billKind as "pagar" | "receber", e.accountId ? null : accountId)}>
          <Check className="size-4" />{e.billKind === "pagar" ? "Paguei" : "Recebi"}
        </Button>
      )}
    </div>
  );
}

/** De qual conta sai (ou em qual entra) o dinheiro quando a conta a pagar/receber não tem conta definida. */
function AccountPicker({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const { data: accounts = [] } = useAccounts();
  useEffect(() => { if (!value && accounts[0]) onChange(accounts[0].id); }, [accounts, value, onChange]);
  if (accounts.length < 2) return null;
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Ao dar baixa, usar a conta</span>
      <Select value={value ?? undefined} onValueChange={onChange}>
        <SelectTrigger aria-label="Conta da baixa" className="h-8 w-48"><SelectValue /></SelectTrigger>
        <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

export function DayDialog({ day, onClose }: { day: CashDay | null; onClose: () => void }) {
  const [accountId, setAccountId] = useState<string | null>(null);
  const needsAccount = Boolean(day?.events.some((e) => e.billId && !e.accountId));
  const label = day ? new Date(`${day.date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) : "";
  return (
    <Dialog open={Boolean(day)} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading capitalize">{label}</DialogTitle>
          <DialogDescription>
            {day?.balance != null ? <>Saldo projetado no fim do dia: <b className={cn(day.balance < 0 && "text-destructive")}>{brl(day.balance)}</b></> : "Dia que já passou (o calendário projeta de hoje em diante)."}
          </DialogDescription>
        </DialogHeader>
        {day && day.events.length === 0 && <p className="text-sm text-muted-foreground">Nada previsto neste dia.</p>}
        {needsAccount && <AccountPicker value={accountId} onChange={setAccountId} />}
        {day?.events.map((e) => <EventRow key={e.key} e={e} accountId={accountId} />)}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild size="sm" variant="ghost"><Link to="/financeiro/contas">Abrir Pagar e receber</Link></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
