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
