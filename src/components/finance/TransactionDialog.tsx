import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowDownCircle, ArrowUpCircle, Loader2, Repeat2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { MoneyInput } from "./MoneyInput";
import type { Business, CreditCard, FinAccount, FinCategory, Transaction, TxType } from "@/integrations/supabase/types";
import { useAccounts, useCards, useCategories, useFinMutations } from "@/hooks/useFinance";
import { useWorkspace } from "@/lib/workspace";
import { METHODS } from "@/lib/finance";
import {
  DESC_PLACEHOLDER, initialTxForm, showsCard, statusLabel, txPayload, validateTxForm, type TxForm,
} from "@/lib/txForm";
import { cn } from "@/lib/utils";

type SetField = <K extends keyof TxForm>(k: K, v: TxForm[K]) => void;

const TYPES: { v: TxType; label: string; icon: typeof ArrowUpCircle; tone: string }[] = [
  { v: "entrada", label: "Entrada", icon: ArrowUpCircle, tone: "text-success" },
  { v: "saida", label: "Saída", icon: ArrowDownCircle, tone: "text-destructive" },
  { v: "transferencia", label: "Transferência", icon: Repeat2, tone: "text-primary" },
];

function TypePicker({ value, onChange }: { value: TxType; onChange: (t: TxType) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Tipo de lançamento">
      {TYPES.map((t) => (
        <button key={t.v} type="button" role="radio" aria-checked={value === t.v} onClick={() => onChange(t.v)}
          className={cn("flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors",
            value === t.v ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>
          <t.icon className={cn("size-4", value === t.v && t.tone)} />{t.label}
        </button>
      ))}
    </div>
  );
}

function TransferFields({ f, set, accounts }: { f: TxForm; set: SetField; accounts: FinAccount[] }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="tx-from">De</Label>
        <RefSelect id="tx-from" value={f.account_id} onChange={(v) => set("account_id", v)} options={accounts} placeholder="Escolha a conta" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tx-to">Para</Label>
        <RefSelect id="tx-to" value={f.to_account_id} onChange={(v) => set("to_account_id", v)} options={accounts} placeholder="Escolha a conta" />
      </div>
    </>
  );
}

function MoneyFlowFields({ f, set, cats, accounts, cards }: {
  f: TxForm; set: SetField; cats: FinCategory[]; accounts: FinAccount[]; cards: CreditCard[];
}) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="tx-cat">Categoria</Label>
        <RefSelect id="tx-cat" value={f.category_id} onChange={(v) => set("category_id", v)} options={cats} placeholder="Sem categoria" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tx-method">Forma</Label>
        <SimpleSelect id="tx-method" value={f.card_id ? "Cartão de crédito" : f.method}
          onChange={(v) => { set("method", v); if (v !== "Cartão de crédito") set("card_id", null); }}
          options={METHODS.map((m) => ({ value: m, label: m }))} />
      </div>
      {showsCard(f, cards.length > 0) ? (
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="tx-card">Cartão</Label>
          <RefSelect id="tx-card" value={f.card_id} onChange={(v) => set("card_id", v)} options={cards} placeholder="Escolha o cartão" />
        </div>
      ) : (
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="tx-acc">Conta</Label>
          <RefSelect id="tx-acc" value={f.account_id} onChange={(v) => set("account_id", v)} options={accounts} placeholder="Sem conta" />
        </div>
      )}
    </>
  );
}

function OwnerFields({ f, set, businesses }: { f: TxForm; set: SetField; businesses: Business[] }) {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="tx-biz">Negócio</Label>
        <RefSelect id="tx-biz" value={f.business_id} onChange={(v) => set("business_id", v)} options={businesses} placeholder="Sem negócio" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tx-use">Uso</Label>
        <SimpleSelect id="tx-use" value={f.use_type} onChange={(v) => set("use_type", v)}
          options={[{ value: "negocio", label: "Negócio" }, { value: "pessoal", label: "Pessoal" }, { value: "misto", label: "Misto" }]} />
      </div>
    </>
  );
}

function StatusSwitches({ f, set }: { f: TxForm; set: SetField }) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={f.status === "pago"} onCheckedChange={(c) => set("status", c ? "pago" : "pendente")} />
        {statusLabel(f)}
      </label>
      {f.type === "saida" && (
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={f.essential} onCheckedChange={(c) => set("essential", c)} />Gasto essencial
        </label>
      )}
    </div>
  );
}

function TxHeader({ tx }: { tx?: Transaction | null }) {
  return (
    <DialogHeader>
      <DialogTitle className="font-heading">{tx ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
      <DialogDescription>
        {tx?.source_type ? "Gerado automaticamente por uma conta, venda ou recebimento." : "Registre uma entrada, saída ou transferência entre contas."}
      </DialogDescription>
    </DialogHeader>
  );
}

export function TransactionDialog({
  open, onOpenChange, tx, defaultType = "saida",
}: { open: boolean; onOpenChange: (o: boolean) => void; tx?: Transaction | null; defaultType?: TxType }) {
  const { businesses, businessFilter } = useWorkspace();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const { save } = useFinMutations("transactions");
  const [f, setF] = useState<TxForm | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(initialTxForm(tx, { defaultType, businessFilter, businesses, firstAccountId: accounts[0]?.id ?? null }));
  }, [open, tx]); // eslint-disable-line react-hooks/exhaustive-deps

  const cats = useMemo(() => categories.filter((c) => f && (c.kind === "ambos" || c.kind === f.type)), [categories, f]);
  if (!f) return null;
  const set: SetField = (k, v) => setF((p) => (p ? { ...p, [k]: v } : p));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = validateTxForm(f);
    if (problem) return setError(problem);
    await save.mutateAsync(txPayload(f, tx?.id));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <TxHeader tx={tx} />
        <form onSubmit={submit} className="space-y-3" noValidate>
          <TypePicker value={f.type} onChange={(t) => set("type", t)} />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Valor</Label>
              <MoneyInput id="tx-amount" value={f.amount} onChange={(e) => set("amount", e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Data</Label>
              <Input id="tx-date" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="tx-desc">Descrição</Label>
              <Input id="tx-desc" value={f.description} onChange={(e) => set("description", e.target.value)}
                placeholder={DESC_PLACEHOLDER[f.type]} />
            </div>

            {f.type === "transferencia"
              ? <TransferFields f={f} set={set} accounts={accounts} />
              : <MoneyFlowFields f={f} set={set} cats={cats} accounts={accounts} cards={cards} />}

            <OwnerFields f={f} set={set} businesses={businesses} />
          </div>

          <StatusSwitches f={f} set={set} />

          <div className="space-y-1.5">
            <Label htmlFor="tx-notes">Observações</Label>
            <Textarea id="tx-notes" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>

          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}{tx ? "Salvar" : "Lançar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
