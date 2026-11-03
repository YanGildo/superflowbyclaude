// Do extrato lido para lançamentos do Superflow (sem React): tipo, categoria sugerida, transferências
// entre as próprias contas e a "impressão digital" (import_key) que impede importar a mesma linha duas vezes.
import type { FinCategory, UseType } from "@/integrations/supabase/types";
import type { StatementRow } from "@/lib/statementParse";

export interface ImportAccount { id: string; name: string; number: string | null; business_id: string | null }

export interface ImportOptions {
  account: ImportAccount;
  /** Todas as contas (para reconhecer transferências entre elas). */
  accounts: ImportAccount[];
  /** Nome do titular (o seu nome como o banco escreve). */
  holder: string | null;
  useType: UseType;
  categories: Pick<FinCategory, "id" | "name" | "kind">[];
  /** Categorias que você escolheu antes para um nome (aprendidas nas importações). */
  rules: Record<string, string>;
}

export interface ImportLine {
  key: string;
  row: StatementRow;
  type: "entrada" | "saida" | "transferencia";
  description: string;
  method: string | null;
  /** id de categoria existente OU nome de categoria a criar. */
  category: { id: string | null; name: string | null };
  fromId: string | null;
  toId: string | null;
  /** Texto para mostrar quando é transferência entre suas contas. */
  transfer: string | null;
}

export const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/** Nome curto de quem recebeu/enviou (sem documento e banco). */
export const shortName = (r: StatementRow) => (r.name.split(" - ")[0] || r.kind).replace(/\s+\(Transferência.*$/, "").trim();

/** Chave do nome usada nas regras aprendidas. */
export const nameKey = (r: StatementRow) => norm(shortName(r)).slice(0, 40) || norm(r.kind);

/* ------------------------------ Categorias sugeridas ------------------------------ */

const RULES: { cat: string; dir: "in" | "out" | "any"; re: RegExp }[] = [
  { cat: "Fatura do cartão", dir: "out", re: /^pagamento de fatura|valor enviado como credito/ },
  { cat: "Estornos e reembolsos", dir: "in", re: /^estorno|^reembolso/ },
  { cat: "Vendas", dir: "in", re: /telepagamentos|epague|nexus marketplace|marketplace seguro|santa marial|pagar me|wise brasil|hotmart|kiwify|eduzz|monetizze|stripe|pushinpay/ },
  { cat: "Tráfego pago", dir: "out", re: /facebook|bytedance|tiktok|google ads|meta platforms/ },
  { cat: "Transporte", dir: "out", re: /\buber\b|uberrides|\b99 tecnologia|via nupay 99|\bposto\b|autoposto|combust|lava jato|estaciona|auto ban|bus servicos|centro automotivo/ },
  { cat: "Saúde", dir: "out", re: /farmacia|drogaria|drogal|droga|total pass|growth supplements/ },
  { cat: "Moradia", dir: "out", re: /\btim s a\b|desktop s a|trazgaz|\bgas\b|sabesp|cpfl|enel|\bvivo\b|\bclaro\b/ },
  { cat: "Lazer", dir: "out", re: /cinema|ingresso|airbnb|hostel|moteis|zig tecnologia|arzopa eventos/ },
  { cat: "Ferramentas / SaaS", dir: "out", re: /openai|anthropic|claude|canva|lovable|notion|supabase|vercel|apify|google workspace|chatgpt/ },
  { cat: "Alimentação", dir: "out", re: /restaurante|lanchonete|lanches|burger|bobs|esfiha|pastel|padaria|sushi|\bbar\b|boteco|choperia|supermerc|mercad|assai|atacad|peixaria|espetinho|sorvete|\b99 food|ifood|zamp|covabra|pague men|poupe|petisco|culinaria|bebidas|adega|conveniencia|fazenda|lider paulinia|acougue|hortifruti|pizza|cafe/ },
];

function suggestCategory(r: StatementRow, o: ImportOptions, type: "entrada" | "saida"): ImportLine["category"] {
  const learned = o.rules[nameKey(r)];
  if (learned && o.categories.some((c) => c.id === learned)) return { id: learned, name: null };
  const raw = `${r.kind} ${shortName(r)}`;
  // Com e sem números (ex.: "99 Tecnologia" precisa dos números; "Loja 10" não).
  const texts = [norm(raw), raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()];
  const hit = RULES.find((x) => (x.dir === "any" || x.dir === r.dir) && texts.some((t) => x.re.test(t)));
  if (!hit) return { id: null, name: null };
  const found = o.categories.find((c) => c.name === hit.cat && (c.kind === type || c.kind === "ambos"));
  return found ? { id: found.id, name: null } : { id: null, name: hit.cat };
}

/* ------------------------------ Transferências entre suas contas ------------------------------ */

/** Outra conta sua citada na linha (pelo número da conta), ou "fora" quando é você numa conta que não está no Superflow. */
function selfTarget(r: StatementRow, o: ImportOptions): ImportAccount | "fora" | null {
  const text = norm(`${r.name} ${r.detail}`);
  const det = digits(r.detail);
  const other = o.accounts.find((a) => a.id !== o.account.id && digits(a.number).length >= 5 && det.includes(digits(a.number)));
  if (other) return other;
  const me = o.holder ? norm(o.holder) : "";
  return me.length >= 6 && text.includes(me) ? "fora" : null;
}

function methodOf(kind: string): string | null {
  if (/pix/i.test(kind)) return "Pix";
  if (/débito/i.test(kind)) return "Débito";
  if (/fatura|crédito/i.test(kind)) return "Cartão";
  if (/boleto/i.test(kind)) return "Boleto";
  return null;
}

function transferLine(r: StatementRow, o: ImportOptions, target: ImportAccount | "fora"): Pick<ImportLine, "type" | "fromId" | "toId" | "transfer"> {
  const otherId = target === "fora" ? null : target.id;
  const otherName = target === "fora" ? "outra conta sua (fora do Superflow)" : target.name;
  return r.dir === "out"
    ? { type: "transferencia", fromId: o.account.id, toId: otherId, transfer: `Para ${otherName}` }
    : { type: "transferencia", fromId: otherId, toId: o.account.id, transfer: `De ${otherName}` };
}

/** Dinheiro que entra na conta vindo do cartão de crédito (Pix no crédito): não é receita. */
const fromCard = (r: StatementRow) => r.dir === "in" && /^Valor adicionado na conta por/.test(r.kind);

/* ------------------------------ Montagem ------------------------------ */

const cents = (v: number) => Math.round(v * 100);

function baseKey(l: Omit<ImportLine, "key">, o: ImportOptions): string {
  const r = l.row;
  // Transferência entre duas contas do Superflow: a mesma chave dos dois lados (não duplica ao importar os dois extratos).
  if (l.type === "transferencia" && l.fromId && l.toId) return `tr:${r.date}:${cents(r.amount)}:${l.fromId}>${l.toId}`;
  return `${o.account.id}:${r.date}:${r.dir}:${cents(r.amount)}:${nameKey(r)}`;
}

function lineOf(r: StatementRow, o: ImportOptions): Omit<ImportLine, "key"> {
  const base = { row: r, description: shortName(r), method: methodOf(r.kind) };
  if (fromCard(r)) return { ...base, type: "transferencia", fromId: null, toId: o.account.id, transfer: "Do cartão de crédito (Pix no crédito)", category: { id: null, name: null }, description: "Pix no crédito (do cartão)" };
  const target = selfTarget(r, o);
  if (target) return { ...base, ...transferLine(r, o, target), category: { id: null, name: null } };
  const type = r.dir === "in" ? "entrada" : "saida";
  return { ...base, type, fromId: null, toId: null, transfer: null, category: suggestCategory(r, o, type) };
}

/** Linhas prontas para a prévia, cada uma com a sua chave única (repetições iguais no mesmo dia ganham #2, #3...). */
export function buildLines(rows: StatementRow[], o: ImportOptions): ImportLine[] {
  const seen = new Map<string, number>();
  return rows.map((r) => {
    const l = lineOf(r, o);
    const k = baseKey(l, o);
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    return { ...l, key: n > 1 ? `${k}#${n}` : k };
  });
}

export interface TxInsert {
  workspace_id: string; business_id: string | null; type: ImportLine["type"]; amount: number; date: string; description: string;
  category_id: string | null; account_id: string | null; to_account_id: string | null; method: string | null;
  status: "pago"; use_type: UseType; import_key: string; notes: string | null;
}

/** Lançamentos para gravar (categorias por nome já resolvidas em ids). */
export function toInserts(lines: ImportLine[], o: ImportOptions, workspaceId: string, catIds: Record<string, string>): TxInsert[] {
  return lines.map((l) => ({
    workspace_id: workspaceId, business_id: o.account.business_id, type: l.type, amount: l.row.amount, date: l.row.date,
    description: l.description, category_id: l.category.id ?? (l.category.name ? catIds[l.category.name] ?? null : null),
    account_id: l.type === "transferencia" ? l.fromId : o.account.id, to_account_id: l.type === "transferencia" ? l.toId : null,
    method: l.method, status: "pago", use_type: o.useType, import_key: l.key,
    notes: [l.row.kind, l.transfer].filter(Boolean).join(" · ") || null,
  }));
}

/** Resumo da prévia. */
export function linesSummary(lines: ImportLine[]) {
  const sum = (f: (l: ImportLine) => boolean) => Math.round(lines.filter(f).reduce((a, l) => a + l.row.amount, 0) * 100) / 100;
  return {
    entradas: sum((l) => l.type === "entrada"), saidas: sum((l) => l.type === "saida"),
    transferencias: lines.filter((l) => l.type === "transferencia").length,
    semCategoria: lines.filter((l) => l.type !== "transferencia" && !l.category.id && !l.category.name).length,
  };
}
