// Grupos do menu lateral recolhidos (cada um abre/fecha sozinho; por padrão todos abertos) e item ativo.
import { NAV, type NavSection } from "@/lib/nav";

const CLOSED_KEY = "superflow:nav-closed";

/** Item "pai" (ex.: /financeiro) só fica ativo na própria rota quando há itens filhos no menu. */
const hasChildren = (path: string) => NAV.some((s) => s.items.some((i) => i.path.startsWith(path + "/")));

export function isNavActive(path: string, pathname: string): boolean {
  if (path === "/" || hasChildren(path)) return pathname === path;
  return pathname === path || pathname.startsWith(path + "/");
}

export function sectionOf(pathname: string): NavSection | undefined {
  return NAV.find((s) => s.items.some((i) => isNavActive(i.path, pathname)));
}

/** Grupos que o usuário recolheu (lembrado neste navegador). */
export const navClosedPref = {
  read(): string[] {
    try {
      const v = JSON.parse(localStorage.getItem(CLOSED_KEY) ?? "[]");
      return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  },
  save(ids: string[]) {
    try { localStorage.setItem(CLOSED_KEY, JSON.stringify(ids)); } catch { /* sem storage: só não lembra */ }
  },
};
