// Formulários do site (rgmarketingbr.com/<slug>): tipos e funções puras. O conteúdo é o mesmo que o site lê.

export type ContactField = "name" | "whatsapp" | "email" | "company" | "instagram" | "country" | "segment" | "temperature";

export interface FormStep {
  id: string;
  q: string;
  hint?: string;
  kind: "text" | "options";
  input?: "text" | "tel" | "email";
  placeholder?: string;
  optional?: boolean;
  options?: string[];
  when?: { step: string; in: string[]; not?: boolean };
  map?: ContactField;
  values?: Record<string, string>;
  label: string;
}

export interface FormContent {
  seo?: { title?: string; description?: string };
  intro?: { eyebrow?: string; title?: string; highlight?: string; subtitle?: string; button?: string };
  done?: { eyebrow?: string; title?: string; text?: string; button?: string; whatsapp?: string; message?: string };
  privacy?: string;
  steps: FormStep[];
}

export interface SiteForm {
  id: string; workspace_id: string; business_id: string | null; slug: string; name: string; active: boolean;
  pipeline_id: string | null; stage_id: string | null; source: string; content: FormContent; created_at: string; updated_at: string;
}

export interface FormResponse {
  id: string; form_id: string; lead_key: string; contact_id: string | null; name: string | null; whatsapp: string | null;
  answers: { q: string; a: string }[]; utm: Record<string, string>; done: boolean; created_at: string; updated_at: string;
}

export const SITE_URL = "https://rgmarketingbr.com";

/** Endereços que já existem no site e não podem virar formulário (a base do banco também bloqueia). */
export const RESERVED_SLUGS = ["usa", "brasil", "portfolio", "auth", "admin", "api", "f", "paginas", "sitemap", "cidadanianow", "martec-portas-de-aco", "new-doors-portas-automaticas", "prime-portas-automaticas"];

export const CONTACT_FIELDS: { value: ContactField | ""; label: string }[] = [
  { value: "", label: "Só guardar a resposta" },
  { value: "name", label: "Nome do contato" }, { value: "whatsapp", label: "WhatsApp" }, { value: "email", label: "E-mail" },
  { value: "company", label: "Empresa" }, { value: "instagram", label: "Instagram / site" }, { value: "country", label: "País" },
  { value: "segment", label: "Segmento" }, { value: "temperature", label: "Temperatura do lead" },
];

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

export const slugError = (slug: string, taken: string[]) => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 2) return "Use letras minúsculas, números e hífen (mínimo 2 caracteres).";
  if (RESERVED_SLUGS.includes(slug)) return "Esse endereço já é uma página do site.";
  if (taken.includes(slug)) return "Já existe um formulário com esse endereço.";
  return null;
};

/** Próximo endereço livre: diagnostico → diagnostico-2 → diagnostico-3... */
export function nextSlug(base: string, taken: string[]) {
  const root = base.replace(/-\d+$/, "");
  if (!taken.includes(root) && !RESERVED_SLUGS.includes(root)) return root;
  for (let n = 2; n < 100; n++) if (!taken.includes(`${root}-${n}`)) return `${root}-${n}`;
  return `${root}-${Date.now()}`;
}

/** Id curto e único para uma pergunta nova. */
export const newStepId = (steps: FormStep[]) => {
  let n = steps.length + 1;
  while (steps.some((s) => s.id === `p${n}`)) n++;
  return `p${n}`;
};

export const emptyStep = (steps: FormStep[]): FormStep => ({ id: newStepId(steps), q: "Nova pergunta", kind: "options", options: ["Opção 1", "Opção 2"], label: "Nova pergunta" });

/** Conteúdo mínimo de um formulário novo em branco. */
export const blankContent = (): FormContent => ({
  seo: { title: "RG Marketing", description: "" },
  intro: { eyebrow: "Diagnóstico gratuito", title: "Vamos conversar sobre o seu negócio?", highlight: "", subtitle: "Responda algumas perguntas rápidas.", button: "Começar" },
  done: { eyebrow: "Tudo certo", title: "Obrigado, {nome}!", text: "Toque no botão abaixo e continue a conversa no WhatsApp.", button: "Falar no WhatsApp", whatsapp: "5519982350262", message: "Olá! Acabei de preencher o formulário no site." },
  privacy: "Usamos seus dados só para falar com você.",
  steps: [
    { id: "nome", q: "Para começar, como você se chama?", kind: "text", placeholder: "Seu nome", label: "Nome", map: "name" },
    { id: "whatsapp", q: "Prazer, {nome}! Qual o seu WhatsApp?", hint: "Com o código do país.", kind: "text", input: "tel", placeholder: "+351 ...", label: "WhatsApp", map: "whatsapp" },
  ],
});

const stepProblem = (s: FormStep, all: FormStep[]): string | null => {
  if (!s.q.trim()) return "Há uma pergunta sem texto.";
  if (s.kind === "options" && (s.options ?? []).filter((o) => o.trim()).length < 2) return `A pergunta “${s.q}” precisa de pelo menos 2 opções.`;
  const dep = s.when?.step;
  if (dep && !all.some((o) => o.id === dep)) return `A pergunta “${s.q}” depende de uma pergunta que não existe mais.`;
  return null;
};

/** Problemas que impedem o formulário de funcionar (mostrados antes de salvar). */
export function validateContent(c: FormContent): string | null {
  if (!c.steps.length) return "Adicione pelo menos uma pergunta.";
  if (!c.steps.some((s) => s.map === "name")) return "Uma pergunta precisa preencher o campo “Nome do contato”.";
  if (!c.steps.some((s) => s.map === "whatsapp")) return "Uma pergunta precisa preencher o campo “WhatsApp”.";
  const bad = c.steps.map((s) => stepProblem(s, c.steps)).find(Boolean);
  if (bad) return bad;
  return (c.done?.whatsapp ?? "").replace(/\D/g, "").length < 10 ? "Confira o WhatsApp do botão final (com código do país, só números)." : null;
}

/** Remove opções vazias e limpa o que o site não precisa. */
export function cleanContent(c: FormContent): FormContent {
  return { ...c, steps: c.steps.map((s) => (s.kind === "options" ? { ...s, options: (s.options ?? []).map((o) => o.trim()).filter(Boolean) } : { ...s, options: undefined })) };
}
