// Aprovação de cadastros: a situação da conta logada e, para o administrador, a fila de novos cadastros.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export type Approval = "approved" | "pending" | "rejected";
export interface Signup { user_id: string; full_name: string | null; email: string; approval: Approval; created_at: string; via_invite: boolean }

export function useMyApproval() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-approval", user?.id],
    enabled: Boolean(user),
    refetchInterval: (q) => (q.state.data === "pending" ? 20_000 : false),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_approval");
      if (error) throw error;
      return (data ?? "pending") as Approval;
    },
  });
}

export function useIsAppAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-app-admin", user?.id],
    enabled: Boolean(user),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_app_admin");
      if (error) throw error;
      return Boolean(data);
    },
  });
}

export function useSignups(enabled: boolean) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["signups"],
    enabled,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_signups");
      if (error) throw error;
      return (data ?? []) as Signup[];
    },
  });
  const set = useMutation({
    mutationFn: async (v: { userId: string; status: Approval }) => {
      const { error } = await supabase.rpc("set_approval", { _user: v.userId, _status: v.status });
      if (error) throw error;
    },
    onSuccess: (_d, v) => { toast.success(v.status === "approved" ? "Acesso liberado." : v.status === "rejected" ? "Cadastro recusado." : "Voltou para pendente."); qc.invalidateQueries({ queryKey: ["signups"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { list, set };
}
