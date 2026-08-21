import "server-only";
import { createClient } from "@supabase/supabase-js";

// NEVER import this file from a client component — the service role key
// bypasses Row Level Security and must stay on the server.
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your environment variables."
    );
  }
  return createClient(url, serviceKey);
}
