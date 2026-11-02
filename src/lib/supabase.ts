import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// The GWS-Wortweg Supabase project. The publishable key is meant for browsers;
// data is protected by Row Level Security. Environment variables override these,
// and setting them to an empty string turns accounts off.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://wsqsehgqbctdzdiplglw.supabase.co";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_ByKnfJOm4tq2bNnEVDUgfg_shyX40-C";

let client: SupabaseClient | null = null;

/** Returns the Supabase client, or null when accounts are turned off. */
export function getSupabase(): SupabaseClient | null {
  if (!url || !key) return null;
  client ??= createClient(url, key);
  return client;
}

export const accountsEnabled = Boolean(url && key);
