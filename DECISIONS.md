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

## Booking-flow decisions (2026-08-08 grilling)

29. **Payment provider is STILL OPEN (Cardcom / HYP / Grow) — decided behind the `PaymentProvider`
    interface (#5), sandbox-first.** What's *locked* is the **shape**, not the vendor: all three are
    Israeli hosted-page providers, so checkout **redirects to the provider's hosted payment page**
    (card data never touches our server) and confirmation is driven by the provider's
    **server-to-server webhook** (→ `confirm_registration`, `held → confirmed`). That contract is
    identical across Cardcom/HYP/Grow, so we build `book_trip`/checkout/webhook against the interface
    and stay uncommitted on the vendor. Matches [ADR 0001](./docs/adr/0001-local-payments-ledger.md)
    (we store only a provider reference). **Go-live = pick the vendor + a credentials swap** in Vercel
    env, no flow change; each candidate is one class behind the same interface, and a later switch is
    one more class. Decision driver = which merchant account the client actually opens + fees +
    receipt/invoice support (see open questions).
    - **Cardcom** is the current reference implementation for the sandbox because it has a free public
      one: test terminal `1000`, API user `Cardcomtest26` (API password from `dev@secure.cardcom.co.il`,
      kept in `.env`, never committed). Test cards: `4580280000000008` (IL success), `4580000000000000`
      (tourist success), any future expiry / any CVV / any 9-digit ID. This lets us build and prove the
      whole flow **now**; if the client lands on HYP or Grow instead, we write that provider class and
      the rest of the flow is unchanged.

30. **v1 charges the FULL amount to confirm (deposit = 100%); deposit/balance split deferred.**
    Amends the *intent* of #7 (deposit + balance) and #8 (balance via magic link) for v1: the
    customer pays 100% at checkout, so there is no balance and **no balance-collection flow is built
    in v1**. Modeled as the single config constant `DEPOSIT_PERCENT` (= 100 now): `book_trip` sets
    `deposit_amount = round(total_amount × DEPOSIT_PERCENT/100)`, guarded `0 < deposit_amount ≤
    total_amount`; the Cardcom charge = `deposit_amount`; the `payments` row is `kind='deposit'`
    ("amount required to confirm"). Switching to a real partial deposit later = set `DEPOSIT_PERCENT`
    to e.g. 50 and build the balance-collection screen then — **no schema change** (`deposit_amount`
    + `payments.kind` already support it). Checkout copy is **number-driven**: `deposit_amount ===
    total_amount` → "תשלום מלא" (no balance line); otherwise "מקדמה now + balance later".

31. **Checkout form + the two mandatory consents (confirmed against the live POC register page).**
    Fields = exactly `book_trip`'s params: participants stepper (`1…free_spots`), full name, phone,
    email; total shown as "סה״כ לתשלום" (full amount, per #30); button "המשך לתשלום". Two **mandatory**
    consent checkboxes (verbatim from the POC):
    1. `קראתי את מדיניות הביטולים ואני מסכים/ה` — the words "מדיניות הביטולים" **link** to our
       cancellation-policy page. That page states **DECISIONS #13** (the ₪-fee tiers), **not** the
       POC's percentage text. The POC's `/cancellation-policy` content (7+ →100%, 3–7 →50%, <3 →0%)
       is **superseded** — a deliberate, documented divergence: we mirror the POC *flow* (policy page
       + consent link) but the *content* is the client's real rule #13. Also **fix the wrong hardcoded
       line** in `src/components/catalog/departure-list.tsx` ("7+ ימים → החזר מלא") to match #13.
    2. `אני מבין/ה שמדובר בפעילות אתגרית הכרוכה בסיכון ואני מאשר/ת השתתפות מרצוני` — the risk/liability
       waiver (static text, not versioned).
    Flow order (forced by the seat hold, #6/#23): form submit → `book_trip` **also records consents**
    (`accepted_terms_at = now()`, `terms_version = TERMS_VERSION`) and creates the hold → redirect to
    Cardcom → webhook confirms. This grows `book_trip`'s signature (a migration handed to the user as
    SQL). `TERMS_VERSION` is a single constant tracking the **cancellation-policy (#13)** text version;
    bump it when that text changes. Refines #27.

32. **The booking payment is a CLOSED transaction — no mechanical refunds.** Invariant that makes it
    so: **the seat hold lasts ≥ the provider's payment-session timeout (+ buffer)**, i.e.
    `hold = provider_session_timeout + buffer` (amends the "~15 min" in #6). Because the seat is held
    for the entire window in which payment can succeed, a successful payment **always** still owns its
    seat → `confirm_registration` always fits → `held → confirmed`, done. A seat is freed (→ `expired`)
    **only** when the provider's session times out / the card fails (genuine abandonment, nobody paid).
    Consequence: the capacity re-check + idempotency in `confirm_registration` is a **defensive
    backstop only** (webhook retries; pathological cases like a webhook for an already-cancelled
    booking) — in normal operation it never rejects and never refunds. **"Paid but no seat" is designed
    out, not handled.** Distinct from *business* refunds (customer/company cancels a confirmed booking,
    #13/#15) — a separate admin-driven flow, not part of the booking transaction and not in this
    increment. **Open fact to confirm:** the chosen provider's hosted-page session timeout (sets the
    hold length; default 30 min until confirmed from the provider's docs — Cardcom's is ~30 min).

33. **Payment vendor = Grow (משולם); build sandbox-first behind `PaymentProvider`, Stav's account is a
    later credentials swap.** Resolves #29's "vendor still open": we commit to **Grow** as the build
    target. Grow's test→live delta is only the **base host** (`sandbox.meshulam.co.il` →
    `secure.meshulam.co.il`) + **credentials** (`userId` + `pageCode` + `apiKey`) — flow and fields are
    identical — so cutover is a **Vercel env swap, no flow change** (fulfils #29). Two facts shape the
    build: Grow has **no public sandbox** (sandbox `userId`/`pageCode` are issued **per business by Grow
    support**), and **Stav has not opened a Grow account yet**. So we build **fake-provider-first**:
    define the `PaymentProvider` interface + a `FakeProvider` mimicking Grow's exact contract (redirect
    to hosted page → **server-to-server webhook** → `confirm_registration`, `held → confirmed`) and
    build/test the whole booking→pay→confirm flow with **zero external dependency**. `GrowProvider` is
    one class added when sandbox creds arrive; Stav's live account is then env credentials only. **Two
    swap-points, both pure config:** (fake → Grow) and (Grow sandbox → Stav live). Supersedes **Cardcom**
    as the sandbox reference in #29 (Cardcom is no longer used).

34. **Admin Dashboard (#10) build plan — UI + auth wiring over the *existing* RLS admin model.** The
    authz layer is already deployed in the baseline schema: `profiles.role='admin'` + `is_admin()` +
    admin RLS on `trails`/`departures`/`bookings`/`leads`/`profiles`, plus the `submit_lead` ingest RPC.
    So the dashboard adds **no new authz DB design** — it wires a session onto what exists. Locked:
    - **Login:** Supabase Auth **email + password, invite-only** (no public signup); `/admin/*` guarded
      by middleware checking the session; **RLS (not app code) enforces PII access** via `is_admin()`, so
      **no service-role key in any request path** (ratifies #11's mechanics; rejects service-role bypass).
    - **Admin mutations:** plain **CRUD direct-to-table under RLS** (edit trail fields, departure
      date/capacity/status, lead status).
    - **Manage Bookings is READ-ONLY in v1 — [OPEN QUESTION] the action set.** v1 shows only the
      **bookings-per-departure view** (list a departure's bookings + contact/PII + paid status, read-only).
      The **mutations are deferred and unresolved**: mark-paid, admin-cancel (stamp `reason='admin'` #25),
      reschedule (capacity-guarded repoint #26), contact-customer. Each would be a `security definer` admin
      RPC (rules in one place, mirroring the booking-flow RPCs) — but *which* actions ship, and their exact
      behaviour, is a **separate grill** before building them. So the invariant-RPCs above are NOT part of
      the current dashboard slice.
    - **Two migrations this needs:** (a) a `"payments: admin all"` RLS policy — `payments` is currently
      deny-all (RLS on, no policies), so the dashboard can't read deposit/paid status; (b) a
      `handle_new_user` trigger that auto-creates a `profiles` row on signup, plus a **one-time promote of
      Stav** to `role='admin'` (no admin exists yet and nothing provisions `profiles` today).
    - **Build order:** (1) auth + `/admin` shell (RTL, **noindex** — admin is never part of the SEO
      cutover #3) + admin bootstrap + the two migrations; (2) **Manage Departures + Manage Bookings**
      (Stav's operational core); (3) Manage Trails (content CRUD + images); (4) **Leads inbox** — and wire
      the contact form to `submit_lead` (it's "coming soon" today, so the inbox stays empty until then).

## Open questions

- [~] **Receipts/invoices (חשבונית מס/קבלה):** Israel requires legal receipts. **Grow can do this
      for us** — it auto-issues חשבונית מס / קבלה after payment and emails/SMSes it to the customer
      (configurable, brandable, also via API). Leaning: **let Grow issue receipts**, so it stays out of
      our build. **To confirm (account-level, client knowledge):** Stav's Grow account has the invoicing
      module enabled (may be a paid add-on) and business/VAT details set. If not enabled, fall back to a
      separate tool (Green Invoice/iCount) — but that's a later, separate integration, not the payment flow.
- [ ] WhatsApp Business API access route (Meta Cloud API direct vs provider like 360dialog/Twilio) + sender number approval.
- [ ] **Automations orchestration — in-app vs Make (Integromat)?** For a **later dedicated grill**: when we
      build automations (transactional #12 + funnel #4), do we code them in-app behind a `MessagingProvider`
      seam, or orchestrate them as external workflows via **Make.com** (client is considering it) / n8n /
      Zapier? Plus: map each trigger → message → channel. **Blocked meanwhile** on the triggers (booking
      confirmed = payment) and channels (WhatsApp/email) that are currently deferred. Current build focus is
      the **Admin Dashboard (#10) + single-owner auth (#11)**, which is fully unblocked.
- [ ] **Admin password recovery not wired** — admin login is password-only; there is no recovery/callback
      route, and Supabase's recovery email redirects to the Site URL with a token the app can't handle
      (surfaced 2026-08-09 during live login verification). Fine for a single owner in v1 (set/reset the
      password via the Supabase dashboard / Admin API). Wire a proper reset flow if more admins are added.
- [ ] **Provider hosted-page session timeout** — sets the seat-hold length (#32: `hold = session + buffer`).
      Confirm from the chosen provider's docs once the vendor is picked; default 30 min until known
      (Cardcom's is ~30 min).

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

- [ ] **Payment provider / merchant account** — STILL OPEN between **Cardcom / HYP / Grow** (see #29).
      Approach is resolved (sandbox-first behind the `PaymentProvider` interface; Cardcom used as the
      sandbox reference because it's free/public), but the **vendor is not chosen** — it depends on which
      merchant account the client opens, plus fees and receipt/invoice support. Client knowledge.
- [x] Deposit mechanics — RESOLVED for v1 (see #30): charge 100% via `DEPOSIT_PERCENT`; no balance
      flow in v1. Still client knowledge for later: the real deposit % and when/how balance is collected.
- [ ] Admin Dashboard scope for v1 (CRUD trails/departures, manage bookings, refunds, exports?) + admin auth.
- [ ] Booking confirmation + receipt/invoice as part of the "closed flow."
- [ ] Cancellation / refund handling in v1 (self-serve vs admin-only).
- [ ] SEO/URL strategy (final phase): keep old Hebrew slugs + redirects vs new English routes.
