// Estado da tela "Importar extrato": ler o arquivo/texto, montar a prévia e o que vai ser gravado.
import { useMemo, useState } from "react";
import { useAccounts, useCategories } from "@/hooks/useFinance";
import { useExistingKeys, useImportSettings, useRunImport } from "@/hooks/useStatementImport";
import type { UseType } from "@/integrations/supabase/types";
import { pdfToText } from "@/lib/pdfText";
import { buildLines, nameKey, type ImportLine, type ImportOptions } from "@/lib/statementImport";
import { parseStatement, rowTotals, type ParsedStatement } from "@/lib/statementParse";
import { useWorkspace } from "@/lib/workspace";

/** Categoria escolhida na prévia: id existente, "new:Nome" (criar) ou "" (sem categoria). */
export type CatChoice = string;

export const catValue = (l: ImportLine): CatChoice => l.category.id ?? (l.category.name ? `new:${l.category.name}` : "");

function applyChoice(l: ImportLine, choice: CatChoice | undefined): ImportLine {
  if (choice === undefined || l.type === "transferencia") return l;
  if (choice.startsWith("new:")) return { ...l, category: { id: null, name: choice.slice(4) } };
  return { ...l, category: { id: choice || null, name: null } };
}

/** Lê um arquivo do extrato (PDF, CSV, OFX ou texto). */
export async function readStatementFile(file: File): Promise<string> {
  if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") return pdfToText(await file.arrayBuffer());
  return file.text();
}

const suggestedUse = (kind: string | undefined): UseType => (kind && kind !== "pessoal" ? "negocio" : "pessoal");
const pickHolder = (...names: (string | null | undefined)[]) => names.find((n) => n && n.trim()) ?? null;

/** Conta, uso e titular escolhidos (com o uso sugerido pelo negócio da conta). */
function useImportTarget(parsed: ParsedStatement | null) {
  const { businesses } = useWorkspace();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const { settings } = useImportSettings();
  const [accountId, setAccountId] = useState("");
  const [useType, setUseType] = useState<UseType | "">("");
  const [holder, setHolder] = useState("");
  const account = accounts.find((a) => a.id === accountId) ?? null;
  const effectiveUse: UseType = useType || suggestedUse(businesses.find((b) => b.id === account?.business_id)?.kind);
  const who = pickHolder(holder, parsed?.holder, settings.titular);
  const options: ImportOptions | null = account ? { account, accounts, holder: who, useType: effectiveUse, categories, rules: settings.regras } : null;
  /** Ao ler: guarda o titular e escolhe a conta pelo número que vem no extrato. */
  const adopt = (p: ParsedStatement) => {
    if (p.holder && !holder) setHolder(p.holder);
    const num = p.accountNumber?.replace(/\D/g, "");
    const match = num ? accounts.find((a) => (a.number ?? "").replace(/\D/g, "") === num) : undefined;
    if (match) setAccountId(match.id); // o número que vem no extrato manda (evita importar na conta errada)
  };
  return { accounts, categories, account, accountId, setAccountId, useType: effectiveUse, setUseType, holder: who ?? "", setHolder, options, adopt };
}

/** Escolhas da prévia: categoria por nome e linhas desmarcadas. */
function usePreviewChoices() {
  const [choices, setChoices] = useState<Record<string, CatChoice>>({});
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const choose = (l: ImportLine, c: CatChoice) => setChoices((m) => ({ ...m, [nameKey(l.row)]: c }));
  const toggle = (key: string) => setExcluded((x) => { const n = new Set(x); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  const clear = () => { setChoices({}); setExcluded(new Set()); };
  const learned = Object.fromEntries(Object.entries(choices).filter(([, c]) => c && !c.startsWith("new:")));
  return { choices, excluded, choose, toggle, clear, learned };
}

export function useImportFlow() {
  const [parsed, setParsed] = useState<ParsedStatement | null>(null);
  const t = useImportTarget(parsed);
  const c = usePreviewChoices();
  const o = t.options;
  const lines = useMemo(() => (parsed && o ? buildLines(parsed.rows, o).map((l) => applyChoice(l, c.choices[nameKey(l.row)])) : []),
    [parsed, o?.account.id, o?.holder, o?.useType, o?.categories, o?.rules, c.choices]); // eslint-disable-line react-hooks/exhaustive-deps
  const existing = useExistingKeys(lines.map((l) => l.key));
  const known = existing.data ?? new Set<string>();
  const fresh = lines.filter((l) => !known.has(l.key));
  const toImport = fresh.filter((l) => !c.excluded.has(l.key));
  const run = useRunImport();

  const read = (text: string) => { const p = parseStatement(text); setParsed(p); c.clear(); t.adopt(p); return p; };
  const submit = (onDone: () => void) => {
    if (o) run.mutate({ lines: toImport, options: o, learned: c.learned, accountNumber: parsed?.accountNumber ?? null }, { onSuccess: onDone });
  };
  const reset = () => { setParsed(null); c.clear(); };

  return {
    ...t, parsed, read, reset, lines, known, fresh, toImport, excluded: c.excluded, toggle: c.toggle, choose: c.choose, submit,
    running: run.isPending, checking: existing.isLoading, totals: parsed ? rowTotals(parsed.rows) : null,
  };
}

export type ImportFlow = ReturnType<typeof useImportFlow>;
