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
import type { Transaction, TxType, UseType } from "@/integrations/supabase/types";
import { useAccounts, useCards, useCategories, useFinMutations } from "@/hooks/useFinance";
import { useWorkspace } from "@/lib/workspace";
import { localISODate, moneyInput, parseMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const METHODS = ["Pix", "Cartão de crédito", "Cartão de débito", "Boleto", "Dinheiro", "Transferência", "Gateway", "Outro"];

type Form = {
  type: TxType; amount: string; date: string; description: string; category_id: string | null;
  account_id: string | null; card_id: string | null; to_account_id: string | null; method: string;
  status: "pago" | "pendente"; essential: boolean; use_type: UseType; business_id: string | null; notes: string;
};

export function TransactionDialog({
  open, onOpenChange, tx, defaultType = "saida",
}: { open: boolean; onOpenChange: (o: boolean) => void; tx?: Transaction | null; defaultType?: TxType }) {
  const { businesses, businessFilter } = useWorkspace();
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const { save } = useFinMutations("transactions");
  const [f, setF] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const biz = businessFilter === "all" ? null : businessFilter;
    const personal = businesses.find((b) => b.id === biz)?.kind === "pessoal";
    setF(tx ? {
      type: tx.type, amount: moneyInput(tx.amount), date: tx.date, description: tx.description,
      category_id: tx.category_id, account_id: tx.account_id, card_id: tx.card_id, to_account_id: tx.to_account_id,
      method: tx.method ?? "Pix", status: tx.status, essential: tx.essential, use_type: tx.use_type,
      business_id: tx.business_id, notes: tx.notes ?? "",
    } : {
      type: defaultType, amount: "", date: localISODate(), description: "", category_id: null,
      account_id: accounts[0]?.id ?? null, card_id: null, to_account_id: null, method: "Pix", status: "pago",
      essential: false, use_type: personal ? "pessoal" : "negocio", business_id: biz, notes: "",
    });
  }, [open, tx]); // eslint-disable-line react-hooks/exhaustive-deps

  const cats = useMemo(() => categories.filter((c) => f && (c.kind === "ambos" || c.kind === f.type)), [categories, f]);
  if (!f) return null;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => (p ? { ...p, [k]: v } : p));
  const fromGenerated = Boolean(tx?.source_type);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseMoney(f.amount);
    if (amount === null || amount <= 0) return setError("Informe um valor maior que zero.");
    if (!f.description.trim()) return setError("Escreva uma descrição (ex.: Mercado, Cliente X).");
    if (f.type === "transferencia" && (!f.account_id || !f.to_account_id)) return setError("Escolha a conta de origem e a de destino.");
    if (f.type === "transferencia" && f.account_id === f.to_account_id) return setError("Origem e destino precisam ser contas diferentes.");
    await save.mutateAsync({
      id: tx?.id, type: f.type, amount, date: f.date, description: f.description.trim(),
      category_id: f.type === "transferencia" ? null : f.category_id,
      account_id: f.card_id ? null : f.account_id, card_id: f.type === "saida" ? f.card_id : null,
      to_account_id: f.type === "transferencia" ? f.to_account_id : null,
      method: f.card_id ? "Cartão de crédito" : f.method, status: f.status, essential: f.type === "saida" && f.essential,
      use_type: f.use_type, business_id: f.business_id, notes: f.notes || null,
    });
    onOpenChange(false);
  };

  const TYPES: { v: TxType; label: string; icon: typeof ArrowUpCircle; tone: string }[] = [
    { v: "entrada", label: "Entrada", icon: ArrowUpCircle, tone: "text-success" },
    { v: "saida", label: "Saída", icon: ArrowDownCircle, tone: "text-destructive" },
    { v: "transferencia", label: "Transferência", icon: Repeat2, tone: "text-primary" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">{tx ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
          <DialogDescription>
            {fromGenerated ? "Gerado automaticamente por uma conta, venda ou recebimento." : "Registre uma entrada, saída ou transferência entre contas."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Tipo de lançamento">
            {TYPES.map((t) => (
              <button key={t.v} type="button" role="radio" aria-checked={f.type === t.v} onClick={() => set("type", t.v)}
                className={cn("flex items-center justify-center gap-1.5 rounded-md py-1.5 text-sm font-medium transition-colors",
                  f.type === t.v ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <t.icon className={cn("size-4", f.type === t.v && t.tone)} />{t.label}
              </button>
            ))}
          </div>

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
                placeholder={f.type === "entrada" ? "Ex.: Mensalidade Padaria Pão Bom" : f.type === "saida" ? "Ex.: Meta Ads" : "Ex.: Reserva do mês"} />
            </div>

            {f.type === "transferencia" ? (
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
            ) : (
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
                {f.type === "saida" && (f.method === "Cartão de crédito" || f.card_id) && cards.length > 0 ? (
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
            )}

            <div className="space-y-1.5">
              <Label htmlFor="tx-biz">Negócio</Label>
              <RefSelect id="tx-biz" value={f.business_id} onChange={(v) => set("business_id", v)} options={businesses} placeholder="Sem negócio" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-use">Uso</Label>
              <SimpleSelect id="tx-use" value={f.use_type} onChange={(v) => set("use_type", v)}
                options={[{ value: "negocio", label: "Negócio" }, { value: "pessoal", label: "Pessoal" }, { value: "misto", label: "Misto" }]} />
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={f.status === "pago"} onCheckedChange={(c) => set("status", c ? "pago" : "pendente")} />
              {f.status === "pago" ? (f.type === "entrada" ? "Recebido" : "Pago") : "Pendente"}
            </label>
            {f.type === "saida" && (
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={f.essential} onCheckedChange={(c) => set("essential", c)} />Gasto essencial
              </label>
            )}
          </div>

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
