// TikTok Shop (criador/afiliado): ritmo do mês, quanto falta por dia e o que está vendendo.
// Tudo manual: você lança o resultado do dia e dos vídeos; nada vem da API do TikTok.
import type { TtsDay, TtsProduct, TtsProductStatus, TtsSampleStatus, TtsSettings, TtsVideo, TtsVideoStatus } from "@/integrations/supabase/types";

export const TTS_DEFAULTS: Omit<TtsSettings, "workspace_id"> = {
  month_goal: 3000, avg_commission_pct: 15, avg_price: 80, orders_per_video: 0.5, videos_per_day_goal: 3, lives_per_week_goal: 2,
};

export const SAMPLE_LABEL: Record<TtsSampleStatus, string> = {
  quero: "Quero pedir", solicitada: "Amostra pedida", a_caminho: "A caminho", recebida: "Recebida", sem_amostra: "Sem amostra",
};
export const PRODUCT_STATUS: { value: TtsProductStatus; label: string; tone: string }[] = [
  { value: "ideia", label: "Ideia", tone: "bg-muted text-muted-foreground" },
  { value: "testando", label: "Testando", tone: "bg-primary/10 text-primary" },
  { value: "vencedor", label: "Vencedor", tone: "bg-success/15 text-success" },
  { value: "pausado", label: "Pausado", tone: "bg-warning/15 text-warning" },
  { value: "descartado", label: "Descartado", tone: "bg-destructive/10 text-destructive" },
];
export const VIDEO_STATUS: { value: TtsVideoStatus; label: string }[] = [
  { value: "ideia", label: "Ideia" }, { value: "roteiro", label: "Roteiro" }, { value: "gravado", label: "Gravado" },
  { value: "editado", label: "Editado" }, { value: "postado", label: "Postado" },
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sum = <T,>(list: T[], f: (x: T) => number) => list.reduce((a, x) => a + (Number(f(x)) || 0), 0);

export interface MonthPace {
  goal: number; done: number; remaining: number; pct: number;
  daysInMonth: number; dayOfMonth: number; daysLeft: number;
  perDay: number;            // comissão que falta por dia (contando hoje)
  expectedByToday: number;   // onde deveria estar se fosse linear
  commissionPerOrder: number;
  ordersPerDay: number;      // vendas por dia que faltam
  videosPerDay: number;      // vídeos por dia para chegar lá (pelas vendas por vídeo)
  ordersPerVideo: number;    // real do mês, ou a estimativa
  gmv: number; orders: number; videos: number; lives: number; activeDays: number;
}

/** Ritmo do mês a partir do diário. */
export function monthPace(days: TtsDay[], s: Omit<TtsSettings, "workspace_id">, today = new Date()): MonthPace {
  const ym = iso(today).slice(0, 7);
  const month = days.filter((d) => d.day.startsWith(ym));
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const daysLeft = daysInMonth - dayOfMonth + 1;
  const done = sum(month, (d) => d.commission);
  const orders = sum(month, (d) => d.orders);
  const videos = sum(month, (d) => d.videos_posted);
  const goal = Number(s.month_goal) || 0;
  const remaining = Math.max(0, goal - done);
  const commissionPerOrder = orders > 0 ? done / orders : (Number(s.avg_price) * Number(s.avg_commission_pct)) / 100;
  const ordersPerVideo = videos >= 10 && orders > 0 ? orders / videos : Number(s.orders_per_video) || 0;
  const perDay = remaining / Math.max(1, daysLeft);
  const ordersPerDay = commissionPerOrder > 0 ? perDay / commissionPerOrder : 0;
  return {
    goal, done, remaining, pct: goal > 0 ? Math.min(100, (done / goal) * 100) : 0,
    daysInMonth, dayOfMonth, daysLeft, perDay, expectedByToday: (goal / daysInMonth) * (dayOfMonth - 1),
    commissionPerOrder, ordersPerDay, videosPerDay: ordersPerVideo > 0 ? ordersPerDay / ordersPerVideo : 0, ordersPerVideo,
    gmv: sum(month, (d) => d.gmv), orders, videos, lives: sum(month, (d) => d.lives), activeDays: month.filter((d) => d.videos_posted > 0 || d.lives > 0).length,
  };
}

/** Dias seguidos com pelo menos 1 vídeo ou live (até ontem conta; hoje conta se já lançou). */
export function postingStreak(days: TtsDay[], today = new Date()): number {
  const active = new Set(days.filter((d) => d.videos_posted > 0 || d.lives > 0).map((d) => d.day));
  const d = new Date(today);
  if (!active.has(iso(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (active.has(iso(d))) { n += 1; d.setDate(d.getDate() - 1); }
  return n;
}

/** Últimos N dias para o gráfico (com zero nos dias sem lançamento). */
export function lastDays(days: TtsDay[], n = 14, today = new Date()) {
  const by = new Map(days.map((d) => [d.day, d]));
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (n - 1 - i));
    const k = iso(d);
    return { day: k, label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, commission: Number(by.get(k)?.commission ?? 0), videos: by.get(k)?.videos_posted ?? 0 };
  });
}

export interface ProductRank { product: TtsProduct; videos: number; posted: number; orders: number; commission: number; views: number }

/** Produtos ordenados pela comissão que os vídeos trouxeram. */
export function productRanking(products: TtsProduct[], videos: TtsVideo[]): ProductRank[] {
  return products.map((p) => {
    const v = videos.filter((x) => x.product_id === p.id);
    return {
      product: p, videos: v.length, posted: v.filter((x) => x.status === "postado").length,
      orders: sum(v, (x) => x.orders), commission: sum(v, (x) => x.commission), views: sum(v, (x) => x.views),
    };
  }).sort((a, b) => b.commission - a.commission || b.orders - a.orders);
}

/** Comissão estimada por venda de um produto. */
export const commissionPerSale = (p: Pick<TtsProduct, "price" | "commission_pct">) =>
  p.price && p.commission_pct ? (Number(p.price) * Number(p.commission_pct)) / 100 : null;

export const todayISO = () => iso(new Date());
