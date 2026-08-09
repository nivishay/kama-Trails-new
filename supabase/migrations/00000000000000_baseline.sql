-- Reconstructed v1 baseline of the Kama Trails schema, captured from the live DB
-- (project nbjkcszrxtpkbqyaccmw) on 2026-08-09 for isolated local testing of the
-- reservation engine. Mirrors tables, constraints, indexes, RLS policies, grants,
-- and the booking RPCs exactly as deployed. The repo's own migrations are
-- ALTER-based (they rename an older trip_instances/trip_registrations schema), so
-- this from-scratch equivalent is what makes a fresh local DB reproducible.

-- ============================================================================
-- Tables
-- ============================================================================

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text,
  phone      text,
  role       text not null default 'user' check (role = any (array['admin','user'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trails (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null,
  name             text not null,
  short_name       text not null,
  region           text not null check (region = any (array['north','south','center'])),
  region_label     text,
  difficulty       text check (difficulty = any (array['easy','easy-medium','medium','medium-hard','hard'])),
  difficulty_label text,
  price            numeric not null check (price >= 0),
  height           text,
  duration         text,
  hero_image       text,
  excerpt          text,
  description      text,
  gear             text,
  audience         text,
  included         text,
  sort_order       integer not null default 0,
  gallery          text[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id) on delete set null,
  constraint trails_slug_key unique (slug)
);

create table public.departures (
  id             uuid primary key default gen_random_uuid(),
  trail_id       uuid not null references public.trails(id) on delete cascade,
  date           date not null,
  departure_time text,
  price          numeric not null check (price >= 0),
  min_capacity   integer not null default 0  check (min_capacity >= 0),
  max_capacity   integer not null default 20 check (max_capacity > 0),
  status         text not null default 'open' check (status = any (array['open','closed','cancelled'])),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users(id) on delete set null,
  constraint departures_capacity_ck check (min_capacity <= max_capacity),
  constraint departures_unique_slot unique (trail_id, date, departure_time)
);

create table public.bookings (
  id                            uuid primary key default gen_random_uuid(),
  departure_id                  uuid not null references public.departures(id) on delete restrict,
  trail_id                      uuid references public.trails(id) on delete set null,
  trail_name                    text not null,
  trip_date                     date,
  registrant_name               text not null,
  phone                         text not null,
  email                         text not null,
  participants_count            integer not null check (participants_count > 0),
  price_per_person              numeric,
  total_amount                  numeric not null check (total_amount >= 0),
  status                        text not null default 'held'
                                  check (status = any (array['held','confirmed','cancelled','expired'])),
  access_token                  uuid not null default gen_random_uuid(),
  hold_expires_at               timestamptz,
  deposit_amount                numeric check (deposit_amount >= 0),
  accepted_terms_at             timestamptz,
  terms_version                 text,
  cancelled_at                  timestamptz,
  cancellation_reason           text check (cancellation_reason = any (array['customer_request','admin','departure_cancelled'])),
  rescheduled_at                timestamptz,
  rescheduled_from_departure_id uuid references public.departures(id),
  created_at                    timestamptz not null default now(),
  updated_at                    timestamptz not null default now(),
  created_by                    uuid references auth.users(id) on delete set null
);

create table public.leads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  message    text not null,
  status     text not null default 'new' check (status = any (array['new','contacted','closed'])),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id),
  kind         text not null check (kind = any (array['deposit','balance','refund'])),
  amount       numeric not null check (amount > 0),
  status       text not null default 'pending' check (status = any (array['pending','succeeded','failed'])),
  provider     text not null,
  provider_ref text,
  paid_at      timestamptz,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id)
);

-- ============================================================================
-- Indexes (non-constraint)
-- ============================================================================
create unique index bookings_access_token_key    on public.bookings (access_token);
create index        bookings_departure_status_idx on public.bookings (departure_id, status);
create index        bookings_instance_idx         on public.bookings (departure_id);
create index        bookings_status_idx           on public.bookings (status);
create index        departures_date_idx           on public.departures (date);
create index        departures_trail_id_idx       on public.departures (trail_id);
create index        leads_status_idx              on public.leads (status);
create index        payments_booking_id_idx       on public.payments (booking_id);

-- ============================================================================
-- Functions
-- ============================================================================

create function public.is_admin()
returns boolean
language sql stable security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- free_spots(departure) — available seats = capacity − (confirmed + unexpired-held)
create function public.free_spots(p_departure_id uuid)
returns integer
language sql stable security definer
set search_path to 'public'
as $$
  select greatest(
    0,
    d.max_capacity - coalesce((
      select sum(b.participants_count)
      from public.bookings b
      where b.departure_id = d.id
        and (b.status = 'confirmed'
             or (b.status = 'held' and b.hold_expires_at > now()))
    ), 0)
  )::integer
  from public.departures d
  where d.id = p_departure_id;
$$;

-- book_trip — creates a HELD booking on a 15-min hold; oversell-safe via row lock
create function public.book_trip(
  p_departure_id uuid,
  p_registrant_name text,
  p_phone text,
  p_email text,
  p_participants_count integer
)
returns public.bookings
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_departure  public.departures;
  v_taken      integer;
  v_remaining  integer;
  v_trail_name text;
  v_row        public.bookings;
begin
  if p_participants_count is null or p_participants_count < 1 then
    raise exception 'participants_count must be at least 1' using errcode = 'check_violation';
  end if;

  select * into v_departure
  from public.departures
  where id = p_departure_id
  for update;

  if not found then
    raise exception 'departure % not found', p_departure_id using errcode = 'no_data_found';
  end if;

  if v_departure.status <> 'open' then
    raise exception 'departure is not open for booking' using errcode = 'check_violation';
  end if;

  select coalesce(sum(participants_count), 0) into v_taken
  from public.bookings
  where departure_id = p_departure_id
    and (status = 'confirmed'
         or (status = 'held' and hold_expires_at > now()));

  v_remaining := v_departure.max_capacity - v_taken;
  if p_participants_count > v_remaining then
    raise exception 'only % seats remaining', greatest(v_remaining, 0)
      using errcode = 'check_violation';
  end if;

  select name into v_trail_name from public.trails where id = v_departure.trail_id;

  insert into public.bookings (
    departure_id, trail_id, trail_name, trip_date,
    registrant_name, phone, email, participants_count,
    price_per_person, total_amount, status, hold_expires_at, created_by
  )
  values (
    v_departure.id, v_departure.trail_id, coalesce(v_trail_name, ''), v_departure.date,
    p_registrant_name, p_phone, p_email, p_participants_count,
    v_departure.price, v_departure.price * p_participants_count,
    'held', now() + interval '15 minutes', auth.uid()
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- confirm_registration — held -> confirmed (normally driven by the deposit webhook)
create function public.confirm_registration(p_id uuid, p_access_token uuid)
returns public.bookings
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_row public.bookings;
begin
  update public.bookings
  set status = 'confirmed'
  where id = p_id
    and access_token = p_access_token
    and status = 'held'
  returning * into v_row;

  if not found then
    raise exception 'booking not found or not confirmable' using errcode = 'no_data_found';
  end if;
  return v_row;
end;
$$;

-- cancel_registration — customer-initiated cancel; stamps reason
create function public.cancel_registration(p_id uuid, p_access_token uuid)
returns public.bookings
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_row public.bookings;
begin
  update public.bookings
  set status = 'cancelled',
      cancelled_at = now(),
      cancellation_reason = 'customer_request'
  where id = p_id
    and access_token = p_access_token
    and status <> 'cancelled'
  returning * into v_row;

  if not found then
    raise exception 'booking not found or already cancelled' using errcode = 'no_data_found';
  end if;
  return v_row;
end;
$$;

-- list_availability — departures (+ free seats) for a trail
create function public.list_availability(p_trail_id uuid default null)
returns table (
  id uuid, trail_id uuid, date date, departure_time text, price numeric,
  min_capacity integer, max_capacity integer, status text, free_spots integer
)
language sql stable security definer
set search_path to 'public'
as $$
  select
    d.id, d.trail_id, d.date, d.departure_time, d.price,
    d.min_capacity, d.max_capacity, d.status,
    public.free_spots(d.id) as free_spots
  from public.departures d
  where (p_trail_id is null or d.trail_id = p_trail_id)
  order by d.date asc;
$$;

-- submit_lead — validated contact-form insert
create function public.submit_lead(p_name text, p_email text, p_phone text, p_message text)
returns uuid
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_email), '') = ''
     or coalesce(trim(p_message), '') = '' then
    raise exception 'name, email and message are required' using errcode = 'check_violation';
  end if;

  insert into public.leads (name, email, phone, message)
  values (p_name, p_email, nullif(trim(p_phone), ''), p_message)
  returning id into v_id;
  return v_id;
end;
$$;

-- ============================================================================
-- Row level security (mirrors live policies exactly)
-- ============================================================================
alter table public.profiles   enable row level security;
alter table public.trails     enable row level security;
alter table public.departures enable row level security;
alter table public.bookings   enable row level security;
alter table public.leads      enable row level security;
alter table public.payments   enable row level security;  -- deny-all: RLS on, no policies

create policy "trails: public read"        on public.trails     for select using (true);
create policy "trails: admin write"        on public.trails     for all    using (is_admin()) with check (is_admin());

create policy "departures: public read"    on public.departures for select using (true);
create policy "departures: admin write"    on public.departures for all    using (is_admin()) with check (is_admin());

create policy "bookings: admin all"        on public.bookings   for all    using (is_admin()) with check (is_admin());

create policy "leads: admin all"           on public.leads      for all    using (is_admin()) with check (is_admin());

create policy "profiles: read own or admin"   on public.profiles for select using ((id = auth.uid()) or is_admin());
create policy "profiles: update own or admin" on public.profiles for update using ((id = auth.uid()) or is_admin()) with check ((id = auth.uid()) or is_admin());

-- ============================================================================
-- Execute grants (mirrors live state; the public booking flow is anon-callable)
-- ============================================================================
grant execute on function public.free_spots(uuid)                              to anon, authenticated;
grant execute on function public.book_trip(uuid, text, text, text, integer)    to anon, authenticated;
grant execute on function public.confirm_registration(uuid, uuid)              to anon, authenticated;
grant execute on function public.cancel_registration(uuid, uuid)               to anon, authenticated;
grant execute on function public.list_availability(uuid)                       to anon, authenticated;
grant execute on function public.submit_lead(text, text, text, text)           to anon, authenticated;
grant execute on function public.is_admin()                                    to anon, authenticated;

-- ============================================================================
-- Supabase default role table grants (mirrors live). RLS still gates anon /
-- authenticated (the deny for non-admins); service_role bypasses RLS entirely.
-- ============================================================================
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables    in schema public to anon, authenticated, service_role;
grant all privileges on all sequences in schema public to anon, authenticated, service_role;
