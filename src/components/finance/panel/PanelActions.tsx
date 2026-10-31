import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, BadgeDollarSign, CreditCard, FileText, Landmark, PiggyBank, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BillDialog } from "@/components/finance/BillDialog";
import { ReserveDialog } from "@/components/finance/goals/GoalDialogs";
import { TransactionDialog } from "@/components/finance/TransactionDialog";
import { AccountDialog } from "@/components/finance/wallet/AccountDialog";
import { CardDialog } from "@/components/finance/wallet/CardDialog";
import { DebtDialog } from "@/components/finance/wallet/DebtDialog";
import { ProLaboreDialog } from "./ProLaboreDialog";

type Open = "entrada" | "saida" | "reserva" | "conta" | "pagar" | "divida" | "receber" | "cartao" | "prolabore" | null;

const ACTIONS: { id: Exclude<Open, null | "entrada" | "saida">; label: string; icon: typeof Wallet }[] = [
  { id: "reserva", label: "Nova reserva", icon: PiggyBank },
  { id: "conta", label: "Nova conta", icon: Landmark },
  { id: "pagar", label: "Conta a pagar", icon: FileText },
  { id: "divida", label: "Nova dívida", icon: AlertTriangle },
  { id: "receber", label: "A receber", icon: ArrowLeftRight },
  { id: "cartao", label: "Cartão", icon: CreditCard },
  { id: "prolabore", label: "Pró-labore", icon: BadgeDollarSign },
];

/** Atalhos do painel: cada botão abre o formulário certo sem sair da tela. */
export function PanelActions() {
  const [open, setOpen] = useState<Open>(null);
  const dlg = (id: Open) => ({ open: open === id, onOpenChange: (o: boolean) => setOpen(o ? id : null) });
  return (
    <div className="flex flex-wrap gap-2">
      <Button className="bg-success text-success-foreground hover:bg-success/90" onClick={() => setOpen("entrada")}><ArrowDownToLine className="size-4" />Nova entrada</Button>
      <Button variant="destructive" onClick={() => setOpen("saida")}><ArrowUpFromLine className="size-4" />Nova despesa</Button>
      {ACTIONS.map((a) => <Button key={a.id} variant="outline" onClick={() => setOpen(a.id)}><a.icon className="size-4" />{a.label}</Button>)}
      <Button variant="outline" asChild><Link to="/financeiro/carteira"><Wallet className="size-4" />Carteira</Link></Button>

      <TransactionDialog {...dlg("entrada")} defaultType="entrada" />
      <TransactionDialog {...dlg("saida")} defaultType="saida" />
      <ReserveDialog {...dlg("reserva")} />
      <AccountDialog {...dlg("conta")} />
      <BillDialog {...dlg("pagar")} kind="pagar" />
      <BillDialog {...dlg("receber")} kind="receber" />
      <DebtDialog {...dlg("divida")} />
      <CardDialog {...dlg("cartao")} />
      <ProLaboreDialog {...dlg("prolabore")} />
    </div>
  );
}
