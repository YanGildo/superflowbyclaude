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
