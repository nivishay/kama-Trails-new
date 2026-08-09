# Reservation engine — integration tests

End-to-end tests for the booking RPCs (`book_trip`, `free_spots`,
`confirm_registration`, `cancel_registration`) against a **local** Supabase stack.
They exercise the real Postgres capacity guard, seat holds, and RLS — not mocks.

## Run

```bash
npm run db:start          # boots local Supabase (Docker required, first run pulls images)
npm run test:integration  # runs this suite against 127.0.0.1
npm run db:stop           # tears the stack down
```

`npm run test:integration` needs no config: it defaults to the local stack URL and
Supabase's well-known local demo keys (see `env.ts`). Point it elsewhere by setting
`SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY`.

The local database is built from `supabase/migrations/00000000000000_baseline.sql`
(a from-scratch copy of the live v1 schema) plus `supabase/seed.sql` (demo data).

## What is covered

- **Never oversell** — many concurrent bookers on a contended seat; capacity N is
  filled exactly and no more. Verified against a broken (lock-free) build to confirm
  the test actually fails on an oversell.
- **Seat holds** — an unexpired hold occupies capacity; an expired hold releases it.
- **Confirm / cancel** — access-token gated; cancel stamps the reason and frees the seat.
- **Status gate** — a closed departure refuses bookings.
- **RLS** — `anon` can neither insert bookings directly nor read booking PII; the only
  way in is the RPC.
- **Snapshots** — `trail_name`, `trip_date`, `price_per_person`, `total_amount` are
  frozen at booking time.

## Note

These are **integration** tests: they require Docker + a running stack, so they are
intentionally excluded from the default `npm test` (unit) run.
