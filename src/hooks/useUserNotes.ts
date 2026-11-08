// Notas rápidas da pessoa logada (privadas, valem em qualquer espaço).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { UserNote } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";

const KEY = ["user-notes"];

export function useUserNotes() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: [...KEY, user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("user_notes").select("*").order("done").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return (data ?? []) as UserNote[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });
  const fail = (e: Error) => toast.error(e.message);

  const add = useMutation({
    mutationFn: async (v: { body: string; page: string }) => {
      const { error } = await supabase.from("user_notes").insert({ body: v.body, page: v.page });
      if (error) throw error;
    },
    onSuccess: refresh, onError: fail,
  });
  const update = useMutation({
    mutationFn: async (v: { id: string; values: Partial<Pick<UserNote, "body" | "done">> }) => {
      const { error } = await supabase.from("user_notes").update(v.values).eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: refresh, onError: fail,
  });
  const remove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("user_notes").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: refresh, onError: fail,
  });
  return { list, add, update, remove };
}
