// Equipes: espaços, membros, permissões, convites e histórico (tela Equipe).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { MemberRole } from "@/integrations/supabase/types";
import type { Level, Permissions } from "@/lib/access";

export interface Member { user_id: string; full_name: string | null; email: string; role: MemberRole; permissions: Permissions | null; joined_at: string }
export interface Invite {
  id: string; email: string | null; role: MemberRole; accepted_at: string | null; created_at: string;
  token: string; permissions: Permissions; expires_at: string;
}
export interface ActivityEntry {
  id: string; user_id: string | null; actor_name: string | null; action: string; module: string; entity_type: string; title: string | null; created_at: string;
}
export interface AccessEntry { kind: "modulo" | "item"; key: string; label: string | null; level: Level; restricted: boolean }
export type InviteRole = Exclude<MemberRole, "owner">;

export const inviteLink = (token: string) => `${window.location.origin}/convite/${token}`;

const rpc = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as T;
};
const showError = (e: Error) => toast.error(e.message);

export function useTeam(ws: string, enabled = true) {
  const qc = useQueryClient();
  const on = Boolean(ws) && enabled;

  const members = useQuery({ queryKey: ["members", ws], enabled: on, queryFn: () => rpc<Member[]>("team_members", { _ws: ws }) });
  const invites = useQuery({
    queryKey: ["invites", ws],
    enabled: on,
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
    qc.invalidateQueries({ queryKey: ["activity", ws] });
  };

  const invite = useMutation({
    mutationFn: (v: { email: string; role: InviteRole; permissions: Permissions }) =>
      rpc<{ status: string; token?: string }>("create_invite", { _ws: ws, _email: v.email.trim() || null, _role: v.role, _permissions: v.permissions }),
    onSuccess: (r) => {
      toast.success(r.status === "adicionado" ? "Essa pessoa já tinha conta e entrou na equipe agora." : "Convite criado. Copie o link e mande para a pessoa.");
      refreshAll();
    },
    onError: showError,
  });

  const setAccess = useMutation({
    mutationFn: (v: { userId: string; role: MemberRole; permissions: Permissions }) =>
      rpc<null>("set_member_access", { _ws: ws, _user: v.userId, _role: v.role, _permissions: v.permissions }),
    onSuccess: () => { toast.success("Permissões salvas."); refreshAll(); qc.invalidateQueries({ queryKey: ["member-access", ws] }); },
    onError: showError,
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => rpc<null>("remove_member", { _ws: ws, _user: userId }),
    onSuccess: () => { toast("Acesso removido."); refreshAll(); qc.invalidateQueries({ queryKey: ["workspace"] }); qc.invalidateQueries({ queryKey: ["my-access"] }); },
    onError: showError,
  });

  const cancelInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast("Convite cancelado. O link deixou de funcionar."); refreshAll(); },
    onError: showError,
  });

  return { members, invites, invite, setAccess, removeMember, cancelInvite };
}

export function useActivity(ws: string) {
  return useQuery({
    queryKey: ["activity", ws],
    enabled: Boolean(ws),
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_log").select("id, user_id, actor_name, action, module, entity_type, title, created_at")
        .eq("workspace_id", ws).order("created_at", { ascending: false }).limit(60);
      if (error) throw error;
      return (data ?? []) as ActivityEntry[];
    },
  });
}

export function useMemberAccess(ws: string, userId: string | null) {
  return useQuery({
    queryKey: ["member-access", ws, userId],
    enabled: Boolean(ws && userId),
    queryFn: () => rpc<AccessEntry[]>("member_access", { _ws: ws, _user: userId }),
  });
}

export function useCreateTeam(onDone: (id: string) => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => rpc<string>("create_team", { _name: name }),
    onSuccess: async (id) => {
      await qc.invalidateQueries({ queryKey: ["workspace"] });
      toast.success("Equipe criada. Agora convide as pessoas.");
      onDone(id);
    },
    onError: showError,
  });
}

export function useAcceptInvite() {
  return useMutation({ mutationFn: (token: string) => rpc<string>("accept_invite", { _token: token }) });
}

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: ["invite-preview", token],
    queryFn: async () => (await rpc<{ workspace_name: string; invited_by_name: string; email: string | null; valid: boolean }[]>("invite_preview", { _token: token }))[0] ?? null,
  });
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
