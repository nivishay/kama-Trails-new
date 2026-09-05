-- Migration: per-departure registration deadline + auto-close (DECISIONS #53, issue #24).
--
-- Public self-serve registration auto-closes at a per-Departure deadline that DEFAULTS to
-- the Departure start time (admin can set it earlier). This maps onto the existing
-- open/closed/cancelled status: past the deadline a still-`open` departure reads as `closed`
-- to the public and book_trip refuses it — the trip still runs, only public sales stop.
-- Admin actions are UNBOUNDED by this deadline (a dedicated admin read + the #32 admin-create
-- path bypass it), so the admin can always intervene, including after the trip ran.
--
-- Hand-applied to the cloud via MCP (see supabase/history/README.md); also picked up by
-- `supabase db reset` for local integration tests.

-- ---------------------------------------------------------------------------
-- 1. safe_time — tolerant time parse for the free-text departure_time column
-- ---------------------------------------------------------------------------
-- departure_time is free text (the admin form feeds it 'HH:MM', but it is not constrained
-- and legacy/test rows may hold arbitrary strings). Parse it to a time when we can, else
-- null — so the deadline math never errors on an unparseable value.
create function public.safe_time(p_text text)
returns time
language plpgsql
immutable
set search_path to 'public'
as $$
begin
  return p_text::time;
exception when others then
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. registration_closes_at — the optional earlier override
-- ---------------------------------------------------------------------------
-- Null = "use the default" (the departure start time). A non-null value lets the admin
-- close public sales earlier than the start.
alter table public.departures add column registration_closes_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. departure_effective_close — the deadline actually enforced
-- ---------------------------------------------------------------------------
-- Default deadline = the departure start (its date + parsed time), interpreted in Israel
-- local time; when the time is absent/unparseable, fall back to end of the departure day so
-- registration is not closed prematurely. An explicit registration_closes_at always wins.
create function public.departure_effective_close(
  p_date date,
  p_departure_time text,
  p_registration_closes_at timestamptz
)
returns timestamptz
language sql
stable
set search_path to 'public'
as $$
  select coalesce(
    p_registration_closes_at,
    (p_date + coalesce(public.safe_time(p_departure_time), time '23:59'))
      ::timestamp at time zone 'Asia/Jerusalem'
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. list_availability — report the EFFECTIVE public status (auto-close)
-- ---------------------------------------------------------------------------
-- A departure that is still `open` but past its deadline reads as `closed` to the public,
-- with no background job: the public catalog and checkout both see it as closed at once.
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
  order by d.date asc;
$$;

-- ---------------------------------------------------------------------------
-- 5. list_departures_admin — admin read: RAW status + deadline + free_spots
-- ---------------------------------------------------------------------------
-- The admin surface must see the true stored status (to drive the open/close toggle) and the
-- deadline, plus a derived `public_closed` flag so the UI can show "closed to the public"
-- without mutating the row. Admin-only; not granted to anon.
create function public.list_departures_admin()
returns table (
  id uuid, trail_id uuid, trail_name text, date date, departure_time text, price numeric,
  min_capacity integer, max_capacity integer, status text, free_spots integer,
  registration_closes_at timestamptz, effective_close timestamptz, public_closed boolean
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
    ) as public_closed
  from public.departures d
  left join public.trails t on t.id = d.trail_id
  where public.is_admin()
  order by d.date asc;
$$;

grant execute on function public.list_departures_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 6. book_trip — refuse a departure past its registration deadline
-- ---------------------------------------------------------------------------
-- Same body as the checkout-consents version (#59); adds the deadline guard right after the
-- open-status check. The public path is deadline-bound; the admin-create path (#32) is not.
create or replace function public.book_trip(
  p_departure_id uuid,
  p_registrant_name text,
  p_phone text,
  p_email text,
  p_participants_count integer,
  p_accept_policy boolean,
  p_sign_waiver boolean,
  p_marketing_opt_in boolean default false
)
returns public.bookings
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c_deposit_percent constant integer := 100;          -- #30/#40: v1 charges the full amount
  c_hold_minutes    constant integer := 40;            -- #44: Cardcom session (~30) + buffer (~10)
  c_policy_version  constant text    := '2026-08-13';  -- #31/#59: cancellation-policy (#13) text version
  c_waiver_version  constant text    := '2026-08-19';  -- #59: signed-waiver text version (git-frozen)

  v_departure      public.departures;
  v_taken          integer;
  v_remaining      integer;
  v_trail_name     text;
  v_total_amount   numeric;
  v_deposit_amount numeric;
  v_customer_id    uuid;
  v_row            public.bookings;
begin
  if p_participants_count is null or p_participants_count < 1 then
    raise exception 'participants_count must be at least 1' using errcode = 'check_violation';
  end if;

  if p_accept_policy is not true or p_sign_waiver is not true then
    raise exception 'the mandatory consents must be accepted to book' using errcode = 'check_violation';
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

  -- Public self-serve auto-closes at the deadline (#53); the admin-create path (#32) skips this.
  if now() >= public.departure_effective_close(
       v_departure.date, v_departure.departure_time, v_departure.registration_closes_at) then
    raise exception 'registration is closed for this departure' using errcode = 'check_violation';
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

  v_total_amount   := v_departure.price * p_participants_count;
  v_deposit_amount := round(v_total_amount * c_deposit_percent / 100.0);

  if v_deposit_amount <= 0 or v_deposit_amount > v_total_amount then
    raise exception 'deposit_amount % must be between 1 and total %', v_deposit_amount, v_total_amount
      using errcode = 'check_violation';
  end if;

  select name into v_trail_name from public.trails where id = v_departure.trail_id;

  v_customer_id := public.match_or_create_customer(
    p_registrant_name, p_phone, p_email, 'checkout');

  if p_marketing_opt_in is true then
    update public.customers
    set marketing_opt_in         = true,
        marketing_consent_at     = now(),
        marketing_consent_source = 'checkout',
        updated_at               = now()
    where id = v_customer_id;
  end if;

  insert into public.bookings (
    departure_id, trail_id, trail_name, trip_date,
    registrant_name, phone, email, participants_count,
    price_per_person, total_amount, deposit_amount,
    policy_accepted_at, policy_version, waiver_signed_at, waiver_version,
    customer_id,
    status, hold_expires_at, created_by
  )
  values (
    v_departure.id, v_departure.trail_id, coalesce(v_trail_name, ''), v_departure.date,
    p_registrant_name, p_phone, p_email, p_participants_count,
    v_departure.price, v_total_amount, v_deposit_amount,
    now(), c_policy_version, now(), c_waiver_version,
    v_customer_id,
    'held', now() + make_interval(mins => c_hold_minutes), auth.uid()
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function
  public.book_trip(uuid, text, text, text, integer, boolean, boolean, boolean)
  to anon, authenticated;
