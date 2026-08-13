-- Migration: checkout + return-page + admin plumbing for the Cardcom flow.
-- Follows 20260813120000_cardcom_payment_confirm.sql. Adds:
--   1. bookings.payment_session_id  — the Cardcom LowProfileId, stored to re-verify (#38).
--   2. payments.document_number/url — the issued חשבונית ref, for the admin view (#36).
--   3. attach_payment_session       — anon RPC to store the session id on a held booking
--      (the public checkout can't write bookings directly under RLS; #33 keeps it off the
--      service role).
--   4. get_booking_by_token         — anon RPC the success/failed page polls (#45).
--   5. record_payment_and_confirm   — recreated to also persist the document ref.

-- ---------------------------------------------------------------------------
-- 1 + 2. New columns
-- ---------------------------------------------------------------------------
alter table public.bookings add column payment_session_id text;
alter table public.payments add column document_number bigint;
alter table public.payments add column document_url text;

-- ---------------------------------------------------------------------------
-- 3. attach_payment_session — store the Cardcom session id on a held booking
-- ---------------------------------------------------------------------------
-- Called right after checkout-start opens the Cardcom session. Token-guarded so only the
-- customer who created the booking (holds its access_token) can set it, and only while held.
create function public.attach_payment_session(
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
    and status = 'held';

  if not found then
    raise exception 'booking not found or not awaiting payment' using errcode = 'no_data_found';
  end if;
end;
$$;

grant execute on function public.attach_payment_session(uuid, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. get_booking_by_token — safe read for the customer return pages (#45)
-- ---------------------------------------------------------------------------
-- The success page polls this until status='confirmed'. Returns only display-safe fields for
-- the one booking whose access_token is presented (bookings are otherwise hidden from anon).
create function public.get_booking_by_token(p_access_token uuid)
returns table (
  id                 uuid,
  departure_id       uuid,
  status             text,
  trail_name         text,
  trip_date          date,
  registrant_name    text,
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
    b.registrant_name, b.participants_count, b.total_amount, b.deposit_amount
  from public.bookings b
  where b.access_token = p_access_token;
$$;

grant execute on function public.get_booking_by_token(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. record_payment_and_confirm — recreate to also persist the receipt ref (#36)
-- ---------------------------------------------------------------------------
-- Same atomic record + confirm behavior as 20260813120000 (#39/#43), plus optional Cardcom
-- document columns. Adding params requires drop-and-recreate; the extra params default to
-- null so existing 4-arg call sites keep working.
drop function if exists public.record_payment_and_confirm(uuid, text, numeric, text);

create function public.record_payment_and_confirm(
  p_booking_id uuid,
  p_provider_ref text,
  p_amount numeric,
  p_provider text default 'cardcom',
  p_document_number bigint default null,
  p_document_url text default null
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

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking % not found', p_booking_id using errcode = 'no_data_found';
  end if;

  insert into public.payments (
    booking_id, kind, amount, status, provider, provider_ref, paid_at,
    document_number, document_url
  )
  values (
    p_booking_id, 'deposit', p_amount, 'succeeded', p_provider, p_provider_ref, now(),
    p_document_number, p_document_url
  )
  on conflict (provider, provider_ref) do nothing;

  if v_booking.status = 'held' then
    update public.bookings
    set status = 'confirmed'
    where id = p_booking_id
    returning * into v_booking;
  end if;

  return v_booking;
end;
$$;

revoke all on function public.record_payment_and_confirm(uuid, text, numeric, text, bigint, text) from public;
revoke all on function public.record_payment_and_confirm(uuid, text, numeric, text, bigint, text) from anon, authenticated;
grant execute on function public.record_payment_and_confirm(uuid, text, numeric, text, bigint, text) to service_role;
