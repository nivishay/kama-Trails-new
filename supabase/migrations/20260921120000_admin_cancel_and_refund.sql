-- Migration: admin cancel + refund (DECISIONS #13/#15/#25/#53/#58).
--
-- The admin panel can create and confirm bookings but has no way to CANCEL one or record a
-- REFUND — the one glaring gap for running the business (an admin literally cannot undo a
-- booking today). This adds the atomic primitive behind both admin cancel flows:
--   • single booking cancel (2a) — refund = paid − #13 fee, computed in the app;
--   • whole-departure cancel (2b) — full refund to every booking (#58), looped in the app.
--
-- The Cardcom refund API call happens in the server action (network I/O can't live in SQL);
-- this RPC records the money that already moved and flips the booking in ONE transaction, so the
-- ledger (payments) and the reservation (bookings.status) commit together and cannot drift —
-- mirroring record_payment_and_confirm (ADR 0002). The amount + refund transaction id are passed
-- in by the caller after Cardcom confirms the refund.

create or replace function public.admin_cancel_booking(
  p_booking_id         uuid,
  p_reason             text,
  p_refund_amount      numeric default 0,
  p_refund_provider_ref text default null,
  p_provider           text default 'cardcom'
)
returns public.bookings
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_booking public.bookings;
begin
  -- Privileged action: only the admin may cancel/refund (#15). security definer would otherwise
  -- bypass RLS, so gate explicitly.
  if not public.is_admin() then
    raise exception 'admin only' using errcode = 'insufficient_privilege';
  end if;

  if p_reason is null
     or p_reason not in ('customer_request', 'admin', 'departure_cancelled') then
    raise exception 'invalid cancellation reason: %', p_reason using errcode = 'check_violation';
  end if;

  if p_refund_amount is null or p_refund_amount < 0 then
    raise exception 'refund amount must not be negative' using errcode = 'check_violation';
  end if;

  -- Lock the booking so a concurrent confirm/expiry can't race the cancel.
  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking % not found', p_booking_id using errcode = 'no_data_found';
  end if;

  -- Already cancelled: no-op, return as-is (idempotent — a retried bulk cancel is harmless).
  if v_booking.status = 'cancelled' then
    return v_booking;
  end if;

  -- Record the refund that Cardcom already performed. Always positive; the direction is `kind`.
  if p_refund_amount > 0 then
    insert into public.payments
      (booking_id, kind, amount, status, provider, provider_ref, paid_at, created_by)
    values
      (p_booking_id, 'refund', p_refund_amount, 'succeeded', p_provider,
       p_refund_provider_ref, now(), auth.uid());
  end if;

  update public.bookings
  set status              = 'cancelled',
      cancelled_at        = now(),
      cancellation_reason = p_reason,
      updated_at          = now()
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

-- Admin-only at the grant layer too (belt and suspenders with the is_admin() check above).
revoke all on function
  public.admin_cancel_booking(uuid, text, numeric, text, text) from public;
grant execute on function
  public.admin_cancel_booking(uuid, text, numeric, text, text) to authenticated;
