// Configurações: perfil do usuário e cadastro de negócios.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Business, BusinessKind, Profile } from "@/integrations/supabase/types";

export function useProfile(userId: string | undefined) {
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });

  const save = useMutation({
    mutationFn: async ({ fullName, phone }: { fullName: string; phone: string }) => {
      const { error } = await supabase.from("profiles")
        .update({ full_name: fullName.trim() || null, phone: phone.trim() || null }).eq("id", userId ?? "");
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["profile"] }); toast.success("Perfil salvo."); },
    onError: (e: Error) => toast.error(`Não salvou: ${e.message}`),
  });

  return { profile, save };
}

const businessError = (e: Error) => toast.error(e.message.includes("duplicate") ? "Já existe um negócio com esse nome." : e.message);

export function useUpdateBusiness(id: string, onDone: () => void) {
  return useMutation({
    mutationFn: async (patch: Partial<Business>) => {
      const { error } = await supabase.from("businesses").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => onDone(),
    onError: businessError,
  });
}

export function useCreateBusiness(workspaceId: string | undefined, onDone: () => void) {
  return useMutation({
    mutationFn: async (b: { name: string; kind: BusinessKind; color: string; position: number }) => {
      const { error } = await supabase.from("businesses").insert({ workspace_id: workspaceId, ...b });
      if (error) throw error;
    },
    onSuccess: () => { onDone(); toast.success("Negócio criado."); },
    onError: businessError,
  });
}
