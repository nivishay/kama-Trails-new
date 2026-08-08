# ADR 0001 — Keep a local payments ledger, not just the provider's data

Status: Accepted (2026-08-08)

## Context
Bookings are paid via an external provider (e.g. Cardcom) that is the authoritative
record of each charge — card details, the receipt/חשבונית, the money movement. A fair
question came up: if the provider already stores all payment data, why keep our own?

## Decision
Keep a local, append-only `payments` ledger — one row per deposit, balance, or refund —
where each row **references** the provider's transaction (`provider`, `provider_ref`,
`amount`, `status`, `paid_at`) and links to its Booking. The Booking stores a **snapshot**
of the agreed plan (`total_amount`, `deposit_amount`). Whether the deposit/balance is paid
is **derived** by summing the ledger, not stored as a mutable status that can drift.

We store only a reference — **never** card numbers/PAN (that stays with the provider; PCI).

## Why (the trade-off)
The provider knows "card X paid 200₪ at 14:32"; it does not know our domain. We keep a
local ledger because:
- **Linking money → Booking/Departure** — only our DB connects a charge to a booking.
- **Reacting to events** — the provider's "deposit succeeded" webhook is what flips a
  Booking `held → confirmed`; we must record it to act on it.
- **No provider call per screen** — the admin bookings table reads our record, not a live
  provider API call per row.
- **Provider-agnostic (DECISIONS #5)** — switching/adding a provider doesn't break bookings
  or reports; they read our ledger, not a proprietary format.
- **Reconciliation & audit** — both sides exist to compare when they disagree.
- **Refunds & receipts** — refunds (incl. partial, per the tiered policy #13) are just rows;
  each row maps to one receipt/חשבונית.

## Alternatives considered
- **Columns on the booking** (`deposit_ref`, `balance_paid_at`, …): simpler for exactly two
  payments, but partial refunds, retries (failed then successful charge), and multiple
  receipts get awkward and force a later migration.
- **Rely on the provider's data only**: couples the whole app to one provider, needs live
  API calls to answer basic questions, and can't link money to our booking model.

## Consequences
- One extra table and a small aggregation query to compute paid state.
- A background/webhook job maintains ledger rows and drives Booking state transitions.
