// Assistente da Central do dia: configurações (ficam em workspaces.settings.assistente).

export type MascotShape = "esfera" | "robo" | "gato";

export type SourceKey = "tarefas" | "financeiro" | "followups" | "propostas" | "entregas" | "conteudo" | "prospects" | "compromissos";

export interface AssistantSettings {
  ativo: boolean;
  nome: string;
  forma: MascotShape;
  /** Horas das varreduras (horário de Brasília), ex.: ["07","13","18"]. */
  horarios: string[];
  /** Proposta enviada há mais de X dias sem resposta vira rascunho de cobrança. */
  diasProposta: number;
  fontes: Record<SourceKey, boolean>;
  modelos: { followup: string; proposta: string };
}

export const SOURCE_LABEL: Record<SourceKey, { label: string; hint: string }> = {
  tarefas: { label: "Tarefas e lembretes", hint: "De hoje e atrasadas" },
  financeiro: { label: "Contas a pagar e receber", hint: "Vencendo em até 3 dias ou atrasadas" },
  followups: { label: "Follow-ups do CRM", hint: "Próximo contato marcado até hoje" },
  propostas: { label: "Propostas paradas", hint: "Enviadas e sem resposta" },
  entregas: { label: "Entregas", hint: "Prazo até amanhã, atrasadas ou com reprovação" },
  conteudo: { label: "Conteúdos", hint: "Para publicar ou gravar hoje" },
  prospects: { label: "Prospects para abordar", hint: "Marcados como “Para abordar”" },
  compromissos: { label: "Compromissos", hint: "Agenda de hoje" },
};
export const SOURCE_KEYS = Object.keys(SOURCE_LABEL) as SourceKey[];

export const DEFAULT_TEMPLATES = {
  followup: "Oi [nome], tudo bem? Passando para dar continuidade à nossa conversa. Consegue falar hoje?",
  proposta: "Oi [nome], tudo bem? Conseguiu dar uma olhada na proposta \"[proposta]\"? Fico à disposição para ajustar o que precisar.",
};

export const DEFAULT_ASSISTANT: AssistantSettings = {
  ativo: true, nome: "Flow", forma: "esfera", horarios: ["07", "13", "18"], diasProposta: 7,
  fontes: Object.fromEntries(SOURCE_KEYS.map((k) => [k, true])) as Record<SourceKey, boolean>,
  modelos: { followup: "", proposta: "" },
};

export const HOURS = Array.from({ length: 17 }, (_, i) => String(i + 6).padStart(2, "0")); // 06h a 22h

export function readAssistant(raw: unknown): AssistantSettings {
  const s = (raw ?? {}) as Partial<AssistantSettings>;
  return {
    ...DEFAULT_ASSISTANT, ...s,
    horarios: Array.isArray(s.horarios) ? s.horarios : DEFAULT_ASSISTANT.horarios,
    fontes: { ...DEFAULT_ASSISTANT.fontes, ...(s.fontes ?? {}) },
    modelos: { ...DEFAULT_ASSISTANT.modelos, ...(s.modelos ?? {}) },
  };
}
