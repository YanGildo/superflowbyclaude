import { Archive, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CreditCard, FinAccount, Transaction } from "@/integrations/supabase/types";
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
