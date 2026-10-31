// Painel financeiro avançado (sem React): filtros, indicadores, gráficos, metas e pró-labore.
import type {
  Debt, FinCategory, FinGoal, Payable, Receivable, Reserve, Transaction, UseType,
} from "@/integrations/supabase/types";
import { localISODate, shiftMonth } from "@/lib/format";
import { monthShort } from "@/lib/overview";
import { ofType, sumAmount } from "@/lib/transactions";

/* ------------------------------ Filtros ------------------------------ */

export type UseFilter = "todos" | UseType;
export type OriginFilter = "todas" | "manual" | "automatica";

export const USE_OPTIONS: { value: UseFilter; label: string }[] = [
  { value: "todos", label: "Todos os usos" }, { value: "negocio", label: "Negócio" },
  { value: "pessoal", label: "Pessoal" }, { value: "misto", label: "Misto" },
];
export const ORIGIN_OPTIONS: { value: OriginFilter; label: string }[] = [
  { value: "todas", label: "Todas as origens" }, { value: "manual", label: "Lançados à mão" },
  { value: "automatica", label: "Automáticos (contas, vendas)" },
];

/** Na visão consolidada (todos os negócios e usos), o pró-labore é só dinheiro mudando de bolso. */
export const withoutInternal = (txs: Transaction[]) => txs.filter((t) => t.source_type !== "prolabore");

export function filterTx(txs: Transaction[], use: UseFilter, origin: OriginFilter) {
  return txs.filter((t) => (use === "todos" || t.use_type === use)
    && (origin === "todas" || (origin === "manual" ? !t.source_type : Boolean(t.source_type))));
}

/* ------------------------------ Indicadores ------------------------------ */

const isCredit = (t: Transaction) => Boolean(t.card_id) || t.method === "Cartão de crédito";
const inMonth = (iso: string | null | undefined, ym: string) => Boolean(iso?.startsWith(ym));

export function monthFlow(monthTx: Transaction[]) {
  const out = ofType(monthTx, "saida");
  const entradas = sumAmount(ofType(monthTx, "entrada"));
  const saidas = sumAmount(out);
  const credito = sumAmount(out.filter(isCredit));
  return { entradas, saidas, restante: entradas - saidas, credito, debito: saidas - credito };
}

export const activeReserves = (reserves: Reserve[]) => reserves.filter((r) => r.status === "ativa");

export function reserveStats(reserves: Reserve[], ym: string) {
  const act = activeReserves(reserves);
  return {
    total: act.reduce((a, r) => a + Number(r.amount), 0),
    thisMonth: act.filter((r) => inMonth(r.date, ym)).reduce((a, r) => a + Number(r.amount), 0),
    goals: new Set(act.map((r) => r.goal_id).filter(Boolean)).size,
  };
}

const OPEN_PAY = new Set(["pendente", "atrasado", "parcial"]);

/** Contas do mês, vencimentos em 7 dias, atrasadas e dívidas ativas. */
export function billStats(payables: Payable[], debts: Debt[], ym: string, today = localISODate()) {
  const in7 = localISODate(new Date(new Date(`${today}T12:00:00`).getTime() + 7 * 864e5));
  const open = payables.filter((p) => OPEN_PAY.has(p.status));
  const pick = (l: Payable[]) => ({ n: l.length, v: l.reduce((a, p) => a + Number(p.amount), 0) });
  const activeDebts = debts.filter((d) => d.status === "ativa" || d.status === "atrasada" || d.status === "renegociada");
  const debtIds = new Set(activeDebts.map((d) => d.id));
  return {
    month: pick(payables.filter((p) => inMonth(p.due_date, ym))),
    next7: pick(open.filter((p) => p.due_date >= today && p.due_date <= in7)),
    late: pick(open.filter((p) => p.due_date < today)),
    debts: { n: activeDebts.length, v: open.filter((p) => p.debt_id && debtIds.has(p.debt_id)).reduce((a, p) => a + Number(p.amount), 0) },
  };
}

/* ------------------------------ Gráficos ------------------------------ */

export const CHART_COLORS = ["#0D47A1", "#26C6DA", "#059669", "#F59E0B", "#7C3AED", "#E11D48", "#64748B"];

export interface Slice { name: string; value: number; color: string }

/** Saídas do mês por categoria: as 6 maiores + "Outras". */
export function categoryAllocation(monthTx: Transaction[], categories: FinCategory[]): Slice[] {
  const m = new Map<string, number>();
  for (const t of ofType(monthTx, "saida")) m.set(t.category_id ?? "", (m.get(t.category_id ?? "") ?? 0) + Number(t.amount));
  const all = [...m.entries()].map(([id, value]) => ({ name: categories.find((c) => c.id === id)?.name ?? "Sem categoria", value }))
    .sort((a, b) => b.value - a.value);
  const top = all.slice(0, 6);
  const rest = all.slice(6).reduce((a, x) => a + x.value, 0);
  if (rest > 0) top.push({ name: "Outras", value: rest });
  return top.map((s, i) => ({ ...s, color: s.name === "Outras" ? CHART_COLORS[6] : CHART_COLORS[i % 6] }));
}

export interface FlowPoint { mes: string; "A pagar (previsto)": number; "Pago": number; "A receber (previsto)": number; "Recebido": number }

/** Fluxo de contas, planejado x real: 3 meses para trás, o atual e o próximo. */
export function billsFlow(payables: Payable[], receivables: Receivable[], ym: string): FlowPoint[] {
  const months = [-3, -2, -1, 0, 1].map((n) => shiftMonth(ym, n));
  const sum = <T>(l: T[], val: (x: T) => number) => l.reduce((a, x) => a + val(x), 0);
  return months.map((m) => ({
    mes: monthShort(m),
    "A pagar (previsto)": sum(payables.filter((p) => inMonth(p.due_date, m)), (p) => Number(p.amount)),
    "Pago": sum(payables.filter((p) => p.status === "pago" && inMonth(p.paid_date ?? p.due_date, m)), (p) => Number(p.amount)),
    "A receber (previsto)": sum(receivables.filter((r) => inMonth(r.expected_date, m)), (r) => Number(r.amount)),
    "Recebido": sum(receivables.filter((r) => r.status === "recebido" && inMonth(r.received_date ?? r.expected_date, m)), (r) => Number(r.amount)),
  }));
}

/** Cor mais escura (amount > 0) ou mais clara (amount < 0), para o efeito 3D dos gráficos. */
export function shade(hex: string, amount = 0.35) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.min(255, Math.max(0, Math.round(c * (1 - amount))));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/* ------------------------------ Metas ------------------------------ */

export const GOAL_KIND_LABEL: Record<FinGoal["kind"], string> = {
  reserva: "Reserva para um objetivo", emergencia: "Reserva de emergência",
  faturamento: "Meta de faturamento", independencia: "Independência financeira",
};

/** Este mês, reservado (ou faturado), quanto falta e % da meta. */
export function goalStats(g: FinGoal, reserves: Reserve[], ym: string, monthIncome: number) {
  const target = Number(g.target);
  const mine = activeReserves(reserves).filter((r) => r.goal_id === g.id);
  const thisMonth = g.kind === "faturamento" ? monthIncome : mine.filter((r) => inMonth(r.date, ym)).reduce((a, r) => a + Number(r.amount), 0);
  const reserved = g.kind === "faturamento" ? monthIncome : mine.reduce((a, r) => a + Number(r.amount), 0);
  const missing = Math.max(0, target - reserved);
  const pct = target > 0 ? Math.min(100, Math.round((reserved / target) * 100)) : 0;
  return { target, thisMonth, reserved, missing, pct };
}

/* ------------------------------ Pró-labore ------------------------------ */

export interface ProLaboreSettings {
  amount: number | null; fromBusiness: string | null; toBusiness: string | null;
  fromAccount: string | null; toAccount: string | null;
}

export function readProLabore(raw: unknown): ProLaboreSettings {
  const r = (raw ?? {}) as Partial<ProLaboreSettings>;
  return {
    amount: typeof r.amount === "number" ? r.amount : null, fromBusiness: r.fromBusiness ?? null,
    toBusiness: r.toBusiness ?? null, fromAccount: r.fromAccount ?? null, toAccount: r.toAccount ?? null,
  };
}

export const PRO_LABORE_OUT = "Pró-labore";
/** Marca os dois lançamentos do pró-labore (na visão consolidada eles se anulam). */
export const PRO_LABORE_SOURCE = "prolabore";
export const PRO_LABORE_IN = "Salário / Pró-labore";

export interface ProLaboreInput extends ProLaboreSettings { amount: number; date: string }

/**
 * Pró-labore = saída no negócio (uso "negócio") + entrada no pessoal (uso "pessoal"),
 * para o resultado da empresa e o orçamento pessoal ficarem certos.
 */
export function proLaboreRows(p: ProLaboreInput, cats: { out: string | null; in: string | null }) {
  const base = { amount: p.amount, date: p.date, method: "Transferência", status: "pago", source_type: PRO_LABORE_SOURCE };
  return [
    { ...base, type: "saida", description: "Pró-labore", business_id: p.fromBusiness, account_id: p.fromAccount, category_id: cats.out, use_type: "negocio", essential: false },
    { ...base, type: "entrada", description: "Pró-labore recebido", business_id: p.toBusiness, account_id: p.toAccount, category_id: cats.in, use_type: "pessoal", essential: false },
  ];
}

/** Pró-labore pago no mês (saídas da categoria Pró-labore). */
export function proLaboreInMonth(monthTx: Transaction[], categories: FinCategory[]) {
  const cat = categories.find((c) => c.name === PRO_LABORE_OUT && c.kind === "saida");
  return cat ? sumAmount(ofType(monthTx, "saida").filter((t) => t.category_id === cat.id)) : 0;
}
