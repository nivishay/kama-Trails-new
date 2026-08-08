# Kama Trails — Target Schema (v1)

Concrete table spec agreed in the 2026-08-08 grilling session. This is the *shape* to build;
the *why* lives in [DECISIONS.md](../DECISIONS.md) and [docs/adr/](./adr). Glossary terms are
in [CONTEXT.md](../CONTEXT.md). Nothing here is applied to Supabase until signed off.

Conventions: all tables have `id uuid pk default gen_random_uuid()`, `created_at`/`updated_at`
`timestamptz default now()`, and (where noted) `created_by uuid → auth.users`. RLS stays enabled
on every table.

## trails — catalog
| column | type | notes |
|---|---|---|
| slug | text unique | |
| name | text | |
| short_name | text | |
| region | text | check: north / south / center |
| region_label | text null | |
| difficulty | text null | check: easy / easy-medium / medium / medium-hard / hard |
| difficulty_label | text null | |
| price | numeric | check >= 0 — base/default per-person price |
| height, duration | text null | free text (Hebrew) |
| **hero_image** | text null | **renamed from `image`** |
| **gallery** | text[] default '{}' | **new** — ordered Storage paths |
| excerpt, description, gear, audience, included | text null | free text |
| sort_order | int default 0 | |

## departures — dated bookable instances (renamed from `trip_instances`)
| column | type | notes |
|---|---|---|
| trail_id | uuid → trails | |
| date | date | |
| departure_time | text null | |
| price | numeric | check >= 0 — per-person, overrides trail price |
| min_capacity | int default 0 | check >= 0 — track-only (#9) |
| max_capacity | int default 20 | check > 0 |
| **status** | text default 'open' | **replaces `is_active`** — check: open / closed / cancelled |

"Full" (occupied >= max_capacity) and "Past" (date < today) are **derived, never stored.**

## bookings — reservations (renamed from `trip_registrations`)
| column | type | notes |
|---|---|---|
| departure_id | uuid → departures | renamed from `trip_instance_id` |
| trail_id | uuid → trails null | |
| trail_name | text | snapshot |
| trip_date | date null | snapshot |
| registrant_name, phone, email | text | contact person (PII) |
| participants_count | int | check > 0 — seats taken |
| price_per_person | numeric null | snapshot |
| total_amount | numeric | check >= 0 — snapshot (participants × price) |
| **deposit_amount** | numeric | **new** — snapshot of deposit owed (amount rule = open question) |
| **status** | text default 'held' | **was pending/confirmed/cancelled** — check: held / confirmed / cancelled / expired |
| **hold_expires_at** | timestamptz null | **new** — seat-hold timer; occupies capacity until it passes |
| **accepted_terms_at** | timestamptz null | **new** — consent proof |
| **terms_version** | text null | **new** — which policy version was accepted |
| **cancelled_at** | timestamptz null | **new** |
| **cancellation_reason** | text null | **new** — check: customer_request / admin / departure_cancelled |
| **rescheduled_at** | timestamptz null | **new** — reschedule audit |
| **rescheduled_from_departure_id** | uuid → departures null | **new** — reschedule audit |
| access_token | uuid default gen_random_uuid() | magic-link handle (non-expiring in v1) |

Reservation lifecycle: `held` → `confirmed` (deposit paid) → `cancelled`, or `expired` (hold
timed out; seats auto-released, row kept for funnel analytics). Payment progress is separate
(see payments), never mixed into this enum.

Capacity guard (never oversold, #6): occupied = Σ `participants_count` where status = `confirmed`
OR (status = `held` AND `hold_expires_at` > now()). Enforced inside a transaction that locks the
departure row before insert. No stored counter.

Reschedule (#14): repoint `departure_id` (capacity-guarded on target), refresh `trip_date`, set
`rescheduled_at` + `rescheduled_from_departure_id`. Payments carry over (linked to booking).

## payments — money ledger (new; ADR 0001)
| column | type | notes |
|---|---|---|
| booking_id | uuid → bookings | |
| kind | text | check: deposit / balance / refund |
| amount | numeric | check > 0 — always positive; direction is in `kind` |
| status | text default 'pending' | check: pending / succeeded / failed |
| provider | text | e.g. 'cardcom' |
| provider_ref | text null | provider transaction id (never card data) |
| paid_at | timestamptz null | |

Paid state (derived): Σ(succeeded deposit+balance) − Σ(succeeded refund). Cancellation fee is
`paid − refunded`, not stored.

## leads — contact inbox (unchanged)
name, email, phone (null), message, status (check: new / contacted / closed).

## profiles — admin auth (unchanged)
id → auth.users, full_name (null), phone (null), role (check: admin / user, default 'user').

## Deferred to a later phase (not built in v1)
- **Per-participant signing** — each participant signs; becomes its own table. (Participant is a
  count in v1 per CONTEXT.md.)
- **Per-image alt text / captions** — promote `gallery text[]` to a `trail_images` table when SEO
  phase (#3) needs it.
- **Messaging/idempotency log** for transactional email + WhatsApp (#12) — a `messages` table to
  prevent double-sends on webhook retries; revisit when wiring the messaging interface.
- **Magic-link token expiry** — `access_token` is non-expiring in v1; add expiry/rotation later.
