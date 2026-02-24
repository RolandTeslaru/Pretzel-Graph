import { SupabaseClient } from "@supabase/supabase-js";

export type WithSupabase<F extends (...args: any[]) => any> =
    (supabase: SupabaseClient, ...args: Parameters<F>) => ReturnType<F>
