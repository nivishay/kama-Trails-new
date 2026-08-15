import { createSupabasePublicClient } from "@/lib/supabase/public";
import type { Article, ArticleListItem } from "./types";

/**
 * Public, read-only access to published Articles. Uses the cookieless public
 * client so `/articles` stays statically renderable (ISR), same as the trails
 * catalog. RLS already hides drafts from the anon key; we also filter on
 * `status = 'published'` explicitly so intent is visible at the call site.
 */

const LIST_COLUMNS = "slug, title, excerpt, hero_image, published_at";
const DETAIL_COLUMNS =
  "id, slug, title, excerpt, meta_description, body_html, hero_image, status, published_at, created_at, updated_at";

/** Published articles, newest first, for the public list page. */
export async function getPublishedArticles(): Promise<ArticleListItem[]> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("articles")
    .select(LIST_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load articles: ${error.message}`);
  }
  return (data ?? []) as ArticleListItem[];
}

/** One published article by slug, or null (draft/unknown slugs read as null). */
export async function getPublishedArticleBySlug(
  slug: string,
): Promise<Article | null> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase
    .from("articles")
    .select(DETAIL_COLUMNS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load article ${slug}: ${error.message}`);
  }
  return (data as Article | null) ?? null;
}
