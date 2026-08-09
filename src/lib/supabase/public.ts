import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

/**
 * Cookieless Supabase client for public, read-only catalog data (trails,
 * departures). Because it never touches request cookies, pages that read
 * through it stay statically renderable — so `/trails` can be cached with ISR
 * instead of re-rendering dynamically on every request. RLS still governs
 * access via the anon key. Do NOT use this for authenticated/user-scoped reads
 * or any write path — use `createSupabaseServerClient` there.
 */
export function createSupabasePublicClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}
