-- Migration: Cardcom payment confirmation model.
-- Implements DECISIONS #38/#39/#41/#43/#44/#45 + ADR 0002. Three coupled changes:
--   1. Grow book_trip: set deposit_amount, record consents, use HOLD_MINUTES (not a
--      hardcoded 15 min — the #44 bug fix).
--   2. Add record_payment_and_confirm — the atomic "insert ledger row + confirm" RPC the
--      Cardcom webhook calls (webhook-confirms-only; ADR 0002).
--   3. Lock down the payments ledger: UNIQUE(provider, provider_ref) for idempotency (#38)
--      and an admin RLS policy so the dashboard can read paid status (#33).
--
-- This is an incremental migration ON TOP of 00000000000000_baseline.sql. Hand-applied
-- (see supabase/history/README.md); also picked up by `supabase db reset` for local tests.

-- ---------------------------------------------------------------------------
-- 1. Grow book_trip — held booking with deposit_amount, consents, HOLD_MINUTES
-- ---------------------------------------------------------------------------
-- Signature grows (adds p_accepted_terms), so drop-and-recreate. Reaching this RPC means
-- the customer ticked the two mandatory consent boxes (#31); we require that assertion and
-- refuse to fabricate consent, then stamp when + which policy version they agreed to.
drop function if exists public.book_trip(uuid, text, text, text, integer);

create function public.book_trip(
  p_departure_id uuid,
  p_registrant_name text,
  p_phone text,
  p_email text,
  p_participants_count integer,
  p_accepted_terms boolean
)
returns public.bookings
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  -- Single config constants (DECISIONS #30/#31/#44). Change here only.
  c_deposit_percent constant integer := 100;          -- #30/#40: v1 charges the full amount
  c_hold_minutes    constant integer := 40;            -- #44: Cardcom session (~30) + buffer (~10);
                                                        -- MUST stay strictly greater than the real
                                                        -- Cardcom session timeout (pre-launch verify)
  c_terms_version   constant text    := '2026-08-13';  -- #31: cancellation-policy (#13) text version

  v_departure      public.departures;
  v_taken          integer;
  v_remaining      integer;
  v_trail_name     text;
  v_total_amount   numeric;
  v_deposit_amount numeric;
  v_row            public.bookings;
begin
  if p_participants_count is null or p_participants_count < 1 then
    raise exception 'participants_count must be at least 1' using errcode = 'check_violation';
  end if;

  -- Both consents are mandatory (#31); never record a consent the caller did not assert.
  if p_accepted_terms is not true then
    raise exception 'the mandatory consents must be accepted to book' using errcode = 'check_violation';
  end if;

  -- Lock the departure so concurrent last-seat bookings can't oversell (#23).
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

  v_total_amount   := v_departure.price * p_participants_count;
  v_deposit_amount := round(v_total_amount * c_deposit_percent / 100.0);

  -- Guard the deposit rule (#30): must be a positive amount within the total.
  if v_deposit_amount <= 0 or v_deposit_amount > v_total_amount then
    raise exception 'deposit_amount % must be between 1 and total %', v_deposit_amount, v_total_amount
      using errcode = 'check_violation';
  end if;

  select name into v_trail_name from public.trails where id = v_departure.trail_id;

  insert into public.bookings (
    departure_id, trail_id, trail_name, trip_date,
    registrant_name, phone, email, participants_count,
    price_per_person, total_amount, deposit_amount,
    accepted_terms_at, terms_version,
    status, hold_expires_at, created_by
  )
  values (
    v_departure.id, v_departure.trail_id, coalesce(v_trail_name, ''), v_departure.date,
    p_registrant_name, p_phone, p_email, p_participants_count,
    v_departure.price, v_total_amount, v_deposit_amount,
    now(), c_terms_version,
    'held', now() + make_interval(mins => c_hold_minutes), auth.uid()
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.book_trip(uuid, text, text, text, integer, boolean)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. payments ledger — idempotency constraint + admin read policy
-- ---------------------------------------------------------------------------
-- The ledger IS the "have we already processed this charge?" record: a UNIQUE on
-- (provider, provider_ref) makes a Cardcom webhook retry a harmless no-op (#38).
alter table public.payments
  add constraint payments_provider_ref_key unique (provider, provider_ref);

-- Admin dashboard reads paid status through RLS (not the service-role key; #33). Table
-- stays deny-all to anon/authenticated (RLS on, no policy for them).
create policy "payments: admin all" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. record_payment_and_confirm — atomic "insert ledger row + confirm" (#39/#43)
-- ---------------------------------------------------------------------------
-- Called ONLY by the verified Cardcom webhook (ADR 0002). In one transaction it records
-- the succeeded payment and flips held -> confirmed, so the money truth (payments) and the
-- reservation truth (bookings.status) commit together and cannot drift. Privileged (#41):
-- security definer, NOT granted to anon/authenticated — the webhook uses the service role.
create function public.record_payment_and_confirm(
  p_booking_id uuid,
  p_provider_ref text,
  p_amount numeric,
  p_provider text default 'cardcom'
)
returns public.bookings
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_booking public.bookings;
begin
  if p_provider_ref is null or length(trim(p_provider_ref)) = 0 then
    raise exception 'provider_ref is required' using errcode = 'check_violation';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be positive' using errcode = 'check_violation';
  end if;

  -- Lock the booking so a concurrent expiry/cancel can't race the confirm.
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking % not found', p_booking_id using errcode = 'no_data_found';
  end if;

  -- Record the money movement idempotently. A webhook retry / Cardcom double-fire hits the
  -- UNIQUE(provider, provider_ref) and is silently skipped (#38/#43).
  insert into public.payments (booking_id, kind, amount, status, provider, provider_ref, paid_at)
  values (p_booking_id, 'deposit', p_amount, 'succeeded', p_provider, p_provider_ref, now())
  on conflict (provider, provider_ref) do nothing;

  -- Confirm only from held (#43). For an already-confirmed booking this is a no-op; for an
  -- expired/cancelled booking (the rare "paid but no seat" #32 designs out) we KEEP the
  -- payment row but do NOT touch status — that leaves a durable "paid but not confirmed"
  -- anomaly (a succeeded payment on a non-confirmed booking) for the admin to resolve via the
  -- manual refund flow (#15). Never silently drop a real charge; never force-confirm.
  if v_booking.status = 'held' then
    update public.bookings
    set status = 'confirmed'
    where id = p_booking_id
    returning * into v_booking;
  end if;

  return v_booking;
end;
$$;

-- Privileged: strip the default PUBLIC execute and grant only the service role (#41).
revoke all on function public.record_payment_and_confirm(uuid, text, numeric, text) from public;
revoke all on function public.record_payment_and_confirm(uuid, text, numeric, text) from anon, authenticated;
grant execute on function public.record_payment_and_confirm(uuid, text, numeric, text) to service_role;
