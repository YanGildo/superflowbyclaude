// Importar extrato: confere o que já existe, cria categorias que faltam, grava só o que é novo
// e guarda o que você ensinou (categoria por nome, seu nome no banco, número da conta).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { FinCategory } from "@/integrations/supabase/types";
import { useScope } from "@/hooks/useScope";
import { useWorkspace } from "@/lib/workspace";
import { toInserts, type ImportLine, type ImportOptions } from "@/lib/statementImport";

export interface ImportSettings { titular: string; regras: Record<string, string> }

export function useImportSettings() {
  const { workspace, refresh } = useWorkspace();
  const raw = (workspace?.settings?.importacao ?? {}) as Partial<ImportSettings>;
  const settings: ImportSettings = { titular: raw.titular ?? "", regras: raw.regras ?? {} };
  const save = async (s: ImportSettings) => {
    const { error } = await supabase.from("workspaces").update({ settings: { ...(workspace?.settings ?? {}), importacao: s } }).eq("id", workspace?.id ?? "");
    if (!error) refresh();
  };
  return { settings, save };
}

const chunk = <T,>(list: T[], n: number) => Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));

/** Quais chaves desta prévia já estão gravadas (inclusive as que foram para a lixeira). */
export function useExistingKeys(keys: string[]) {
  const scope = useScope();
  return useQuery({
    queryKey: ["fin", "import-keys", scope.wsId, keys.length, keys[0], keys[keys.length - 1]],
    enabled: scope.ready && keys.length > 0,
    queryFn: async () => {
      const found = new Set<string>();
      for (const part of chunk(keys, 150)) {
        const { data, error } = await supabase.from("transactions").select("import_key").eq("workspace_id", scope.wsId).in("import_key", part);
        if (error) throw error;
        (data ?? []).forEach((r: { import_key: string | null }) => { if (r.import_key) found.add(r.import_key); });
      }
      return found;
    },
  });
}

/** Cria as categorias sugeridas que ainda não existem e devolve nome → id. */
async function ensureCategories(wsId: string, lines: ImportLine[], cats: Pick<FinCategory, "id" | "name" | "kind">[]) {
  const ids: Record<string, string> = {};
  const wanted = new Map<string, "entrada" | "saida">();
  lines.forEach((l) => { if (!l.category.id && l.category.name && l.type !== "transferencia") wanted.set(l.category.name, l.type); });
  for (const [name, kind] of wanted) {
    const has = cats.find((c) => c.name === name);
    if (has) { ids[name] = has.id; continue; }
    const { data, error } = await supabase.from("fin_categories").insert({ workspace_id: wsId, name, kind }).select("id").single();
    if (error) throw error;
    ids[name] = (data as { id: string }).id;
  }
  return ids;
}

export interface ImportRequest {
  lines: ImportLine[]; options: ImportOptions;
  /** Regras novas aprendidas nesta importação (nome → categoria). */
  learned: Record<string, string>;
  accountNumber: string | null;
}

export function useRunImport() {
  const qc = useQueryClient();
  const scope = useScope();
  const { settings, save } = useImportSettings();
  return useMutation({
    mutationFn: async ({ lines, options, learned, accountNumber }: ImportRequest) => {
      const catIds = await ensureCategories(scope.wsId, lines, options.categories);
      let added = 0;
      for (const part of chunk(toInserts(lines, options, scope.wsId, catIds), 300)) {
        const { data, error } = await supabase.from("transactions")
          .upsert(part, { onConflict: "workspace_id,import_key", ignoreDuplicates: true }).select("id");
        if (error) throw error;
        added += (data ?? []).length;
      }
      if (accountNumber && !options.account.number) await supabase.from("fin_accounts").update({ number: accountNumber }).eq("id", options.account.id);
      await save({ titular: options.holder ?? settings.titular, regras: { ...settings.regras, ...learned } });
      return { added, skipped: lines.length - added };
    },
    onSuccess: ({ added, skipped }) => {
      qc.invalidateQueries({ queryKey: ["fin"] });
      qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      toast.success(`${added} lançamento(s) importado(s)${skipped ? ` · ${skipped} já existiam` : ""}.`);
    },
    onError: (e: Error) => toast.error(`Não importou: ${e.message}`),
  });
}
