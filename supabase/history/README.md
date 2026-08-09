# Migration history (archived — not applied by the CLI)

These files are the **incremental** migrations that were hand-applied to the live
project to reach the v1 schema. They are kept here as a historical record. They are
**not** under `supabase/migrations/`, so `supabase db reset` / `db push` ignore them.

- `20260808120000_align_schema_to_v1.sql` — renamed `trip_instances → departures`,
  `trip_registrations → bookings`, added the hold/deposit/consent/cancel/reschedule
  columns, and created `payments`. **ALTER-based** — it edits an older schema in place,
  so it cannot build a database from scratch.
- `20260808130000_rewrite_rpcs_to_v1_model.sql` — rewrote the booking RPCs
  (`book_trip`, `free_spots`, `confirm/cancel_registration`, `list_availability`)
  onto the v1 model (15-min seat hold, `held` state, capacity = confirmed + unexpired-held).

## Why a squashed baseline replaced them

The repo could not rebuild the live DB: the original `0001_schema … 0005_*` migrations
were never committed here, and these two files only *alter* that missing base. The live
project's recorded migration versions also differ from these filenames. So
`supabase/migrations/00000000000000_baseline.sql` now captures the **current v1 state**
from scratch — that is the reproducible source of truth for local dev, CI, and tests.

## If you later adopt CLI-managed pushes to production

The live DB already **is** at the baseline state, so do not re-run the baseline against
it. Mark it as already-applied instead of executing it:

```bash
supabase link --project-ref nbjkcszrxtpkbqyaccmw
supabase migration repair --status applied 00000000000000
```

Then future schema changes go in as new timestamped migrations on top of the baseline.
