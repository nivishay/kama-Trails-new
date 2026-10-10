-- Admin write access to the public `trip_photos` storage bucket, so the admin
-- trail editor can upload hero/gallery images straight from the browser (the
-- authenticated admin session carries through RLS). Public read already exists
-- ("Public read for trip_photos"); these add the write side, gated by the same
-- public.is_admin() check used by every table policy (profiles.role = 'admin').

create policy "Admin insert trip_photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'trip_photos' and public.is_admin());

create policy "Admin update trip_photos"
  on storage.objects for update to authenticated
  using (bucket_id = 'trip_photos' and public.is_admin())
  with check (bucket_id = 'trip_photos' and public.is_admin());

create policy "Admin delete trip_photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'trip_photos' and public.is_admin());
