import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The GWS-Wortweg Supabase project. The publishable key is meant for browsers;
// data is protected by Row Level Security. Environment variables override these,
// and setting them to an empty string turns accounts off.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wsqsehgqbctdzdiplglw.supabase.co";
export const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ByKnfJOm4tq2bNnEVDUgfg_shyX40-C";

let client: SupabaseClient | null = null;

/** Returns the Supabase client, or null when accounts are turned off. */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) return null;
  client ??= createClient(supabaseUrl, supabaseKey);
  return client;
}

export const accountsEnabled = Boolean(supabaseUrl && supabaseKey);
