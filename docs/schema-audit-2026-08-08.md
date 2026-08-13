# Schema Audit — kama_trails (live DB)

**Date:** 2026-08-08
**Project:** `nbjkcszrxtpkbqyaccmw` (kama_trails), Postgres 17
**Run by:** `schema-checker` agent checklist (read-only: Supabase advisors + `list_tables` + migration files)
**Scope:** 6 tables (`trails`, `departures`, `bookings`, `leads`, `payments`, `profiles`), 8 functions, RLS policies.
Source of truth for intent: [`SCHEMA.md`](./SCHEMA.md) + `supabase/migrations/*.sql`.

---

## What's healthy ✅
- **RLS enabled on all 6 tables.** Convention holds.
- **Every CHECK enum matches `docs/SCHEMA.md`** exactly — `departures.status`, `bookings.status`,
  `payments.kind`/`status`, `cancellation_reason`, region/difficulty, and all `>= 0` / `> 0`
  money/capacity guards. No constraint drift.
- **No mutable `search_path` findings** — every `SECURITY DEFINER` function pins its search_path,
  so the classic privilege-escalation vector is closed.
- Public booking RPCs are safely scoped (capacity-guarded insert; `confirm`/`cancel` gate on
  `access_token`) — being anon-callable is by design.

---

## Findings (most severe first)

### 🔴 HIGH — `rls_auto_enable()` is a SECURITY DEFINER function anyone can call
Executable by `anon` **and** `authenticated` via `POST /rest/v1/rpc/rls_auto_enable`. Unlike the
booking RPCs this isn't a business endpoint — its name implies privileged DDL (enabling RLS). A
definer function performing admin ops, reachable by the public anon key, is a real escalation
surface. Same concern, lower stakes, for `is_admin()` (no reason for anon to call it).

**Fix:**
```sql
revoke execute on function public.rls_auto_enable() from anon, authenticated;
-- likely also:
revoke execute on function public.is_admin() from anon, authenticated;
```
**Inspect the body first (read-only):**
```sql
select proname, pg_get_functiondef(oid) from pg_proc
where pronamespace='public'::regnamespace and proname in ('rls_auto_enable','is_admin');
```
Ref: lint 0028 — https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

### 🟠 MEDIUM — Verify PII tables have no anon `SELECT` policy
`bookings` (name/phone/email) and `leads` (name/email/phone) are the PII tables. RLS is on and the
advisor raised no exposure flag, but their policies weren't visible to the read-only tools. The site
should only reach these through the gated RPCs — confirm no direct anon read:
```sql
select tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname='public' and tablename in ('bookings','leads','payments')
order by tablename;
```
If `anon` appears with `cmd=SELECT` and a null/`true` `qual` on those tables, that's a leak to fix.

### 🟠 MEDIUM — `payments` has RLS on but zero policies → unreachable
Safe (deny-all) but broken: the money ledger can't be read or written by anon/authenticated at all.
The migration flagged this ("policies handled in the separate RLS branch") — that branch hasn't
landed. Finish the `payments` policies before wiring the payment flow.
Ref: lint 0008 — https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

### 🟠 MEDIUM — Live DB isn't reproducible from `supabase/migrations/`
`is_admin()`, `rls_auto_enable()`, `submit_lead()`, and **all RLS policies** (e.g.
`trails: public read`, `profiles: read own or admin`, the `departures` policies) exist in the live
DB but appear in **none** of the two migration files. The repo can't rebuild this database. Capture
the current functions + policies as a migration so the schema is version-controlled.

### 🟡 LOW — cleanups (safe to batch later)
- **`profiles` policies re-evaluate `auth.uid()` per row** — wrap as `(select auth.uid())`. Trivial
  perf best-practice. Lint 0003.
- **Overlapping policies** on `trails` & `departures` — the admin `FOR ALL` policy overlaps the
  public-read `SELECT`. Scope the admin policy to write actions to remove the overlap. Lint 0006.
- **Unindexed FKs** — mostly `created_by` audit columns (low volume); `bookings.trail_id` and
  `rescheduled_from_departure_id` are the only ones likely to matter. Lint 0001.
- **`payments` missing `updated_at`** — every other table has it and `status` mutates
  (pending→succeeded). Minor convention gap.
- **Leaked-password protection off** in Auth — one-click enable in the dashboard.

### ⚪ Ignore
- **5 "unused index" warnings** are an artifact of an empty/new DB (0 rows). These indexes back real
  query paths — do **not** drop them.
- The historical `is_active`→`status` data-loss caveat is already applied; nothing to do now unless
  you need to recover which departures were previously inactive.

---

## Verdict
**Not a blocker to keep building, but not ship-ready for a public payment flow.** Two gates for
go-live:
1. Settle **`rls_auto_enable` / `is_admin`** anon-execute (HIGH).
2. Confirm **no anon read on `bookings` / `leads`** + finish **`payments` policies** (MEDIUM).

The rest is low-priority cleanup. Core schema shape, constraints, and definer-function hygiene are
solid.

---

## Open verification steps (run when ready)
- [ ] Run the `pg_get_functiondef` query above; decide keep/revoke on `rls_auto_enable` + `is_admin`.
- [ ] Run the `pg_policies` query above; confirm no anon SELECT on `bookings` / `leads`.
- [ ] Write the missing RLS + functions into a tracked migration.
