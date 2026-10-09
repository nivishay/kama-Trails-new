-- Migration: close a payment-bypass hole on confirm_registration.
--
-- confirm_registration(uuid, uuid) is a SECURITY DEFINER function that flips a booking
-- held -> confirmed on an access_token match alone — no payment, no consent, no expiry check. The
-- baseline granted EXECUTE to anon + authenticated (00000000000000_baseline.sql:345). Because the
-- booking's id + access_token are exposed to the customer's own browser (they ride in the Cardcom
-- return URLs and are returned by get_booking_by_token via the anon key), a customer could call
-- this RPC directly from devtools and confirm a seat for FREE — and a confirmed seat is counted by
-- free_spots forever (it never expires), so it is permanent unpaid inventory + revenue loss.
--
-- The real confirm path is the service-role webhook -> record_payment_and_confirm (locked to
-- postgres + service_role). The app has no remaining caller of confirm_registration (ADR 0002 keeps
-- it only for a manual/admin path). So restrict EXECUTE to service_role: the payment webhook and a
-- future admin tool can still call it, but the public roles cannot.
--
-- cancel_registration keeps its anon/authenticated grant on purpose — a customer cancelling their
-- own token-held booking is legitimate; only the free-confirm path is the hole.

revoke execute on function public.confirm_registration(uuid, uuid) from anon, authenticated;
revoke execute on function public.confirm_registration(uuid, uuid) from public;
grant execute on function public.confirm_registration(uuid, uuid) to service_role;
