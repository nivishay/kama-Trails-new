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

33. **Admin Dashboard (#10) build plan — UI + auth wiring over the *existing* RLS admin model.** The
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

## Cardcom integration decisions (2026-08-13 grilling) — see [ADR 0002](./docs/adr/0002-cardcom-confirmation-model.md)

34. **Payment provider = Cardcom.** Resolves the open vendor in #29. Still built behind the
    `PaymentProvider` interface (#5); go-live remains a credentials swap, and a later switch is one
    more class. What #29 locked (hosted redirect page + server-to-server webhook) is unchanged — this
    only fills in the vendor and the Cardcom-specific design below.

35. **Cardcom API generation = v11 REST `LowProfile/Create`.** JSON in/out; amounts in **shekels**
    (matches our `numeric` `total_amount`/`deposit_amount` — no agorot conversion). We set the amount
    in the Create call and **the customer cannot change it** on the hosted page, so the charged amount
    is trustworthy by construction. (Legacy form-encoded `Interface/LowProfile.aspx` in agorot is
    rejected.)

36. **Receipts (חשבונית מס/קבלה) = Cardcom issues them**, folded into the `LowProfile/Create` call via
    the **`Document` block** — Cardcom auto-issues the חשבונית מס/קבלה and emails it to the customer.
    **Supersedes the earlier "let Grow issue receipts" lean** (that reasoning was vendor-specific;
    vendor is now Cardcom). No separate invoicing integration in v1 (no Green Invoice/iCount). We may
    store the returned `DocumentInfo` ref (`DocumentNumber`/`DocumentUrl`) for the admin view.
    **Dependency (pre-launch, account/client knowledge):** Stav's Cardcom terminal must have the
    documents/invoicing module enabled (may be a paid add-on) + business/VAT details set.
    **Update (2026-08-13):** Cardcom confirmed to the client that receipts are issued/sent
    **automatically**. Remaining verify (narrowed): that the automatic document is the **legal
    חשבונית מס/קבלה** (not merely a payment-confirmation email), carries our business/VAT details, and is
    **addressed + emailed to the customer**. Build consequence: if the *terminal* auto-issues per charge,
    we may not need to *trigger* the document, but the `LowProfile/Create` call still passes the
    **customer name + email + a line description** ("השתתפות בטיול …") so the receipt is addressed and
    delivered to the right customer.

37. **Confirmation model = webhook-confirms-only + pull-verify** (the security-critical rule). The
    server-to-server webhook (Cardcom → our `WebHookUrl`) is the **only** thing that flips
    `held → confirmed`. The browser `SuccessRedirectUrl` page **never mutates state** — it only
    *displays*, polling the booking by `access_token` until it reads `confirmed`. Because Cardcom does
    **not** sign its webhook, we **do not trust the POST body**: on receipt we call
    **`GetLpResult(LowProfileId)`** and treat *that* response as the source of truth. Before confirming
    we verify **`ResponseCode` success + returned amount (`TranzactionInfo.Amount`) == booking
    `deposit_amount` + our terminal**. (The amount check is a secondary guard — see #35 — it catches a
    config/currency mistake.) Reliable-by-design with #32: a payment can only succeed while the seat is
    still held, so "paid but no seat" can't occur.

38. **Correlation & idempotency.** The Create call carries **`ReturnValue = booking.id`**; Cardcom
    echoes it back on the webhook + result, which is how we find the booking. **`provider_ref` =
    Cardcom `TranzactionId`**. Add a **`UNIQUE(provider, provider_ref)` on `payments`** so webhook
    retries are harmless no-ops (the ledger *is* the "have we processed this charge?" record).
    `LowProfileId` identifies the payment session (stored to re-fetch/verify).

39. **Atomic confirm RPC = `record_payment_and_confirm(booking_id, provider_ref, amount)`.** In **one
    DB transaction**: insert one `payments` row (`kind='deposit'`, `status='succeeded'`, `provider_ref`;
    idempotent via the #38 unique index) **and** update `bookings` `held → confirmed`. Replaces the
    loose "insert payment *then* call `confirm_registration`" for the paid path — the **money truth**
    (payments) and the **reservation truth** (`status`) commit together and cannot drift.
    `confirm_registration` is retained only for a possible manual/admin confirm path. Named generically
    (not `..._deposit_...`) because in v1 the confirming payment is the **full** amount, not a deposit.

40. **Full payment in v1; deposit deferred to a later version** (reaffirms #30). To close a booking the
    customer pays the **FULL amount** — no partial deposit and no balance-collection flow in v1.
    Internally the confirming payment is still recorded as **`kind='deposit'`** meaning *"the amount
    required to confirm"* (= total in v1); the **customer never sees the word "deposit"** — checkout
    copy is **"תשלום מלא"**. Introducing a real deposit later = set `DEPOSIT_PERCENT < 100` + build the
    balance screen, with **no schema change** (`payments.kind` + `deposit_amount` already support it).
    _[Open, deferred: if we later prefer the stored v1 value to be neutral (`'full'`) rather than
    `'deposit'`, that's a one-line enum choice — traded against a migration when real deposits arrive.]_

41. **The confirm path is privileged; the webhook is a Next.js Route Handler with the service-role key.**
    `record_payment_and_confirm` is `security definer` and **not granted to `anon`/`authenticated`** — if
    the public role could call it, an attacker could confirm a booking without paying (guessed
    `booking_id` + any `provider_ref`), which would make ADR 0002's verification pointless. So the RPC is
    invoked **only** by the Cardcom **webhook handler**, implemented as a **Next.js Route Handler on
    Vercel** (Node runtime, non-cached) holding the **service-role key** (server-only env, never
    `NEXT_PUBLIC`). This does **not** violate #33: #33 forbids service-role in *user request* paths
    (`/admin/*`); the webhook is a *system* path (Cardcom → our server, no browser/session), which is the
    correct place for a scoped elevated credential — it makes "verified-webhook-only" the single way a
    booking can confirm. Chosen over a Supabase Edge Function to keep one deploy target / env store and
    because the handler already makes the outbound `GetLpResult` call. See [ADR 0002](./docs/adr/0002-cardcom-confirmation-model.md).

42. **The v1 ledger records only *succeeded* payments — no `pending` row at checkout-start.** A `held`
    booking already means "payment attempt in flight," so a `pending` payments row would duplicate that
    signal in a second place (the "two truths" drift we're avoiding). The `payments` ledger stays what
    ADR 0001 says — a record of *actual money movements*: an abandoned checkout leaves an `expired`
    booking and **no** payment row (nothing to reconcile/GC). Correlation needs no pending row
    (`ReturnValue = booking.id` + `GetLpResult`, #37/#38). Consequence: `payments.status` values
    `'pending'`/`'failed'` are **unused in v1** — kept in the enum for the future (retries, balance flow),
    not manufactured.

43. **`record_payment_and_confirm` behavior by booking state (the #32 backstop, made concrete).** The RPC
    **always records the payment idempotently** (`UNIQUE(provider, provider_ref)`), and:
    - `held` → insert payment + flip `held → confirmed` (the normal path).
    - already `confirmed` (webhook retry / Cardcom double-fire) → the unique index rejects the duplicate;
      **idempotent no-op**.
    - `expired` / `cancelled` (the rare "paid but no seat" #32 designs out) → **record the payment but do
      NOT change status**, and **flag it as an anomaly for the admin** ("paid but not confirmed"), resolved
      via the manual refund flow (#15). Never silently drop a real charge; never force-confirm (would
      oversell or revive an admin-cancelled booking). **No** automatic capacity-recheck/re-confirm — the
      30-min+ hold makes this case rare enough that a cheap safe backstop is correct, not a feature.

44. **Seat-hold length = Cardcom session timeout + buffer (strictly greater), as a named constant.** Makes
    #32's `hold = session + buffer` concrete and **supersedes the "~15 min" figures in #6/#21 and the
    hardcoded `15 minutes` in `book_trip`** (a live mismatch to fix). The hold must be **strictly greater**
    than Cardcom's hosted-page session timeout — equal timers re-open the boundary race #32 closes (a
    payment landing as the hold expires = "paid but no seat"). `HOLD_MINUTES = Cardcom_session + buffer`;
    with Cardcom's ~30 min (still to confirm) and a ~10 min buffer → **~40 min**. Exact value follows the
    open question (confirm Cardcom's real session timeout); if a round 30-min hold is ever wanted, Cardcom's
    session must be pinned ≤ ~20 so a buffer still exists.

45. **Accepted build defaults for checkout-start + return** (follow-through on locked decisions; no new
    forks — accepted 2026-08-13):
    - **`book_trip` grows** to set `deposit_amount = round(total_amount × DEPOSIT_PERCENT/100)` (= total in
      v1, #30), record both mandatory consents (`accepted_terms_at = now()`, `terms_version =
      TERMS_VERSION`, #31), then create the hold at `HOLD_MINUTES` (#44). Signature grows (migration).
    - **`PaymentProvider` interface** (#5) in `src/lib/payments/`: `createCheckout(booking) → { redirectUrl,
      sessionId }` and `getResult(sessionId) → verified PaymentResult` (normalized: success, amount,
      `providerRef`, `bookingId`, document ref). `CardcomProvider` maps these to `LowProfile/Create` +
      `GetLpResult`.
    - **Customer return pages:** `SuccessRedirectUrl` reads the booking by `access_token` and **polls until
      `status='confirmed'`** (the webhook drives the real transition, #37); `FailedRedirectUrl` offers
      retry; **both `noindex`** (never part of the SEO cutover, cf. #33).

## Leads capture & concierge funnel (2026-08-15 grilling)

46. **Buy-before-build — prefer an existing product over code we own.** When a need is already met by a
    service we use or can adopt, use *that* rather than building it. Extends #5 (external services behind
    interfaces) from "make providers pluggable" to "don't build what you can rent." Applied: Cardcom issues
    receipts (#36) — no invoicing code; leads are chatted in **WhatsApp / Meta Business Suite Inbox** — no
    chat UI; Facebook/Instagram lead capture **pulls from Meta** — no re-built form. **The limit — source
    of truth:** an off-the-shelf product wins only when it doesn't fragment the hub (#48). Rule when a "just
    use product X" idea comes up: does X cover the need *without* splitting the source of truth? If yes, use
    it; if it would create a second place leads live, pull *from* it into the hub instead.

47. **Leads capture is built to its FINAL state now — supersedes the "funnel is a later phase" clause of
    #4/#18.** No throwaway v1 for lead handling: we build the concierge funnel's first stage (capture +
    immediate WhatsApp auto-reply) directly. This reverses only the *sequencing* of #4/#18 for the
    lead-capture stage; the later funnel stages (quote reminders, prep alerts, post-trip) remain unbuilt.

48. **Leads architecture = one hub, rented conversations, owned pipeline.**
    - **Supabase `leads` = the single source of truth / hub.** *Every* channel flows **in** — website form
      (now), Facebook/Instagram lead-ads + inbound WhatsApp (later) — never out to a second store.
    - **Conversations (2-way chat, FB+IG+WhatsApp) = Meta Business Suite Inbox** — rented, free, already
      Stav's daily tool. We build no chat UI.
    - **Pipeline over the booking domain = our `/admin` inbox** (the one thing Meta can't do — it ties a
      Lead to Departures/Bookings). Its "open conversation" button deep-links to Meta Suite.

49. **WhatsApp channel = Cloud API *direct* (no BSP, no Twilio).** The number **+972 53-484-4874 ("שבילי
    קמה")** is on the WhatsApp Cloud API (WhatsApp Manager: Connected, quality High), owned in-house under
    Stav's Meta Business account (no agency). Resolves the WhatsApp-access open question. The auto-reply is a
    **single in-app Cloud API call** from the capture server action (same pattern as Cardcom's `actions.ts`)
    — **not Make.** Make stays reconsidered only for the *time-delayed* funnel automations (2h SLA, 24/48h
    reminders); the orchestration open question (#4-era) remains open for those.

50. **First build slice = form → hub → WhatsApp auto-reply.** `/contact` form → `submitContactForm` server
    action → `submit_lead` (Supabase) → Cloud API sends an approved template to the customer. Consequences:
    - **Fields:** name + WhatsApp phone + email **required**; message **optional**.
    - **Migration:** `leads.phone` → `not null`; `leads.message` → nullable; `submit_lead` requires phone,
      validates email + Israeli **mobile**, normalizes to E.164 (`05X…` → `9725X…`); add a **`source`**
      column (first slice writes `'contact_form'`, so Facebook ingest slots in later — closes the
      glossary/schema gap where CONTEXT.md's Lead already names a *source* the table lacked).
    - **Consent:** a WhatsApp opt-in line on the form ("בשליחת הטופס אני מאשר/ת יצירת קשר בוואטסאפ").
    - **Capture-always, send-best-effort:** the lead is always stored; the *paid* WhatsApp fires only for a
      valid mobile, and a send failure is logged but never loses the lead (it still lands in the inbox).

51. **Public-form abuse gate (best practice, free tiers).** Because each submit now *spends money and
    messages a real phone*, the form is gated to protect both the wallet and the number's WhatsApp quality
    rating: **Cloudflare Turnstile** (invisible bot check) + **honeypot** + **Upstash Ratelimit**
    (per-IP/per-phone) + **`libphonenumber-js`** valid-mobile-only send guard. Note: hand-rolled rate-limit
    is broken on Vercel serverless (no shared memory) → Upstash, or Vercel WAF on Pro.

## Open questions

- [x] **Receipts/invoices (חשבונית מס/קבלה): RESOLVED → Cardcom issues them** (see #36). Supersedes the
      earlier "let Grow issue receipts" lean now the vendor is Cardcom. **Cardcom confirmed to the client
      that receipts are sent automatically (2026-08-13).** Remaining verify (narrowed, pre-launch): the
      automatic document is the **legal חשבונית מס/קבלה** with our business/VAT details, **addressed +
      emailed to the customer** — not just a payment-confirmation email. If it turns out not to be a valid
      tax document, fall back to Green Invoice/iCount as a later, separate integration.
- [x] **WhatsApp API access route: RESOLVED → Cloud API direct** (see #49). Number +972 53-484-4874
      ("שבילי קמה") is Connected on the WhatsApp Cloud API, in-house under Stav's Meta Business account —
      **no BSP, no Twilio**. Remaining setup (not a decision): author + submit the auto-reply template for
      Meta approval, and generate the credentials (see the pre-launch token item).
- [ ] **Automations orchestration — in-app vs Make (Integromat)? NARROWED (see #49).** Settled: the
      *lead-capture auto-reply* is **in-app** (a single Cloud API call, no orchestrator). Still open **only**
      for the *time-delayed / multi-step* funnel automations (2h no-response SLA, 24h/48h quote reminders,
      prep alerts): code them in-app behind a `MessagingProvider` seam with a scheduler (Supabase
      `pg_cron`/Vercel Cron), or orchestrate via **Make.com** (client is considering it) / n8n. Decide when
      those timers are built; map each trigger → message → channel then.
- [ ] **Admin password recovery not wired** — admin login is password-only; there is no recovery/callback
      route, and Supabase's recovery email redirects to the Site URL with a token the app can't handle
      (surfaced 2026-08-09 during live login verification). Fine for a single owner in v1 (set/reset the
      password via the Supabase dashboard / Admin API). Wire a proper reset flow if more admins are added.
- [ ] **Cardcom hosted-page session timeout** — sets the seat-hold length (#32: `hold = session + buffer`).
      Vendor is now Cardcom (#34); confirm the exact value from Cardcom's terminal config / docs. Default
      ~30 min until confirmed.

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

- [x] **Payment provider / merchant account — RESOLVED → Cardcom** (see #34–#40). Built behind the
      `PaymentProvider` interface (#5); go-live is a credentials swap. Remaining client/account facts to
      confirm are tracked in the pre-launch checklist (invoicing module, production terminal + API creds,
      session timeout).
- [x] Deposit mechanics — RESOLVED for v1 (see #30): charge 100% via `DEPOSIT_PERCENT`; no balance
      flow in v1. Still client knowledge for later: the real deposit % and when/how balance is collected.
- [ ] Admin Dashboard scope for v1 (CRUD trails/departures, manage bookings, refunds, exports?) + admin auth.
- [ ] Booking confirmation + receipt/invoice as part of the "closed flow."
- [ ] Cancellation / refund handling in v1 (self-serve vs admin-only).
- [ ] SEO/URL strategy (final phase): keep old Hebrew slugs + redirects vs new English routes.
