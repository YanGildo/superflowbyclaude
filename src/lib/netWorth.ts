// Patrimônio líquido: ativos (contas + bens) menos dívidas (parcelas em aberto + fatura atual dos cartões).
// Reservas não somam de novo: o dinheiro reservado já está dentro de alguma conta.
import type { AssetKind, Debt, FinAsset, NetWorthSnapshot, Payable } from "@/integrations/supabase/types";
import { openAmount } from "@/lib/finance";
import { CHART_COLORS, type Slice } from "@/lib/finPanel";
import { monthShort } from "@/lib/overview";

export const ASSET_KIND: Record<AssetKind, string> = { investimento: "Investimento", imovel: "Imóvel", veiculo: "Veículo", outro: "Outro" };
export const ASSET_KINDS = Object.keys(ASSET_KIND) as AssetKind[];

const OPEN = new Set(["pendente", "atrasado", "parcial"]);
const round = (n: number) => Math.round(n * 100) / 100;

export interface NetWorth {
  accounts: number; goods: number; installments: number; cards: number;
  assetsTotal: number; debtsTotal: number; net: number; reserved: number;
  assetSlices: Slice[]; splitSlices: Slice[];
}

export function computeNetWorth(i: {
  accountBalances: number[]; assets: FinAsset[]; payables: Payable[]; debts: Debt[]; cardInvoices: number[]; reserved: number;
}): NetWorth {
  const active = new Set(i.debts.filter((d) => d.status !== "quitada" && d.status !== "cancelada").map((d) => d.id));
  const accounts = round(i.accountBalances.reduce((a, b) => a + b, 0));
  const goods = round(i.assets.reduce((a, x) => a + Number(x.value), 0));
  const installments = round(i.payables.filter((p) => OPEN.has(p.status) && p.debt_id && active.has(p.debt_id)).reduce((a, p) => a + openAmount(p), 0));
  const cards = round(i.cardInvoices.reduce((a, b) => a + b, 0));
  const assetsTotal = round(Math.max(0, accounts) + goods);
  const debtsTotal = round(installments + cards + Math.max(0, -accounts));
  const byKind = ASSET_KINDS.map((k) => ({ k, v: i.assets.filter((x) => x.kind === k).reduce((a, x) => a + Number(x.value), 0) }));
  const assetSlices: Slice[] = [
    { name: "Contas", value: Math.max(0, accounts), color: CHART_COLORS[0] },
    ...byKind.map((b, n) => ({ name: ASSET_KIND[b.k], value: b.v, color: CHART_COLORS[n + 1] })),
  ].filter((s) => s.value > 0);
  return {
    accounts, goods, installments, cards, assetsTotal, debtsTotal, net: round(assetsTotal - debtsTotal), reserved: i.reserved,
    assetSlices, splitSlices: [{ name: "Ativos", value: assetsTotal, color: "#059669" }, { name: "Dívidas", value: debtsTotal, color: "#E11D48" }].filter((s) => s.value > 0),
  };
}

/** O registro do mês mudou? (evita gravar à toa a cada abertura da tela) */
export const snapshotChanged = (s: NetWorthSnapshot | undefined, n: NetWorth) =>
  !s || Number(s.net) !== n.net || Number(s.accounts) !== n.accounts || Number(s.goods) !== n.goods || Number(s.debts) !== n.debtsTotal;

export const historySeries = (list: NetWorthSnapshot[]) =>
  list.map((s) => ({ mes: `${monthShort(s.month)}/${s.month.slice(2, 4)}`, Patrimônio: Number(s.net), Ativos: Number(s.accounts) + Number(s.goods), Dívidas: Number(s.debts) }));
