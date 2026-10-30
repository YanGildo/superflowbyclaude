// Rótulos e regras do comercial (sem React).
import type {
  Activity, ContactStatus, JourneyMoment, PipelineStage, ProposalItem, ProposalStatus, Temperature,
} from "@/integrations/supabase/types";

export const CONTACT_STATUS: Record<ContactStatus, { label: string; tone: string }> = {
  lead: { label: "Lead", tone: "bg-info/10 text-info" },
  em_negociacao: { label: "Em negociação", tone: "bg-warning/15 text-warning" },
  cliente_ativo: { label: "Cliente ativo", tone: "bg-success/10 text-success" },
  pausado: { label: "Pausado", tone: "bg-muted text-muted-foreground" },
  cancelado: { label: "Cancelado", tone: "bg-destructive/10 text-destructive" },
  perdido: { label: "Perdido", tone: "bg-destructive/10 text-destructive" },
};

export const TEMPERATURE: Record<Temperature, { label: string; tone: string }> = {
  frio: { label: "Frio", tone: "bg-info/10 text-info" },
  morno: { label: "Morno", tone: "bg-warning/15 text-warning" },
  quente: { label: "Quente", tone: "bg-destructive/10 text-destructive" },
};

export const SOURCES = [
  "Instagram", "Facebook", "Google", "Anúncio", "Indicação", "Prospecção", "WhatsApp", "Site / Landing page", "Telegram", "Evento", "Outro",
];

export const CHANNELS = ["WhatsApp", "Instagram", "E-mail", "Telefone", "Reunião online", "Presencial", "Telegram", "Outro"];

/** Tipos do Registro de Contatos (categoria "contato"). */
export const CONTACT_TYPES = ["Mensagem", "Ligação", "Reunião", "E-mail", "Follow-up", "Visita", "Suporte"];

/** Tipos de Conversões (categoria "conversao"); os três primeiros também são gravados sozinhos. */
export const CONVERSION_TYPES = ["Lead gerado", "Proposta enviada", "Negócio fechado", "Venda avulsa", "Upsell", "Renovação", "Indicação"];

export const ACTIVITY_STATUS: Record<string, { label: string; tone: string }> = {
  pendente: { label: "Pendente / aberto", tone: "text-warning" },
  fechado: { label: "Fechado", tone: "text-success" },
  perdido: { label: "Perdido", tone: "text-destructive" },
};

export const PROPOSAL_STATUS: Record<ProposalStatus, { label: string; tone: string }> = {
  rascunho: { label: "Rascunho", tone: "bg-muted text-muted-foreground" },
  enviada: { label: "Enviada", tone: "bg-info/10 text-info" },
  em_negociacao: { label: "Em negociação", tone: "bg-warning/15 text-warning" },
  aprovada: { label: "Aprovada", tone: "bg-success/10 text-success" },
  recusada: { label: "Recusada", tone: "bg-destructive/10 text-destructive" },
  expirada: { label: "Expirada", tone: "bg-muted text-muted-foreground" },
};

export const JOURNEY: { id: JourneyMoment; title: string; hint: string; template: string[] }[] = [
  { id: "antes_fechar", title: "Antes de fechar", hint: "Apresentação, proposta e contrato — antes do lead virar cliente.",
    template: ["Diagnóstico do negócio", "Apresentação da agência", "Enviar proposta", "Enviar contrato", "Receber setup / 1ª mensalidade"] },
  { id: "onboarding", title: "Onboarding", hint: "Briefing, lista de acessos e reunião de boas-vindas.",
    template: ["Formulário de briefing", "Coletar acessos (Meta, Google, site)", "Criar grupo do cliente", "Reunião de boas-vindas", "Planejamento do 1º mês"] },
  { id: "execucao", title: "Execução mensal", hint: "Relatórios, reuniões, demandas e entregas do mês.",
    template: ["Calendário de conteúdo aprovado", "Campanhas no ar", "Relatório mensal", "Reunião de resultados"] },
  { id: "revisao", title: "Revisão e expansão", hint: "Revisão trimestral e propostas de novos serviços.",
    template: ["Revisão trimestral", "Pesquisa de satisfação", "Proposta de novo serviço", "Pedir indicação / depoimento"] },
];

/** Cor da bolinha de cada etapa (pela posição), no padrão do pipeline antigo. */
const STAGE_COLORS = ["#3B82F6", "#06B6D4", "#6366F1", "#8B5CF6", "#F59E0B", "#10B981", "#F97316", "#0D47A1", "#64748B"];
export const stageColor = (s: PipelineStage) => s.color ?? (s.outcome === "lost" ? "#64748B" : STAGE_COLORS[s.position % STAGE_COLORS.length]);

/** Mensalidade (itens recorrentes) e valor único (itens avulsos) de uma proposta. */
export function proposalTotals(items: Pick<ProposalItem, "quantity" | "unit_price" | "recurring">[]) {
  const sum = (rec: boolean) => items.filter((i) => i.recurring === rec).reduce((a, i) => a + Number(i.quantity) * Number(i.unit_price), 0);
  return { monthly: sum(true), oneOff: sum(false) };
}

/** Só dígitos, com DDI 55 quando faltar — para links wa.me. */
export function waLink(phone: string | null | undefined, text?: string): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  const full = digits.length <= 11 ? `55${digits}` : digits;
  return `https://wa.me/${full}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** Atividade é do mês (yyyy-mm)? */
export const inMonth = (a: Pick<Activity, "at">, ym: string) => a.at.slice(0, 7) === ym;
