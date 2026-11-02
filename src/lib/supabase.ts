import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

/** Returns the Supabase client, or null when accounts are not configured. */
export function getSupabase(): SupabaseClient | null {
  if (!url || !key) return null;
  client ??= createClient(url, key);
  return client;
}

export const accountsEnabled = Boolean(url && key);
