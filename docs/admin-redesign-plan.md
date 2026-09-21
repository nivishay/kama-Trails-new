# Admin Panel Redesign — Plan

**Status:** draft for approval · **Date:** 2026-09-21
**Design source:** Claude Design "Admin Panel Directions"
(`meetings_docs/admin-redesign/Admin Panel Directions.dc.html`)
**Goal:** make the admin panel more intuitive **using what the code already has** —
finish, don't grow scope. Two parts: (A) a hybrid dashboard, (B) the cancel/refund
actions layer (launch-blocking, but already decided — see below).

## Build status (2026-09-21) — implemented on `feat/admin-redesign-plan`

- ✅ **§0 corrections** — status badge labels were already correct; no dead-model strings in `src`.
- ✅ **Part A hybrid dashboard** — needs-attention (below-minimum), upcoming cards, month calendar
  (`src/lib/admin/dashboard.ts`, `month-calendar.tsx`, rewritten `(dashboard)/page.tsx`).
- ✅ **Leads inbox** — `/admin/leads` + status transitions; `פניות` nav enabled.
- ✅ **Fee calculator** — `src/lib/admin/cancellation.ts` (+ 15 unit tests).
- ✅ **Cardcom `refund()`** — provider contract + Cardcom (`RefundByTransactionId`) + fake (+ tests).
- ✅ **Cancel flows (2a/2b)** — `admin_cancel_booking` RPC + orchestration + UI + integration test.
- **DB:** RPC applied to **Preview** (`kama_trails_preview`) and verified; **prod `kama_trails`
  pending** at merge (see `docs/pre-launch-checklist.md`).
- **Deferred (not in scope):** partial-cancel 2c (not in #53); dashboard hold-expiry/anomaly
  attention rows (below-minimum + leads shipped); calendar month-navigation (current month only).
- **Prod launch gate:** set `CARDCOM_API_PASSWORD`; verify the refund response field name.

---

## 0. The design was drawn against a deleted model — correct it first

The sketches show `חיוב עכשיו` (charge now), `שליחת קישור תשלום מחדש`, `חיוב נכשל · 2 נסיונות`,
and a status called **`משוריינת`** (reserved). **All of these come from the tokenization model
(DECISIONS #46–#50) that decision [#58](../DECISIONS.md) deleted on 2026-08-19.**

Under the current model (#58) a booking is **paid in full at checkout, or it isn't** — there is
no saved card, no scheduled charge, no charge-retry, and no `reserved` state. The real lifecycle
is `held` → `confirmed` → `cancelled`/`expired` (`src/lib/admin/bookings.ts:4`), where **`held`
= awaiting payment** and **`confirmed` = paid**. This is exactly the "it's paid or not" point
raised in review.

**So, before building anything, the redesign target is corrected to the #58 world:** drop every
charge-retry / saved-card / `משוריינת` element from the sketches.

### Terminology & label corrections (design → real)

| Design label | Problem | Use instead | Source |
|---|---|---|---|
| `משוריינת` (a status) | Invented; `reserved` was removed by #58 | **`ממתין לתשלום`** (status `held`) | `booking-status-badge.tsx:8` |
| `מאושרת` | Wrong gender/label | **`מאושר`** (status `confirmed`) | `booking-status-badge.tsx:7` |
| Single status tag mixing paid + lifecycle | Conflates two things | **Two columns:** סטטוס (`held`/`confirmed`/`cancelled`/`expired`) **and** תשלום (שולם / — ) | `[id]/page.tsx` PaymentCell |
| `חיוב עכשיו` (charge now) | No saved card / tokenization under #58 | **Remove** | #58 |
| `חיוב נכשל · 2 נסיונות` | No charge-retry tracking exists | **Remove**; the real "needs attention" signal is a `held` booking whose hold is expiring | #58, `expire_stale_holds` |
| `שליחת קישור תשלום מחדש` | Only meaningful for **unpaid admin-created** bookings (pay-link), not "retry a failed charge" | **Keep, scoped** to held/admin-created bookings | #51, `admin-created-bookings.ts` |
| `העברה ליציאה אחרת` (tagged "בהמשך") | Correctly deferred | Leave deferred | #54 (reschedule removed) |

---

## Part A — Hybrid dashboard (calendar 1c + day-board 1b)

**Baseline today** (`src/app/admin/(dashboard)/page.tsx`): 4 stat tiles + 2 quick-links. No
calendar, no needs-attention list, no departure cards.

**Target:** a landing that is (1) day-board convenient — "what needs attention" + upcoming
departures — and (2) calendar for the high-level month view.

### Element → data source → build status

| Dashboard element | Backing data (exists?) | Status |
|---|---|---|
| Top stat numbers (יציאות קרובות / הזמנות מאושרות / משתתפים / פניות) | `getAdminStats()` ✅ | **Exists** — reuse |
| Month calendar grid with per-day departure chips | `getAdminDepartures()` (date, time, capacity, status, price, min) ✅ | **New UI, existing data** |
| Capacity bar / "מלא" / "מתחת למינימום" per departure | `getDepartureBookingCounts()` (confirmed+held participants) vs `min/max_capacity` ✅ | **New UI, existing data** |
| "היציאות הקרובות" cards | same as above ✅ | **New UI, existing data** |
| "מועד החלטה" (decision deadline) chip | `registration_closes_at` ✅ (#24/#53) | **New UI, existing data** |
| "דורש טיפול" — below-minimum departure | counts vs `min_capacity` + date ✅ | **New UI, existing data** |
| "דורש טיפול" — unpaid/expiring hold (replaces "חיוב נכשל") | `held` bookings + `hold_expires_at` ✅ | **New UI, existing data** |
| "דורש טיפול" — paid-but-not-confirmed anomaly (#43) | `BookingPayment.anomaly` ✅ | **New UI, existing data** |
| "3 פניות חדשות" **link target** | `leads` table exists; **no leads page** (nav `פניות` disabled) | **⚠️ Gap — needs a leads inbox** |

### Part A gaps to resolve
1. **Leads inbox** (`פניות`): the table + count exist, but there's no page and the nav item is
   disabled ("בקרוב"). The dashboard can *show* the count; it has nowhere to *link* until a
   minimal leads list exists. Decided scope per #10 ("Leads inbox") and #56.
2. **Needs-attention signals** must be defined against #58 (holds expiring, below-minimum,
   anomaly) — **not** the design's "failed charge" framing.

---

## Part B — Cancel / refund / contact (actions layer) — launch-blocking

This is **already specified**, not new product thinking. It maps 1:1 to decided rules:

- **#53** — admin action set: cancel-trip (bulk) · admin-cancel single booking · contact customer.
- **#13** — cancellation fee tiers (below).
- **#58** — everyone paid in full ⇒ company/departure-cancel = **full refund to all**;
  customer-cancel = refund **minus** the #13 tier.
- **#15** — refunds are **admin, manual**, issued from the dashboard.
- **#25** — record `cancelled_at` + `cancellation_reason`
  (`customer_request` / `admin` / `departure_cancelled`); money stays in the ledger.
- **#22** — the `payments` ledger holds a **refund row** referencing the provider txn.

### #13 fee tiers (canonical) — note the design's "0" tier is unspecified

| When customer cancels | Fee per participant |
|---|---|
| **7+ days before** | **0 ₪ — full refund** (decided 2026-09-21, extends #13) |
| 5–6 days before | 50 ₪ |
| 3–4 days before | 150 ₪ |
| within 48 h | full cost (no refund) |

### Design sketch → decision mapping

| Sketch | Maps to | Verdict |
|---|---|---|
| **2a** single-booking cancel dialog (fee calc, reason, refund, notify) | #53 + #13 + #15 + #25 | **In scope — build** (corrected per §0) |
| **2b** cancel whole departure, full refund all | #53 cancel-trip + #58 | **In scope — build** |
| **2c** partial cancel (drop *some* participants from a booking) | **Not in #53's action set** | **⚠️ Out of decided scope** — an addition, not a finish. Recommend deferring. |
| **2a** charge-now / retry / `משוריינת` | deleted by #58 | **Remove** (see §0) |

### The pivotal implementation decision — how "refund" actually moves money

The Cardcom provider (`src/lib/payments/cardcom/cardcom-provider.ts`) implements **only**
`createCheckout` + `getResult`. **There is no refund/void call.** So "refund" can mean one of two
things, and this choice sizes all of Part B:

- **Option 1 — Record-only (manual money movement).** Stav refunds inside Cardcom's own portal;
  our panel computes the #13 fee, **records a refund row** in `payments`, flips the booking to
  `cancelled` (#25), and sends the cancellation message. Matches #15's "admin, manual … by hand."
  **Smaller, launch-viable.**
- **Option 2 — API refund.** Add a `refund()` method to `PaymentProvider` + `CardcomProvider`
  (+ `FakeProvider`), call Cardcom's refund-by-transaction API using the stored `provider_ref`,
  then record the ledger row. **Larger; a real Cardcom integration + test surface.**

Recommended: **Option 1 for launch** (honours #15 literally, unblocks cancel/refund, minimal risk),
with the ledger + fee calculator built so Option 2 is a later drop-in.

### Data/DB still needed for Part B
- Booking columns `cancelled_at`, `cancellation_reason` (#25) — verify present in schema
  (`docs/SCHEMA.md`) or add a migration.
- Refund rows in `payments` — the ledger supports it (#22); `getBookingsForDeparture` currently
  only reads `status='succeeded'` and must learn to net refunds.
- Server actions: `cancelBooking`, `cancelDeparture` (bulk), fee calculator (pure, unit-tested per
  CLAUDE.md), all guarded by admin RLS.
- CI: cancel/refund is a critical money flow → add to the CI ladder (`.github/workflows/ci.yml`,
  ADR 0003) with `PAYMENT_PROVIDER: fake`.

---

## Open questions (block finalizing)
1. **7+ day cancellation fee** — confirm it's a full refund (0 ₪), or state the real rule (#13 gap).
2. **Refund mechanism** — Option 1 (record-only) or Option 2 (Cardcom API refund)?
3. **Leads inbox** — build a minimal `פניות` page now (so the dashboard's "needs attention" links
   somewhere), or leave `פניות` disabled and drop that dashboard row for launch?
4. **Partial cancel (2c)** — confirm deferred (not in #53).

## Suggested build order
1. §0 corrections (labels, remove dead buttons) — cheap, unblocks everything.
2. Part A hybrid dashboard from existing data (calendar + needs-attention + upcoming).
3. Leads inbox (if in scope) so "פניות" links.
4. Part B: fee calculator → single-booking cancel (2a) → cancel-departure (2b) → refund ledger.
