import { useSearchParams } from "react-router-dom";
import { currentYM } from "@/lib/format";

/** Mês selecionado (yyyy-mm) guardado na URL (?m=), para manter ao navegar entre telas do financeiro. */
export function useMonthParam(): [string, (ym: string) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get("m");
  const ym = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : currentYM();
  const set = (v: string) => setParams((p) => { p.set("m", v); return p; }, { replace: true });
  return [ym, set];
}
