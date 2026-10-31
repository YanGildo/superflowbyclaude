// Marketing: etapas, rótulos, KPIs, métricas de campanha e calendário.
import type { Campaign, CampaignStatus, ContentItem, ContentStage, Delivery, DeliveryStatus } from "@/integrations/supabase/types";
import { localISODate } from "@/lib/format";

export const CONTENT_STAGE: Record<ContentStage, { label: string; tone: string; color: string }> = {
  ideia:     { label: "Ideia",     tone: "bg-muted text-muted-foreground",    color: "#94A3B8" },
  roteiro:   { label: "Roteiro",   tone: "bg-info/10 text-info",              color: "#38BDF8" },
  gravacao:  { label: "Gravação",  tone: "bg-warning/15 text-warning",        color: "#F59E0B" },
  edicao:    { label: "Edição",    tone: "bg-primary/10 text-primary",        color: "#2563EB" },
  revisao:   { label: "Revisão",   tone: "bg-warning/15 text-warning",        color: "#F97316" },
  aprovado:  { label: "Aprovado",  tone: "bg-success/10 text-success",        color: "#22C55E" },
  publicado: { label: "Publicado", tone: "bg-success/15 text-success",        color: "#16A34A" },
  pausado:   { label: "Pausado",   tone: "bg-muted text-muted-foreground",    color: "#64748B" },
};
export const CONTENT_STAGES = Object.keys(CONTENT_STAGE) as ContentStage[];
export const STAGE_OPTIONS = CONTENT_STAGES.map((s) => ({ value: s, label: CONTENT_STAGE[s].label }));

export const CONTENT_KINDS = ["Post", "Carrossel", "Reels", "Story", "Vídeo", "Anúncio", "Copy", "Roteiro", "Ação"];
/** Tipos que entram em "Produção de Vídeos". */
export const VIDEO_KINDS = new Set(["Reels", "Vídeo"]);
export const isVideo = (c: Pick<ContentItem, "kind">) => VIDEO_KINDS.has(c.kind);

export const MKT_CHANNELS = ["Instagram", "TikTok", "YouTube", "Facebook", "LinkedIn", "WhatsApp", "Telegram", "Blog", "E-mail"];
export const PLATFORMS = ["Meta Ads", "Google Ads", "TikTok Ads", "YouTube", "LinkedIn Ads", "Orgânico", "Telegram"];
export const OBJECTIVES = ["Leads", "Vendas", "Mensagens", "Tráfego", "Reconhecimento", "Engajamento"];

export const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; tone: string }> = {
  planejada: { label: "Planejada", tone: "bg-muted text-muted-foreground" },
  ativa:     { label: "Ativa",     tone: "bg-success/10 text-success" },
  pausada:   { label: "Pausada",   tone: "bg-warning/15 text-warning" },
  encerrada: { label: "Encerrada", tone: "bg-muted text-muted-foreground" },
};
export const CAMPAIGN_STATUS_OPTIONS = (Object.keys(CAMPAIGN_STATUS) as CampaignStatus[]).map((s) => ({ value: s, label: CAMPAIGN_STATUS[s].label }));

export const DELIVERY_STATUS: Record<DeliveryStatus, { label: string; tone: string }> = {
  pendente:        { label: "Pendente",          tone: "bg-muted text-muted-foreground" },
  em_producao:     { label: "Em produção",       tone: "bg-primary/10 text-primary" },
  em_revisao:      { label: "Em revisão",        tone: "bg-warning/15 text-warning" },
  enviado_cliente: { label: "Enviado ao cliente", tone: "bg-info/10 text-info" },
  aprovado:        { label: "Aprovado",          tone: "bg-success/10 text-success" },
  reprovado:       { label: "Reprovado",         tone: "bg-destructive/10 text-destructive" },
  publicado:       { label: "Publicado",         tone: "bg-success/15 text-success" },
};
export const DELIVERY_STATUSES = Object.keys(DELIVERY_STATUS) as DeliveryStatus[];
export const DELIVERY_STATUS_OPTIONS = DELIVERY_STATUSES.map((s) => ({ value: s, label: DELIVERY_STATUS[s].label }));
export const DELIVERY_TYPES = ["Post", "Carrossel", "Vídeo", "Reels", "Criativo de anúncio", "Landing page", "Site", "Relatório", "Identidade visual", "Outro"];
const DELIVERY_DONE = new Set<DeliveryStatus>(["aprovado", "publicado"]);
export const deliveryOpen = (d: Pick<Delivery, "status">) => !DELIVERY_DONE.has(d.status);
export const deliveryLate = (d: Pick<Delivery, "status" | "due_date">, today = localISODate()) =>
  deliveryOpen(d) && Boolean(d.due_date) && (d.due_date as string) < today;

/** Grupos da Produção de Vídeos. */
export const VIDEO_GROUPS: { id: string; label: string; stages: ContentStage[] }[] = [
  { id: "ideias", label: "Ideias / roteiros", stages: ["ideia", "roteiro"] },
  { id: "gravar", label: "Aguardando gravação", stages: ["gravacao"] },
  { id: "producao", label: "Em produção", stages: ["edicao", "revisao", "aprovado"] },
  { id: "publicados", label: "Publicados", stages: ["publicado"] },
];

const IN_PRODUCTION = new Set<ContentStage>(["roteiro", "gravacao", "edicao", "revisao", "aprovado"]);

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localISODate(d);
};

/** Data que o item ocupa no calendário: publicação, senão prazo, senão gravação. */
export const contentDate = (c: Pick<ContentItem, "publish_at" | "due_date" | "recording_at">) =>
  (c.publish_at ?? c.due_date ?? c.recording_at)?.slice(0, 10) ?? null;

export function marketingKpis(items: ContentItem[], today = localISODate()) {
  const week = addDays(today, 7);
  const ym = today.slice(0, 7);
  let ideas = 0; let production = 0; let next7 = 0; let published = 0;
  for (const c of items) {
    if (c.stage === "ideia") ideas++;
    if (IN_PRODUCTION.has(c.stage)) production++;
    const d = contentDate(c);
    if (c.stage !== "publicado" && d && d >= today && d <= week) next7++;
    if (c.stage === "publicado" && (d ?? c.updated_at.slice(0, 10)).slice(0, 7) === ym) published++;
  }
  return { ideas, production, next7, published };
}

/* ------------------------------ Campanhas ------------------------------ */

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

type Metrics = Pick<Campaign, "spend" | "impressions" | "clicks" | "leads" | "sales" | "revenue">;

export function campaignMetrics(c: Metrics) {
  return {
    ctr: ratio(c.clicks * 100, c.impressions),
    cpc: ratio(c.spend, c.clicks),
    cpl: ratio(c.spend, c.leads),
    cpa: ratio(c.spend, c.sales),
    roas: ratio(c.revenue, c.spend),
  };
}

export function campaignTotals(list: Metrics[]): Metrics {
  return list.reduce<Metrics>((t, c) => ({
    spend: t.spend + Number(c.spend), impressions: t.impressions + c.impressions, clicks: t.clicks + c.clicks,
    leads: t.leads + c.leads, sales: t.sales + c.sales, revenue: t.revenue + Number(c.revenue),
  }), { spend: 0, impressions: 0, clicks: 0, leads: 0, sales: 0, revenue: 0 });
}

/** Soma por plataforma (para o gráfico). */
export function byPlatform(list: Campaign[]) {
  const m = new Map<string, Metrics>();
  for (const c of list) m.set(c.platform, campaignTotals([m.get(c.platform) ?? campaignTotals([]), c]));
  return [...m.entries()].map(([platform, t]) => ({ platform, ...t }));
}

export type Period = "mes" | "30" | "90" | "tudo";
export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "mes", label: "Este mês" }, { value: "30", label: "Últimos 30 dias" },
  { value: "90", label: "Últimos 90 dias" }, { value: "tudo", label: "Tudo" },
];

function periodStart(p: Period, today: string): string | null {
  if (p === "tudo") return null;
  if (p === "mes") return `${today.slice(0, 7)}-01`;
  return addDays(today, -Number(p));
}

/** Campanha rodou em algum momento do período? */
export function inPeriod(c: Pick<Campaign, "start_date" | "end_date" | "created_at">, p: Period, today = localISODate()) {
  const from = periodStart(p, today);
  if (!from) return true;
  const start = c.start_date ?? c.created_at.slice(0, 10);
  return start <= today && (!c.end_date || c.end_date >= from);
}

export const DEMO_TAG = "[demonstração]";

/** Campanhas de exemplo para ver o dashboard funcionando antes de conectar Meta/Google. */
export function demoCampaigns(today = localISODate()): Partial<Campaign>[] {
  const start = addDays(today, -20);
  const rows: [string, string, string, number, number, number, number, number, number][] = [
    ["Leads — Ensaio com IA", "Meta Ads", "Leads", 850, 62000, 1480, 74, 9, 2610],
    ["Remarketing — Visitantes do site", "Meta Ads", "Vendas", 420, 31000, 690, 18, 6, 1740],
    ["Pesquisa — Agência de marketing", "Google Ads", "Leads", 1200, 18500, 940, 41, 5, 7500],
    ["YouTube — Vídeo institucional", "Google Ads", "Reconhecimento", 300, 54000, 380, 4, 0, 0],
    ["TikTok — Antes e depois", "TikTok Ads", "Mensagens", 260, 47000, 1120, 33, 3, 870],
  ];
  return rows.map(([name, platform, objective, spend, impressions, clicks, leads, sales, revenue]) => ({
    name, platform, objective, status: "ativa", spend, impressions, clicks, leads, sales, revenue,
    start_date: start, daily_budget: Math.round(spend / 20), notes: DEMO_TAG,
  }));
}

/* ------------------------------ Calendário ------------------------------ */

/** Semanas (domingo a sábado) que cobrem o mês "YYYY-MM"; dias fora do mês vêm como null. */
export function monthGrid(ym: string): (string | null)[][] {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const days = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
  for (let d = 1; d <= days; d++) cells.push(`${ym}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export interface CalendarEvent { id: string; date: string; title: string; color: string; kind: string; onOpen?: () => void }

export function groupByDate(events: CalendarEvent[]) {
  const m = new Map<string, CalendarEvent[]>();
  for (const e of events) m.set(e.date, [...(m.get(e.date) ?? []), e]);
  return m;
}
