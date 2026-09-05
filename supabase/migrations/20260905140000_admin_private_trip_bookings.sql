-- Migration: admin-created bookings — private trip + late add (DECISIONS #51/#53/#58, issue #32).
--
-- One primitive (`admin_create_booking`) behind two admin entry points:
--   (a) Private Trip — the admin makes an UNLISTED departure of a chosen trail and books it;
--   (b) Late add    — the admin adds a participant to an existing departure after sales closed.
-- Both are the SAME booking as self-serve, with the same held → confirmed lifecycle, and both
-- charge the full amount IMMEDIATELY via a pay-link (pay-immediately, ADR #58 — no tokenization).
-- Admin-created bookings are UNBOUNDED by the public registration deadline (#53): no
-- open-status / deadline guard, only the capacity guard. Consents are collected from the
-- customer on the pay-link, not fabricated at admin-create time.
--
-- Hand-applied to the cloud via MCP; also picked up by `supabase db reset` for local tests.

-- ---------------------------------------------------------------------------
-- 1. is_private — unlisted departures (private trips)
-- ---------------------------------------------------------------------------
-- A private departure is excluded from the public catalog but still links to its trail's
-- public page (the pay-link and admin surface reference it directly).
alter table public.departures add column is_private boolean not null default false;

-- ---------------------------------------------------------------------------
-- 2. list_availability — also exclude private departures from the public catalog
-- ---------------------------------------------------------------------------
create or replace function public.list_availability(p_trail_id uuid default null)
returns table (
  id uuid, trail_id uuid, date date, departure_time text, price numeric,
  min_capacity integer, max_capacity integer, status text, free_spots integer
)
language sql stable security definer
set search_path to 'public'
as $$
  select
    d.id, d.trail_id, d.date, d.departure_time, d.price,
    d.min_capacity, d.max_capacity,
    case
      when d.status = 'open'
       and now() >= public.departure_effective_close(d.date, d.departure_time, d.registration_closes_at)
      then 'closed'
      else d.status
    end as status,
    public.free_spots(d.id) as free_spots
  from public.departures d
  where (p_trail_id is null or d.trail_id = p_trail_id)
    and d.is_private = false
  order by d.date asc;
$$;

-- ---------------------------------------------------------------------------
-- 3. list_departures_admin — surface the private flag to the admin
-- ---------------------------------------------------------------------------
drop function if exists public.list_departures_admin();

create function public.list_departures_admin()
returns table (
  id uuid, trail_id uuid, trail_name text, date date, departure_time text, price numeric,
  min_capacity integer, max_capacity integer, status text, free_spots integer,
  registration_closes_at timestamptz, effective_close timestamptz, public_closed boolean,
  is_private boolean
)
language sql stable security definer
set search_path to 'public'
as $$
  select
    d.id, d.trail_id, coalesce(t.name, '—') as trail_name, d.date, d.departure_time, d.price,
    d.min_capacity, d.max_capacity, d.status, public.free_spots(d.id) as free_spots,
    d.registration_closes_at,
    public.departure_effective_close(d.date, d.departure_time, d.registration_closes_at) as effective_close,
    (d.status = 'open'
     and now() >= public.departure_effective_close(d.date, d.departure_time, d.registration_closes_at)
    ) as public_closed,
    d.is_private
  from public.departures d
  left join public.trails t on t.id = d.trail_id
  where public.is_admin()
  order by d.date asc;
$$;

grant execute on function public.list_departures_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. admin_create_booking — the admin-created booking primitive (#51)
-- ---------------------------------------------------------------------------
-- Creates a held booking on any departure the admin points at, capacity-guarded but NOT
-- bounded by the open-status / registration deadline (admin unbounded, #53). Dedups the
-- customer (phone-primary, #55). Leaves the consents unsigned — the customer asserts them on
-- the pay-link (sign_booking_and_start_payment). A longer hold keeps the pay-link valid while
-- the customer gets to it (holds are the only auto seat-release under pay-immediately, #58).
create function public.admin_create_booking(
  p_departure_id uuid,
  p_registrant_name text,
  p_phone text,
  p_email text,
  p_participants_count integer
)
returns public.bookings
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c_admin_hold_days constant integer := 7;  -- pay-link validity window before the seat releases

  v_departure    public.departures;
  v_taken        integer;
  v_remaining    integer;
  v_trail_name   text;
  v_total_amount numeric;
  v_customer_id  uuid;
  v_row          public.bookings;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  if coalesce(trim(p_registrant_name), '') = '' then
    raise exception 'registrant name is required' using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_phone), '') = '' then
    raise exception 'phone is required' using errcode = 'check_violation';
  end if;
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

  -- Capacity is the one guard the admin path keeps (never oversell a seat). No status or
  -- deadline check: the admin can add a late participant after public sales closed (#53).
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

  v_total_amount := v_departure.price * p_participants_count;
  if v_total_amount <= 0 then
    raise exception 'total amount must be positive' using errcode = 'check_violation';
  end if;

  select name into v_trail_name from public.trails where id = v_departure.trail_id;

  v_customer_id := public.match_or_create_customer(
    p_registrant_name, p_phone, p_email, 'admin');

  insert into public.bookings (
    departure_id, trail_id, trail_name, trip_date,
    registrant_name, phone, email, participants_count,
    price_per_person, total_amount, deposit_amount,
    customer_id,
    status, hold_expires_at, created_by
  )
  values (
    v_departure.id, v_departure.trail_id, coalesce(v_trail_name, ''), v_departure.date,
    p_registrant_name, p_phone, p_email, p_participants_count,
    v_departure.price, v_total_amount, v_total_amount,
    v_customer_id,
    'held', now() + make_interval(days => c_admin_hold_days), auth.uid()
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- admin-only: not on the public API surface.
revoke all on function public.admin_create_booking(uuid, text, text, text, integer) from public;
grant execute on function public.admin_create_booking(uuid, text, text, text, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. sign_booking_consents — the customer signs on the pay-link, over the token path
-- ---------------------------------------------------------------------------
-- Token-guarded (the pay-link carries access_token): records the two mandatory consents on a
-- held booking and applies the optional newsletter opt-in on the customer (#59/#33). This is
-- the pay-link's counterpart to the consents book_trip records inline for self-serve. The
-- caller (the pay-link server action) then starts the Cardcom checkout for the full amount.
create function public.sign_booking_consents(
  p_booking_id uuid,
  p_access_token uuid,
  p_accept_policy boolean,
  p_sign_waiver boolean,
  p_marketing_opt_in boolean default false
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c_policy_version constant text := '2026-08-13';  -- #31/#59, kept in step with book_trip
  c_waiver_version constant text := '2026-08-19';  -- #59, kept in step with book_trip
  v_booking public.bookings;
begin
  if p_accept_policy is not true or p_sign_waiver is not true then
    raise exception 'the mandatory consents must be accepted to pay' using errcode = 'check_violation';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id and access_token = p_access_token
  for update;

  if not found then
    raise exception 'booking not found for token' using errcode = 'no_data_found';
  end if;
  if v_booking.status <> 'held' then
    raise exception 'booking is not awaiting payment' using errcode = 'check_violation';
  end if;

  update public.bookings
  set policy_accepted_at = coalesce(policy_accepted_at, now()),
      policy_version     = c_policy_version,
      waiver_signed_at   = coalesce(waiver_signed_at, now()),
      waiver_version     = c_waiver_version,
      updated_at         = now()
  where id = p_booking_id;

  if p_marketing_opt_in is true and v_booking.customer_id is not null then
    update public.customers
    set marketing_opt_in         = true,
        marketing_consent_at     = now(),
        marketing_consent_source = 'checkout',
        updated_at               = now()
    where id = v_booking.customer_id;
  end if;
end;
$$;

grant execute on function
  public.sign_booking_consents(uuid, uuid, boolean, boolean, boolean)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. get_booking_by_token — also return the email the pay-link needs for Cardcom
-- ---------------------------------------------------------------------------
-- The pay-link (an admin-sent capability URL carrying access_token) starts a Cardcom checkout,
-- which needs the customer email. It is RLS-protected on the table, so surface it through this
-- token-guarded security-definer read — the caller already holds the per-booking secret token.
-- Adding a column requires drop-and-recreate; existing callers select by name, so unaffected.
drop function if exists public.get_booking_by_token(uuid);

create function public.get_booking_by_token(p_access_token uuid)
returns table (
  id                 uuid,
  departure_id       uuid,
  status             text,
  trail_name         text,
  trip_date          date,
  registrant_name    text,
  email              text,
  participants_count integer,
  total_amount       numeric,
  deposit_amount     numeric
)
language sql
stable security definer
set search_path to 'public'
as $$
  select
    b.id, b.departure_id, b.status, b.trail_name, b.trip_date,
    b.registrant_name, b.email, b.participants_count, b.total_amount, b.deposit_amount
  from public.bookings b
  where b.access_token = p_access_token;
$$;

grant execute on function public.get_booking_by_token(uuid) to anon, authenticated;
