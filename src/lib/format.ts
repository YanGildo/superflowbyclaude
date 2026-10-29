export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Data local (fuso do navegador) no formato yyyy-mm-dd, sem cair no dia seguinte por causa do UTC. */
export function localISODate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  return { start: localISODate(start), next: localISODate(next) };
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

/**
 * Lê valor digitado em reais: aceita "1.234,56", "1234,56", "1234.56" e "R$ 1.234".
 * Retorna null se não for um número válido.
 */
export function parseMoney(input: string): number | null {
  let s = input.replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); // formato BR: 1.234,56
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); // 1.234 ou 12.500 (milhar)
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

/** 1234.5 -> "1.234,50" (para preencher campo de edição). */
export const moneyInput = (n: number | null | undefined) =>
  n == null ? "" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** "2026-10" ± n meses */
export function shiftMonth(ym: string, n: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const currentYM = () => localISODate().slice(0, 7);

/** intervalo [início, fim) de um mês "yyyy-mm" */
export const ymRange = (ym: string) => ({ start: `${ym}-01`, next: `${shiftMonth(ym, 1)}-01` });
