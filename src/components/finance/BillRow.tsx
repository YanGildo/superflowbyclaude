import { Check, CheckCircle2, MoreHorizontal, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Payable } from "@/integrations/supabase/types";
import { BILL_RECURRENCE, type BillKind } from "@/lib/billForm";
import { BILL_PAGE_TEXT, dueLabel, type Bill } from "@/lib/bills";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface BillRowActions {
  edit: (b: Bill) => void;
  settle: (b: Bill) => void;
  reopen: (b: Bill) => void;
  cancel: (b: Bill) => void;
  remove: (b: Bill) => void;
}

function BillMeta({ b, today, category }: { b: Bill; today: string; category?: string }) {
  const late = !b.done && b.date < today;
  const p = b.raw as Payable;
  return (
    <div className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
      <span className={cn(late && "font-medium text-destructive")}>{dueLabel(b, today)}</span>
      {category && <span>{category}</span>}
      {b.recurrence !== "none" && <span className="inline-flex items-center gap-1"><Repeat className="size-3" />{BILL_RECURRENCE[b.recurrence]}</span>}
      {p.installment_number && <span>Parcela {p.installment_number}</span>}
    </div>
  );
}

function BillMenu({ b, act }: { b: Bill; act: BillRowActions }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="size-8" aria-label={`Mais ações para ${b.title}`}><MoreHorizontal className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => act.edit(b)}>Editar</DropdownMenuItem>
        {b.done && <DropdownMenuItem onClick={() => act.reopen(b)}>Reabrir</DropdownMenuItem>}
        {!b.done && <DropdownMenuItem onClick={() => act.cancel(b)}>Cancelar (não vai acontecer)</DropdownMenuItem>}
        <DropdownMenuItem className="text-destructive" onClick={() => act.remove(b)}>Excluir</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BillRow({ b, kind, today, category, act }: {
  b: Bill; kind: BillKind; today: string; category?: string; act: BillRowActions;
}) {
  const text = BILL_PAGE_TEXT[kind];
  return (
    <div className="group flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => act.edit(b)}>
        <p className={cn("truncate text-sm font-medium", b.done && "text-muted-foreground line-through")}>{b.title}</p>
        <BillMeta b={b} today={today} category={category} />
      </div>
      <span className={cn("font-heading text-sm font-semibold tabular-nums", text.amountTone)}>{brl(b.amount)}</span>
      {!b.done ? (
        <Button size="sm" variant="outline" onClick={() => act.settle(b)} aria-label={`${text.action} ${b.title}`}>
          <Check className="size-4" />{text.action}
        </Button>
      ) : <Badge variant="secondary" className="text-success"><CheckCircle2 className="mr-1 size-3" />ok</Badge>}
      <BillMenu b={b} act={act} />
    </div>
  );
}
