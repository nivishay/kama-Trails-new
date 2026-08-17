# ADR 0004 — Tokenize at registration, charge ~14 days before departure

Status: Accepted (2026-08-16 meeting; supersedes the "confirmed = paid at checkout" core of
DECISIONS #6/#30/#32/#40 and amends ADR 0002)

## Context
The client cannot hold a credit-card framework (מסגרת אשראי) for more than about a week, so the
original v1 model — collect the full amount at checkout and treat `confirmed` as "paid" (DECISIONS
#6, #30, #32, #37, #40; ADR 0002) — does not work for Bookings made weeks in advance. At the
2026-08-16 meeting (Niv / Ran / Stav) we agreed to **decouple securing the seat from collecting the
money**: save the card now, charge later.

## Decision
A Booking secures its seat at **registration by tokenizing the card, not by paying**. Cardcom's
hosted page runs a **tokenize-only** operation; on success the Booking becomes **`reserved`** (seat
secured, capacity occupied, **no money moved**) — this is when the customer is "booked." The actual
**Charge** runs later, against the stored Token, at **`max(departure − 14 days, now)`**: ~14 days
before departure, or **immediately** for a last-minute Booking already inside that window (one
scheduled-charge mechanism, no special-case code path). A successful Charge moves **`reserved →
confirmed`**; only then does Cardcom auto-issue the **חשבונית מס/קבלה** (DECISIONS #36) — at
registration the customer gets a **booking confirmation**, not a receipt.

**Failed charge** (card expired / insufficient funds / decline) is the new failure mode the old
model designed out, and is handled explicitly: the system **auto-retries the Token** a few times,
then **notifies the customer with a new pay-now link** (an immediate charge, since we are inside the
14-day window) and **alerts the Admin** that retries failed and a link was sent. If still unpaid
after **~2 days**, the seat **auto-releases** and the Admin is notified. This is the **one automatic
cancellation path**; it is distinct from the admin-decided minimum-participants cancellation
(DECISIONS #9).

**Refunds** are modeled off **charge state**, not the calendar alone:

| | Before Charge (>14d out, no money moved) | After Charge (confirmed) |
|---|---|---|
| **Customer cancels** | Release seat + drop Token — nothing owed | Refund **minus** policy fee (Stav's tiers, #13) |
| **Company cancels** (weather / min / force majeure) | Release seat + drop Token — nothing to refund | **Full** refund (no fee) **or** free reschedule |

The cancellation-fee tiers therefore govern exactly one cell (customer-cancels-after-charge); every
other case is "no money moved" or "full refund." Stav finalizes the exact numbers/timing (#13
becomes provisional), but this structure holds regardless.

## Why (the trade-off)
- **Decoupling is forced by the credit-framework constraint** — a seat weeks out cannot rest on a
  held framework, so "secure now, collect near the trip" is the only shape that works.
- **`reserved` as a first-class state** stops us conflating "seat secured" with "paid." The old
  model's identity (`confirmed` ⇔ money in bank) is deliberately broken: `reserved` = secured,
  `confirmed` = paid.
- **Charge at `max(D−14, now)`** keeps last-minute Bookings on the same mechanism (charge "now")
  instead of a separate immediate-pay branch.
- **Charge failure cannot be designed out** the way "paid but no seat" was (DECISIONS #32) — the
  weeks-long gap between securing and collecting is the whole point — so it gets a real
  retry → re-link → bounded-deadline → auto-release path.

## Alternatives considered
- **Keep pay-at-checkout (ADR 0002 as-is):** rejected — impossible under the >1-week framework limit
  for advance Bookings.
- **Authorize/hold the framework instead of tokenizing:** rejected — that is exactly the hold the
  client cannot keep beyond ~a week.
- **Manual admin-only handling of failed charges:** rejected for the release step (a dead
  reserved-but-unpaid seat would silently occupy capacity); ret/notify is automated, only the
  final *decision* stays out of the customer's hands via the bounded 2-day auto-release.

## Consequences
- **PR #15 (Cardcom charge-now) is reworked**, not discarded: the registration `LowProfile/Create`
  becomes a **tokenize-only** call (no `Document` block); a **new charge step** runs the Token at
  `max(D−14, now)` and carries the `Document` block so the receipt is issued at collection time.
- **ADR 0002 is amended:** the webhook that "flips `held → confirmed`" now flips **`held →
  reserved`** on tokenization; a separate charge event drives **`reserved → confirmed`**. The
  pull-verify (`GetLpResult`) and atomic record-and-confirm principles carry over to the charge.
- **New scheduled job** to run charges at `max(D−14, now)` and to drive the retry/deadline timers
  (cron/edge function) — a new operational dependency to provision and monitor.
- **Seat-hold length (#44)** still only needs to cover the short tokenization redirect, so the
  `session + buffer` reasoning survives unchanged; the weeks-long `reserved` wait is **not** a hold.
- **Customer copy constraint:** the registration confirmation states **when and how much** they'll
  be charged, but must **not** say "we saved your card" — Cardcom holds the card; we hold only a
  Token.
- **`payments.status='failed'`** (unused in v1 per #42) now becomes a real, used state.
