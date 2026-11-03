// Fluxo de caixa: saldo projetado dia a dia a partir do saldo das contas, das contas a pagar/receber
// (com as repetições projetadas) e da fatura atual dos cartões. Sem React.
import type { BillRecurrence, CreditCard, Payable, Receivable } from "@/integrations/supabase/types";
import { localISODate } from "@/lib/format";
import { openAmount } from "@/lib/finance";

export interface CashEvent {
  key: string; date: string; kind: "entrada" | "saida"; title: string; amount: number;
  /** Ocorrência futura calculada a partir de uma conta que se repete (ainda não existe no banco). */
  projected: boolean; late: boolean; billId: string | null; billKind: "pagar" | "receber" | null;
  /** Conta bancária já definida na conta a pagar/receber (null = escolher ao dar baixa). */
  accountId: string | null;
}

export interface CashDay { date: string; inMonth: boolean; events: CashEvent[]; in: number; out: number; balance: number | null; past: boolean }

const OPEN_PAY = new Set(["pendente", "atrasado", "parcial"]);
const OPEN_REC = new Set(["previsto", "atrasado", "parcial"]);

const iso = (d: Date) => localISODate(d);
const parse = (s: string) => new Date(`${s}T12:00:00`);
const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate();

/** Próxima data de uma conta que se repete (mensal mantém o dia; dia 31 vira o último dia do mês). */
export function nextDate(date: string, r: BillRecurrence, anchorDay: number): string {
  const d = parse(date);
  if (r === "weekly") return iso(new Date(d.getTime() + 7 * 864e5));
  const months = r === "yearly" ? 12 : 1;
  const y = d.getFullYear(), m = d.getMonth() + months;
  return iso(new Date(y, m, Math.min(anchorDay, lastDay(y, m))));
}

type Bill = { id: string; title: string; amount: number; date: string; recurrence: BillRecurrence; kind: "pagar" | "receber"; accountId: string | null };

/** Ocorrências de uma conta até a data limite (a real + as repetições projetadas). */
function occurrences(b: Bill, until: string, today: string): CashEvent[] {
  const out: CashEvent[] = [];
  const anchor = parse(b.date).getDate();
  let date = b.date;
  for (let i = 0; date <= until && i < 400; i++) {
    out.push({
      key: `${b.id}-${i}`, date: date < today ? today : date, kind: b.kind === "pagar" ? "saida" : "entrada", title: b.title,
      amount: b.amount, projected: i > 0, late: date < today, billId: i === 0 ? b.id : null, billKind: b.kind, accountId: b.accountId,
    });
    if (b.recurrence === "none") break;
    date = nextDate(date, b.recurrence, anchor);
  }
  return out;
}

/** Próximo vencimento da fatura de um cartão (a partir de hoje). */
export function nextDueDate(card: Pick<CreditCard, "due_day">, today: string): string | null {
  if (!card.due_day) return null;
  const t = parse(today);
  const y = t.getFullYear(), m = t.getMonth();
  const thisMonth = iso(new Date(y, m, Math.min(card.due_day, lastDay(y, m))));
  return thisMonth >= today ? thisMonth : iso(new Date(y, m + 1, Math.min(card.due_day, lastDay(y, m + 1))));
}

export interface CashInput {
  startBalance: number; payables: Payable[]; receivables: Receivable[];
  invoices: { card: CreditCard; total: number }[];
}

/** Todos os eventos de hoje até a data limite. Atrasados entram hoje (ainda precisam ser pagos/recebidos). */
export function cashEvents(i: CashInput, until: string, today = localISODate()): CashEvent[] {
  const bills: Bill[] = [
    ...i.payables.filter((p) => OPEN_PAY.has(p.status)).map((p) => ({ id: p.id, title: p.title, amount: openAmount(p), date: p.due_date, recurrence: p.recurrence, kind: "pagar" as const, accountId: p.account_id })),
    ...i.receivables.filter((r) => OPEN_REC.has(r.status)).map((r) => ({ id: r.id, title: r.title, amount: Number(r.amount), date: r.expected_date, recurrence: r.recurrence, kind: "receber" as const, accountId: r.account_id })),
  ];
  const cards = i.invoices.filter((x) => x.total > 0).flatMap((x): CashEvent[] => {
    const date = nextDueDate(x.card, today);
    return date && date <= until ? [{ key: `card-${x.card.id}`, date, kind: "saida", title: `Fatura ${x.card.name} (atual)`, amount: x.total, projected: true, late: false, billId: null, billKind: null, accountId: null }] : [];
  });
  return [...bills.flatMap((b) => occurrences(b, until, today)), ...cards].sort((a, b) => a.date.localeCompare(b.date));
}

/** Primeiro e último dia da grade do mês (de domingo a sábado). */
function gridBounds(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(y, m - 1, 1 - first.getDay());
  const end = new Date(y, m, 0);
  end.setDate(end.getDate() + (6 - end.getDay()));
  return { start, end };
}

const sumKind = (ev: CashEvent[], kind: CashEvent["kind"]) => ev.filter((e) => e.kind === kind).reduce((a, e) => a + e.amount, 0);

/** Semanas (dom→sáb) do mês com o saldo projetado no fim de cada dia (de hoje em diante). */
export function cashMonth(i: CashInput, ym: string, today = localISODate()): { weeks: CashDay[][]; summary: CashSummary } {
  const { start, end } = gridBounds(ym);
  const events = cashEvents(i, iso(end), today);
  const byDate = new Map<string, CashEvent[]>();
  events.forEach((e) => byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]));
  // Mês futuro: o que cai entre hoje e o início da grade já mexe no saldo.
  const startIso = iso(start);
  let balance = i.startBalance + events.filter((e) => e.date >= today && e.date < startIso)
    .reduce((a, e) => a + (e.kind === "entrada" ? e.amount : -e.amount), 0);
  const days: CashDay[] = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = iso(d);
    const ev = byDate.get(date) ?? [];
    const inn = sumKind(ev, "entrada"), out = sumKind(ev, "saida"), past = date < today;
    if (!past) balance += inn - out;
    days.push({ date, inMonth: date.startsWith(ym), events: ev, in: inn, out, past, balance: past ? null : Math.round(balance * 100) / 100 });
  }
  const weeks = Array.from({ length: days.length / 7 }, (_, w) => days.slice(w * 7, w * 7 + 7));
  return { weeks, summary: summarize(days.filter((d) => d.inMonth), i.startBalance) };
}

export interface CashSummary { today: number; in: number; out: number; final: number | null; lowest: { date: string; balance: number } | null; negativeDays: number }

function summarize(month: CashDay[], start: number): CashSummary {
  const ahead = month.filter((d) => !d.past);
  const lowest = ahead.reduce<CashDay | null>((lo, d) => (d.balance != null && (lo == null || d.balance < (lo.balance as number)) ? d : lo), null);
  return {
    today: start, in: ahead.reduce((a, d) => a + d.in, 0), out: ahead.reduce((a, d) => a + d.out, 0),
    final: ahead.length ? ahead[ahead.length - 1].balance : null,
    lowest: lowest ? { date: lowest.date, balance: lowest.balance as number } : null,
    negativeDays: ahead.filter((d) => (d.balance ?? 0) < 0).length,
  };
}
