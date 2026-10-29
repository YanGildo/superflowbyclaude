import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Archive, CreditCard as CardIcon, Landmark, Loader2, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { RefSelect, SimpleSelect } from "@/components/common/RefSelect";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { useAccounts, useAllPaidTransactions, useCards, useDebts, useFinMutations, usePayables } from "@/hooks/useFinance";
import { useWorkspace } from "@/lib/workspace";
import type { CreditCard, Debt, FinAccount } from "@/integrations/supabase/types";
import { ACCOUNT_TYPES, accountBalance, cardInvoice } from "@/lib/finance";
import { brl, localISODate, moneyInput, parseMoney } from "@/lib/format";
import { shortDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

const COLORS = ["#0D47A1", "#26C6DA", "#059669", "#7c3aed", "#d97706", "#dc2626", "#0A1A2F", "#475569"];

function ColorPick({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Cor">
      {COLORS.map((c) => (
        <button key={c} type="button" role="radio" aria-checked={value === c} aria-label={`Cor ${c}`} onClick={() => onChange(c)}
          className="size-6 rounded-full ring-offset-2 ring-offset-background aria-checked:ring-2 aria-checked:ring-ring" style={{ background: c }} />
      ))}
    </div>
  );
}

/* ------------------------------ Contas ------------------------------ */

function AccountDialog({ open, onOpenChange, acc }: { open: boolean; onOpenChange: (o: boolean) => void; acc?: FinAccount | null }) {
  const { businesses } = useWorkspace();
  const { save } = useFinMutations("fin_accounts");
  const [f, setF] = useState({ name: "", type: "corrente" as FinAccount["type"], bank: "", initial: "", color: COLORS[0], business_id: null as string | null });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(acc ? { name: acc.name, type: acc.type, bank: acc.bank ?? "", initial: moneyInput(acc.initial_balance), color: acc.color ?? COLORS[0], business_id: acc.business_id }
      : { name: "", type: "corrente", bank: "", initial: "", color: COLORS[0], business_id: null });
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

/* ------------------------------ Cartões ------------------------------ */

function CardDialog({ open, onOpenChange, card }: { open: boolean; onOpenChange: (o: boolean) => void; card?: CreditCard | null }) {
  const { save } = useFinMutations("credit_cards");
  const [f, setF] = useState({ name: "", brand: "", last: "", limit: "", closing: "", due: "", color: COLORS[6] });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setError(null);
    setF(card ? { name: card.name, brand: card.brand ?? "", last: card.last_digits ?? "", limit: moneyInput(card.credit_limit),
      closing: card.closing_day?.toString() ?? "", due: card.due_day?.toString() ?? "", color: card.color ?? COLORS[6] }
      : { name: "", brand: "", last: "", limit: "", closing: "", due: "", color: COLORS[6] });
  }, [open, card]);
  const day = (s: string) => (s.trim() === "" ? null : Number(s));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return setError("Dê um nome ao cartão (ex.: Nubank roxinho).");
    if (f.last && !/^\d{4}$/.test(f.last)) return setError("Últimos dígitos: exatamente 4 números.");
    const limit = f.limit.trim() ? parseMoney(f.limit) : 0;
    if (limit === null || limit < 0) return setError("Limite inválido.");
    for (const d of [day(f.closing), day(f.due)]) if (d !== null && (!Number.isInteger(d) || d < 1 || d > 31)) return setError("Dias precisam estar entre 1 e 31.");
    await save.mutateAsync({ id: card?.id, name: f.name.trim(), brand: f.brand || null, last_digits: f.last || null, credit_limit: limit,
      closing_day: day(f.closing), due_day: day(f.due), color: f.color });
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

/* ------------------------------ Dívidas ------------------------------ */

function DebtDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
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

/* ------------------------------ Página ------------------------------ */

type Tab = "contas" | "cartoes" | "dividas";

export default function Carteira() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("aba") as Tab) || "contas";
  const setTab = (t: Tab) => setParams((p) => { p.set("aba", t); return p; }, { replace: true });
  const { data: accounts = [], isLoading: la } = useAccounts();
  const { data: cards = [], isLoading: lc } = useCards();
  const { data: debts = [], isLoading: ld } = useDebts();
  const { data: payables = [] } = usePayables();
  const { data: txs = [] } = useAllPaidTransactions();
  const accM = useFinMutations("fin_accounts");
  const cardM = useFinMutations("credit_cards");
  const debtM = useFinMutations("debts");
  const [accDlg, setAccDlg] = useState<{ open: boolean; acc?: FinAccount | null }>({ open: false });
  const [cardDlg, setCardDlg] = useState<{ open: boolean; card?: CreditCard | null }>({ open: false });
  const [debtDlg, setDebtDlg] = useState(false);

  const totalBalance = accounts.reduce((a, acc) => a + accountBalance(acc, txs), 0);
  const TABS: { v: Tab; label: string; icon: typeof Wallet }[] = [
    { v: "contas", label: "Contas", icon: Landmark }, { v: "cartoes", label: "Cartões", icon: CardIcon }, { v: "dividas", label: "Dívidas", icon: Wallet },
  ];
  const newBtn = tab === "contas" ? <Button onClick={() => setAccDlg({ open: true, acc: null })}><Plus className="size-4" />Nova conta</Button>
    : tab === "cartoes" ? <Button onClick={() => setCardDlg({ open: true, card: null })}><Plus className="size-4" />Novo cartão</Button>
    : <Button onClick={() => setDebtDlg(true)}><Plus className="size-4" />Nova dívida</Button>;

  return (
    <div>
      <PageHeader eyebrow="Financeiro" title="Dívidas e cartões" description="Contas bancárias, cartões de crédito e dívidas parceladas." actions={newBtn} />

      <div className="mb-5 flex gap-1 rounded-lg border bg-card p-0.5 sm:w-fit" role="tablist" aria-label="Seção">
        {TABS.map((t) => (
          <button key={t.v} role="tab" aria-selected={tab === t.v} onClick={() => setTab(t.v)}
            className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium", tab === t.v ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
            <t.icon className="size-4" />{t.label}
          </button>
        ))}
      </div>

      {tab === "contas" && (la ? <Skeleton className="h-40 rounded-xl" /> : accounts.length === 0 ? (
        <EmptyState icon={Landmark} title="Nenhuma conta cadastrada" description="Cadastre suas contas (banco, carteira, gateway) para ver o saldo real de cada uma."
          action={<Button onClick={() => setAccDlg({ open: true, acc: null })}><Plus className="size-4" />Cadastrar conta</Button>} />
      ) : (
        <>
          <Card className="brand-hero mb-4 border-0"><CardContent className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-cyan">Saldo total</p>
            <p className="mt-1 font-heading text-3xl font-semibold tabular-nums text-white">{brl(totalBalance)}</p>
            <p className="text-xs text-white/60">Somando {accounts.length} conta(s), pelos lançamentos pagos.</p>
          </CardContent></Card>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {accounts.map((a) => {
              const bal = accountBalance(a, txs);
              return (
                <Card key={a.id} className="group overflow-hidden">
                  <span className="block h-1" style={{ background: a.color ?? COLORS[0] }} />
                  <CardContent className="space-y-1 p-4">
                    <div className="flex items-start justify-between">
                      <div><p className="font-heading font-semibold">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{ACCOUNT_TYPES.find((t) => t.value === a.type)?.label}{a.bank && ` · ${a.bank}`}</p></div>
                      <div className="flex opacity-0 group-hover:opacity-100">
                        <Button size="icon" variant="ghost" className="size-8" aria-label={`Editar ${a.name}`} onClick={() => setAccDlg({ open: true, acc: a })}><Pencil className="size-4" /></Button>
                        <Button size="icon" variant="ghost" className="size-8" aria-label={`Arquivar ${a.name}`} onClick={() => accM.remove.mutate(a.id)}><Archive className="size-4" /></Button>
                      </div>
                    </div>
                    <p className={cn("pt-2 font-heading text-2xl font-semibold tabular-nums", bal < 0 && "text-destructive")}>{brl(bal)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ))}

      {tab === "cartoes" && (lc ? <Skeleton className="h-40 rounded-xl" /> : cards.length === 0 ? (
        <EmptyState icon={CardIcon} title="Nenhum cartão" description="Cadastre seus cartões para acompanhar fatura e limite."
          action={<Button onClick={() => setCardDlg({ open: true, card: null })}><Plus className="size-4" />Cadastrar cartão</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((c) => {
            const inv = cardInvoice(c, txs);
            const limit = Number(c.credit_limit);
            const pct = limit > 0 ? Math.min(100, Math.round((inv.total / limit) * 100)) : 0;
            return (
              <Card key={c.id} className="group overflow-hidden">
                <div className="space-y-6 p-4 text-white" style={{ background: `linear-gradient(135deg, ${c.color ?? COLORS[6]}, #0A1A2F)` }}>
                  <div className="flex items-start justify-between">
                    <div><p className="font-heading font-semibold">{c.name}</p><p className="text-xs text-white/70">{c.brand ?? "Cartão"}</p></div>
                    <div className="flex opacity-0 group-hover:opacity-100">
                      <Button size="icon" variant="ghost" className="size-8 text-white hover:bg-white/10 hover:text-white" aria-label={`Editar ${c.name}`} onClick={() => setCardDlg({ open: true, card: c })}><Pencil className="size-4" /></Button>
                      <Button size="icon" variant="ghost" className="size-8 text-white hover:bg-white/10 hover:text-white" aria-label={`Arquivar ${c.name}`} onClick={() => cardM.remove.mutate(c.id)}><Archive className="size-4" /></Button>
                    </div>
                  </div>
                  <p className="font-mono text-sm tracking-widest text-white/80">•••• {c.last_digits ?? "••••"}</p>
                </div>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Fatura atual ({shortDate(inv.start)}–{shortDate(inv.end)})</span>
                    <span className="font-heading font-semibold tabular-nums">{brl(inv.total)}</span>
                  </div>
                  {limit > 0 && <>
                    <Progress value={pct} className={cn("h-1.5", pct > 85 && "[&>div]:bg-destructive")} />
                    <p className="text-xs text-muted-foreground">Disponível {brl(Math.max(0, limit - inv.total))} de {brl(limit)}</p>
                  </>}
                  {c.due_day && <p className="text-xs text-muted-foreground">Vence todo dia {c.due_day}{c.closing_day && ` · fecha dia ${c.closing_day}`}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      {tab === "dividas" && (ld ? <Skeleton className="h-40 rounded-xl" /> : debts.length === 0 ? (
        <EmptyState icon={Wallet} title="Nenhuma dívida" description="Cadastre empréstimos e compras parceladas. As parcelas aparecem em Pagar e receber."
          action={<Button onClick={() => setDebtDlg(true)}><Plus className="size-4" />Cadastrar dívida</Button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {debts.map((d: Debt) => {
            const parts = payables.filter((p) => p.debt_id === d.id);
            const paid = parts.filter((p) => p.status === "pago");
            const paidValue = paid.reduce((a, p) => a + Number(p.amount), 0);
            const next = parts.filter((p) => p.status !== "pago").sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
            const pct = d.installments_total ? Math.round((paid.length / d.installments_total) * 100) : 0;
            const quitada = paid.length >= d.installments_total;
            return (
              <Card key={d.id} className="group">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-heading font-semibold">{d.name}</p><p className="text-xs text-muted-foreground">{d.creditor ?? "Sem credor"}{d.interest_rate ? ` · ${d.interest_rate}% a.m.` : ""}</p></div>
                    <div className="flex items-center gap-1">
                      {quitada && <Badge className="bg-success text-success-foreground">Quitada</Badge>}
                      <Button size="icon" variant="ghost" className="size-8 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                        aria-label={`Excluir ${d.name}`} onClick={() => debtM.remove.mutate(d.id)}><Trash2 className="size-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs"><span className="text-muted-foreground">{paid.length}/{d.installments_total} parcelas pagas</span><span className="font-medium">{pct}%</span></div>
                    <Progress value={pct} className="h-2" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><p className="text-xs text-muted-foreground">Falta pagar</p><p className="font-semibold tabular-nums">{brl(Math.max(0, Number(d.total_amount) - paidValue))}</p></div>
                    <div><p className="text-xs text-muted-foreground">Próxima parcela</p><p className="font-semibold tabular-nums">{next ? `${brl(Number(next.amount))} · ${shortDate(next.due_date)}` : "—"}</p></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ))}

      <AccountDialog open={accDlg.open} acc={accDlg.acc} onOpenChange={(o) => setAccDlg((d) => ({ ...d, open: o }))} />
      <CardDialog open={cardDlg.open} card={cardDlg.card} onOpenChange={(o) => setCardDlg((d) => ({ ...d, open: o }))} />
      <DebtDialog open={debtDlg} onOpenChange={setDebtDlg} />
    </div>
  );
}
