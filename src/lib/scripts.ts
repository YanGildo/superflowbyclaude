// Variáveis dos scripts: [nome], [valor], [prazo]...
const VAR_RE = /\[([^\]\n]{1,40})\]/g;

/** Variáveis usadas no texto, sem repetir, na ordem em que aparecem. */
export function scriptVars(body: string): string[] {
  return [...new Set([...body.matchAll(VAR_RE)].map((m) => m[1]))];
}

/** Troca as variáveis que têm valor; as sem valor ficam como estão, para o usuário completar. */
export function fillVars(body: string, values: Record<string, string>): string {
  return body.replace(VAR_RE, (all, name: string) => values[name]?.trim() || all);
}

/** Pedaços do texto marcando o que é variável (para destacar na tela). */
export function splitVars(body: string): { text: string; isVar: boolean }[] {
  const out: { text: string; isVar: boolean }[] = [];
  let last = 0;
  for (const m of body.matchAll(VAR_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: body.slice(last, at), isVar: false });
    out.push({ text: m[0], isVar: true });
    last = at + m[0].length;
  }
  if (last < body.length) out.push({ text: body.slice(last), isVar: false });
  return out;
}

/** Busca simples em título, texto, momento, categoria e tags. */
export function matchesScript(s: { title: string; body: string; moment: string | null; category: string | null; tags: string[] }, q: string) {
  if (!q.trim()) return true;
  const needle = q.toLowerCase();
  return [s.title, s.body, s.moment ?? "", s.category ?? "", ...s.tags].some((v) => v.toLowerCase().includes(needle));
}
