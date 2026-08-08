-- Migration: rewrite the booking RPC layer to the v1 schema + model.
-- The prior RPCs (book_trip, free_spots, list_availability, confirm/cancel_registration)
-- were built on the old names + pre-hold/pre-deposit logic; the rename broke them.
-- Realigns to DECISIONS #6 (15-min seat hold), #20 (held state), #23 (capacity =
-- confirmed + unexpired-held), #25 (customer cancel stamps reason). deposit_amount is
-- left null until the deposit rule (open question) is decided.

-- Signature/return changes require drop-and-recreate.
drop function if exists public.list_availability(uuid);
drop function if exists public.book_trip(uuid, text, text, text, integer);
drop function if exists public.free_spots(uuid);

-- ---------------------------------------------------------------------------
-- free_spots(departure) — available seats = capacity − (confirmed + unexpired-held)
-- ---------------------------------------------------------------------------
create function public.free_spots(p_departure_id uuid)
returns integer
language sql
stable security definer
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

-- ---------------------------------------------------------------------------
-- book_trip — creates a HELD booking on a 15-min hold; oversell-safe via row lock
-- ---------------------------------------------------------------------------
create function public.book_trip(
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
  v_departure  public.departures;
  v_taken      integer;
  v_remaining  integer;
  v_trail_name text;
  v_row        public.bookings;
begin
  if p_participants_count is null or p_participants_count < 1 then
    raise exception 'participants_count must be at least 1' using errcode = 'check_violation';
  end if;

  -- lock the departure so concurrent last-seat bookings can't oversell (#23)
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

-- ---------------------------------------------------------------------------
-- confirm_registration — held -> confirmed (normally driven by the deposit webhook)
-- ---------------------------------------------------------------------------
create or replace function public.confirm_registration(p_id uuid, p_access_token uuid)
returns public.bookings
language plpgsql
security definer
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

-- ---------------------------------------------------------------------------
-- cancel_registration — customer-initiated cancel; stamps reason (#25)
-- ---------------------------------------------------------------------------
create or replace function public.cancel_registration(p_id uuid, p_access_token uuid)
returns public.bookings
language plpgsql
security definer
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

-- ---------------------------------------------------------------------------
-- list_availability — departures (+ free seats) for a trail; returns status not is_active
-- ---------------------------------------------------------------------------
create function public.list_availability(p_trail_id uuid default null)
returns table (
  id uuid, trail_id uuid, date date, departure_time text, price numeric,
  min_capacity integer, max_capacity integer, status text, free_spots integer
)
language sql
stable security definer
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
