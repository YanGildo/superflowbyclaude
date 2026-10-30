import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, fullName: string) => Promise<string | null>;
  resetPassword: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export { supabaseConfigured };

/** Traduz as mensagens mais comuns do Supabase Auth. */
function translate(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar (veja sua caixa de entrada).";
  if (m.includes("already registered")) return "Este e-mail já tem conta. Use \"Entrar\".";
  if (m.includes("password should be")) return "A senha precisa ter pelo menos 8 caracteres.";
  if (m.includes("rate limit")) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  return message;
}

const errorText = (error: { message: string } | null) => (error ? translate(error.message) : null);

/** Chamadas ao Supabase Auth (a camada de tela não fala com o cliente direto). */
export const authApi = {
  getSession: () => supabase.auth.getSession(),
  onChange: (cb: (s: Session | null) => void) => supabase.auth.onAuthStateChange((_event, s) => cb(s)),
  async signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return errorText(error);
  },
  async signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    return errorText(error);
  },
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    return errorText(error);
  },
  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password });
    return errorText(error);
  },
  async signOut() {
    await supabase.auth.signOut();
  },
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
