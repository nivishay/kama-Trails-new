# ADR 0002 — Cardcom confirmation: webhook-triggered, pull-verified, atomic record-and-confirm

Status: Accepted (2026-08-13)

## Context
Bookings are paid on Cardcom's hosted page (v11 `LowProfile/Create`); card data never
touches our server (DECISIONS #29, #34–#35). When a payment completes, Cardcom gives us
three signals: a **browser redirect** to our success/failed URL (unreliable — the tab may
close), a **server-to-server webhook** to our `WebHookUrl` (reliable), and a **pull API**
`GetLpResult(LowProfileId)` returning Cardcom's authoritative result. Cardcom does **not**
sign its webhook, so the POST body is not, by itself, trustworthy. We need one clear,
non-drifting answer to "what confirms a booking?"

## Decision
The **webhook is the only thing that flips `held → confirmed`**; the browser redirect page
only *displays* status, polling the booking by `access_token`. We **do not trust the webhook
body** — on receipt we call `GetLpResult(LowProfileId)` and treat that as the source of
truth, verifying `ResponseCode` success, `TranzactionInfo.Amount == booking.deposit_amount`,
and our terminal before acting. Correlation is by **`ReturnValue = booking.id`** (Cardcom
echoes it back); the charge's `TranzactionId` becomes `payments.provider_ref`.

The verified webhook calls **one RPC, `record_payment_and_confirm`**, which in a single DB
transaction inserts the `payments` row (**idempotent via `UNIQUE(provider, provider_ref)`**)
**and** flips `held → confirmed`. The **money truth** (the ledger, ADR 0001) and the
**reservation truth** (`bookings.status`) therefore commit together and cannot drift, and a
webhook retry is a harmless no-op.

## Why (the trade-off)
- **Two systems, one truth per fact.** Cardcom is authoritative about the charge/receipt; we
  are authoritative about the booking/capacity; the `payments` row is the join (holds a
  snapshot + `provider_ref`). They never claim the same fact, so they can't disagree.
- **Pull-verify over trust-body.** An unsigned webhook URL, if leaked or guessed, would let
  an attacker POST a fake "success" → free confirmed bookings and a broken capacity count.
  Re-fetching from Cardcom closes that hole. The amount is also trustworthy by construction
  (we set `Sum` in Create; the customer can't change it), so the amount check is a secondary
  guard against config/currency mistakes.
- **Atomic record-and-confirm over dual-write.** A loose "insert payment, then confirm" can
  half-fail and leave the ledger and status inconsistent. One transaction removes that class
  of bug; the ledger's unique index makes retries idempotent.
- **Reliable by design (DECISIONS #32).** The seat hold lasts ≥ Cardcom's session timeout, so
  a payment can only succeed while the seat is still held — "paid but no seat" is designed out,
  and the confirm always fits.

## Alternatives considered
- **Trust the webhook body directly (no re-fetch):** simpler, but unauthenticated input on the
  payment path — rejected.
- **Confirm on the browser success redirect:** unreliable (tab close, mobile network) and
  spoofable — demoted to display-only.
- **Derive `status` purely from the payments ledger (no stored state):** breaks because
  `status` also moves on non-payment events (hold expiry, admin cancel of a *paid* booking),
  so it is a distinct concept, not a projection of the ledger.

## Consequences
- New RPC `record_payment_and_confirm`; `confirm_registration` kept only for a manual/admin
  path. A migration adds `UNIQUE(provider, provider_ref)` on `payments`.
- The webhook handler makes an outbound `GetLpResult` call before confirming (one extra Cardcom
  round-trip per payment).
- The success page needs a small poll-until-confirmed UX rather than confirming inline.
