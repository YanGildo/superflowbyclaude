// Temas do app: guardados neste navegador e aplicados como classe no <html>.
export type ThemeId = "claro" | "escuro" | "black" | "hibrido";

export const THEMES: { id: ThemeId; label: string; hint: string; classes: string[] }[] = [
  { id: "claro", label: "Claro", hint: "Fundo claro, cards claros.", classes: [] },
  { id: "escuro", label: "Escuro", hint: "Fundo marinho, cards escuros.", classes: ["dark"] },
  { id: "black", label: "Total Black", hint: "Preto profundo com destaques azuis.", classes: ["dark", "theme-black"] },
  { id: "hibrido", label: "Híbrido", hint: "Fundo escuro com cards claros.", classes: ["theme-hybrid"] },
];

const KEY = "superflow:theme";
const ALL_CLASSES = ["dark", "theme-black", "theme-hybrid"];

export function readTheme(): ThemeId {
  try {
    const v = localStorage.getItem(KEY) as ThemeId | null;
    return THEMES.some((t) => t.id === v) ? (v as ThemeId) : "claro";
  } catch {
    return "claro";
  }
}

export function applyTheme(id: ThemeId) {
  const root = document.documentElement;
  root.classList.remove(...ALL_CLASSES);
  root.classList.add(...(THEMES.find((t) => t.id === id)?.classes ?? []));
}

export function saveTheme(id: ThemeId) {
  applyTheme(id);
  try { localStorage.setItem(KEY, id); } catch { /* sem storage: vale só nesta sessão */ }
}
