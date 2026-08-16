-- Issue #19 — data step (applied to the cloud project, hand-run via MCP; the
-- storage objects it reads exist only in cloud, so this is a no-op locally).
--
-- For each of the 5 seeded trails, set hero_image = first file in its storage
-- folder and gallery = the rest, both alphabetical by filename. Photos are
-- stored as bucket-relative keys; the app resolves them to public URLs at read
-- time (src/lib/catalog/photos.ts).
with ordered as (
  select (storage.foldername(name))[1] as folder, name,
         row_number() over (partition by (storage.foldername(name))[1] order by name) as rn
  from storage.objects
  where bucket_id = 'trip_photos'
),
agg as (
  select folder,
         (array_agg(name order by rn))[1] as hero,
         array_agg(name order by rn) filter (where rn > 1) as gallery
  from ordered group by folder
),
map(folder, slug) as (
  values ('nahal-gilabon','nahal-gilbon'),
         ('nahal-qumran','nahal-qumran'),
         ('black-crevice-zavitan','nakik-shachor'),
         ('nahal-rahaf','nahal-rachaf'),
         ('dalton-cliff','mitzpe-dalton')
)
update trails t
set hero_image = a.hero,
    gallery = coalesce(a.gallery, '{}')
from agg a join map m on m.folder = a.folder
where t.slug = m.slug;
