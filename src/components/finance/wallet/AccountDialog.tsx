import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { useFinMutations } from "@/hooks/useFinance";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { useWorkspace } from "@/lib/workspace";
import type { FinAccount } from "@/integrations/supabase/types";
import { ACCOUNT_TYPES, WALLET_COLORS } from "@/lib/finance";
import { moneyInput, parseMoney } from "@/lib/format";
import { ColorPick } from "./ColorPick";

export function AccountDialog({ open, onOpenChange, acc }: { open: boolean; onOpenChange: (o: boolean) => void; acc?: FinAccount | null }) {
  const { businesses } = useWorkspace();
  const { save } = useFinMutations("fin_accounts");
  const [f, setF] = useState({ name: "", type: "corrente" as FinAccount["type"], bank: "", initial: "", color: WALLET_COLORS[0], business_id: null as string | null });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(acc ? { name: acc.name, type: acc.type, bank: acc.bank ?? "", initial: moneyInput(acc.initial_balance), color: acc.color ?? WALLET_COLORS[0], business_id: acc.business_id }
      : { name: "", type: "corrente", bank: "", initial: "", color: WALLET_COLORS[0], business_id: null });
  }, [open, acc]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return setError("Dê um nome à conta (ex.: Nubank PJ).");
    const initial = f.initial.trim() ? parseMoney(f.initial) : 0;
    if (initial === null) return setError("Saldo inicial inválido.");
    await save.mutateAsync({ id: acc?.id, name: f.name.trim(), type: f.type, bank: f.bank || null, initial_balance: initial, color: f.color, business_id: f.business_id });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-heading">{acc ? "Editar conta" : "Nova conta"}</DialogTitle>
          <DialogDescription>Banco, carteira digital, gateway (Nexus, PushinPay...) ou dinheiro.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="space-y-1.5"><Label htmlFor="acc-name">Nome</Label><Input id="acc-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="acc-type">Tipo</Label><SimpleSelect id="acc-type" value={f.type} onChange={(v) => setF({ ...f, type: v })} options={ACCOUNT_TYPES} /></div>
            <div className="space-y-1.5"><Label htmlFor="acc-bank">Banco / instituição</Label><Input id="acc-bank" value={f.bank} onChange={(e) => setF({ ...f, bank: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acc-initial">Saldo inicial</Label>
            <MoneyInput id="acc-initial" value={f.initial} onChange={(e) => setF({ ...f, initial: e.target.value })} />
            <p className="text-xs text-muted-foreground">Quanto tinha na conta quando começou a usar o Superflow. O saldo atual é calculado pelos lançamentos.</p>
          </div>
          <div className="space-y-1.5"><Label htmlFor="acc-biz">Negócio</Label><RefSelect id="acc-biz" value={f.business_id} onChange={(v) => setF({ ...f, business_id: v })} options={businesses} placeholder="Compartilhada" /></div>
          <div className="space-y-1.5"><Label>Cor</Label><ColorPick value={f.color} onChange={(c) => setF({ ...f, color: c })} /></div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
