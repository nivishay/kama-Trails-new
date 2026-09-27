-- Migration: partner_logos — the client/partner organisations shown in the
-- homepage "גאים לשרת את מאות לקוחותינו" strip (mirrors the old site's client
-- logo row). Content is admin-managed; the public site only reads it.
--
-- Image bytes ship in the app under `public/logos/`, so `image_path` is an
-- app-relative path (e.g. `/logos/01-spni.png`), not a storage bucket key.

create table public.partner_logos (
  id uuid primary key default gen_random_uuid(),
  -- Organisation name; also the image alt text for screen readers.
  name text not null,
  -- App-relative path under public/ (served by Next directly).
  image_path text not null,
  -- Optional outbound link to the partner (unused for now).
  link_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.partner_logos enable row level security;

-- Public read (the strip is on the public homepage); admin-only writes, mirroring
-- the trails table policies.
create policy "partner_logos: public read" on public.partner_logos
  for select to public using (true);

create policy "partner_logos: admin write" on public.partner_logos
  for all to public using (is_admin()) with check (is_admin());

-- Seed the logos from the old site's client strip, preserving display order.
insert into public.partner_logos (name, image_path, sort_order) values
  ('החברה להגנת הטבע',        '/logos/01-spni.png',            1),
  ('הטכניון',                 '/logos/02-technion.svg',        2),
  ('טללים',                   '/logos/03-tlalim.png',          3),
  ('לקוח של שבילי קמה',       '/logos/04-client.png',          4),
  ('קרן קיימת לישראל',        '/logos/05-kkl.jpg',             5),
  ('תנועת הצופים',            '/logos/06-tzofim.png',          6),
  ('Coralogix',               '/logos/07-coralogix.png',       7),
  ('מגן דוד אדום',            '/logos/08-mda.svg',             8),
  ('המכבי הצעיר',             '/logos/09-maccabi-hatzair.svg', 9),
  ('אחליי – נוער מוביל שינוי','/logos/10-client.jpg',          10),
  ('Enlight',                 '/logos/11-enlight.png',         11),
  ('סר-אל (SAR-EL)',          '/logos/12-sar-el.svg',          12);
