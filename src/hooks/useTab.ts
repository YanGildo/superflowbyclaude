import { useSearchParams } from "react-router-dom";

/** Aba da página guardada na URL (?aba=). */
export function useTab(ids: readonly string[]) {
  const [params, setParams] = useSearchParams();
  const tab = ids.find((t) => t === params.get("aba")) ?? ids[0];
  const go = (id: string) => setParams((p) => { p.set("aba", id); return p; }, { replace: true });
  return [tab, go] as const;
}
