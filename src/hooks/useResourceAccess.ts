// Acesso por item (tarefa, projeto, script, prospect, plano) e "mover para a equipe".
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { MemberRole } from "@/integrations/supabase/types";
import type { Level, ResourceType } from "@/lib/access";

export interface ResourceMember {
  user_id: string; full_name: string | null; email: string; role: MemberRole;
  module_level: Level; grant_level: Level | null; restricted: boolean;
}

export function useResourceAccess(type: ResourceType, id: string, enabled: boolean) {
  const qc = useQueryClient();
  const key = ["resource-access", type, id];
  const list = useQuery({
    queryKey: key,
    enabled: enabled && Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("resource_access", { _type: type, _id: id });
      if (error) throw error;
      return (data ?? []) as ResourceMember[];
    },
  });
  const done = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ["activity"] }); };
  const setGrant = useMutation({
    mutationFn: async (v: { userId: string; level: Level }) => {
      const { error } = await supabase.rpc("set_resource_grant", { _type: type, _id: id, _user: v.userId, _level: v.level === "none" ? null : v.level });
      if (error) throw error;
    },
    onSuccess: done,
    onError: (e: Error) => toast.error(e.message),
  });
  const setRestricted = useMutation({
    mutationFn: async (on: boolean) => {
      const { error } = await supabase.rpc("set_resource_restricted", { _type: type, _id: id, _restricted: on });
      if (error) throw error;
    },
    onSuccess: (_d, on) => { done(); toast.success(on ? "Agora só quem você liberar vê este item." : "Item aberto para quem tem acesso ao módulo."); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { list, setGrant, setRestricted };
}

export function useMoveToWorkspace(onDone?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { type: ResourceType; id: string; target: string }) => {
      const { error } = await supabase.rpc("move_to_workspace", { _type: v.type, _id: v.id, _target: v.target });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast.success("Movido. Agora está no outro espaço (é o mesmo item, não uma cópia)."); onDone?.(); },
    onError: (e: Error) => toast.error(e.message),
  });
}
