// Relatórios de anúncios importados (campanha, conjunto, anúncio).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useScope } from "@/hooks/useScope";
import type { AdMetric, AdRow } from "@/lib/adReports";

export interface AdImportSummary { novos: number; atualizados: number; iguais: number; campanhas: number; erros: { line: string; erro: string }[] }

export function useAdMetrics() {
  const scope = useScope();
  return useQuery({
    queryKey: ["ad-metrics", scope.wsId, scope.businessFilter],
    enabled: scope.ready,
    queryFn: async () => {
      const { data, error } = await scope.apply(supabase.from("ad_metrics").select("*"), { business: true })
        .order("date_start", { ascending: false }).limit(20000);
      if (error) throw error;
      return (data ?? []) as AdMetric[];
    },
  });
}

export function useImportAds() {
  const scope = useScope();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rows, onProgress }: { rows: AdRow[]; onProgress?: (n: number) => void }) => {
      const total: AdImportSummary = { novos: 0, atualizados: 0, iguais: 0, campanhas: 0, erros: [] };
      for (let i = 0; i < rows.length; i += 1000) {
        const { data, error } = await supabase.rpc("import_ad_metrics", { _ws: scope.wsId, _business: scope.businessIdForNew, _rows: rows.slice(i, i + 1000) });
        if (error) throw error;
        const r = data as AdImportSummary;
        total.novos += r.novos; total.atualizados += r.atualizados; total.iguais += r.iguais; total.campanhas = r.campanhas; total.erros.push(...r.erros);
        onProgress?.(Math.min(rows.length, i + 1000));
      }
      return total;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ad-metrics"] }); qc.invalidateQueries({ queryKey: ["crm"] }); qc.invalidateQueries({ queryKey: ["marketing"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
}
