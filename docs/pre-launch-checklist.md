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
  number + API user/password (replacing test terminal `1000` / `Cardcomtest26`). Never
  commit; verify not in the client bundle.
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
  the checkout builds the Cardcom `SuccessRedirectUrl`/`FailedRedirectUrl`/`WebHookUrl` from it
  (`src/lib/site-url.ts`). Defaults to `http://localhost:3000` in dev.
- [ ] **`WebHookUrl` reachable in production** (public Vercel URL) and
  `SuccessRedirectUrl`/`FailedRedirectUrl` point at the live domain. The webhook —
  verified via `GetLpResult` — is the only thing that confirms a booking (DECISIONS #37).
- [ ] **Create the `/cancellation-policy` page** with the real #13 fee-tier content — the
  checkout consent (`src/app/checkout/checkout-form.tsx`) links "מדיניות הביטולים" to it; the
  route does not exist yet (DECISIONS #31). Also fix the stale policy blurb in
  `src/components/catalog/departure-list.tsx` to match #13.
- [ ] **End-to-end sandbox payment** once `NEXT_PUBLIC_SITE_URL` is a public URL: the webhook
  can't reach `localhost`, so the checkout→webhook→confirmed loop is only fully exercisable
  against a deployed preview (test card in DECISIONS #29).
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

## Operational readiness

- [ ] Error monitoring / logging wired for production.
- [ ] DB backups configured and a restore tested.
- [ ] Custom 404 / error pages in Hebrew RTL.
- [ ] Analytics installed (as decided).
