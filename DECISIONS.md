# Kama Trails — Decisions & Open Questions

Living record of what we've agreed and what's still open. Updated during planning.
See [CONTEXT.md](./CONTEXT.md) for domain terms and [CLAUDE.md](./CLAUDE.md) for coding rules.

## Locked decisions

1. **Build approach:** Custom-coded app — **Next.js + Supabase** (Postgres + Auth).
   Not no-code/base44, not WordPress. The base44 POC is the product reference, not the codebase.
2. **v1 scope ("Version One"):** The site working like the POC + **real payment** = a
   complete closed booking flow (browse → pick departure → register → pay → confirmed),
   plus the **Admin Dashboard**. Marketing pages as in the POC are included.
3. **Sequencing & SEO north star:** **SEO + URL migration + domain cutover is the FINAL phase**,
   after v1 works. The end state is cutting over to the **existing live domain
   `https://kamatrails.co.il`** to **preserve its search ranking** — so we treat its SEO as an
   asset to protect, not rebuild. Practical rule for all earlier phases: **keep the real Kama
   site URLs close** — mirror the old URL structure (Hebrew slugs: `/אודות/`, `/trails-in-north/`,
   `/trails-in-south/`, `/trails-in-center/`, `/comming-soon-trails/`, `/contact/`, …) or maintain
   a 1:1 old→new redirect map, so the cutover is clean with no lost link equity. Old-site URL &
   content map: `meetings_docs/scrape_old.txt`. Don't lock in route/slug choices that would break
   this later (relates to #28: `trail_images` + alt text arrive with the SEO phase).
4. **Primary journey:** Self-serve public booking (as in the POC). The full concierge
   CRM funnel + WhatsApp/email automations (from the funnel doc) is a **later phase**, not v1.
5. **External services behind interfaces:** payment (and later WhatsApp/email) are isolated
   behind thin interfaces so concrete providers are pluggable.
6. **Booking lifecycle:** Pay-to-confirm with a temporary **seat hold** (~15 min) on checkout
   start. Booking is CONFIRMED only on successful **deposit** payment (then confirmation +
   receipt sent); abandoned/timed-out checkouts auto-release the hold. Capacity is never oversold.
7. **Payment model:** **Deposit + balance.** A deposit (מקדמה) is paid at booking to confirm
   and hold the spot; the remaining **balance** (יתרה) is collected later. (Amount %, timing,
   and collection method — see open questions.)
8. **Customer accounts:** **Guest checkout** — book with name/phone/email, no signup. The
   balance is paid via a secure **magic link** (email/SMS) to the booking. No customer passwords.
9. **Minimum registrants:** **Track-only.** A Departure stores a minimum and shows progress/
   status (e.g. "min not yet met"), but the admin **manually** decides whether to run or cancel.
   No automatic cancellation or refunds in v1.
10. **Admin Dashboard (v1) covers:** Manage Trails (content CRUD + images), Manage Departures
    (dates/capacity/min/price/time, open/close/cancel), Manage Bookings (view + contact +
    deposit/balance status, mark paid, cancel, refund), and a **Leads inbox** (contact-form
    submissions). Overview/analytics and manual/phone-booking entry are later additions.
11. **Admin auth:** **Single owner login** (Stav) with full access, via **Supabase Auth**.
    More staff / roles can be added later.
12. **Transactional messaging (v1):** **Email + WhatsApp.** Booking confirmation, receipt, and
    the balance magic link are sent over both email (transactional email service) and WhatsApp
    (WhatsApp Business API). Both sit behind one messaging interface. Marketing/funnel automations
    remain a later phase; this is transactional only.

13. **Cancellation & refund policy (canonical business rule):**
    - Cancel **5–6 days** before departure → fee **50 ₪ per participant**.
    - Cancel **3–4 days** before departure → fee **150 ₪ per participant**.
    - Cancel **within 48 hours** of departure → **full cost per participant** (no refund).
    - Registration + payment do **not** guarantee the trip runs — a trip runs only once the
      **minimum participants** is reached (reinforces the track-only minimum, decision #9).
    - If a trip won't run due to too few registrants, customers are notified **up to 3 days before**.
    - Cancellation due to **too few registrants / force majeure / weather / COVID limits** →
      customer gets a **full refund OR a free reschedule** to a new date.
14. **Reschedule:** **Admin-only.** The admin moves a booking to another departure (old spot
    freed, new spot taken, payments carry over). No customer self-serve reschedule in v1.
15. **Refund processing:** **Admin, manual.** The admin issues refunds from the dashboard,
    applying the tiered policy (#13) by hand. No customer self-serve or automatic refunds in v1.
16. **Language:** **Hebrew-only (RTL)** for v1. Content and code structured so English can be
    added later without a rewrite. No i18n framework wired up in v1.
17. **Catalog data:** **Seed from old content.** A seed script pre-loads the 15 existing trails
    (titles, descriptions, regions, heights, images) into Supabase; the admin edits from there
    and adds departures fresh. "From 0" = a fresh DB, not base44's data.
18. **Hosting (default, low-risk):** Next.js on **Vercel**, **Supabase** for Postgres + Auth +
    Storage (trail images). Revisit only if a constraint appears.

## Schema decisions (2026-08-08 grilling) — see [docs/SCHEMA.md](./docs/SCHEMA.md)

19. **Table names match the glossary:** `trip_registrations` → **`bookings`**, `trip_instances`
    → **`departures`**. Code, RLS, and seed all speak one language (Trail → Departure → Booking).
20. **Booking reservation states:** `held` → `confirmed` → `cancelled`, plus `expired`
    (abandoned/timed-out hold; row kept for funnel analytics). Replaces `pending`.
21. **Seat hold:** a `hold_expires_at` timestamp on the booking; a held booking occupies capacity
    only while unexpired. ~15-min timer (#6).
22. **Payments = a local ledger (not the provider's data):** separate `payments` table, one row per
    deposit/balance/refund, each referencing the provider transaction (`provider`, `provider_ref`);
    the booking keeps snapshot `total_amount` + `deposit_amount`; paid state is derived. See
    [ADR 0001](./docs/adr/0001-local-payments-ledger.md). Never store card data.
23. **Capacity guard:** occupied = Σ participants of (confirmed + unexpired-held); enforced in a
    row-locked transaction at booking time. No stored counter (can't drift). "Full"/"Past" derived.
24. **Departure status:** enum `open` / `closed` / `cancelled` (replaces `is_active`). `closed` =
    sales stopped but trip runs; `cancelled` = trip called off (bookings refunded/rescheduled #13).
25. **Cancellation record:** `cancelled_at` + `cancellation_reason` (`customer_request` / `admin` /
    `departure_cancelled`) — captures which refund policy applied. Money stays in the ledger. All
    cancellations are admin-executed (#15).
26. **Reschedule = move in place:** repoint the booking's `departure_id` (capacity-guarded), keep
    booking identity so payments + magic link carry over; store `rescheduled_at` (+ original
    departure id). Admin-only (#14).
27. **Consents:** both POC checkout consents are mandatory; record `accepted_terms_at` +
    `terms_version` on the booking. Per-participant signing is deferred to a later version.
28. **Trail images:** `hero_image` (renamed from `image`) + `gallery text[]` of Storage paths.
    Promote to a `trail_images` table (with alt text) when the SEO phase (#3) needs it.

## Open questions

- [ ] **Receipts/invoices (חשבונית מס/קבלה):** Israel requires legal receipts for the deposit and
      balance. Auto-issue via the payment provider, via a separate tool (Green Invoice/iCount),
      or manual? Tied to the payment-provider choice — client knowledge.
- [ ] WhatsApp Business API access route (Meta Cloud API direct vs provider like 360dialog/Twilio) + sender number approval.

## Deferred to a later phase (schema stays ready for these)

- **Per-participant signing** — each Participant signs consents; becomes its own table.
  (Participant is a count in v1.)
- **Per-image alt text / captions** — promote `gallery text[]` to a `trail_images` table when the
  SEO phase (#3) needs it.
- **Messaging/idempotency log** for transactional email + WhatsApp (#12) — a `messages` table to
  prevent double-sends on webhook retries; add when wiring the messaging interface.
- **Magic-link token expiry** — `access_token` is non-expiring in v1; add expiry/rotation later.

## Out of scope

- **Gift Cards** — explicitly dropped. Not built or referenced in v1.

- [ ] **Payment provider / merchant account** — TBD (client knowledge). Design provider-agnostic until known.
- [ ] Deposit mechanics: amount (fixed % or ₪/person), when balance is due, how balance is collected.
- [ ] Admin Dashboard scope for v1 (CRUD trails/departures, manage bookings, refunds, exports?) + admin auth.
- [ ] Booking confirmation + receipt/invoice as part of the "closed flow."
- [ ] Cancellation / refund handling in v1 (self-serve vs admin-only).
- [ ] SEO/URL strategy (final phase): keep old Hebrew slugs + redirects vs new English routes.
