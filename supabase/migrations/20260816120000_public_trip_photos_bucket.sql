-- Issue #19: serve per-trail photos from the `trip_photos` Storage bucket.
-- The app renders hero/gallery images as plain <Image src> URLs, so the bucket
-- must be public. Flip it public and add an explicit public read policy on its
-- objects (drop-first so the migration is safe to re-run).
update storage.buckets set public = true where id = 'trip_photos';

drop policy if exists "Public read for trip_photos" on storage.objects;
create policy "Public read for trip_photos"
  on storage.objects
  for select
  to public
  using (bucket_id = 'trip_photos');
