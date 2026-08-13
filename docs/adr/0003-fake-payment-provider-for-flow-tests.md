# ADR 0003 — A fake payment provider seam so CI can flow-test the booking happy-path

Status: Accepted (2026-08-13)

## Context

The booking journey (browse → checkout → **pay** → confirmed) is the crown-jewel customer
flow, so it deserves a blocking end-to-end (Playwright) test in CI. But the payment step
hands off to **Cardcom's external hosted page** (`startCheckout` → `provider.createCheckout()`
→ `redirect(session.redirectUrl)`), and — by ADR 0002 — a booking only flips `held → confirmed`
when Cardcom's **server-to-server webhook** reaches `/api/cardcom/webhook`. The success page
merely polls; it never confirms inline.

Two hard walls for a CI flow test on a GitHub-hosted runner:

1. Playwright cannot reliably drive Cardcom's own hosted DOM (their markup, possible 3-D Secure,
   rate limits, network flakiness).
2. Even against the Cardcom **sandbox**, the confirming webhook cannot reach a `localhost` runner
   — there is no public URL for Cardcom to call back. The booking would sit `held` and the poller
   would time out; the flow could never reach `confirmed`.

So a deterministic, blocking flow test cannot use the real provider. `getPaymentProvider()`
today unconditionally returns the real `CardcomProvider`.

## Decision

Introduce a **`FakePaymentProvider`** behind the existing `PaymentProvider` interface, selected
by `getPaymentProvider()` when an explicit env flag (`PAYMENT_PROVIDER=fake`) is set. The fake
implements `createCheckout` by returning a `redirectUrl` that points **straight back at our own
`/checkout/success`** (no external hop) and drives the same `record_payment_and_confirm` path the
real webhook would — so the flow test reaches a genuine `confirmed` booking with zero external
dependency.

The fake is **fail-closed for production**: it is honoured only when `PAYMENT_PROVIDER=fake`
**and** the deployment is not production (`VERCEL_ENV !== "production"`). The guard is the
_deployment_ signal, deliberately **not** the build mode: the flow test runs against a real
production build (`next build`), where `NODE_ENV === "production"`, so a `NODE_ENV`-based guard
would wrongly disable the fake in exactly the job that needs it. On a real Vercel production
deployment `VERCEL_ENV === "production"`, so the flag is ignored there and the real
`CardcomProvider` is always used — no deploy can confirm a booking without a real charge.

CI wires this into a **PR-gate flow job** (Lane 1): boot the app + local Supabase, set
`PAYMENT_PROVIDER=fake`, run the Playwright booking smoke. The real Cardcom **sandbox** is
exercised separately (Lane 2) as a manual/nightly e2e against a **deployed public preview**,
where the webhook can actually land — see the pre-launch checklist.

## Why (the trade-off)

- **The seam already exists.** Payment is already behind a `PaymentProvider` interface with a
  `getPaymentProvider()` factory (dependency injection). Adding a second implementation is the
  idiomatic use of that seam, not a new abstraction invented for tests.
- **Determinism is what makes it a gate.** A blocking merge check must be fast and flake-free.
  The fake has no network, no third party, no timing — it either works or the app is broken.
- **We do not lose real-integration coverage.** The Cardcom wire contract stays covered by the
  provider unit tests and the DB-layer `payments.integration.test.ts` (record-and-confirm,
  idempotency, the expired-booking anomaly, RLS), and by the Lane 2 sandbox e2e against a real
  deployment. The fake covers the _UI funnel_, not Cardcom's protocol.
- **The production risk is designed out.** A fake that confirms bookings without payment is a
  security landmine if it ever ships live, so selection is gated on the production deployment
  signal (`VERCEL_ENV`) and recorded in the pre-launch checklist as a launch-blocking verification.

## Alternatives considered

- **Mock Cardcom inside Playwright only (no prod-code seam):** intercept the outbound Cardcom
  call in the test. Keeps production untouched but couples the test to Cardcom's wire protocol
  and re-implements the redirect/confirm by hand — brittle. Rejected.
- **Tunnel the sandbox into CI (ngrok):** run the real sandbox on the PR gate and expose the
  runner so the webhook lands. Real, but adds a tunnel service, secrets, and third-party
  flakiness to _every_ PR run. Rejected for the gate; this is effectively Lane 2's job done
  against a proper deployment instead.
- **Stop the flow test before payment:** assert only that the checkout form renders, never
  confirm. No prod change, but it skips the exact step being built this week. Rejected — the
  confirm is the point.

## Consequences

- `getPaymentProvider()` gains an env branch and a new `FakePaymentProvider` implementation
  (server-only, dev/test-only by construction).
- A new launch-blocking checklist item: verify `PAYMENT_PROVIDER=fake` is unset (and inert) in
  production env.
- The Playwright flow smoke runs against the fake; the real Cardcom sandbox e2e is a separate
  Lane 2 job, unscheduled until a public preview deploy exists.
