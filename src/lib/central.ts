// Central do dia: junta o que precisa de você (tarefas, contas, CRM, marketing, prospecção, agenda)
// numa lista só, com origem e prazo. Sem React: só regras.
import type {
  Appointment, AssistantDraft, Contact, ContentItem, Delivery, Payable, Proposal, Prospect, Receivable, Task,
} from "@/integrations/supabase/types";
import type { AssistantSettings, SourceKey } from "@/lib/assistant";
import { brl, localISODate } from "@/lib/format";
import { shortDate } from "@/lib/labels";

export type ItemSource = SourceKey | "rascunho";

export interface CentralItem {
  id: string; source: ItemSource; title: string; detail: string | null;
  /** Data (yyyy-mm-dd) ou data-hora ISO do prazo; null = sem prazo. */
  due: string | null; late: boolean; businessId: string | null; href: string;
}

export const SOURCE_TAG: Record<ItemSource, { label: string; tone: string }> = {
  tarefas: { label: "Tarefa", tone: "bg-primary/10 text-primary" },
  financeiro: { label: "Financeiro", tone: "bg-success/10 text-success" },
  followups: { label: "CRM", tone: "bg-info/10 text-info" },
  propostas: { label: "Proposta", tone: "bg-info/10 text-info" },
  entregas: { label: "Entrega", tone: "bg-warning/15 text-warning" },
  conteudo: { label: "Conteúdo", tone: "bg-violet-500/10 text-violet-600" },
  prospects: { label: "Prospecção", tone: "bg-brand-cyan/15 text-brand-blue" },
  compromissos: { label: "Agenda", tone: "bg-muted text-foreground" },
  rascunho: { label: "Rascunho", tone: "bg-muted text-muted-foreground" },
};

export interface CentralInput {
  tasks: Task[]; payables: Payable[]; receivables: Receivable[]; contacts: Contact[]; proposals: Proposal[];
  deliveries: Delivery[]; content: ContentItem[]; prospects: Prospect[]; appointments: Appointment[]; drafts: AssistantDraft[];
}

const addDays = (iso: string, n: number) => localISODate(new Date(new Date(`${iso}T12:00:00`).getTime() + n * 864e5));
const day = (iso: string | null | undefined) => (iso ? localISODate(new Date(iso)) : null);

/* ------------------------------ Fontes ------------------------------ */

type Ctx = { today: string; s: AssistantSettings };
type Rule = (i: CentralInput, c: Ctx) => CentralItem[];

const tasks: Rule = ({ tasks: list }, { today }) => list
  .filter((t) => t.status !== "concluida" && !t.deleted_at && (t.my_day_date === today || (t.due_date != null && t.due_date <= today) || (day(t.reminder_at) ?? "9") <= today))
  .map((t) => ({
    id: `t-${t.id}`, source: "tarefas", title: t.title, detail: t.reminder_at ? `Lembrete ${new Date(t.reminder_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : null,
    due: t.due_date ?? today, late: Boolean(t.due_date && t.due_date < today), businessId: t.business_id, href: "/tarefas",
  }));

const OPEN_PAY = new Set(["pendente", "atrasado", "parcial"]);

const money: Rule = ({ payables, receivables }, { today }) => {
  const limit = addDays(today, 3);
  const pay = payables.filter((p) => OPEN_PAY.has(p.status) && p.due_date <= limit).map((p): CentralItem => ({
    id: `p-${p.id}`, source: "financeiro", title: `Pagar: ${p.title}`, detail: brl(Number(p.amount)), due: p.due_date,
    late: p.due_date < today, businessId: p.business_id, href: "/financeiro/contas?tipo=pagar",
  }));
  const rec = receivables.filter((r) => r.status !== "recebido" && r.status !== "cancelado" && r.expected_date <= limit).map((r): CentralItem => ({
    id: `r-${r.id}`, source: "financeiro", title: `Receber: ${r.title}`, detail: brl(Number(r.amount)), due: r.expected_date,
    late: r.expected_date < today, businessId: r.business_id, href: "/financeiro/contas?tipo=receber",
  }));
  return [...pay, ...rec];
};

const followups: Rule = ({ contacts }, { today }) => contacts
  .filter((k) => !k.deleted_at && k.status !== "perdido" && k.next_contact_at && (day(k.next_contact_at) as string) <= today)
  .map((k) => ({
    id: `c-${k.id}`, source: "followups", title: `Falar com ${k.name}`, detail: k.next_action, due: day(k.next_contact_at),
    late: (day(k.next_contact_at) as string) < today, businessId: k.business_id, href: "/comercial?aba=clientes",
  }));

const proposals: Rule = ({ proposals: list, contacts }, { today, s }) => {
  const names = new Map(contacts.map((c) => [c.id, c.name]));
  const limit = addDays(today, -s.diasProposta);
  return list.filter((p) => (p.status === "enviada" || p.status === "em_negociacao") && (day(p.sent_at ?? p.created_at) as string) <= limit)
    .map((p) => ({
      id: `pr-${p.id}`, source: "propostas", title: `Proposta parada: ${p.title}`, detail: names.get(p.contact_id) ?? null,
      due: day(p.sent_at ?? p.created_at), late: true, businessId: p.business_id, href: "/comercial?aba=propostas",
    }));
};

const DELIVERY_DONE = new Set(["aprovado", "publicado"]);

const deliveries: Rule = ({ deliveries: list }, { today }) => {
  const limit = addDays(today, 1);
  return list.filter((d) => !DELIVERY_DONE.has(d.status) && ((d.due_date != null && d.due_date <= limit) || d.status === "reprovado"))
    .map((d) => ({
      id: `d-${d.id}`, source: "entregas", title: d.title, detail: d.status === "reprovado" ? "Cliente reprovou" : null, due: d.due_date,
      late: Boolean(d.due_date && d.due_date < today), businessId: d.business_id, href: "/marketing/entregas",
    }));
};

const content: Rule = ({ content: list }, { today }) => list
  .filter((c) => c.stage !== "publicado" && c.stage !== "pausado" && (day(c.publish_at) === today || c.recording_at === today))
  .map((c) => ({
    id: `m-${c.id}`, source: "conteudo", title: c.title, detail: c.recording_at === today ? "Gravar hoje" : "Publicar hoje",
    due: today, late: false, businessId: c.business_id, href: "/marketing?aba=conteudo",
  }));

const prospects: Rule = ({ prospects: list }) => list.filter((p) => p.status === "Para abordar").slice(0, 10)
  .map((p) => ({
    id: `pp-${p.id}`, source: "prospects", title: `Abordar ${p.name}`, detail: [p.category, p.city].filter(Boolean).join(" · ") || null,
    due: null, late: false, businessId: null, href: "/prospeccao?aba=lista",
  }));

const agenda: Rule = ({ appointments }, { today }) => appointments
  .filter((a) => day(a.starts_at) === today && new Date(a.ends_at ?? a.starts_at).getTime() >= Date.now() - 30 * 60000)
  .map((a) => ({
    id: `a-${a.id}`, source: "compromissos", title: a.title,
    detail: [new Date(a.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), a.location].filter(Boolean).join(" · "),
    due: a.starts_at, late: false, businessId: a.business_id, href: "/hoje#agenda",
  }));

const RULES: Record<SourceKey, Rule> = {
  tarefas: tasks, financeiro: money, followups, propostas: proposals, entregas: deliveries, conteudo: content, prospects, compromissos: agenda,
};

/** Lista única "Precisa de mim": atrasados primeiro, depois por prazo; sem prazo no fim. */
export function needsMe(input: CentralInput, s: AssistantSettings, today = localISODate()): CentralItem[] {
  const ctx = { today, s };
  const all = (Object.keys(RULES) as SourceKey[]).filter((k) => s.fontes[k]).flatMap((k) => RULES[k](input, ctx));
  return all.sort((a, b) => Number(b.late) - Number(a.late) || (a.due ?? "9999").localeCompare(b.due ?? "9999"));
}

/** "Já tratado hoje": tarefas concluídas, contas pagas/recebidas e rascunhos decididos hoje. */
export function handledToday(i: CentralInput, today = localISODate()) {
  return [
    ...i.tasks.filter((t) => t.status === "concluida" && day(t.completed_at) === today).map((t) => ({ id: `t-${t.id}`, title: t.title, source: "tarefas" as ItemSource })),
    ...i.payables.filter((p) => p.status === "pago" && p.paid_date === today).map((p) => ({ id: `p-${p.id}`, title: `Pago: ${p.title}`, source: "financeiro" as ItemSource })),
    ...i.receivables.filter((r) => r.status === "recebido" && r.received_date === today).map((r) => ({ id: `r-${r.id}`, title: `Recebido: ${r.title}`, source: "financeiro" as ItemSource })),
    ...i.drafts.filter((d) => d.status === "aprovado" && day(d.decided_at) === today).map((d) => ({ id: `x-${d.id}`, title: `Enviado: ${d.title}`, source: "rascunho" as ItemSource })),
  ];
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function overview(items: CentralItem[], drafts: number) {
  const late = items.filter((i) => i.late).length;
  const agenda = items.filter((i) => i.source === "compromissos").length;
  const parts = [plural(items.length, "item esperando", "itens esperando")];
  if (late) parts.push(plural(late, "atrasado", "atrasados"));
  if (agenda) parts.push(plural(agenda, "compromisso", "compromissos"));
  if (drafts) parts.push(plural(drafts, "rascunho para aprovar", "rascunhos para aprovar"));
  return { late, line: `${late > 2 ? "Dia apertado" : "Dia sob controle"}: ${parts.join(", ")}.` };
}

function soonLine(items: CentralItem[], late: number, today: string) {
  const soon = items.find((i) => !i.late && i.due && i.due.slice(0, 10) > today && i.due.slice(0, 10) <= addDays(today, 1));
  if (soon) return `Prestes a atrasar: ${soon.title} (${shortDate(soon.due)}).`;
  return late ? "Resolva os atrasados antes de puxar coisa nova." : "Nada prestes a atrasar.";
}

/** Resumo em até 3 linhas: como está o dia, a coisa mais importante, o que está prestes a atrasar. */
export function summary(items: CentralItem[], drafts: number, today = localISODate()): string[] {
  if (!items.length && !drafts) return ["Dia tranquilo: nada esperando por você agora.", "", ""];
  const o = overview(items, drafts);
  const top = items[0];
  return [o.line, top ? `Mais importante: ${top.title}${top.late ? " (atrasado)" : ""}.` : "", soonLine(items, o.late, today)];
}
