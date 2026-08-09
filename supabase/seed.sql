-- Demo seed for local development so `supabase start` yields a pokeable DB.
-- Tests do NOT depend on this — each test creates its own isolated trail/departure.
insert into public.trails (slug, name, short_name, region, region_label, difficulty, price, duration)
values
  ('nahal-kziv', 'שביל נחל כזיב', 'נחל כזיב', 'north', 'צפון', 'medium', 180, 'כ-4 שעות'),
  ('har-meron',  'מסלול הר מירון', 'הר מירון', 'north', 'צפון', 'easy-medium', 150, 'כ-3 שעות');

-- One open departure per trail, three weeks out, small capacity for easy manual testing.
insert into public.departures (trail_id, date, departure_time, price, max_capacity, status)
select id, current_date + 21, '08:00', price, 12, 'open' from public.trails where slug = 'nahal-kziv';

insert into public.departures (trail_id, date, departure_time, price, max_capacity, status)
select id, current_date + 21, '07:30', price, 8, 'open' from public.trails where slug = 'har-meron';
