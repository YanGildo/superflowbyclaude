// WhatsApp (simulado por enquanto): conversas e mensagens ligadas aos contatos do CRM.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useScope } from "@/hooks/useScope";

export function useChat() {
  const qc = useQueryClient();
  const scope = useScope();
  const refresh = () => qc.invalidateQueries({ queryKey: ["crm"] });

  /** Abre (ou reaproveita) a conversa de um contato. Devolve o id da conversa. */
  const openThread = useMutation({
    mutationFn: async (contactId: string): Promise<string> => {
      const found = await supabase.from("chat_threads").select("id").eq("workspace_id", scope.wsId).eq("contact_id", contactId).maybeSingle();
      if (found.error) throw found.error;
      if (found.data) return (found.data as { id: string }).id;
      const { data, error } = await supabase.from("chat_threads")
        .insert({ workspace_id: scope.wsId, business_id: scope.businessIdForNew, contact_id: contactId }).select("id").single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const send = useMutation({
    mutationFn: async ({ threadId, body, direction }: { threadId: string; body: string; direction: "in" | "out" }) => {
      const { error } = await supabase.from("chat_messages").insert({ workspace_id: scope.wsId, thread_id: threadId, body, direction });
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeThread = useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase.from("chat_threads").delete().eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast("Conversa excluída."); },
  });

  return { openThread, send, removeThread };
}

/** Respostas de cliente para testar o fluxo sem WhatsApp real. */
export const FAKE_REPLIES = [
  "Oi! Vi o anúncio, quanto custa?",
  "Pode me mandar mais detalhes de como funciona?",
  "Tem algum exemplo pra eu ver?",
  "Achei interessante. Como é o pagamento?",
  "Vou pensar e te falo amanhã.",
  "Achei um pouco caro…",
  "Fechado! Pode mandar o Pix.",
  "Mandei o comprovante 👍",
];
