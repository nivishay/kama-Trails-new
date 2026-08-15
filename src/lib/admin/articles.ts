import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminArticleListItem, Article } from "@/lib/content/types";

/**
 * Admin-side reads for Articles. Goes through the authenticated server client so
 * RLS applies (admin session) — an admin sees drafts as well as published rows.
 */

const ADMIN_LIST_COLUMNS = "id, slug, title, status, published_at, updated_at";
const DETAIL_COLUMNS =
  "id, slug, title, excerpt, meta_description, body_html, hero_image, status, published_at, created_at, updated_at";

/** Every article (drafts included), newest activity first, for the admin list. */
export async function getAdminArticles(): Promise<AdminArticleListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select(ADMIN_LIST_COLUMNS)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load articles: ${error.message}`);
  }
  return (data ?? []) as AdminArticleListItem[];
}

/** One article by id for the edit form, or null if it does not exist. */
export async function getArticleById(id: string): Promise<Article | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("articles")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load article ${id}: ${error.message}`);
  }
  return (data as Article | null) ?? null;
}
