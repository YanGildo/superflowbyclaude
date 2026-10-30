import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { CreditCard as CardIcon, Landmark, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, EmptyState } from "@/components/common/PageHeader";
import { AccountDialog } from "@/components/finance/wallet/AccountDialog";
import { CardDialog } from "@/components/finance/wallet/CardDialog";
import { DebtDialog } from "@/components/finance/wallet/DebtDialog";
import { AccountsGrid, CardsGrid, DebtsGrid } from "@/components/finance/wallet/WalletTabs";
import { useAccounts, useAllPaidTransactions, useCards, useDebts, useFinMutations, usePayables } from "@/hooks/useFinance";
import type { CreditCard, FinAccount } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Tab = "contas" | "cartoes" | "dividas";

const TABS: { v: Tab; label: string; icon: typeof Wallet; add: string }[] = [
  { v: "contas", label: "Contas", icon: Landmark, add: "Nova conta" },
  { v: "cartoes", label: "Cartões", icon: CardIcon, add: "Novo cartão" },
  { v: "dividas", label: "Dívidas", icon: Wallet, add: "Nova dívida" },
];

/** Carregando → esqueleto; lista vazia → estado vazio; senão o conteúdo. */
function TabBody({ loading, empty, emptyState, children }: { loading: boolean; empty: boolean; emptyState: ReactNode; children: ReactNode }) {
  if (loading) return <Skeleton className="h-40 rounded-xl" />;
  return <>{empty ? emptyState : children}</>;
}

function TabBar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="mb-5 flex gap-1 rounded-lg border bg-card p-0.5 sm:w-fit" role="tablist" aria-label="Seção">
      {TABS.map((t) => (
        <button key={t.v} role="tab" aria-selected={tab === t.v} onClick={() => setTab(t.v)}
          className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium", tab === t.v ? "bg-primary text-primary-foreground" : "hover:bg-accent")}>
          <t.icon className="size-4" />{t.label}
        </button>
      ))}
    </div>
  );
}

function useWalletData() {
  const accounts = useAccounts();
  const cards = useCards();
  const debts = useDebts();
  const { data: payables = [] } = usePayables();
  const { data: txs = [] } = useAllPaidTransactions();
  return { accounts, cards, debts, payables, txs };
}

export default function Carteira() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get("aba") as Tab) || "contas";
  const setTab = (t: Tab) => setParams((p) => { p.set("aba", t); return p; }, { replace: true });
  const { accounts, cards, debts, payables, txs } = useWalletData();
  const accM = useFinMutations("fin_accounts");
  const cardM = useFinMutations("credit_cards");
  const debtM = useFinMutations("debts");
  const [accDlg, setAccDlg] = useState<{ open: boolean; acc?: FinAccount | null }>({ open: false });
  const [cardDlg, setCardDlg] = useState<{ open: boolean; card?: CreditCard | null }>({ open: false });
  const [debtDlg, setDebtDlg] = useState(false);

  const add: Record<Tab, () => void> = {
    contas: () => setAccDlg({ open: true, acc: null }),
    cartoes: () => setCardDlg({ open: true, card: null }),
    dividas: () => setDebtDlg(true),
  };
  const current = TABS.find((t) => t.v === tab) ?? TABS[2];
  const addButton = (label: string) => <Button onClick={add[current.v]}><Plus className="size-4" />{label}</Button>;

  return (
    <div>
      <PageHeader eyebrow="Financeiro" title="Dívidas e cartões" description="Contas bancárias, cartões de crédito e dívidas parceladas."
        actions={addButton(current.add)} />

      <TabBar tab={tab} setTab={setTab} />

      {tab === "contas" && (
        <TabBody loading={accounts.isLoading} empty={(accounts.data ?? []).length === 0}
          emptyState={<EmptyState icon={Landmark} title="Nenhuma conta cadastrada" description="Cadastre suas contas (banco, carteira, gateway) para ver o saldo real de cada uma."
            action={addButton("Cadastrar conta")} />}>
          <AccountsGrid accounts={accounts.data ?? []} txs={txs}
            onEdit={(a) => setAccDlg({ open: true, acc: a })} onArchive={(a) => accM.remove.mutate(a.id)} />
        </TabBody>
      )}

      {tab === "cartoes" && (
        <TabBody loading={cards.isLoading} empty={(cards.data ?? []).length === 0}
          emptyState={<EmptyState icon={CardIcon} title="Nenhum cartão" description="Cadastre seus cartões para acompanhar fatura e limite."
            action={addButton("Cadastrar cartão")} />}>
          <CardsGrid cards={cards.data ?? []} txs={txs}
            onEdit={(c) => setCardDlg({ open: true, card: c })} onArchive={(c) => cardM.remove.mutate(c.id)} />
        </TabBody>
      )}

      {tab === "dividas" && (
        <TabBody loading={debts.isLoading} empty={(debts.data ?? []).length === 0}
          emptyState={<EmptyState icon={Wallet} title="Nenhuma dívida" description="Cadastre empréstimos e compras parceladas. As parcelas aparecem em Pagar e receber."
            action={addButton("Cadastrar dívida")} />}>
          <DebtsGrid debts={debts.data ?? []} payables={payables} onRemove={(d) => debtM.remove.mutate(d.id)} />
        </TabBody>
      )}

      <AccountDialog open={accDlg.open} acc={accDlg.acc} onOpenChange={(o) => setAccDlg((d) => ({ ...d, open: o }))} />
      <CardDialog open={cardDlg.open} card={cardDlg.card} onOpenChange={(o) => setCardDlg((d) => ({ ...d, open: o }))} />
      <DebtDialog open={debtDlg} onOpenChange={setDebtDlg} />
    </div>
  );
}
