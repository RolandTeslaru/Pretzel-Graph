import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "http://127.0.0.1:54321";
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const g = globalThis as unknown as { __supabase?: SupabaseClient };
export const supabase: SupabaseClient = (g.__supabase ??= createClient(supabaseUrl, supabaseKey));

if (import.meta.hot) import.meta.hot.accept();