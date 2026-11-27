import { createClient } from "@supabase/supabase-js";

// These are safe to expose in the browser — they only allow the access
// level you grant via Row Level Security policies in Supabase (read-only
// for the public, in our setup).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url as string, anonKey as string)
  : null;
