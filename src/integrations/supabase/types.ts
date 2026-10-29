// Tipos das tabelas usadas na Fase 0.
// Quando o projeto Supabase existir, substituir por tipos gerados:
//   npx supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts

export type BusinessKind = "pessoal" | "agencia" | "saas" | "infoproduto" | "servico" | "telegram" | "outro";

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
