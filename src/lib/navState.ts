// Qual grupo do menu lateral está aberto (um por vez) e qual item está ativo.
import { NAV, type NavSection } from "@/lib/nav";

const OPEN_KEY = "superflow:nav-open";

/** Item "pai" (ex.: /financeiro) só fica ativo na própria rota quando há itens filhos no menu. */
const hasChildren = (path: string) => NAV.some((s) => s.items.some((i) => i.path.startsWith(path + "/")));

export function isNavActive(path: string, pathname: string): boolean {
  if (path === "/" || hasChildren(path)) return pathname === path;
  return pathname === path || pathname.startsWith(path + "/");
}

export function sectionOf(pathname: string): NavSection | undefined {
  return NAV.find((s) => s.items.some((i) => isNavActive(i.path, pathname)));
}

export const navOpenPref = {
  read(): string | null {
    try { return localStorage.getItem(OPEN_KEY); } catch { return null; }
  },
  save(id: string | null) {
    try {
      if (id) localStorage.setItem(OPEN_KEY, id);
      else localStorage.removeItem(OPEN_KEY);
    } catch { /* sem storage: só não lembra */ }
  },
};
