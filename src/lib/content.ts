// Módulo Conteúdo: etapas, checklist, CSV do calendário, alertas, medianas e os pedidos para o chat Social Media.
import type { ContentItem, ContentMetric, ContentStage, ContentStory, ClientQuestion, Recording, RecordingStatus, RecordingTopic } from "@/integrations/supabase/types";

export const FLOW: ContentStage[] = ["ideia", "roteiro", "gravacao", "edicao", "aprovado", "agendado", "publicado"];
export const FORMATS = ["Reels", "Carrossel", "Post", "Story", "Newsletter"];
export const SOCIAL = ["Instagram", "TikTok", "YouTube", "LinkedIn", "Facebook", "Newsletter"];
export const PILLARS = ["Educar", "Bastidor", "Prova", "Opinião", "Venda"];

export const CHECKLIST = [
  { key: "caso", label: "Nasceu de um caso concreto." },
  { key: "conferir", label: "Nenhum [CONFERIR] no texto." },
  { key: "linha1", label: "Primeira linha é promessa ou número." },
  { key: "cta", label: "Uma chamada só." },
  { key: "hashtags", label: "Até 5 hashtags, só descritivas." },
  { key: "voz", label: "Li em voz alta e soa como eu." },
] as const;

/** Só deixa ir para "Aprovado" (ou depois) com tudo marcado. */
export const checklistDone = (c: Pick<ContentItem, "checklist">) => CHECKLIST.every((k) => c.checklist?.[k.key]);
export const needsChecklist = (stage: ContentStage) => ["aprovado", "agendado", "publicado"].includes(stage);

export const isSale = (c: Pick<ContentItem, "pillar" | "objective">) => /venda/i.test(`${c.pillar ?? ""} ${c.objective ?? ""}`);
const day = (c: Pick<ContentItem, "publish_at" | "due_date">) => (c.publish_at ?? c.due_date ?? "").slice(0, 10);

/** Conferências do Kit sobre o calendário. */
export function calendarAlerts(items: ContentItem[]): string[] {
  const list = items.filter((c) => day(c)).sort((a, b) => day(a).localeCompare(day(b)));
  const out: string[] = [];
  const sales = list.filter(isSale).length;
  if (sales > Math.max(1, Math.ceil(list.length / 4))) out.push(`${sales} posts de venda em ${list.length}: o ideal é no máximo 1 a cada 4.`);
  list.forEach((c, i) => {
    const prev = list[i - 1];
    if (prev && c.pillar && prev.pillar === c.pillar && (new Date(day(c)).getTime() - new Date(day(prev)).getTime()) <= 86400000)
      out.push(`Mesmo pilar (${c.pillar}) em dias seguidos: ${prev.title} e ${c.title}.`);
  });
  const noCta = list.filter((c) => !c.cta?.trim());
  if (noCta.length) out.push(`${noCta.length} post(s) sem chamada (CTA): ${noCta.slice(0, 3).map((c) => c.title).join(", ")}${noCta.length > 3 ? "…" : ""}.`);
  const weeks = new Map<string, ContentItem[]>();
  list.forEach((c) => { const d = new Date(`${day(c)}T12:00:00`); const k = new Date(d.getTime() - ((d.getDay() + 6) % 7) * 86400000).toISOString().slice(0, 10); weeks.set(k, [...(weeks.get(k) ?? []), c]); });
  weeks.forEach((w, k) => { if (!w.some((c) => c.cta?.trim())) out.push(`Semana de ${k.split("-").reverse().join("/")} sem nenhuma chamada pra ação.`); });
  return out;
}

/* ------------------------------ CSV do calendário ------------------------------ */

export const CSV_COLUMNS = ["data", "hora", "plataforma", "formato", "pilar", "titulo", "gancho", "objetivo", "cta"] as const;
export interface CsvRow { line: number; values: Record<string, string>; errors: string[] }

function splitCsv(line: string, sep: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i += 1; } else q = !q; }
    else if (ch === sep && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

export function parseCalendarCsv(text: string): CsvRow[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const sep = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const head = splitCsv(lines[0], sep).map((h) => h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
  return lines.slice(1).map((l, i) => {
    const cells = splitCsv(l, sep);
    const values = Object.fromEntries(CSV_COLUMNS.map((c) => [c, cells[head.indexOf(c)] ?? ""]));
    const errors: string[] = [];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.data)) errors.push("data fora do formato AAAA-MM-DD");
    if (values.hora && !/^\d{1,2}:\d{2}$/.test(values.hora)) errors.push("hora fora do formato HH:MM");
    if (!values.titulo && !values.gancho) errors.push("sem título nem gancho");
    return { line: i + 2, values, errors };
  });
}

export function csvToItem(v: Record<string, string>) {
  const hora = v.hora || "09:00";
  return {
    title: v.titulo || v.gancho, hook: v.gancho || null, channel: v.plataforma || "Instagram", kind: v.formato || "Post",
    pillar: v.pilar || null, objective: v.objetivo || null, cta: v.cta || null, stage: "ideia",
    publish_at: new Date(`${v.data}T${hora.padStart(5, "0")}:00`).toISOString(),
  };
}

/* ------------------------------ Números ------------------------------ */

export function median(nums: number[]): number {
  const a = nums.filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
  if (!a.length) return 0;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export const multiple = (views: number | null, med: number | null) => (views && med ? views / med : null);
export const fmtNum = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("pt-BR"));

/** Última medição de cada peça. */
export function latestByItem(metrics: ContentMetric[]): Map<string, ContentMetric> {
  const m = new Map<string, ContentMetric>();
  [...metrics].sort((a, b) => a.measured_on.localeCompare(b.measured_on)).forEach((x) => m.set(x.item_id, x));
  return m;
}

/* ------------------------------ Pedidos para o Claude ------------------------------ */

const bullets = (l: string[]) => (l.length ? l.map((x) => `- ${x}`).join("\n") : "- (nada cadastrado)");

export function promptPauta(stories: ContentStory[], questions: ClientQuestion[], persona?: string | null) {
  const free = stories.filter((s) => !s.used_item_ids?.length);
  return [
    "Etapa 1, pauta da gravação.",
    persona ? `\nQuem sou e pra quem falo: ${persona}` : "",
    "\nHistórias ainda não usadas:",
    bullets(free.map((s) => [s.title, s.number, s.result].filter(Boolean).join(" · "))),
    "\nPerguntas de clientes:",
    bullets(questions.filter((q) => !q.used).map((q) => q.text)),
    "\nMonte a pauta de 30 minutos e me devolva também em CSV (assunto,caso,numero,formato,minutos) pra eu importar no Superflow.",
  ].join("\n");
}

export const promptMapa = (r?: Recording | null) =>
  `Etapa 2, mapa de cortes. Transcrição abaixo:\n\n${r?.transcript?.trim() || "[COLE A TRANSCRIÇÃO AQUI]"}`;

export const promptPacote = (title: string) => `Etapa 3, pacote do item: ${title}`;

export const promptCalendario = () =>
  `Etapa 4, calendário do mês. Me devolva em CSV com as colunas exatamente assim: ${CSV_COLUMNS.join(",")} (data AAAA-MM-DD, hora HH:MM).`;

export function promptRelatorio(rows: { title: string; kind: string; formula: string; m: ContentMetric }[]) {
  const head = "| Post | Formato | Fórmula | Views | Retenção 3s | Salvamentos | Comentários |\n|---|---|---|---|---|---|---|";
  const body = rows.map((r) => `| ${r.title} | ${r.kind} | ${r.formula || "—"} | ${fmtNum(r.m.views)} | ${r.m.retention3s ?? "—"}% | ${fmtNum(r.m.saves)} | ${fmtNum(r.m.comments)} |`).join("\n");
  return `Etapa 6, relatório da semana.\n\n${head}\n${body || "| (sem métricas na semana) | | | | | | |"}`;
}

export const WHISPER = "whisper gravacao.m4a --model small --language pt --output_format txt";

/* ------------------------------ Gravações ------------------------------ */

export const REC_STATUS: { value: RecordingStatus; label: string }[] = [
  { value: "pauta", label: "Pauta pronta" }, { value: "gravado", label: "Gravado" }, { value: "transcrito", label: "Transcrito" },
  { value: "mapa", label: "Mapa feito" }, { value: "pecas", label: "Peças geradas" },
];

/** Lê a pauta colada em CSV: assunto,caso,numero,formato,minutos (com ou sem cabeçalho). */
export function parseTopics(text: string): RecordingTopic[] {
  return text.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean)
    .map((l) => l.split(/[;,](?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, "").trim()))
    .filter((c) => c[0] && !/^assunto$/i.test(c[0]))
    .map(([assunto, caso, numero, formato, minutos]) => ({ assunto, caso, numero, formato, minutos: minutos ? Number(minutos.replace(",", ".")) || undefined : undefined }));
}


/** Pendências do módulo (aparecem na Central e na lista de pendências). */
export const PENDENCIAS = [
  { t: "1 take, 5 reels", o: "Gravar 1 vez e editar 5 versões (CapCut), com 5 ganchos e 5 legendas", w: "Claude + CapCut. Fase 2" },
  { t: "Zernio", o: "Agendar em várias redes, ler comentários e puxar métricas sozinho (substitui a entrada manual da Análise)", w: "Integração. 2 contas grátis, depois US$ 6/conta/mês" },
  { t: "Automação de comentário pro direct", o: "Quem comenta a palavra recebe o material no direct", w: "Zernio ou ManyChat" },
  { t: "Instagram Agent Skill completa", o: "Régua oficial, roteiro cronometrado, pesquisa de nicho", w: "Claude Code" },
  { t: "Content Principles", o: "Skill que melhora roteiro e audita o que já postei", w: "Claude (app)" },
  { t: "Em alta automático", o: "Busca diária em fontes, com resumo às 7h", w: "Edge function + pg_cron" },
  { t: "Watch (analisar vídeo de referência)", o: "O Claude assiste um reel e devolve gancho e estrutura", w: "Claude Code" },
];


/** Cor e texto do múltiplo de um reel de referência. */
export function multipleBadge(m: number | null): { text: string; tone: string; note: string } {
  if (m == null) return { text: "—", tone: "bg-muted", note: "" };
  if (m >= 3) return { text: `${m.toFixed(1)}x`, tone: "bg-success/15 text-success", note: " · sinal" };
  if (m < 1.5) return { text: `${m.toFixed(1)}x`, tone: "bg-muted text-muted-foreground", note: " · dia normal da conta" };
  return { text: `${m.toFixed(1)}x`, tone: "bg-warning/15 text-warning", note: "" };
}

/** Parágrafo "quem sou" que vai nos pedidos. */
export function personaText(s: { persona: string | null; frequency: string | null; platforms: string | null } | null | undefined) {
  if (!s) return "";
  return [s.persona, s.frequency && `Frequência: ${s.frequency}`, s.platforms && `Plataformas: ${s.platforms}`].filter(Boolean).join(". ");
}
