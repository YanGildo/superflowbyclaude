// Guarda o link de convite enquanto a pessoa entra ou cria a conta.
const KEY = "superflow:convite";

export const pendingInvite = {
  read(): string | null {
    try { return localStorage.getItem(KEY); } catch { return null; }
  },
  save(token: string) {
    try { localStorage.setItem(KEY, token); } catch { /* sem storage: a pessoa abre o link de novo */ }
  },
  clear() {
    try { localStorage.removeItem(KEY); } catch { /* sem storage */ }
  },
};
