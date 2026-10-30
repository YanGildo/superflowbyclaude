import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { useFinMutations } from "@/hooks/useFinance";
import type { CreditCard } from "@/integrations/supabase/types";
import { cardForm, cardPayload, validateCardForm, type CardForm } from "@/lib/walletForms";
import { ColorPick } from "./ColorPick";

export function CardDialog({ open, onOpenChange, card }: { open: boolean; onOpenChange: (o: boolean) => void; card?: CreditCard | null }) {
  const { save } = useFinMutations("credit_cards");
  const [f, setF] = useState<CardForm>(() => cardForm(null));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(cardForm(card));
  }, [open, card]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateCardForm(f);
    if (problem) return setError(problem);
    await save.mutateAsync(cardPayload(f, card?.id));
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="font-heading">{card ? "Editar cartão" : "Novo cartão"}</DialogTitle>
          <DialogDescription>Compras lançadas no cartão entram na fatura do ciclo atual. Nunca guarde o número completo.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3" noValidate>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="cc-name">Nome</Label><Input id="cc-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></div>
          <div className="space-y-1.5"><Label htmlFor="cc-brand">Bandeira</Label><Input id="cc-brand" value={f.brand} onChange={(e) => setF({ ...f, brand: e.target.value })} placeholder="Visa, Master..." /></div>
          <div className="space-y-1.5"><Label htmlFor="cc-last">Últimos 4 dígitos</Label><Input id="cc-last" inputMode="numeric" maxLength={4} value={f.last} onChange={(e) => setF({ ...f, last: e.target.value.replace(/\D/g, "") })} /></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="cc-limit">Limite</Label><MoneyInput id="cc-limit" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="cc-close">Dia de fechamento</Label><Input id="cc-close" type="number" min={1} max={31} value={f.closing} onChange={(e) => setF({ ...f, closing: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="cc-due">Dia de vencimento</Label><Input id="cc-due" type="number" min={1} max={31} value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></div>
          <div className="col-span-2 space-y-1.5"><Label>Cor</Label><ColorPick value={f.color} onChange={(c) => setF({ ...f, color: c })} /></div>
          {error && <p className="col-span-2 text-sm text-destructive" role="alert">{error}</p>}
          <DialogFooter className="col-span-2"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
