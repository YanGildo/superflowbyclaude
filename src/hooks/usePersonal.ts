// Dados dos módulos pessoais: TikTok Shop, Veículos e Treino (sempre do espaço atual).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type {
  BodyAssessment, DietLog, FitnessSettings, TtsDay, TtsProduct, TtsSettings, TtsVideo, Vehicle, VehicleService, WorkoutLog, WorkoutPlan,
} from "@/integrations/supabase/types";
import { useCrmList } from "@/hooks/useCrm";
import { useScope } from "@/hooks/useScope";

const recent = (q: any) => q.order("created_at", { ascending: false }); // eslint-disable-line @typescript-eslint/no-explicit-any

export const useTtsProducts = () => useCrmList<TtsProduct>("tts_products", [], recent);
export const useTtsVideos = () => useCrmList<TtsVideo>("tts_videos", [], recent);
export const useTtsDays = () => useCrmList<TtsDay>("tts_days", [], (q) => q.order("day", { ascending: false }).limit(400));
export const useVehicles = () => useCrmList<Vehicle>("vehicles", [], (q) => q.order("created_at"));
export const useVehicleServices = () =>
  useCrmList<VehicleService>("vehicle_services", [], (q) => q.order("date", { ascending: false }).order("created_at", { ascending: false }));
export const useAssessments = () => useCrmList<BodyAssessment>("body_assessments", [], (q) => q.order("date", { ascending: false }));
export const useWorkoutPlans = () => useCrmList<WorkoutPlan>("workout_plans", [], (q) => q.is("archived_at", null).order("position").order("created_at"));
export const useWorkoutLogs = () => useCrmList<WorkoutLog>("workout_logs", [], (q) => q.order("date", { ascending: false }).limit(500));
export const useDietLogs = () => useCrmList<DietLog>("diet_logs", [], (q) => q.order("date", { ascending: false }).limit(400));

/** Configuração única por espaço (tts_settings, fitness_settings). */
function useSettings<T extends { workspace_id: string }>(table: "tts_settings" | "fitness_settings") {
  const scope = useScope();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: [table, scope.wsId],
    enabled: scope.ready,
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").eq("workspace_id", scope.wsId).maybeSingle();
      if (error) throw error;
      return (data ?? null) as T | null;
    },
  });
  const save = useMutation({
    mutationFn: async (v: Partial<Omit<T, "workspace_id">>) => {
      const { error } = await supabase.from(table).upsert({ ...v, workspace_id: scope.wsId, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Salvo."); qc.invalidateQueries({ queryKey: [table] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { q, save };
}

export const useTtsSettings = () => useSettings<TtsSettings>("tts_settings");
export const useFitnessSettings = () => useSettings<FitnessSettings>("fitness_settings");
