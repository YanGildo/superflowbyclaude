// Tipos das tabelas usadas no app.
// Quando quiser tipos 100% gerados do banco:
//   npx supabase gen types typescript --project-id jxzogffjeedimdvcliqp > src/integrations/supabase/database.types.ts

export type BusinessKind = "pessoal" | "agencia" | "saas" | "infoproduto" | "servico" | "telegram" | "outro";
export type Priority = "baixa" | "media" | "alta" | "urgente";
export type TaskStatus = "pendente" | "em_andamento" | "aguardando" | "concluida";
export type Recurrence = "none" | "daily" | "weekdays" | "weekly" | "monthly" | "yearly";
export type MemberRole = "owner" | "admin" | "member" | "viewer";

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  settings: Record<string, unknown>;
}

export interface Business {
  id: string;
  workspace_id: string;
  name: string;
  kind: BusinessKind;
  color: string | null;
  icon: string | null;
  position: number;
  archived_at: string | null;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  timezone: string;
}

export interface WorkFlow {
  id: string;
  workspace_id: string;
  name: string;
  color: string | null;
  position: number;
  is_system: boolean;
}

export interface TaskList {
  id: string;
  workspace_id: string;
  business_id: string | null;
  name: string;
  color: string | null;
  position: number;
  deleted_at: string | null;
}

export interface Task {
  id: string;
  workspace_id: string;
  business_id: string | null;
  list_id: string | null;
  flow_id: string | null;
  project_id: string | null;
  goal_id: string | null;
  contact_id: string | null;
  title: string;
  notes: string | null;
  status: TaskStatus;
  priority: Priority;
  tags: string[];
  is_important: boolean;
  my_day_date: string | null;
  due_date: string | null;
  reminder_at: string | null;
  recurrence: Recurrence;
  assignee_id: string | null;
  position: number;
  completed_at: string | null;
  created_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskStep {
  id: string;
  workspace_id: string;
  task_id: string;
  title: string;
  done: boolean;
  position: number;
}

export interface Project {
  id: string;
  workspace_id: string;
  business_id: string | null;
  contact_id: string | null;
  name: string;
  description: string | null;
  category: string | null;
  status: string;
  progress: number;
  priority: Priority;
  start_date: string | null;
  deadline: string | null;
  link: string | null;
  next_actions: string[];
  color: string | null;
  position: number;
  deleted_at: string | null;
  created_at: string;
}

export interface Goal {
  id: string;
  workspace_id: string;
  business_id: string | null;
  project_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  status: "ativa" | "pausada" | "concluida";
  priority: Priority;
  target_value: number | null;
  current_value: number;
  deadline: string | null;
  color: string | null;
  position: number;
  completed_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

export interface GoalStep {
  id: string;
  workspace_id: string;
  goal_id: string;
  title: string;
  done: boolean;
  position: number;
}

export interface Funnel {
  id: string;
  workspace_id: string;
  business_id: string | null;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/* ------------------------------ Financeiro ------------------------------ */

export type AccountType = "corrente" | "dinheiro" | "reserva" | "investimento" | "carteira_digital" | "gateway" | "outro";
export type TxType = "entrada" | "saida" | "transferencia";
export type UseType = "pessoal" | "negocio" | "misto";
export type BillRecurrence = "none" | "weekly" | "monthly" | "yearly";

export interface FinAccount {
  id: string; workspace_id: string; business_id: string | null; name: string; type: AccountType;
  bank: string | null; initial_balance: number; color: string | null; archived_at: string | null; created_at: string;
}

export interface CreditCard {
  id: string; workspace_id: string; business_id: string | null; name: string; brand: string | null;
  last_digits: string | null; credit_limit: number; closing_day: number | null; due_day: number | null;
  color: string | null; archived_at: string | null; created_at: string;
}

export interface FinCategory {
  id: string; workspace_id: string; name: string; kind: "entrada" | "saida" | "ambos";
  color: string | null; icon: string | null; essential: boolean;
}

export interface Transaction {
  id: string; workspace_id: string; business_id: string | null; type: TxType; amount: number; date: string;
  description: string; category_id: string | null; account_id: string | null; card_id: string | null;
  to_account_id: string | null; method: string | null; status: "pago" | "pendente"; essential: boolean;
  use_type: UseType; project_id: string | null; contact_id: string | null; source_type: string | null;
  source_id: string | null; notes: string | null; deleted_at: string | null; created_at: string;
}

export interface Payable {
  id: string; workspace_id: string; business_id: string | null; title: string; category_id: string | null;
  amount: number; due_date: string; paid_date: string | null;
  status: "pendente" | "pago" | "atrasado" | "cancelado" | "parcial"; method: string | null;
  recurrence: BillRecurrence; debt_id: string | null; card_id: string | null; account_id: string | null;
  installment_number: number | null; notes: string | null; created_at: string;
}

export interface Receivable {
  id: string; workspace_id: string; business_id: string | null; contact_id: string | null; proposal_id: string | null;
  title: string; category_id: string | null; amount: number; expected_date: string; received_date: string | null;
  status: "previsto" | "recebido" | "atrasado" | "cancelado" | "parcial"; recurrence: BillRecurrence;
  account_id: string | null; notes: string | null; created_at: string;
}

export interface Debt {
  id: string; workspace_id: string; business_id: string | null; name: string; creditor: string | null;
  total_amount: number; installments_total: number; installment_amount: number | null; first_due_date: string | null;
  interest_rate: number | null; status: "ativa" | "quitada" | "atrasada" | "renegociada" | "cancelada";
  notes: string | null; created_at: string;
}

export interface FinGoal {
  id: string; workspace_id: string; business_id: string | null; name: string;
  kind: "reserva" | "faturamento" | "emergencia" | "independencia"; target: number;
  period: "mensal" | "anual" | "unico" | null; deadline: string | null; color: string | null;
  status: "ativa" | "pausada" | "concluida"; created_at: string;
}

export interface Reserve {
  id: string; workspace_id: string; goal_id: string | null; name: string; amount: number; date: string;
  status: "ativa" | "concluida" | "arquivada"; notes: string | null; created_at: string;
}

/* ------------------------------ Comercial ------------------------------ */

export type ContactStatus = "lead" | "em_negociacao" | "cliente_ativo" | "pausado" | "cancelado" | "perdido";
export type Temperature = "frio" | "morno" | "quente";

export interface Contact {
  id: string; workspace_id: string; business_id: string | null; kind: "pessoa" | "empresa"; name: string;
  company: string | null; contact_person: string | null; email: string | null; phone: string | null; whatsapp: string | null;
  instagram: string | null; website: string | null; city: string | null; state: string | null; country: string | null;
  segment: string | null; source: string | null; status: ContactStatus; temperature: Temperature | null; priority: Priority;
  plan_name: string | null; monthly_value: number | null; start_date: string | null; services: string[];
  next_action: string | null; next_contact_at: string | null; notes: string | null; meta: Record<string, unknown>;
  deleted_at: string | null; created_at: string; updated_at: string;
}

export interface Pipeline { id: string; workspace_id: string; business_id: string | null; name: string; position: number }

export interface PipelineStage {
  id: string; workspace_id: string; pipeline_id: string; name: string; position: number;
  outcome: "open" | "won" | "lost"; set_contact_status: ContactStatus | null; color: string | null;
}

export interface Deal {
  id: string; workspace_id: string; business_id: string | null; contact_id: string; pipeline_id: string; stage_id: string;
  title: string; value: number | null; recurring_value: number | null; expected_close: string | null;
  status: "open" | "won" | "lost"; lost_reason: string | null; position: number; closed_at: string | null;
  deleted_at: string | null; created_at: string; updated_at: string;
}

export interface Activity {
  id: string; workspace_id: string; business_id: string | null; contact_id: string | null; deal_id: string | null;
  category: "contato" | "conversao"; type: string; channel: string | null; summary: string | null; notes: string | null;
  outcome: string | null; value: number | null; at: string; next_follow_up_at: string | null;
  campaign_id: string | null; origin: string; created_at: string;
}

export interface Service {
  id: string; workspace_id: string; business_id: string | null; name: string; description: string | null;
  default_price: number | null; recurring: boolean; active: boolean;
}

export type ProposalStatus = "rascunho" | "enviada" | "em_negociacao" | "aprovada" | "recusada" | "expirada";

export interface Proposal {
  id: string; workspace_id: string; business_id: string | null; contact_id: string; deal_id: string | null; title: string;
  status: ProposalStatus; monthly_value: number; setup_fee: number; min_term_months: number | null;
  payment_method: string | null; billing_day: number | null; valid_until: string | null; sent_at: string | null;
  approved_at: string | null; notes: string | null; deleted_at: string | null; created_at: string;
}

export interface ProposalItem {
  id: string; workspace_id: string; proposal_id: string; service_id: string | null; description: string;
  quantity: number; unit_price: number; recurring: boolean; position: number;
}

export type JourneyMoment = "antes_fechar" | "onboarding" | "execucao" | "revisao";

export interface JourneyItem {
  id: string; workspace_id: string; business_id: string | null; contact_id: string | null; moment: JourneyMoment;
  title: string; description: string | null; done: boolean; due_date: string | null; position: number;
}

export interface ScriptSegment {
  id: string; workspace_id: string; name: string; description: string | null; service_type: string | null;
  categories: string[]; is_default: boolean; archived_at: string | null; position: number;
  variables: Record<string, string>;
}

export interface Script {
  id: string; workspace_id: string; segment_id: string | null; title: string; category: string | null;
  moment: string | null; channel: string; body: string; tags: string[]; favorite: boolean;
  archived_at: string | null; created_at: string; updated_at: string;
}

export interface ChatThread {
  id: string; workspace_id: string; business_id: string | null; contact_id: string; channel: string;
  mode: "simulado" | "real"; last_message_at: string; created_at: string;
}

export interface ChatMessage { id: string; workspace_id: string; thread_id: string; direction: "in" | "out"; body: string; at: string }

/* ------------------------------ Prospecção ------------------------------ */

export interface Prospect {
  id: string; workspace_id: string; search_id: string | null; campaign_id: string | null; place_id: string | null;
  name: string; category: string | null; niche: string | null; address: string | null; neighborhood: string | null;
  city: string | null; state: string | null; country: string | null; latitude: number | null; longitude: number | null;
  phone: string | null; whatsapp: string | null; email: string | null; website: string | null; instagram: string | null;
  facebook: string | null; maps_url: string | null; rating: number | null; reviews_count: number | null;
  status: string; temperature: string | null; priority: string; score: number | null; score_reasons: string[];
  notes: string | null; last_approach_at: string | null; converted_contact_id: string | null; created_at: string;
  linkedin: string | null; tiktok: string | null; youtube: string | null; x_profile: string | null;
  emails: string[]; email_host: string | null; tech: ProspectTech | null; intent_score: number | null;
  opening_hours: Record<string, string[]> | null; price_range: string | null; source: string;
  enriched_at: string | null; enrich_error: string | null;
}

/** Sinais do site do prospect (preenchidos pelo enriquecimento). */
export interface ProspectTech {
  fb_pixel: boolean; google_ads_tag: boolean; analytics: boolean; bing_ads: boolean; linkedin_insight: boolean;
  tiktok_pixel: boolean; cms: string | null; mobile_friendly: boolean;
}

export interface ProspectSearch {
  id: string; workspace_id: string; name: string | null; is_saved: boolean; filters: Record<string, unknown>;
  status: string; location: string | null; requested_limit: number | null; result_count: number; new_count: number;
  duplicate_count: number; error_message: string | null; started_at: string | null; finished_at: string | null; created_at: string;
  provider: string; job_ids: string[]; progress: { etapa?: string; feitos?: number; total?: number } | null;
}

export interface ProspectCampaign {
  id: string; workspace_id: string; name: string; niche: string | null; location: string | null;
  objective: string | null; status: string; created_at: string;
}

/* ------------------------------ Marketing ------------------------------ */

export type ContentStage = "ideia" | "roteiro" | "gravacao" | "edicao" | "revisao" | "aprovado" | "publicado" | "pausado";

export interface ContentItem {
  id: string; workspace_id: string; business_id: string | null; contact_id: string | null; campaign_id: string | null;
  project_id: string | null; title: string; kind: string; channel: string | null; objective: string | null;
  stage: ContentStage; priority: Priority; responsible_id: string | null; script: string | null; caption: string | null;
  recording_at: string | null; due_date: string | null; publish_at: string | null; file_url: string | null;
  notes: string | null; position: number; deleted_at: string | null; created_at: string; updated_at: string;
}

export type CampaignStatus = "planejada" | "ativa" | "pausada" | "encerrada";

export interface Campaign {
  id: string; workspace_id: string; business_id: string | null; contact_id: string | null; name: string; platform: string;
  objective: string | null; status: CampaignStatus; daily_budget: number | null; total_budget: number | null;
  spend: number; impressions: number; clicks: number; leads: number; sales: number; revenue: number;
  start_date: string | null; end_date: string | null; landing_page: string | null; tracking_param: string | null;
  region: string | null; notes: string | null; deleted_at: string | null; created_at: string; updated_at: string;
}

export type DeliveryStatus = "pendente" | "em_producao" | "em_revisao" | "enviado_cliente" | "aprovado" | "reprovado" | "publicado";

export interface Delivery {
  id: string; workspace_id: string; business_id: string | null; contact_id: string | null; proposal_id: string | null;
  title: string; type: string | null; due_date: string | null; status: DeliveryStatus; responsible_id: string | null;
  links: string | null; client_comments: string | null; notes: string | null; deleted_at: string | null;
  created_at: string; updated_at: string;
}

export interface MarketingPlan {
  id: string; workspace_id: string; business_id: string | null; month: string; goal: string | null; audience: string | null;
  offer: string | null; channels: string[]; notes: string | null; updated_at: string;
}
