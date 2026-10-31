// Atalhos do motor próprio para as telas: configuração atual, teste, busca, recuperação e enriquecimento.
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProspectSettings } from "@/hooks/useProspects";
import { resumeEngineSearch, runEngineSearch, runEnrich } from "@/hooks/useProspectRunner";
import { useScope } from "@/hooks/useScope";
import type { ProspectSearch } from "@/integrations/supabase/types";
import { testEngine, type EngineConfig } from "@/lib/engineClient";
import type { EngineSearch, EnrichChoice } from "@/lib/mapsEngine";

export function useEngine() {
  const qc = useQueryClient();
  const scope = useScope();
  const { settings } = useProspectSettings();
  const cfg: EngineConfig = { url: settings.engineUrl, key: settings.engineKey };
  const ctx = { cfg, ws: scope.wsId, qc };

  const test = useMutation({ mutationFn: (c?: EngineConfig) => testEngine(c ?? cfg) });

  return {
    cfg, test, provider: settings.provider,
    search: (s: EngineSearch) => runEngineSearch(ctx, s),
    resume: (s: ProspectSearch) => resumeEngineSearch(ctx, s),
    enrich: (ids: string[], options: EnrichChoice) => runEnrich(qc, ids, options),
  };
}
