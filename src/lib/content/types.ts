/**
 * Article — a standalone SEO content-marketing post (CONTEXT.md; DECISIONS #46–#53).
 * A Trail is a bookable route; an Article is editorial content, unrelated to the
 * catalog. An Article is a `draft` until first published, then publicly visible.
 */

export type ArticleStatus = "draft" | "published";

/** A single article row as stored (body is already-sanitized HTML). */
export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  meta_description: string | null;
  body_html: string;
  hero_image: string | null;
  status: ArticleStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** The fields shown on the public list — no body, to keep the query light. */
export interface ArticleListItem {
  slug: string;
  title: string;
  excerpt: string | null;
  hero_image: string | null;
  published_at: string | null;
}

/** The fields shown in the admin list (drafts included). */
export interface AdminArticleListItem {
  id: string;
  slug: string;
  title: string;
  status: ArticleStatus;
  published_at: string | null;
  updated_at: string;
}
