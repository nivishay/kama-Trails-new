-- Articles: standalone SEO content-marketing posts (DECISIONS #46–#53, ADR 0003).
-- A draft is private; only a published row is publicly readable. Admin has full
-- CRUD via the existing is_admin() authz (baseline) — no new authz design.
-- `body_html` is SANITIZED HTML written by the app (never raw editor input) — see
-- src/lib/content/sanitize-html.ts. Inline + hero images live in the public-read
-- `article_images` Storage bucket.

create table public.articles (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null,
  title            text not null,
  excerpt          text,
  meta_description text,
  body_html        text not null default '',
  hero_image       text,
  status           text not null default 'draft' check (status = any (array['draft','published'])),
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id) on delete set null,
  constraint articles_slug_key unique (slug)
);

-- Public list orders newest-first over published rows only (partial index).
create index articles_published_idx
  on public.articles (published_at desc)
  where status = 'published';

-- ============================================================================
-- Row level security: public reads published; admin does everything.
-- (Permissive SELECT policies combine with OR, so admin also reads drafts.)
-- ============================================================================
alter table public.articles enable row level security;

create policy "articles: public read published"
  on public.articles for select
  using (status = 'published');

create policy "articles: admin all"
  on public.articles for all
  using (is_admin()) with check (is_admin());

-- Match the baseline's table-grant model (RLS still gates anon/authenticated).
grant all privileges on public.articles to anon, authenticated, service_role;

-- ============================================================================
-- Storage: public-read `article_images` bucket, admin-write (DECISIONS #52).
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('article_images', 'article_images', true)
on conflict (id) do nothing;

create policy "article_images: public read"
  on storage.objects for select
  using (bucket_id = 'article_images');

create policy "article_images: admin insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'article_images' and is_admin());

create policy "article_images: admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'article_images' and is_admin())
  with check (bucket_id = 'article_images' and is_admin());

create policy "article_images: admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'article_images' and is_admin());
