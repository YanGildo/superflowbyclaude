// Em espaço de equipe, o que outra pessoa muda aparece sozinho:
// tempo real do Supabase (quando ligado) + recarga leve a cada 30 s como reserva.
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TABLES = ["tasks", "task_steps", "projects", "scripts", "prospects", "action_plans", "action_plan_steps",
  "action_plan_assets", "goals", "contacts", "deals", "activity_log", "workspace_members"];

export function useTeamSync(wsId: string | undefined, isTeam: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!wsId || !isTeam) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => qc.invalidateQueries({ type: "active" }), 400);
    };
    const channel = supabase.channel(`equipe-${wsId}`);
    TABLES.forEach((table) => channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `workspace_id=eq.${wsId}` }, refresh));
    channel.subscribe();
    const poll = setInterval(() => { if (document.visibilityState === "visible") refresh(); }, 30_000);
    return () => { clearTimeout(timer); clearInterval(poll); supabase.removeChannel(channel); };
  }, [wsId, isTeam, qc]);
}
