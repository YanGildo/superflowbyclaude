// Equipe do workspace: membros, convites e nome (tela Equipe).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { MemberRole } from "@/integrations/supabase/types";

export interface Member { user_id: string; full_name: string | null; email: string; role: MemberRole; joined_at: string }
export interface Invite { id: string; email: string; role: MemberRole; accepted_at: string | null; created_at: string }
export type InviteRole = Exclude<MemberRole, "owner">;

export function useTeam(ws: string) {
  const qc = useQueryClient();

  const members = useQuery({
    queryKey: ["members", ws],
    enabled: Boolean(ws),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_members", { _ws: ws });
      if (error) throw error;
      return (data ?? []) as Member[];
    },
  });

  const invites = useQuery({
    queryKey: ["invites", ws],
    enabled: Boolean(ws),
    queryFn: async () => {
      const { data, error } = await supabase.from("workspace_invites").select("*")
        .eq("workspace_id", ws).is("accepted_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Invite[];
    },
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ["members", ws] });
    qc.invalidateQueries({ queryKey: ["invites", ws] });
  };
  const showError = (e: Error) => toast.error(e.message);

  const invite = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: InviteRole }) => {
      const { data, error } = await supabase.rpc("invite_member", { _ws: ws, _email: email, _role: role });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (r) => {
      toast.success(r === "adicionado"
        ? "Essa pessoa já tinha conta e entrou na equipe agora."
        : "Convite registrado. Quando a pessoa criar a conta com esse e-mail, entra direto aqui.");
      refreshAll();
    },
    onError: showError,
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, r }: { userId: string; r: MemberRole }) => {
      const { error } = await supabase.from("workspace_members").update({ role: r }).eq("workspace_id", ws).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Papel atualizado."); refreshAll(); },
    onError: showError,
  });

  const removeMember = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("workspace_members").delete().eq("workspace_id", ws).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast("Pessoa removida da equipe."); refreshAll(); },
    onError: showError,
  });

  const cancelInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: refreshAll,
  });

  return { members, invites, invite, changeRole, removeMember, cancelInvite };
}

export function useRenameWorkspace(ws: string, onDone: () => void) {
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("workspaces").update({ name: name.trim() }).eq("id", ws);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Nome salvo."); onDone(); },
    onError: (e: Error) => toast.error(e.message),
  });
}
