import { ArrowDownCircle, ArrowUpCircle, CreditCard, Repeat2, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Business, Transaction, TxType } from "@/integrations/supabase/types";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

const TX_STYLE: Record<TxType, { icon: typeof ArrowUpCircle; iconTone: string; amountTone: string; sign: string }> = {
  entrada: { icon: ArrowUpCircle, iconTone: "text-success", amountTone: "text-success", sign: "+" },
  saida: { icon: ArrowDownCircle, iconTone: "text-destructive", amountTone: "text-foreground", sign: "−" },
  transferencia: { icon: Repeat2, iconTone: "text-primary", amountTone: "text-muted-foreground", sign: "" },
};

export interface TxNames {
  category: (id: string | null) => string | undefined;
  account: (id: string | null) => string | undefined;
  card: (id: string | null) => string | undefined;
  business: (id: string | null) => Business | undefined;
}

/** Cartão, ou conta (com destino, se for transferência). */
function MoneySource({ t, names }: { t: Transaction; names: TxNames }) {
  if (t.card_id) return <span className="inline-flex items-center gap-1"><CreditCard className="size-3" />{names.card(t.card_id)}</span>;
  const acc = names.account(t.account_id);
  if (!acc) return null;
  return <span className="inline-flex items-center gap-1"><Wallet className="size-3" />{acc}{t.to_account_id && ` → ${names.account(t.to_account_id)}`}</span>;
}

function TxMeta({ t, names }: { t: Transaction; names: TxNames }) {
  const cat = names.category(t.category_id);
  const b = names.business(t.business_id);
  return (
    <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
      {cat && <span>{cat}</span>}
      <MoneySource t={t} names={names} />
      {b && <span className="inline-flex items-center gap-1"><span className="size-1.5 rounded-full" style={{ background: b.color ?? "currentColor" }} />{b.name}</span>}
      {t.source_type && <span>automático</span>}
    </div>
  );
}

export function TxRow({ t, names, onOpen, onMarkPaid, onRemove }: {
  t: Transaction; names: TxNames; onOpen: () => void; onMarkPaid: () => void; onRemove: () => void;
}) {
  const style = TX_STYLE[t.type];
  const Icon = style.icon;
  return (
    <div className="group flex cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 hover:border-primary/30" onClick={onOpen}>
      <Icon className={cn("size-5 shrink-0", style.iconTone)} />
      <div className="min-w-0 flex-1">
        <button className="block max-w-full truncate text-left text-sm font-medium hover:underline"
          onClick={(e) => { e.stopPropagation(); onOpen(); }}>{t.description}</button>
        <TxMeta t={t} names={names} />
      </div>
      {t.status === "pendente" && (
        <Badge variant="outline" className="cursor-pointer text-warning" title="Marcar como pago"
          onClick={(e) => { e.stopPropagation(); onMarkPaid(); }}>pendente</Badge>
      )}
      <span className={cn("shrink-0 font-heading text-sm font-semibold tabular-nums", style.amountTone)}>
        {style.sign}{brl(Number(t.amount))}
      </span>
      <Button size="icon" variant="ghost" className="size-8 shrink-0 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
        aria-label={`Excluir ${t.description}`} onClick={(e) => { e.stopPropagation(); onRemove(); }}>
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
