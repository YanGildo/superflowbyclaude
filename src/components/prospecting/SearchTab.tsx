import { DatabaseZap, History, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEngine } from "@/hooks/useEngine";
import { useProspectActions, useProspectSearches } from "@/hooks/useProspects";
import { isRunning, useRunState } from "@/hooks/useProspectRunner";
import type { ProspectSearch } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { ApifySearchForm } from "./ApifySearchForm";
import { EngineSearchForm } from "./EngineSearchForm";

const STATUS: Record<string, { label: string; tone: string }> = {
  running: { label: "Rodando", tone: "text-warning" }, done: { label: "Concluída", tone: "text-success" },
  failed: { label: "Falhou", tone: "text-destructive" }, pending: { label: "Aguardando", tone: "text-muted-foreground" },
  saved: { label: "Busca salva", tone: "text-primary" },
};

/** Botão de cada busca do histórico: atualizar (Apify) ou recuperar (motor, se a página fechou no meio). */
function HistoryAction({ s }: { s: ProspectSearch }) {
  const { sync } = useProspectActions();
  const engine = useEngine();
  useRunState();
  if (s.status !== "running") return null;
  if (s.provider === "motor") {
    if (isRunning() || !s.job_ids.length) return null;
    return <Button size="sm" variant="outline" onClick={() => void engine.resume(s)}><DatabaseZap className="size-4" />Recuperar resultados</Button>;
  }
  return (
    <Button size="sm" variant="outline" disabled={sync.isPending} onClick={() => sync.mutate(s.id)}>
      {sync.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}Atualizar
    </Button>
  );
}

function SearchHistory({ list }: { list: ProspectSearch[] }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><History className="size-4" />Buscas</CardTitle></CardHeader>
      <CardContent className="space-y-1.5">
        {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma busca ainda. Quando você buscar, ela aparece aqui.</p>}
        {list.map((s) => {
          const st = STATUS[s.is_saved ? "saved" : s.status] ?? STATUS.pending;
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name ?? "Busca"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.provider === "motor" ? "Motor próprio" : "Apify"} · {s.location ?? "—"} · {new Date(s.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {s.status === "done" && <span className="text-xs text-muted-foreground">{s.result_count} encontrados · {s.new_count} novos</span>}
              <span className={cn("text-xs font-medium", st.tone)}>{st.label}</span>
              <HistoryAction s={s} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function SearchTab() {
  const { data: searches = [] } = useProspectSearches();
  const { provider } = useEngine();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
        <span>Use os dados com responsabilidade (LGPD): sem spam, respeite pedidos de remoção e personalize a abordagem.</span>
        <span className="text-muted-foreground">Buscando com <b>{provider === "motor" ? "Motor próprio" : "Apify"}</b> · <Link to="?aba=config" className="text-primary hover:underline">trocar</Link></span>
      </div>
      {provider === "motor" ? <EngineSearchForm /> : <ApifySearchForm />}
      <SearchHistory list={searches} />
    </div>
  );
}
