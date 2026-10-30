import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthContext, authApi, supabaseConfigured, type AuthState } from "@/lib/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured);

  useEffect(() => {
    if (!supabaseConfigured) return;
    authApi.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = authApi.onChange(setSession);
    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    loading,
    signIn: authApi.signIn,
    signUp: authApi.signUp,
    resetPassword: authApi.resetPassword,
    updatePassword: authApi.updatePassword,
    signOut: authApi.signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
