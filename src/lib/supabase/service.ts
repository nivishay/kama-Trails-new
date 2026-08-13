import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client — bypasses RLS. Use ONLY on privileged system paths that have
// no browser/user session (e.g. the Cardcom webhook, DECISIONS #41). NEVER import this into a
// user-request path (/admin/*, customer pages) — that's the #33 rule. The secret key is
// server-only (SUPABASE_SECRET_KEY, never NEXT_PUBLIC).

function requireServerEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See .env.example.`);
  }
  return value;
}

export function createSupabaseServiceClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "The service-role client must never be created in the browser.",
    );
  }
  const url = requireServerEnv("SUPABASE_URL");
  const secretKey = requireServerEnv("SUPABASE_SECRET_KEY");
  return createClient(url, secretKey, { auth: { persistSession: false } });
}
