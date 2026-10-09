# Kama Trails — Pre-Launch Checklist

Living checklist of everything that must be verified or done **before shipping the
real website** (public launch on `https://kamatrails.co.il`). See
[CLAUDE.md](../CLAUDE.md) for coding rules and [DECISIONS.md](../DECISIONS.md) for
locked decisions.

**How to use this file (rule for every agent):** whenever you defer something to
launch — a temporary shortcut, a `// TODO before ship`, a setting that's fine for
dev but wrong for production, a manual step, or a check that only matters live —
**add a line here** in the right section. Link the commit/PR and the file:line it
lives in. Nothing that blocks a real launch should live only in someone's memory or
a code comment. Tick items with `[x]` as they're done; don't delete them (the
history is the audit trail).

Status legend: `[ ]` open · `[x]` done · `[~]` in progress / partial.

---

## Booking & reservations correctness

- [ ] **Add `revalidatePath("/trails")` + `revalidatePath("/trails/[slug]")` on
  booking events** when booking goes live. The catalog is ISR-cached with
  `revalidate = 60` (see `src/app/trails/page.tsx`, `src/app/trails/[slug]/page.tsx`),
  so without on-demand revalidation a filled/cancelled departure can look stale for
  up to 60s. Overbooking is already impossible (the reservation path re-checks the DB
  at booking time) — this is a freshness/UX item, not a safety one.
  _Deferred in PR: ISR caching for the trails catalog._
- [x] Fix the hardcoded `15 minutes` hold in `book_trip` to the `HOLD_MINUTES` constant
  (`= Cardcom session + buffer`, strictly greater — DECISIONS #44). _Done: `book_trip` now
  uses `HOLD_MINUTES = 40` (migration `20260813120000_cardcom_payment_confirm.sql`)._ The
  **value 40 is provisional** — still gated on confirming Cardcom's real session timeout (see
  the "Confirm Cardcom's hosted-page session timeout" item below); adjust the constant there.
- [~] Verify the seat-hold expiry (`HOLD_MINUTES`, DECISIONS #44) actually releases holds and
  frees capacity in production (cron scheduled and running). _Built (#61): `expire_stale_holds()`
  flips lapsed `held` → `expired`, scheduled every minute via **pg_cron**
  (`20260906120000_expire_stale_holds.sql`). The pre-payment guards (`attach_payment_session`,
  `sign_booking_consents`) also reject a lapsed hold so it can't be paid in the race window. Still
  to verify **live**: that `pg_cron` is enabled on the cloud DB and the `expire-stale-holds` job
  is actually firing (`select * from cron.job;` / `cron.job_run_details`)._
- [x] **Apply `20260906120000_expire_stale_holds.sql` to the cloud DBs** (Preview
  `kama_trails_preview`, then main `kama_trails`) via MCP before deploy, and **confirm `pg_cron`
  installs there** — the migration's schedule step is wrapped in a `do … exception` block so it
  no-ops where `pg_cron` can't load, which means a silent no-schedule is possible; verify the job
  exists after applying (#61). _Done: applied to both cloud DBs; `pg_cron` installed and the
  `expire-stale-holds` job is scheduled (`* * * * *`) on both. Still to observe live: the job
  actually firing (`cron.job_run_details`) once real bookings exist._
- [ ] End-to-end test a real payment against the **live** Cardcom terminal (not the
  sandbox terminal `1000`) before opening booking to the public.
- [x] **Apply `20260921130000_close_past_departures.sql` to the cloud DBs.** Flips past `open`
  departures to `closed` (daily pg_cron + one-time backfill), so trips that already ran stop
  reading as open. _Applied to **both** Preview `kama_trails_preview` and main `kama_trails`
  (backfilled — 16 past departures closed in prod; `close-past-departures` job scheduled
  `5 0 * * *`, pg_cron confirmed on both)._

## Admin manage-actions, private trips & pay-links (DECISIONS #51/#53, issues #24/#32)

- [ ] **Apply the two new migrations to the cloud DBs** (Preview `kama_trails_preview`, then
  main `kama_trails`) via MCP before deploy — authored locally only this session (agent was
  told author-files-only): `20260905120000_departure_registration_deadline.sql` and
  `20260905140000_admin_private_trip_bookings.sql`.
- [ ] **Revisit the 7-day admin pay-link hold window** (`c_admin_hold_days` in
  `20260905140000_admin_private_trip_bookings.sql`). Admin-created bookings hold the seat for 7
  days so the pay-link stays valid; the seat auto-releases only on hold-timeout (#58). Confirm 7
  days is the right pay-window for private trips / late adds, and that a lapsed pay-link's seat
  release is acceptable (no notification is sent on expiry in v1).
- [ ] **Verify private (unlisted) departures never leak into the public catalog** — excluded by
  `is_private` in `list_availability`; confirm they also stay out of any sitemap/SEO surface at
  cutover, while still linking to the trail's public page (DECISIONS #51).
- [ ] **Registration-deadline default = departure start time**, computed in Asia/Jerusalem
  (`departure_effective_close`); when `departure_time` is absent/unparseable it falls back to end
  of the departure day. Confirm this matches Stav's expectation before launch (DECISIONS #53).

## ~~Tokenization payment model (ADR 0004 / DECISIONS #46–#52)~~ — SUPERSEDED (2026-08-19)

> **Superseded by DECISIONS #58 — reverted to pay-immediately at checkout.** The tokenize-then-charge-later
> model (ADR 0004) is no longer in effect, so the items that were here — scheduled D−14 Charge job,
> failed-charge retry/pay-link/2-day auto-release, tokenize-only registration + receipt-on-charge, the
> tokenize-capability terminal check, and the D−21 pre-charge under-min escalation — **no longer apply** and
> are dropped. Payment is collected in full at checkout again (see the **Cardcom payment provider** section
> below). One item survives (refunds still happen), moved here:

- [ ] **Confirm the Cardcom refund/זיכוי fee** (e.g. ~10₪) and, if any, disclose it in the customer
  cancellation message. Refunds are **admin-manual, calendar-tiered** (DECISIONS #13; refund model is #58,
  not charge-state).

### Admin cancel/refund flow (DECISIONS #13/#15/#53) — built this session

- [x] **Apply `20260921120000_admin_cancel_and_refund.sql` to the cloud DBs** (adds the
  `admin_cancel_booking` RPC). _Applied to **both** Preview `kama_trails_preview` and main
  `kama_trails` (verified: RPC present, security-definer, admin-only guard fires)._
- [ ] **Set `CARDCOM_API_PASSWORD` in Vercel prod env.** The refund endpoint
  (`Transactions/RefundByTransactionId`) authenticates with ApiName + ApiPassword — unlike checkout.
  `CardcomProvider.refund` throws loudly if it's missing, so a cancel-with-refund will fail until it's
  set (`src/lib/payments/cardcom/env.ts`, `cardcom-provider.ts`).
- [ ] **Verify the refund response's transaction-id field against the live Cardcom terminal.** The
  public v11 swagger doesn't pin `RefundByTransactionIdResp`'s field name; `refund()` reads
  `NewTranzactionId ?? TranzactionId` (`src/lib/payments/cardcom/wire-types.ts`). Confirm the real
  field so the refund's `provider_ref` is recorded, and adjust if Cardcom uses another name.
- [ ] **End-to-end sandbox refund** once a preview with real sandbox creds exists: cancel a paid
  booking and confirm Cardcom returns the money + a `kind='refund'` row lands in `payments`.
- [ ] **Partial-cancel (design 2c) deferred** — dropping *some* participants from a booking is not in
  the decided action set (#53); revisit only if Stav needs it. Tracked in `docs/admin-redesign-plan.md`.

## Checkout consents & signed waiver (DECISIONS #59) — legal

- [ ] **Finalize the signed-waiver text** including an explicit **ייפוי-כוח clause** — the booker
  declares authority to accept the waiver on behalf of **all** Participants (Participant is a count in
  v1, #27). Have **Ran legal-review** it, then set the initial `WAIVER_VERSION`.
- [ ] **Never mutate a released `POLICY_VERSION` / `WAIVER_VERSION` text in place — only bump the
  constant.** A stored version ref (`policy_version` / `waiver_version` on the booking) must always
  resolve to the exact text the customer signed; editing frozen text silently makes the stored ref
  lie (DECISIONS #59, extends #31).

## Marketing consent & customer data (DECISIONS #55–#56) — legal

- [ ] **Imported customers default opted-OUT** and are excluded from the Newsletter audience; only
  explicit opt-in is marketable (Israeli anti-spam / חוק הספאם). Have Ran legal-review the opt-in
  flow + copy before any marketing send.
- [ ] **Newsletter tool syncs consent both ways** — export only opted-in; an unsubscribe in the tool
  writes back opt-out (#55/#57).

## WhatsApp / automations (DECISIONS #57)

- [ ] **Meta-approved WhatsApp templates** for every transactional message before launch (Niv drafts,
  Stav finalizes wording) + sender-number approval + API access route chosen.

## Cardcom payment provider (DECISIONS #34–#40)

- [ ] **Swap sandbox → production Cardcom credentials** in Vercel env: real terminal
  number + API user/password (replacing test terminal `1000`). Never commit; verify not in
  the client bundle.
  - _2026-10-09: live creds identified + verified authenticating via `LowProfile/Create`
    (`ResponseCode 0`) from local `.env` — the **"חיבור ל-kama trail site"** API key
    (permissions חיוב/זיכוי/ביטול) on **terminal `198493`**. `CARDCOM_API_NAME` **must include
    the `SK-` prefix** (copying it without the prefix / truncated → `603`); terminal `1000` is
    unusable with this key (`614`)._
  - _Still to confirm: the Vercel **prod + preview** `CARDCOM_API_NAME` carries the `SK-`
    prefix and `CARDCOM_TERMINAL_NUMBER=198493` (Vercel hides `secret`-visibility values, so
    they can't be read back — verify by re-entering from the known-good local `.env`, or via a
    preview deploy)._
- [ ] **Confirm the auto-issued Cardcom document is a legal חשבונית מס/קבלה** (Cardcom told the
  client receipts are automatic — verify it's the tax document, not just a payment-confirmation
  email), carries business name + VAT details, and is addressed + emailed to the customer
  (DECISIONS #36). Confirm the `LowProfile/Create` call passes customer name/email + line
  description so the document is addressed correctly. If it's not a valid tax document, fall back
  to Green Invoice/iCount. _Built: `createCheckout` passes a `Document` block with
  `DocumentTypeToCreate: "TaxInvoiceAndReceipt"` + customer name/email + line description._
- [ ] **Confirm the `Document` block does not double-issue** a receipt: if Stav's terminal is
  configured to auto-issue a document per charge AND we pass `DocumentTypeToCreate`, the customer
  could get two documents. Verify against the live terminal; if it auto-issues, drop the explicit
  `DocumentTypeToCreate` (keep name/email so it's still addressed) — `src/lib/payments/cardcom/cardcom-provider.ts` (DECISIONS #36).
- [ ] **Bump `POLICY_VERSION`** (the cancellation-policy version constant in `book_trip`, formerly
  `TERMS_VERSION`/`c_terms_version = '2026-08-13'`; renamed by the #59 policy/waiver split) if the
  cancellation-policy (#13) text changes before launch — it stamps which policy version each customer
  agreed to (DECISIONS #31/#59).
- [ ] **Confirm Cardcom's hosted-page session timeout** and set the seat-hold length to
  `session + buffer` (DECISIONS #32/#39; the ~30 min default is a guess until confirmed).
- [ ] **Set `NEXT_PUBLIC_SITE_URL`** to the live origin (`https://kamatrails.co.il`) in Vercel —
  the checkout builds the Cardcom `SuccessRedirectUrl`/`FailedRedirectUrl`/`WebHookUrl` and the admin
  pay-links from it (`src/lib/site-url.ts`). Defaults to `http://localhost:3000` in dev.
  - _2026-10-09 (QA sweep): `getSiteUrl()` was hardened so it can **no longer silently emit a
    localhost URL on a deployed environment** — if `NEXT_PUBLIC_SITE_URL` is unset/localhost it falls
    back to Vercel's own origin (`VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL`) and throws if even that
    is absent. This was the root cause of the "private-trip pay-link doesn't work" bug (the copied
    link was `http://localhost:3000/...`). Setting the var is still required for the canonical origin
    and the `kamatrails.co.il` cutover, but the link + webhook no longer break when it's merely unset._
- [ ] **`WebHookUrl` reachable in production** (public Vercel URL) and
  `SuccessRedirectUrl`/`FailedRedirectUrl` point at the live domain. The webhook —
  verified via `GetLpResult` — is the only thing that confirms a booking (DECISIONS #37).
- [ ] **Create the `/cancellation-policy` page** with the real #13 fee-tier content — the
  checkout consent (`src/app/checkout/checkout-form.tsx`) links "מדיניות הביטולים" to it; the
  route does not exist yet (DECISIONS #31). Also fix the stale policy blurb in
  `src/components/catalog/departure-list.tsx` to match #13.
- [ ] **End-to-end payment test** once `NEXT_PUBLIC_SITE_URL` is a public URL: the webhook
  can't reach `localhost`, so the checkout→webhook→confirmed loop is only fully exercisable
  against a deployed preview.
  - _2026-10-09 (RESOLVED): Cardcom's **public** test terminal works for no-charge flow testing —
    `CARDCOM_TERMINAL_NUMBER=1000`, `CARDCOM_API_NAME=cardtest26`, `CARDCOM_API_PASSWORD=cardcom26`
    (from support article 360002688814). Verified live against `/api/v11/LowProfile/Create`
    (`ResponseCode 0`). Test card `4580280000000008`, exp `12/30`, CVV `123`; amounts under ₪5000
    simulate success, over ₪5000 simulate failure. These are now the ACTIVE creds in local `.env`
    (live 198493 creds commented out there). Earlier `614`/`603` failures were from using Kama's own
    keys on 1000 / stale emailed creds — not needed anymore. **Prod must still swap back to the live
    198493 terminal** (Vercel env — see the credential-swap item above)._
- [ ] Verify webhook **idempotency** under Cardcom retries in production (the
  `UNIQUE(provider, provider_ref)` on `payments` must make a retry a no-op, DECISIONS #38).
- [ ] **Review the verbose Cardcom response logging before launch.** `CardcomProvider.post`
  logs every Cardcom response (`console.info("[cardcom] … response", data)`,
  `src/lib/payments/cardcom/cardcom-provider.ts`) to diagnose the checkout/charge path. The
  `GetLpResult` / receipt blocks can carry **customer PII**, so gate it to non-production (or
  redact to `ResponseCode`/`Description` only) before going live — the rest of the payments code
  deliberately logs booking-id-only (`[cardcom-webhook]`). Added as a temporary debugging aid.
- [ ] **`PAYMENT_PROVIDER=fake` must be unset (and inert) in production.** The CI flow test
  uses a `FakePaymentProvider` that confirms bookings without a real charge (ADR 0003); it is
  hard-blocked on production deployments (`VERCEL_ENV === "production"` in
  `isFakePaymentProviderEnabled`, `src/lib/payments/index.ts`), but still confirm the Vercel prod env
  has no `PAYMENT_PROVIDER=fake` set at all — defence in depth.
- [ ] **Arm the Lane 2 sandbox e2e** (`.github/workflows/*` — real Cardcom sandbox against a
  deployed public preview) once a preview deployment with a reachable `WebHookUrl` exists: add
  the `schedule:` cron and the sandbox creds as CI secrets. It ships as a manual
  `workflow_dispatch` job until then (ADR 0003; pairs with the "End-to-end sandbox payment"
  item above).

## Leads capture & WhatsApp (DECISIONS #46–#51)

- [ ] **Replace the dev/personal WhatsApp token with a business-owned System-User token** before launch.
  Building/testing may use a token Niv generates via his Full access on the WhatsApp asset, but **Niv's
  portfolio access expires 9 Nov 2026** — if prod creds are tied to his membership, the auto-reply silently
  dies that day. Create a **System User** (portfolio-admin action — likely Stav) with
  `whatsapp_business_messaging` + `whatsapp_business_management`, assigned to the "שבילי קמה" WhatsApp
  account, and use that permanent token in prod env (DECISIONS #49).
- [ ] **Get the auto-reply message template approved by Meta** — the long pole (approval has lead time);
  no automated WhatsApp can send without it. Author the Hebrew copy and submit early (DECISIONS #50).
- [ ] **Set production secrets in Vercel env (never committed):** WhatsApp Cloud API token + Phone number ID,
  Cloudflare Turnstile site+secret keys, Upstash Redis URL+token (DECISIONS #50/#51). Verify none reach the
  client bundle.
- [ ] **Verify capture-always / send-best-effort in production:** a failed/blocked WhatsApp send (invalid
  number, API error, quota) must still leave the lead in the inbox — never a lost lead (DECISIONS #50).
- [ ] **Confirm the form's WhatsApp opt-in consent line** is present and its wording is final (DECISIONS #50).

## SEO & domain cutover (FINAL phase — see DECISIONS #3, #28)

- [ ] URL structure mirrors the old site or a 1:1 redirect map is in place
  (`meetings_docs/scrape_old.txt`) — no lost link equity on cutover.
  - [ ] Redirect the old Hebrew legal slugs to the new ASCII routes:
    `/מדיניות-פרטיות/` → `/privacy`, `/נגישות/` → `/accessibility`
    (pages added in `src/app/privacy/`, `src/app/accessibility/`).
- [ ] `sitemap.xml` + `robots.txt` generated and correct.
- [ ] Per-page metadata (title/description) and canonical URLs on every public route.
- [ ] Trail images have alt text (`trail_images` + alt, DECISIONS #28).
- [ ] Redirects verified for every old URL before DNS cutover to `kamatrails.co.il`.

## Performance

- [ ] Confirm all public routes are static/ISR (not `ƒ` dynamic) in `next build`
  output — dynamic renders on public pages are almost always a caching bug.
- [ ] Review `next.config.ts` `images.deviceSizes` — defaults generate variants up to
  3840px for source images that are ~768px wide (wasted bytes). Cap to sensible sizes.

## Security & data

- [ ] RLS reviewed on every table (run `schema-checker`); anon key can only read what's
  intended and write nothing it shouldn't.
- [ ] No secrets in the repo or client bundle; production env vars set in the host.
- [ ] Customer PII (name/phone/email) is stored/logged only where needed.
- [x] **Payment-bypass hole on `confirm_registration` closed** (QA sweep 2026-10-09). The
  SECURITY DEFINER `confirm_registration(uuid, uuid)` flipped a booking `held → confirmed` on a
  token match alone and was granted to `anon`/`authenticated`/`PUBLIC`, so a customer could confirm
  a seat for free from devtools. Migration `20261009120000_revoke_confirm_registration_public_grant.sql`
  revokes it down to `service_role` (applied to prod + in repo). The real confirm path
  (`record_payment_and_confirm`) is unaffected.
- [x] **Bot-gate + rate-limit now fail CLOSED in production** (QA sweep 2026-10-09). `verifyTurnstile`
  and `checkContactRateLimit` previously bypassed silently when their env (`TURNSTILE_SECRET_KEY` /
  Upstash) was missing, in any environment. They now reject on a production deployment
  (`isProductionDeployment()`, `src/lib/env/deployment.ts`) so a missing key surfaces as a visibly
  broken contact form instead of an open gate. **Still must set the prod keys** (see Leads section) —
  the fail-closed is a backstop, not a substitute.
- [x] **Double-cancel double-refund race fixed** (QA sweep 2026-10-09). `cancel-booking.ts` used to
  `provider.refund()` *before* flipping the row, so two near-simultaneous admin cancels both refunded
  at Cardcom while the ledger showed one. Reworked into a two-phase flow
  (`20261009130000_admin_cancel_atomic_claim.sql`, applied to prod + in repo): `admin_begin_cancellation`
  transitions the booking under a row lock and only the winner (`did_cancel=true`) refunds;
  `admin_record_refund` records it idempotently. Covered by `test/reservation/admin-cancel-atomic.integration.test.ts`
  (incl. a concurrent-claim test). _Residual: a Cardcom refund-API failure now leaves the booking
  cancelled-but-unrefunded (loud error → manual Cardcom refund), a deliberate trade vs. the previous
  silent double-refund._

## Operational readiness

- [ ] Error monitoring / logging wired for production.
- [ ] DB backups configured and a restore tested.
- [ ] Custom 404 / error pages in Hebrew RTL.
- [ ] Analytics installed (as decided).
