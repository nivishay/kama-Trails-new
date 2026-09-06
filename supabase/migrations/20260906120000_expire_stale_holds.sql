-- Migration: expire stale seat holds so `held` stops lying (#61).
--
-- Root cause of the booking-flow bug: capacity math everywhere counts a hold only while
--   status = 'held' AND hold_expires_at > now()
-- so an expired hold silently frees its seat for counting — but NOTHING ever flips the
-- booking ROW to 'expired'. The row reads 'held' forever, and every guard that trusts the
-- literal status (attach_payment_session, sign_booking_consents, the pay-link action) keeps
-- treating a long-dead hold as still payable. A customer could pay for a seat that already
-- lapsed and was resold → oversell, and admin views show stale "held" rows.
--
-- Fix, two complementary layers:
--   1. expire_stale_holds() + a per-minute pg_cron job — makes the status column truthful for
--      admin/reporting and flips the seat "back to valid" (available) once the hold lapses.
--   2. Harden the two PRE-payment guards to also require hold_expires_at > now(), closing the
--      race window between a hold lapsing and the next sweep run.
--
-- Deliberately NOT hardened: record_payment_and_confirm / confirm_registration. Those are the
-- money-received paths — a succeeded charge always keeps the row, even on an expired hold
-- (the "paid but no seat" anomaly is surfaced to the admin, never silently dropped; #43/#32).

-- ---------------------------------------------------------------------------
-- 1. expire_stale_holds — flip lapsed holds held -> expired. Idempotent; returns the count.
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_holds()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_count integer;
begin
  update public.bookings
  set status     = 'expired',
      updated_at = now()
  where status = 'held'
    and hold_expires_at is not null
    and hold_expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- The sweep mutates other customers' bookings, so keep it off the public roles: only the cron
-- job (runs as the postgres superuser) and a service/admin caller may invoke it.
revoke all on function public.expire_stale_holds() from public;
grant execute on function public.expire_stale_holds() to service_role;

-- ---------------------------------------------------------------------------
-- 2a. attach_payment_session — also require a LIVE hold (recreated from 20260813130000)
-- ---------------------------------------------------------------------------
create or replace function public.attach_payment_session(
  p_booking_id uuid,
  p_access_token uuid,
  p_session_id text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.bookings
  set payment_session_id = p_session_id
  where id = p_booking_id
    and access_token = p_access_token
    and status = 'held'
    and hold_expires_at > now();   -- #61: a lapsed hold is no longer awaiting payment

  if not found then
    raise exception 'booking not found or its hold has expired' using errcode = 'no_data_found';
  end if;
end;
$$;

grant execute on function public.attach_payment_session(uuid, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2b. sign_booking_consents — reject a lapsed hold (recreated from 20260905140000)
-- ---------------------------------------------------------------------------
-- Same behavior as before, except the "awaiting payment" gate now also fails once the hold
-- has expired, so the pay-link cannot charge a seat that already lapsed (and may be resold).
create or replace function public.sign_booking_consents(
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
  -- #61: treat a lapsed (or hold-less) hold as no longer payable, not just a non-held status.
  if v_booking.status <> 'held'
     or v_booking.hold_expires_at is null
     or v_booking.hold_expires_at <= now() then
    raise exception 'booking is not awaiting payment (hold expired)' using errcode = 'check_violation';
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
-- 3. get_booking_by_token — also surface hold_expires_at (recreated from 20260905140000)
-- ---------------------------------------------------------------------------
-- The pay-link action reads this before charging; returning the hold deadline lets it show a
-- precise "the hold has expired" message instead of a generic failure during the race window.
-- Adding a column requires drop-and-recreate; callers select by name, so unaffected.
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
  deposit_amount     numeric,
  hold_expires_at    timestamptz
)
language sql
stable security definer
set search_path to 'public'
as $$
  select
    b.id, b.departure_id, b.status, b.trail_name, b.trip_date,
    b.registrant_name, b.email, b.participants_count, b.total_amount,
    b.deposit_amount, b.hold_expires_at
  from public.bookings b
  where b.access_token = p_access_token;
$$;

grant execute on function public.get_booking_by_token(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Schedule the sweep once a minute.
-- ---------------------------------------------------------------------------
-- pg_cron is available on Supabase cloud. On a local/CI stack that doesn't preload it this
-- block is a no-op, so `supabase start` / `db reset` still apply the migration cleanly — the
-- hardened guards above already make an expired hold unpayable even without the sweep.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('expire-stale-holds', '* * * * *', 'select public.expire_stale_holds();');
exception when others then
  raise notice 'pg_cron unavailable (%); skipping schedule. expire_stale_holds() is still callable.', sqlerrm;
end;
$$;
