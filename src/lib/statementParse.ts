// Leitura de extratos bancários (sem React). Aceita:
// 1. Texto do extrato do Nubank (PDF copiado com Ctrl+C, ou o texto tirado do PDF enviado);
// 2. CSV do app do Nubank (Data,Valor,Identificador,Descrição) ou CSV simples (data; descrição; valor);
// 3. OFX (exportação padrão de qualquer banco).

export interface StatementRow {
  date: string; // yyyy-mm-dd
  dir: "in" | "out";
  amount: number;
  /** Tipo do movimento como o banco escreve (ex.: "Compra no débito"). */
  kind: string;
  /** Com quem (empresa/pessoa), quando o banco informa. */
  name: string;
  /** Linhas extras do banco (documento, banco, agência e conta de quem recebeu/enviou). */
  detail: string;
}

export interface StatementSummary { initial: number | null; totalIn: number | null; totalOut: number | null; final: number | null }

export interface ParsedStatement {
  format: "nubank-texto" | "csv" | "ofx";
  rows: StatementRow[];
  summary: StatementSummary | null;
  /** Nome do titular lido no cabeçalho (para achar transferências entre as próprias contas). */
  holder: string | null;
  /** Número da conta lido no cabeçalho (ex.: 57032386-0). */
  accountNumber: string | null;
}

const MONTHS: Record<string, string> = { JAN: "01", FEV: "02", MAR: "03", ABR: "04", MAI: "05", JUN: "06", JUL: "07", AGO: "08", SET: "09", OUT: "10", NOV: "11", DEZ: "12" };
const DATE_RE = /^(\d{2}) (JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ) (\d{4})(?:\s|$)/;
const AMOUNT_RE = /^(?:R\$\s?)?\d{1,3}(?:\.\d{3})*,\d{2}$/;
const SIGNED_RE = /^([+-])\s?(?:R\$\s?)?(\d{1,3}(?:\.\d{3})*,\d{2})$/;

/** "1.549,28" → 1549.28 */
export function brNumber(s: string): number {
  return Number(s.replace(/R\$|\s/g, "").replace(/\./g, "").replace(",", "."));
}

const KINDS = [
  "Transferência enviada pelo Pix", "Transferência recebida pelo Pix", "Transferência Recebida", "Transferência enviada",
  "Compra no débito via NuPay", "Compra no débito", "Pagamento de fatura", "Pagamento de boleto", "Pagamento efetuado",
  "Reembolso recebido pelo Pix", "Reembolso enviado pelo Pix", "Valor adicionado na conta por", "Valor enviado como crédito",
  "Estorno - ", "Resgate", "Aplicação", "Depósito", "Débito automático", "Boleto", "Recarga", "Saque", "Pix no Crédito",
];

/** Rodapé de página: começa a quebra de página (o cabeçalho da próxima vem em seguida). */
const FOOTER = [/^Tem alguma dúvida/i, /^metropolitanas\)/i, /^Caso a solução/i, /^disponíveis em nubank/i, /^Extrato gerado/i, /^\d+ de \d+$/, /^Atendimento/i];
/** Linha do período ("01 DE JULHO DE 2026 a 31 DE ..."): fecha o cabeçalho da página. */
const PERIOD = /\bDE \d{4} a \d{2} DE\b/i;
/** Textos de cabeçalho/rodapé de página que não são movimento. */
const NOISE = [...FOOTER, PERIOD, /^VALORES EM R\$/i, /^CPF /, /^CNPJ /];

const kindOf = (cell: string) => KINDS.find((k) => cell.startsWith(k));
const isNoise = (cell: string) => NOISE.some((r) => r.test(cell));
const cleanName = (s: string) => s.replace(/\s+-\s*$/, "").trim();

/** Quebra o texto em "células": cada linha, e dentro dela os blocos separados por 2+ espaços (texto com layout). */
function cells(text: string): string[] {
  return text.split(/\r?\n/).flatMap((l) => l.split(/\s{2,}|\t/)).map((c) => c.trim()).filter(Boolean);
}

/* ------------------------------ Resumo (cabeçalho) ------------------------------ */

function summaryOf(cs: string[]): StatementSummary | null {
  const end = cs.indexOf("Movimentações");
  if (end < 0) return null;
  const head = cs.slice(0, end);
  const after = (label: string, re: RegExp, last = false) => {
    const idxs = head.map((c, i) => (c === label ? i : -1)).filter((i) => i >= 0);
    const i = last ? idxs[idxs.length - 1] : idxs[0];
    if (i == null) return null;
    const hit = head.slice(i + 1).find((c) => re.test(c));
    return hit ? brNumber(hit.replace(/^[+-]/, "")) : null;
  };
  const signed = /^[+-]\d/;
  return {
    initial: after("Saldo inicial", AMOUNT_RE),
    totalIn: after("Total de entradas", signed),
    totalOut: after("Total de saídas", signed),
    final: after("Saldo final do período", AMOUNT_RE, true),
  };
}

function holderOf(cs: string[]): string | null {
  const first = cs.find((c) => !isNoise(c));
  if (!first || DATE_RE.test(first) || /\d,\d{2}$/.test(first)) return null;
  const name = first.replace(/[\d./-]+/g, " ").replace(/\s+/g, " ").trim();
  return name.split(" ").length >= 2 ? name : null;
}

/* ------------------------------ Movimentações (texto) ------------------------------ */

interface Pending { kind: string; name: string }
interface State {
  date: string | null; dir: "in" | "out"; pending: Pending | null; skipAmount: boolean; started: boolean; rows: StatementRow[];
  /** Último movimento lido: recebe as linhas extras (documento, banco, conta). */
  last: StatementRow | null;
  /** Dentro do rodapé + cabeçalho de uma quebra de página (pula até a linha do período). */
  pageBreak: boolean;
}

function onAmount(s: State, cell: string) {
  if (s.skipAmount) { s.skipAmount = false; return; }
  if (!s.pending || !s.date) return;
  s.last = { date: s.date, dir: s.dir, amount: brNumber(cell), kind: s.pending.kind, name: cleanName(s.pending.name), detail: "" };
  s.rows.push(s.last);
  s.pending = null;
}

function onMarker(s: State, cell: string): boolean {
  if (cell === "Movimentações") { s.started = true; return true; }
  if (cell === "Total de entradas" || cell === "Total de saídas") {
    s.dir = cell === "Total de entradas" ? "in" : "out"; s.pending = null; s.last = null; s.skipAmount = false; return true;
  }
  if (cell === "Saldo do dia" || cell === "Saldo inicial" || cell === "Saldo final do período" || cell === "Rendimento líquido") {
    s.skipAmount = true; s.pending = null; s.last = null; return true;
  }
  return false;
}

/** Linha de data ("09 JUL 2026"), que pode trazer o "Total de ..." na mesma linha. */
function onDate(s: State, cell: string): boolean {
  const d = DATE_RE.exec(cell);
  if (!d || PERIOD.test(cell)) return false;
  s.date = `${d[3]}-${MONTHS[d[2]]}-${d[1]}`; s.started = true; s.pending = null; s.last = null;
  onMarker(s, cell.slice(d[0].length).trim());
  return true;
}

/** Quebra de página: pula rodapé e cabeçalho; as linhas extras do último movimento continuam depois dela. */
function onPage(s: State, cell: string): boolean {
  if (FOOTER.some((r) => r.test(cell))) { s.pageBreak = true; return true; }
  if (s.pageBreak) { if (PERIOD.test(cell)) s.pageBreak = false; return true; }
  return isNoise(cell);
}

/** Texto que não é tipo nem valor: nome de quem recebeu/enviou ou linha extra (documento, banco, conta). */
function onText(s: State, cell: string) {
  if (s.pending) s.pending.name = s.pending.name ? `${s.pending.name} ${cell}` : cell;
  else if (s.last && s.last.detail.length < 240) s.last.detail = `${s.last.detail} ${cell}`.trim();
}

function step(s: State, cell: string) {
  if (onDate(s, cell) || onPage(s, cell) || onMarker(s, cell) || !s.started || SIGNED_RE.test(cell)) return;
  if (AMOUNT_RE.test(cell)) { onAmount(s, cell); return; }
  const kind = kindOf(cell);
  if (kind) { s.skipAmount = false; s.last = null; s.pending = { kind: kind.replace(/ - $/, "").trim(), name: cell.slice(kind.length).trim() }; return; }
  onText(s, cell);
}

function parseNubankText(text: string): ParsedStatement {
  const cs = cells(text);
  const summary = summaryOf(cs);
  const s: State = { date: null, dir: "out", pending: null, skipAmount: false, started: !cs.includes("Movimentações"), rows: [], last: null, pageBreak: false };
  for (const c of cs) step(s, c);
  const head = cs.slice(0, Math.max(0, cs.indexOf("Movimentações")));
  return { format: "nubank-texto", rows: s.rows, summary, holder: holderOf(cs), accountNumber: head.find((c) => /^\d{5,}-\d$/.test(c)) ?? null };
}

/* ------------------------------ CSV ------------------------------ */

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`\\s*(?:"((?:[^"]|"")*)"|([^${sep}]*))\\s*(?:${sep}|$)`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) && m.index < line.length) out.push((m[1] ?? m[2] ?? "").replace(/""/g, '"').trim());
  return out;
}

function csvDate(s: string): string | null {
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return iso ? iso[0] : null;
}

function csvNumber(s: string): number {
  const v = s.replace(/R\$|\s/g, "");
  return /,\d{1,2}$/.test(v) ? brNumber(v) : Number(v);
}

/** Descrição do Nubank: "Tipo - Nome - documento - banco". */
function splitDescription(desc: string): { kind: string; name: string; detail: string } {
  const parts = desc.split(" - ");
  if (parts.length >= 2 && kindOf(parts[0])) return { kind: parts[0].trim(), name: parts[1].trim(), detail: parts.slice(2).join(" - ") };
  const kind = kindOf(desc);
  return kind ? { kind, name: desc.slice(kind.length).replace(/^\s*-\s*/, "").trim(), detail: "" } : { kind: "", name: desc.trim(), detail: "" };
}

function parseCsv(text: string): ParsedStatement {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const sep = (lines[0].match(/;/g) ?? []).length > (lines[0].match(/,/g) ?? []).length ? ";" : ",";
  const head = splitCsvLine(lines[0], sep).map((h) => h.toLowerCase());
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const iDate = col(/data|date/), iVal = col(/valor|amount|value/), iDesc = col(/descri|hist|memo|lan/);
  const rows = lines.slice(1).flatMap((l): StatementRow[] => {
    const c = splitCsvLine(l, sep);
    const date = csvDate(c[iDate] ?? ""), v = csvNumber(c[iVal] ?? "");
    if (!date || !Number.isFinite(v) || v === 0) return [];
    return [{ date, dir: v > 0 ? "in" : "out", amount: Math.abs(v), ...splitDescription(c[iDesc] ?? "") }];
  });
  return { format: "csv", rows, summary: null, holder: null, accountNumber: null };
}

/* ------------------------------ OFX ------------------------------ */

function parseOfx(text: string): ParsedStatement {
  const tag = (block: string, t: string) => new RegExp(`<${t}>([^<\\r\\n]*)`, "i").exec(block)?.[1].trim() ?? "";
  const rows = (text.match(/<STMTTRN>[\s\S]*?(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>)/gi) ?? []).flatMap((b): StatementRow[] => {
    const d = tag(b, "DTPOSTED"), v = Number(tag(b, "TRNAMT").replace(",", "."));
    if (!/^\d{8}/.test(d) || !Number.isFinite(v) || v === 0) return [];
    return [{ date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, dir: v > 0 ? "in" : "out", amount: Math.abs(v), ...splitDescription(tag(b, "MEMO") || tag(b, "NAME")) }];
  });
  return { format: "ofx", rows, summary: null, holder: null, accountNumber: tag(text, "ACCTID") || null };
}

/** Descobre o formato e lê. */
export function parseStatement(text: string): ParsedStatement {
  const t = text.replace(new RegExp(String.fromCharCode(0xfeff), "g"), "");
  if (/<OFX>|<STMTTRN>/i.test(t)) return parseOfx(t);
  const first = t.split(/\r?\n/).find((l) => l.trim()) ?? "";
  if (/data|date/i.test(first) && /valor|amount|value/i.test(first) && /[,;]/.test(first)) return parseCsv(t);
  return parseNubankText(t);
}

/** Soma de entradas e saídas lidas (para conferir com o resumo do extrato). */
export function rowTotals(rows: StatementRow[]) {
  const sum = (dir: "in" | "out") => Math.round(rows.filter((r) => r.dir === dir).reduce((a, r) => a + r.amount, 0) * 100) / 100;
  return { totalIn: sum("in"), totalOut: sum("out") };
}
