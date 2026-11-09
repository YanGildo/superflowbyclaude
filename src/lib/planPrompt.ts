// Prompt universal dos planos de ação: qualquer IA devolve um JSON que o Superflow transforma em plano.
import type { ActionAssetKind } from "@/integrations/supabase/types";

/** Telas do Superflow que um passo pode abrir (o botão da etapa). */
const SCREENS = [
  "/hoje", "/tarefas", "/projetos", "/metas", "/funis", "/comercial", "/prospeccao", "/scripts", "/whatsapp",
  "/marketing", "/marketing/conteudo", "/marketing/campanhas-dashboard", "/marketing/entregas", "/financeiro",
];

export const UNIVERSAL_PLAN_PROMPT = `Você vai transformar o planejamento que eu descrever em um PLANO DE AÇÃO para o meu sistema (Superflow).
Responda SOMENTE com um bloco de código JSON válido, sem nenhum texto antes ou depois, neste formato exato:

\`\`\`json
{
  "title": "Nome curto do plano",
  "goal": "Meta em uma frase, com número e prazo",
  "summary": "Resumo de 2 a 4 frases do que o plano faz",
  "document": "O plano completo em markdown (contexto, estratégia, detalhes). Pode ser longo.",
  "steps": [
    {
      "phase": "Semana 1 · Preparar",
      "title": "O que fazer, começando com verbo",
      "details": "Como fazer, em 1 a 4 frases ou uma lista curta em markdown",
      "due_date": "AAAA-MM-DD ou null",
      "repeat": false,
      "link_path": "uma das telas abaixo ou null",
      "link_label": "Texto do botão ou null"
    }
  ],
  "assets": [
    {
      "kind": "script | prompt | nota | link",
      "title": "Nome do material",
      "body": "O texto completo (mensagem, prompt, roteiro...)",
      "url": "https://... ou null",
      "step": "título EXATO da etapa a que pertence, ou null"
    }
  ],
  "metrics": ["Nomes dos números para acompanhar toda semana (opcional)"]
}
\`\`\`

Regras:
1. Agrupe as etapas em fases na ordem em que acontecem (ex.: "Semana 1 · Preparar", "Fase 2 · Lançar"). Use o mesmo texto de fase em todas as etapas da mesma fase.
2. Cada etapa é UMA ação concreta e verificável. Entre 5 e 30 etapas no total.
3. "repeat": true só para rotinas que se repetem (ex.: "Mandar 20 mensagens por dia"); elas não são marcadas como feitas.
4. Coloque em "assets" tudo que for para copiar e usar: mensagens de WhatsApp/Instagram (kind "script"), prompts para IA (kind "prompt"), observações (kind "nota") e links úteis (kind "link").
5. "link_path" só pode ser uma destas telas, ou null: ${SCREENS.join(", ")}.
6. Datas no formato AAAA-MM-DD. Se eu não falar de datas, use null.
7. Escreva em português do Brasil, direto e simples. Não invente números que eu não dei; se faltar algo, deixe claro no "document".
8. O JSON precisa ser válido: aspas duplas, sem vírgula sobrando, quebras de linha dentro de textos como \\n.

Meu planejamento:
[descreva aqui o que você quer: objetivo, prazo, contexto, o que já tem e o que precisa]`;

export interface ImportedStep {
  phase: string; title: string; details: string | null; due_date: string | null; repeat: boolean; link_path: string | null; link_label: string | null;
}
export interface ImportedAsset { kind: ActionAssetKind; title: string; body: string | null; url: string | null; step: string | null }
export interface ImportedPlan {
  title: string; goal: string | null; summary: string | null; document: string | null;
  steps: ImportedStep[]; assets: ImportedAsset[]; metrics: string[];
}

type Raw = Record<string, unknown>;
const str = (v: unknown, max = 20000) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const KINDS: ActionAssetKind[] = ["script", "prompt", "nota", "link"];
const isDate = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const isPath = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v.slice(0, 200) : null);

/** Pega o JSON de dentro da resposta da IA (com ou sem ```json, com texto em volta). */
function extractJson(text: string): Raw {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!candidate.trim()) throw new Error("Não encontrei um JSON no texto colado.");
  try { return JSON.parse(candidate) as Raw; } catch {
    throw new Error("O JSON veio com erro de formato. Peça para a IA corrigir e devolver só o JSON.");
  }
}

function toStep(r: Raw, i: number): ImportedStep | null {
  const title = str(r.title, 300);
  if (!title) return null;
  return {
    phase: str(r.phase, 120) ?? "Etapas", title, details: str(r.details, 4000), due_date: isDate(str(r.due_date, 10)),
    repeat: r.repeat === true, link_path: isPath(str(r.link_path, 200)), link_label: str(r.link_label, 60) ?? (isPath(str(r.link_path)) ? `Abrir (${i + 1})` : null),
  };
}

function toAsset(r: Raw): ImportedAsset | null {
  const title = str(r.title, 200);
  if (!title) return null;
  const kind = KINDS.includes(r.kind as ActionAssetKind) ? (r.kind as ActionAssetKind) : "nota";
  return { kind, title, body: str(r.body), url: str(r.url, 500), step: str(r.step, 300) };
}

/** Lê o texto colado e devolve o plano pronto para gravar (ou um erro explicando o que falta). */
export function parseImportedPlan(text: string): ImportedPlan {
  const raw = extractJson(text);
  const title = str(raw.title, 200);
  if (!title) throw new Error("O plano veio sem \"title\" (nome do plano).");
  const list = (v: unknown) => (Array.isArray(v) ? (v as Raw[]).filter((x) => x && typeof x === "object") : []);
  const steps = list(raw.steps).map(toStep).filter(Boolean) as ImportedStep[];
  if (!steps.length) throw new Error("O plano veio sem etapas (\"steps\").");
  const assets = list(raw.assets).map(toAsset).filter(Boolean) as ImportedAsset[];
  const metrics = Array.isArray(raw.metrics) ? (raw.metrics as unknown[]).map((m) => str(m, 80)).filter(Boolean) as string[] : [];
  return { title, goal: str(raw.goal, 300), summary: str(raw.summary, 2000), document: str(raw.document, 60000), steps, assets, metrics };
}

/** Texto do documento com os números da semana sugeridos (quando vierem). */
export function documentWithMetrics(p: ImportedPlan) {
  if (!p.metrics.length) return p.document;
  const block = `\n\n## Números para acompanhar toda semana\n${p.metrics.map((m) => `- ${m}`).join("\n")}`;
  return `${p.document ?? ""}${block}`.trim();
}
