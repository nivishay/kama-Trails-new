-- Migration: make admin cancel + refund race-safe (QA sweep 2026-10-09).
--
-- The old flow (src/lib/admin/cancel-booking.ts) read the booking, called Cardcom provider.refund()
-- over the network, THEN called admin_cancel_booking to flip the row. Two near-simultaneous cancels
-- (two admins / two tabs — the per-form disabled only stops one session) therefore both passed the
-- pre-check and both refunded at Cardcom, while the second admin_cancel_booking saw status='cancelled'
-- and no-op'd — leaving Cardcom double-refunded but the ledger showing a single refund.
--
-- Fix: split the operation so the Cardcom refund can only be issued by the caller that ACTUALLY
-- transitions the booking to cancelled, serialized by the booking row lock.
--   1. admin_begin_cancellation — under SELECT … FOR UPDATE, flips held/confirmed -> cancelled and
--      returns did_cancel=true ONLY for the caller that performed the transition. A concurrent or
--      repeated call gets did_cancel=false and must not refund. It also returns the net paid amount
--      and the charge transaction id (derived under the same lock) so the refund is computed from a
--      consistent snapshot rather than a separate, racy read.
--   2. admin_record_refund — records the refund the caller just performed at Cardcom, idempotent via
--      the payments UNIQUE(provider, provider_ref).
--
-- Trade-off (intentional, matches the audit): the status flips before the Cardcom call, so if the
-- refund API fails the booking is already cancelled and the refund must be completed manually in
-- Cardcom. That is a loud, visible, recoverable error — strictly better than the previous SILENT
-- double refund. The original admin_cancel_booking is left in place (admin-only, still covered by its
-- integration tests) but is no longer called by the app.

create or replace function public.admin_begin_cancellation(
  p_booking_id uuid,
  p_reason     text
)
returns table (
  did_cancel          boolean,
  amount_paid         numeric,
  charge_provider_ref text,
  departure_date      date,
  participants_count  integer,
  status_before       text
)
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_booking public.bookings;
  v_amount_paid numeric := 0;
  v_charge_ref text := null;
  v_dep_date date;
  r record;
begin
  -- Privileged action: only the admin may cancel/refund (#15). security definer bypasses RLS, so
  -- gate explicitly.
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  if p_reason is null
     or p_reason not in ('customer_request', 'admin', 'departure_cancelled') then
    raise exception 'invalid cancellation reason: %', p_reason using errcode = 'check_violation';
  end if;

  -- Lock the booking so concurrent cancels serialize here — only one can transition it.
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking % not found', p_booking_id using errcode = 'no_data_found';
  end if;

  -- Net paid + the charge txn to refund against, derived under the lock (ledger: deposit/balance
  -- add, refund subtracts; the refund targets the most recent charge carrying a provider_ref).
  for r in
    select kind, amount, provider_ref
    from public.payments
    where booking_id = p_booking_id and status = 'succeeded'
  loop
    if r.kind = 'refund' then
      v_amount_paid := v_amount_paid - r.amount;
    else
      v_amount_paid := v_amount_paid + r.amount;
      if r.provider_ref is not null then v_charge_ref := r.provider_ref; end if;
    end if;
  end loop;
  if v_amount_paid < 0 then v_amount_paid := 0; end if;

  select d.date into v_dep_date
  from public.departures d where d.id = v_booking.departure_id;

  -- OUT params returned in every branch, so the caller always sees a consistent snapshot.
  status_before       := v_booking.status;
  amount_paid         := v_amount_paid;
  charge_provider_ref := v_charge_ref;
  departure_date      := v_dep_date;
  participants_count  := v_booking.participants_count;

  -- Already cancelled (or a concurrent caller won the lock first): no transition, caller must NOT
  -- refund. Idempotent — a retried bulk cancel is harmless.
  if v_booking.status = 'cancelled' then
    did_cancel := false;
    return next;
    return;
  end if;

  update public.bookings
  set status              = 'cancelled',
      cancelled_at        = now(),
      cancellation_reason = p_reason,
      updated_at          = now()
  where id = p_booking_id;

  did_cancel := true;
  return next;
end;
$$;

-- Admin-only at the grant layer too (belt and suspenders with the is_admin() check above). Revoke
-- from anon as well as public: Supabase's default privileges auto-grant EXECUTE to anon on new
-- functions, which is harmless here (is_admin() rejects anon) but untidy — keep the grant surface
-- to authenticated + service_role only.
revoke all on function public.admin_begin_cancellation(uuid, text) from public, anon;
grant execute on function public.admin_begin_cancellation(uuid, text) to authenticated;

create or replace function public.admin_record_refund(
  p_booking_id          uuid,
  p_refund_amount       numeric,
  p_refund_provider_ref text,
  p_provider            text default 'cardcom'
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;
  if p_refund_amount is null or p_refund_amount <= 0 then
    raise exception 'refund amount must be positive' using errcode = 'check_violation';
  end if;

  -- Idempotent on the payments UNIQUE(provider, provider_ref): a retry of the same Cardcom refund
  -- transaction records at most one ledger row (mirrors record_payment_and_confirm).
  insert into public.payments
    (booking_id, kind, amount, status, provider, provider_ref, paid_at, created_by)
  values
    (p_booking_id, 'refund', p_refund_amount, 'succeeded', p_provider,
     p_refund_provider_ref, now(), auth.uid())
  on conflict (provider, provider_ref) do nothing;
end;
$$;

revoke all on function public.admin_record_refund(uuid, numeric, text, text) from public, anon;
grant execute on function public.admin_record_refund(uuid, numeric, text, text) to authenticated;

-- Tidy pre-existing drift (flagged by the QA sweep): admin_cancel_booking also picked up an anon
-- EXECUTE grant from Supabase default privileges, despite its migration only granting authenticated.
-- Harmless (is_admin() rejects anon) but revoke it so the grant surface matches intent.
revoke execute on function
  public.admin_cancel_booking(uuid, text, numeric, text, text) from anon;
