// Treino: níveis de evolução, avaliações físicas (dobras + bioimpedância + medidas), treinos e dieta.
import type { BodyAssessment, DietLog, Exercise, Meal, WorkoutLog } from "@/integrations/supabase/types";

/**
 * Níveis de evolução pelo % de gordura (tabela da sua avaliação: homens 26–35 anos, Pollock 7 dobras).
 * Nível 1 é o ponto de partida; cada faixa vencida é um nível acima.
 */
export interface Level { n: number; name: string; gym: string; min: number; max: number; color: string; tip: string }
export const LEVELS: Level[] = [
  { n: 1, name: "Ponto de partida", gym: "Muito ruim", min: 28, max: 36.9, color: "#ef4444", tip: "Constância acima de tudo: treinar 4x na semana e acertar a dieta 80% dos dias." },
  { n: 2, name: "Primeiros resultados", gym: "Ruim", min: 25, max: 27.9, color: "#f97316", tip: "A roupa já muda. Mantenha o déficit e aumente as cargas aos poucos." },
  { n: 3, name: "Em transformação", gym: "Abaixo da média", min: 22, max: 24.9, color: "#f59e0b", tip: "Hora de caprichar no cardio e no sono; a cintura cai rápido nessa fase." },
  { n: 4, name: "Na média", gym: "Média", min: 19, max: 21.9, color: "#eab308", tip: "Você já está na média. Foque em força nos básicos e proteína todo dia." },
  { n: 5, name: "Acima da média", gym: "Acima da média", min: 16, max: 18.9, color: "#84cc16", tip: "Os detalhes aparecem. Ajuste fino da dieta e periodização do treino." },
  { n: 6, name: "Atleta", gym: "Bom", min: 12, max: 15.9, color: "#22c55e", tip: "Definição visível. Manter é o novo jogo: rotina e recuperação." },
  { n: 7, name: "Elite", gym: "Excelente", min: 8, max: 11.9, color: "#14b8a6", tip: "Nível de competição. Só com acompanhamento e muita disciplina." },
];

export function levelOf(fat: number | null | undefined): Level | null {
  if (fat == null) return null;
  return LEVELS.find((l) => fat >= l.min) ?? (fat > 36.9 ? LEVELS[0] : LEVELS[LEVELS.length - 1]);
}

/** Quanto falta para o próximo nível, mantendo a massa magra de hoje. */
export function nextLevelTarget(a: Pick<BodyAssessment, "weight" | "fat_pct" | "lean_kg">) {
  const lv = levelOf(a.fat_pct);
  if (!lv || !a.weight || a.fat_pct == null) return null;
  const next = LEVELS.find((l) => l.n === lv.n + 1);
  if (!next) return { level: lv, next: null, targetFat: null, targetWeight: null, fatToLose: 0, progress: 100 };
  const lean = a.lean_kg ?? a.weight * (1 - a.fat_pct / 100);
  const targetFat = next.max;
  const targetWeight = lean / (1 - targetFat / 100);
  const span = lv.max - lv.min || 1;
  return {
    level: lv, next, targetFat, targetWeight,
    fatToLose: Math.max(0, a.weight - targetWeight),
    progress: Math.max(0, Math.min(100, ((lv.max - a.fat_pct) / span) * 100)),
  };
}

export const BMI_CLASSES = [
  { max: 16.99, label: "Muito abaixo do peso" }, { max: 18.49, label: "Abaixo do peso" }, { max: 24.99, label: "Peso normal" },
  { max: 29.99, label: "Acima do peso" }, { max: 34.99, label: "Obesidade I" }, { max: 39.99, label: "Obesidade II" }, { max: 999, label: "Obesidade III" },
];
export const bmi = (w?: number | null, h?: number | null) => (w && h ? w / (h * h) : null);
export const bmiClass = (v: number | null) => (v == null ? null : BMI_CLASSES.find((c) => v <= c.max)?.label ?? null);
/** Relação cintura/altura: acima de 0,5 indica gordura abdominal acima do ideal. */
export const waistHeight = (a: BodyAssessment) => (a.circumferences.cintura && a.height ? a.circumferences.cintura / (a.height * 100) : null);

/* ------------------------------ Medidas ------------------------------ */

export type Better = "down" | "up" | "none";
export interface Measure { key: string; label: string; better: Better; side?: "L" | "R" | "C"; x?: number; y?: number; short?: string }

/** Circunferências (cm). x/y = posição no boneco (viewBox 0 0 200 420). */
export const CIRCUMFERENCES: Measure[] = [
  { key: "torax", label: "Tórax", better: "none", side: "C", x: 100, y: 108 },
  { key: "braco_d_contraido", short: "Braço dir.", label: "Braço dir. contraído", better: "up", side: "L", x: 52, y: 128 },
  { key: "braco_e_contraido", short: "Braço esq.", label: "Braço esq. contraído", better: "up", side: "R", x: 148, y: 128 },
  { key: "braco_d_relaxado", label: "Braço dir. relaxado", better: "none" },
  { key: "braco_e_relaxado", label: "Braço esq. relaxado", better: "none" },
  { key: "antebraco_d", label: "Antebraço dir.", better: "up" },
  { key: "antebraco_e", label: "Antebraço esq.", better: "up" },
  { key: "cintura", label: "Cintura", better: "down", side: "C", x: 100, y: 160 },
  { key: "abdomen", label: "Abdômen", better: "down", side: "C", x: 100, y: 180 },
  { key: "quadril", label: "Quadril", better: "down", side: "C", x: 100, y: 205 },
  { key: "coxa_d", short: "Coxa dir.", label: "Coxa dir.", better: "none", side: "L", x: 82, y: 255 },
  { key: "coxa_e", short: "Coxa esq.", label: "Coxa esq.", better: "none", side: "R", x: 118, y: 255 },
  { key: "panturrilha_d", short: "Pantur. dir.", label: "Panturrilha dir.", better: "up", side: "L", x: 80, y: 335 },
  { key: "panturrilha_e", short: "Pantur. esq.", label: "Panturrilha esq.", better: "up", side: "R", x: 120, y: 335 },
  { key: "escapular", label: "Escapular", better: "none" },
];
/** Dobras cutâneas (mm): todas melhoram quando caem. */
export const SKINFOLDS: Measure[] = [
  { key: "peitoral", label: "Peitoral", better: "down" }, { key: "axilar_media", label: "Axilar média", better: "down" },
  { key: "triceps", label: "Tríceps", better: "down" }, { key: "subescapular", label: "Subescapular", better: "down" },
  { key: "abdominal", label: "Abdominal", better: "down" }, { key: "suprailiaca", label: "Supra-ilíaca", better: "down" },
  { key: "coxa", label: "Coxa", better: "down" }, { key: "panturrilha", label: "Panturrilha", better: "down" }, { key: "biceps", label: "Bíceps", better: "down" },
];

export type Trend = "good" | "bad" | "same" | "none";
export function trend(now: number | undefined | null, before: number | undefined | null, better: Better): Trend {
  if (now == null || before == null || !now || !before) return "none";
  if (now === before) return "same";
  if (better === "none") return "none";
  return (now < before) === (better === "down") ? "good" : "bad";
}

/* ------------------------------ Rotina ------------------------------ */

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** Segunda-feira da semana de uma data. */
export function weekStart(d = new Date()) { const x = new Date(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return iso(x); }
export const workoutsThisWeek = (logs: WorkoutLog[], today = new Date()) => {
  const start = weekStart(today);
  return new Set(logs.filter((l) => l.date >= start && l.date <= iso(today)).map((l) => l.date)).size;
};
/** Semanas seguidas batendo a meta de treinos (a semana atual conta se já bateu). */
export function weekStreak(logs: WorkoutLog[], goal: number, today = new Date()) {
  let n = 0; const d = new Date(today);
  for (let i = 0; i < 52; i += 1) {
    const start = weekStart(d); const end = new Date(`${start}T12:00:00`); end.setDate(end.getDate() + 6);
    const count = new Set(logs.filter((l) => l.date >= start && l.date <= iso(end)).map((l) => l.date)).size;
    if (count >= goal) n += 1; else if (i > 0) break;
    d.setDate(d.getDate() - 7);
  }
  return n;
}
/** Aderência à dieta nos últimos N dias (sim = 1, parcial = 0,5). */
export function dietAdherence(logs: DietLog[], days = 14, today = new Date()) {
  const from = new Date(today); from.setDate(from.getDate() - (days - 1));
  const list = logs.filter((l) => l.date >= iso(from) && l.date <= iso(today));
  const score = list.reduce((a, l) => a + (l.followed === "sim" ? 1 : l.followed === "parcial" ? 0.5 : 0), 0);
  return { logged: list.length, pct: list.length ? (score / list.length) * 100 : 0 };
}
export const daysUntil = (dateIso: string | null, today = new Date()) =>
  dateIso ? Math.round((new Date(`${dateIso}T12:00:00`).getTime() - new Date(`${iso(today)}T12:00:00`).getTime()) / 864e5) : null;

/* ------------------------------ Texto ↔ listas ------------------------------ */

/** "Supino reto | 4x10 | 30 kg | 60s | obs" → exercício. Uma linha por exercício. */
export function parseExercises(text: string): Exercise[] {
  return text.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0])
    .map(([name, sets, load, rest, notes]) => ({ name, sets: sets || undefined, load: load || undefined, rest: rest || undefined, notes: notes || undefined }));
}
export const exercisesText = (list: Exercise[]) =>
  list.map((e) => [e.name, e.sets ?? "", e.load ?? "", e.rest ?? "", e.notes ?? ""].join(" | ").replace(/( \| )+$/, "")).join("\n");

/** "07:00 | Café da manhã | 3 ovos, 1 pão" → refeição. */
export function parseMeals(text: string): Meal[] {
  return text.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p.some(Boolean))
    .map((p) => (p.length >= 3 ? { time: p[0], name: p[1], items: p.slice(2).join(" | ") } : { name: p[0], items: p[1] }));
}
export const mealsText = (list: Meal[]) => list.map((m) => [m.time, m.name, m.items].filter((x) => x != null).join(" | ")).join("\n");
