import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** true quando o .env.local ainda não foi preenchido. */
export const supabaseConfigured = Boolean(url && anonKey && !url.includes("SEU-PROJETO"));

export const supabase: SupabaseClient = createClient(
  supabaseConfigured && url ? url : "http://localhost:54321",
  supabaseConfigured && anonKey ? anonKey : "public-anon-key-placeholder",
  { auth: { persistSession: true, autoRefreshToken: true } },
);
