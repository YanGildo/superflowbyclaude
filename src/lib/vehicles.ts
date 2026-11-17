// Veículos: manutenções com peças e valores, histórico e "última vez que fez".
import type { ServiceItem, Vehicle, VehicleService, VehicleServiceCategory } from "@/integrations/supabase/types";

export const SERVICE_CATEGORIES: { value: VehicleServiceCategory; label: string }[] = [
  { value: "manutencao", label: "Manutenção" }, { value: "revisao", label: "Revisão" }, { value: "pneus", label: "Pneus" },
  { value: "combustivel", label: "Combustível" }, { value: "documentacao", label: "Documentação / IPVA" }, { value: "seguro", label: "Seguro" },
  { value: "lavagem", label: "Lavagem" }, { value: "multa", label: "Multa" }, { value: "outros", label: "Outros" },
];
export const CATEGORY_LABEL = Object.fromEntries(SERVICE_CATEGORIES.map((c) => [c.value, c.label])) as Record<VehicleServiceCategory, string>;

export const itemTotal = (i: ServiceItem) => Math.max(0, (Number(i.qty) || 0) * (Number(i.unit) || 0) - (Number(i.discount) || 0));
export const itemsTotal = (items: ServiceItem[]) => items.reduce((a, i) => a + itemTotal(i), 0);

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export interface HistoryHit { service: VehicleService; item: ServiceItem | null; daysAgo: number }

/** Procura uma peça ou serviço no histórico ("amortecedor", "pastilha", "óleo"), do mais recente para o mais antigo. */
export function searchHistory(services: VehicleService[], term: string, today = new Date()): HistoryHit[] {
  const t = fold(term.trim());
  if (t.length < 2) return [];
  const daysAgo = (d: string) => Math.round((today.getTime() - new Date(`${d}T12:00:00`).getTime()) / 864e5);
  return services.flatMap((s): HistoryHit[] => {
    const items = s.items.filter((i) => fold(i.desc).includes(t));
    if (items.length) return items.map((item) => ({ service: s, item, daysAgo: daysAgo(s.date) }));
    const inText = [s.notes, s.shop, CATEGORY_LABEL[s.category]].some((x) => x && fold(x).includes(t));
    return inText ? [{ service: s, item: null, daysAgo: daysAgo(s.date) }] : [];
  });
}

export interface VehicleStats { total: number; year: number; last12: number; count: number; last: VehicleService | null; byCategory: [string, number][] }

export function vehicleStats(v: Vehicle, services: VehicleService[], today = new Date()): VehicleStats {
  const mine = services.filter((s) => s.vehicle_id === v.id);
  const y = String(today.getFullYear());
  const cut = new Date(today); cut.setFullYear(cut.getFullYear() - 1);
  const cutIso = cut.toISOString().slice(0, 10);
  const cats = new Map<string, number>();
  mine.forEach((s) => cats.set(s.category, (cats.get(s.category) ?? 0) + Number(s.total)));
  return {
    total: mine.reduce((a, s) => a + Number(s.total), 0),
    year: mine.filter((s) => s.date.startsWith(y)).reduce((a, s) => a + Number(s.total), 0),
    last12: mine.filter((s) => s.date >= cutIso).reduce((a, s) => a + Number(s.total), 0),
    count: mine.length,
    last: mine[0] ?? null,
    byCategory: [...cats.entries()].sort((a, b) => b[1] - a[1]),
  };
}

/** Próximas manutenções marcadas (por data ou km). */
export function upcoming(v: Vehicle, services: VehicleService[]) {
  return services.filter((s) => s.vehicle_id === v.id && (s.next_date || s.next_km))
    .map((s) => ({ s, kmLeft: s.next_km && v.current_km ? s.next_km - v.current_km : null }))
    .sort((a, b) => (a.s.next_date ?? "9999").localeCompare(b.s.next_date ?? "9999"));
}
