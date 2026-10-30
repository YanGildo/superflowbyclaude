import { Archive, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { CreditCard, Debt, FinAccount, Payable, Transaction } from "@/integrations/supabase/types";
import { ACCOUNT_TYPES, WALLET_COLORS, accountBalance, cardInvoice } from "@/lib/finance";
import { brl } from "@/lib/format";
import { shortDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

/* ------------------------------ Contas ------------------------------ */

function AccountCard({ a, txs, onEdit, onArchive }: { a: FinAccount; txs: Transaction[]; onEdit: () => void; onArchive: () => void }) {
  const bal = accountBalance(a, txs);
  return (
    <Card className="group overflow-hidden">
      <span className="block h-1" style={{ background: a.color ?? WALLET_COLORS[0] }} />
      <CardContent className="space-y-1 p-4">
        <div className="flex items-start justify-between">
          <div><p className="font-heading font-semibold">{a.name}</p>
            <p className="text-xs text-muted-foreground">{ACCOUNT_TYPES.find((t) => t.value === a.type)?.label}{a.bank && ` · ${a.bank}`}</p></div>
          <div className="flex opacity-0 group-hover:opacity-100">
            <Button size="icon" variant="ghost" className="size-8" aria-label={`Editar ${a.name}`} onClick={onEdit}><Pencil className="size-4" /></Button>
            <Button size="icon" variant="ghost" className="size-8" aria-label={`Arquivar ${a.name}`} onClick={onArchive}><Archive className="size-4" /></Button>
          </div>
        </div>
        <p className={cn("pt-2 font-heading text-2xl font-semibold tabular-nums", bal < 0 && "text-destructive")}>{brl(bal)}</p>
      </CardContent>
    </Card>
  );
}

export function AccountsGrid({ accounts, txs, onEdit, onArchive }: {
  accounts: FinAccount[]; txs: Transaction[]; onEdit: (a: FinAccount) => void; onArchive: (a: FinAccount) => void;
}) {
  const totalBalance = accounts.reduce((a, acc) => a + accountBalance(acc, txs), 0);
  return (
    <>
      <Card className="brand-hero mb-4 border-0"><CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-cyan">Saldo total</p>
        <p className="mt-1 font-heading text-3xl font-semibold tabular-nums text-white">{brl(totalBalance)}</p>
        <p className="text-xs text-white/60">Somando {accounts.length} conta(s), pelos lançamentos pagos.</p>
      </CardContent></Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((a) => <AccountCard key={a.id} a={a} txs={txs} onEdit={() => onEdit(a)} onArchive={() => onArchive(a)} />)}
      </div>
    </>
  );
}

/* ------------------------------ Cartões ------------------------------ */

function CardLimit({ limit, total }: { limit: number; total: number }) {
  if (limit <= 0) return null;
  const pct = Math.min(100, Math.round((total / limit) * 100));
  return (
    <>
      <Progress value={pct} className={cn("h-1.5", pct > 85 && "[&>div]:bg-destructive")} />
      <p className="text-xs text-muted-foreground">Disponível {brl(Math.max(0, limit - total))} de {brl(limit)}</p>
    </>
  );
}

function CreditCardTile({ c, txs, onEdit, onArchive }: { c: CreditCard; txs: Transaction[]; onEdit: () => void; onArchive: () => void }) {
  const inv = cardInvoice(c, txs);
  const btn = "size-8 text-white hover:bg-white/10 hover:text-white";
  return (
    <Card className="group overflow-hidden">
      <div className="space-y-6 p-4 text-white" style={{ background: `linear-gradient(135deg, ${c.color ?? WALLET_COLORS[6]}, #0A1A2F)` }}>
        <div className="flex items-start justify-between">
          <div><p className="font-heading font-semibold">{c.name}</p><p className="text-xs text-white/70">{c.brand ?? "Cartão"}</p></div>
          <div className="flex opacity-0 group-hover:opacity-100">
            <Button size="icon" variant="ghost" className={btn} aria-label={`Editar ${c.name}`} onClick={onEdit}><Pencil className="size-4" /></Button>
            <Button size="icon" variant="ghost" className={btn} aria-label={`Arquivar ${c.name}`} onClick={onArchive}><Archive className="size-4" /></Button>
          </div>
        </div>
        <p className="font-mono text-sm tracking-widest text-white/80">•••• {c.last_digits ?? "••••"}</p>
      </div>
      <CardContent className="space-y-2 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted-foreground">Fatura atual ({shortDate(inv.start)}–{shortDate(inv.end)})</span>
          <span className="font-heading font-semibold tabular-nums">{brl(inv.total)}</span>
        </div>
        <CardLimit limit={Number(c.credit_limit)} total={inv.total} />
        {c.due_day && <p className="text-xs text-muted-foreground">Vence todo dia {c.due_day}{c.closing_day && ` · fecha dia ${c.closing_day}`}</p>}
      </CardContent>
    </Card>
  );
}

export function CardsGrid({ cards, txs, onEdit, onArchive }: {
  cards: CreditCard[]; txs: Transaction[]; onEdit: (c: CreditCard) => void; onArchive: (c: CreditCard) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => <CreditCardTile key={c.id} c={c} txs={txs} onEdit={() => onEdit(c)} onArchive={() => onArchive(c)} />)}
    </div>
  );
}

/* ------------------------------ Dívidas ------------------------------ */

/** Situação de uma dívida a partir das parcelas geradas em Pagar e receber. */
function debtStatus(d: Debt, payables: Payable[]) {
  const parts = payables.filter((p) => p.debt_id === d.id);
  const paid = parts.filter((p) => p.status === "pago");
  const paidValue = paid.reduce((a, p) => a + Number(p.amount), 0);
  const next = parts.filter((p) => p.status !== "pago").sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
  const pct = d.installments_total ? Math.round((paid.length / d.installments_total) * 100) : 0;
  return { paidCount: paid.length, paidValue, next, pct, quitada: paid.length >= d.installments_total };
}

function DebtCard({ d, payables, onRemove }: { d: Debt; payables: Payable[]; onRemove: () => void }) {
  const s = debtStatus(d, payables);
  return (
    <Card className="group">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div><p className="font-heading font-semibold">{d.name}</p><p className="text-xs text-muted-foreground">{d.creditor ?? "Sem credor"}{d.interest_rate ? ` · ${d.interest_rate}% a.m.` : ""}</p></div>
          <div className="flex items-center gap-1">
            {s.quitada && <Badge className="bg-success text-success-foreground">Quitada</Badge>}
            <Button size="icon" variant="ghost" className="size-8 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
              aria-label={`Excluir ${d.name}`} onClick={onRemove}><Trash2 className="size-4" /></Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">{s.paidCount}/{d.installments_total} parcelas pagas</span><span className="font-medium">{s.pct}%</span></div>
          <Progress value={s.pct} className="h-2" />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><p className="text-xs text-muted-foreground">Falta pagar</p><p className="font-semibold tabular-nums">{brl(Math.max(0, Number(d.total_amount) - s.paidValue))}</p></div>
          <div><p className="text-xs text-muted-foreground">Próxima parcela</p><p className="font-semibold tabular-nums">{s.next ? `${brl(Number(s.next.amount))} · ${shortDate(s.next.due_date)}` : "—"}</p></div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DebtsGrid({ debts, payables, onRemove }: { debts: Debt[]; payables: Payable[]; onRemove: (d: Debt) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {debts.map((d) => <DebtCard key={d.id} d={d} payables={payables} onRemove={() => onRemove(d)} />)}
    </div>
  );
}
