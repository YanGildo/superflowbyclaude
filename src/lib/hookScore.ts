// Régua de nota do gancho (0 a 100), roda no navegador. Regras do material "Painel de Conteúdo".

export type Verdict = "FORTE" | "OK" | "FRACO";
export interface HookScore {
  score: number;
  verdict: Verdict;
  parts: { key: string; label: string; value: number }[];
  weakest: string;
  fatal: string[];
}

const TENSION = ["pare", "parar", "nunca", "errado", "erro", "errei", "perdi", "custou", "custa", "ninguém", "não", "nem", "grátis",
  "paguei", "segredo", "antes", "só", "sem", "contra", "pior", "problema", "risco", "cuidado", "verdade", "mentira"];
const TENSION_PHRASES = ["em vez de"];
const WORD_NUMBERS = ["dois", "duas", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "quinze",
  "vinte", "trinta", "quarenta", "cinquenta", "cem", "cento", "duzentos", "trezentos", "quinhentos", "mil", "milhão", "milhões"];
const FILLER = ["então", "tipo", "oi", "olá", "hoje", "basicamente", "olha", "só", "deixa eu", "você sabia", "nesse vídeo", "muita gente"];
const COMMANDS = ["pare", "para", "roube", "rouba", "copie", "copia", "salve", "salva", "use", "usa", "faça", "faz", "veja", "vê", "nunca", "sempre"];
const YOU = ["você", "vc", "seu", "sua", "seus", "suas", "te", "ti", "contigo"];
const ME = ["eu", "meu", "minha", "meus", "minhas", "a gente", "nós", "nosso", "nossa", "me", "comigo",
  // verbos na 1ª pessoa do passado ("Perdi R$ 18.000…")
  "perdi", "paguei", "errei", "fiz", "ganhei", "testei", "gastei", "descobri", "aprendi", "levei", "passei", "rodei", "comecei",
  "vendi", "consegui", "tentei", "usei", "cobrei", "fechei", "postei", "gravei", "criei", "troquei", "larguei", "dobrei"];

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** Palavras com acento contam como 1; "18.000" e "R$ 18.000" também. */
export function words(text: string): string[] {
  return text.replace(/R\$\s+/g, "R$").match(/[\p{L}\p{N}$][\p{L}\p{N}$.,%'-]*/gu)?.map((w) => w.replace(/[.,]+$/, "")) ?? [];
}

const norm = (w: string) => w.toLowerCase();
const isNumber = (w: string) => /\d/.test(w);
const isMoney = (w: string) => /^R\$/i.test(w);
const isWordNumber = (w: string) => WORD_NUMBERS.includes(norm(w));

/** Nomes próprios: maiúscula que não é início de frase. */
function properIdx(text: string, ws: string[]): Set<number> {
  const out = new Set<number>();
  const sentenceStarts = new Set<number>([0]);
  let idx = 0;
  const tokens = text.replace(/R\$\s+/g, "R$").split(/\s+/).filter(Boolean);
  tokens.forEach((t, i) => { if (i > 0 && /[.!?:]["')]*$/.test(tokens[i - 1])) sentenceStarts.add(idx); if (/[\p{L}\p{N}$]/u.test(t)) idx += 1; });
  ws.forEach((w, i) => { if (!sentenceStarts.has(i) && /^\p{Lu}/u.test(w) && !isMoney(w)) out.add(i); });
  return out;
}

function sizeScore(ws: string[], text: string) {
  const n = ws.length;
  let s = n < 5 ? 100 - (5 - n) * 20 : n > 12 ? 100 - (n - 12) * 11 : 100;
  if (text.length > 60) s -= 12;
  return clamp(s);
}

function specificity(ws: string[], proper: Set<number>) {
  const c = ws.filter((w, i) => isNumber(w) || isMoney(w) || isWordNumber(w) || proper.has(i)).length;
  return c === 0 ? 15 : c === 1 ? 75 : 100;
}

function stakes(ws: string[], low: string) {
  const c = ws.filter((w) => TENSION.includes(norm(w)) || isMoney(w)).length + TENSION_PHRASES.filter((p) => low.includes(p)).length;
  return c === 0 ? 20 : c === 1 ? 70 : 100;
}

function frontLoad(ws: string[], proper: Set<number>, low: string) {
  const heavy = ws.findIndex((w, i) => TENSION.includes(norm(w)) || isNumber(w) || isMoney(w) || isWordNumber(w) || proper.has(i));
  let s = heavy < 0 ? 30 : heavy < 4 ? 100 : heavy < 7 ? 70 : 40;
  if (FILLER.some((f) => low.startsWith(`${f} `) || low.startsWith(`${f},`) || low === f)) s -= 30;
  return clamp(s);
}

function audience(ws: string[], low: string) {
  const l = ws.map(norm);
  if (l.some((w) => YOU.includes(w))) return 100;
  if (COMMANDS.includes(l[0] ?? "")) return 90;
  if (l.some((w) => ME.includes(w)) || low.includes("a gente")) return 70;
  return 35;
}

function fatalErrors(text: string, low: string): string[] {
  const out: string[] = [];
  if (/(não|nao) (role|rola|passa|pule|saia)|para de rolar|pare de rolar|não pula/.test(low)) out.push("Pede pra não rolar o feed");
  if (/nesse vídeo|neste vídeo|vou te mostrar|vou mostrar|hoje eu vou/.test(low)) out.push("Preâmbulo");
  if (/^(oi|olá|ola|e aí|fala|bom dia|boa tarde|boa noite)\b/.test(low)) out.push("Saudação no começo");
  if (/#\w/.test(text)) out.push("Hashtag no gancho");
  if (/\p{Extended_Pictographic}/u.test(text)) out.push("Emoji no gancho");
  return out;
}

export function scoreHook(raw: string): HookScore {
  const text = raw.trim();
  const low = text.toLowerCase();
  const ws = words(text);
  const proper = properIdx(text, ws);
  const parts = [
    { key: "tamanho", label: "Tamanho", value: sizeScore(ws, text) },
    { key: "especificidade", label: "Especificidade", value: specificity(ws, proper) },
    { key: "jogo", label: "O que está em jogo", value: stakes(ws, low) },
    { key: "frente", label: "Carga na frente", value: frontLoad(ws, proper, low) },
    { key: "fala", label: "Com quem fala", value: audience(ws, low) },
  ];
  const fatal = fatalErrors(text, low);
  const avg = parts.reduce((a, p) => a + p.value, 0) / parts.length;
  const min = Math.min(...parts.map((p) => p.value));
  const score = clamp(avg * 0.6 + min * 0.4 - 15 * fatal.length);
  const weakest = [...parts].sort((a, b) => a.value - b.value)[0].label;
  const verdict: Verdict = score >= 70 && min >= 55 && fatal.length === 0 ? "FORTE" : score >= 50 ? "OK" : "FRACO";
  return { score, verdict, parts, weakest, fatal };
}

export const VERDICT_TONE: Record<Verdict, string> = {
  FORTE: "bg-success/15 text-success",
  OK: "bg-warning/15 text-warning",
  FRACO: "bg-destructive/10 text-destructive",
};
