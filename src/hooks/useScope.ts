import { useWorkspace } from "@/lib/workspace";

/**
 * Escopo atual: workspace + filtro de negócio.
 * - `apply(q)` filtra uma consulta pelo workspace e (se houver) pelo negócio selecionado.
 * - `businessIdForNew` é o negócio que novos registros recebem (null em "Todos").
 */
export function useScope() {
  const { workspace, businessFilter } = useWorkspace();
  const wsId = workspace?.id ?? "";
  const businessIdForNew = businessFilter === "all" ? null : businessFilter;

  // Tipagem solta de propósito: os tipos do supabase-js estouram o limite do TS com genéricos aqui.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function apply(q: any, opts?: { business?: boolean }): any {
    let r = q.eq("workspace_id", wsId);
    if (opts?.business !== false && businessFilter !== "all") r = r.eq("business_id", businessFilter);
    return r;
  }

  return { wsId, businessFilter, businessIdForNew, apply, ready: Boolean(wsId) };
}
