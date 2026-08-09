-- Migration: align the live schema to the v1 target (docs/SCHEMA.md)
-- Decisions: DECISIONS.md #19-#28 + ADR 0001.
-- Strategy: in-place ALTERs (renames preserve data, FKs, and RLS policies).
-- Applied 2026-08-08.
--
-- CAVEAT (discovered after applying): the DB was NOT empty (5 seeded trails,
-- 13 departures, 1 confirmed booking) — Supabase's list_tables row counts were
-- stale. Data survived the renames, BUT `departures.is_active` was dropped without
-- mapping to `status`, so every departure became `status='open'`. If any departure
-- was previously inactive that state was lost. A correct rerun would first do:
--   update departures set status = case when is_active then 'open' else 'closed' end;
-- before `drop column is_active`.

begin;

-- ============================================================================
-- 1. trails — hero + gallery images (#28)
-- ============================================================================
alter table public.trails rename column image to hero_image;
alter table public.trails add column gallery text[] not null default '{}';

-- ============================================================================
-- 2. trip_instances -> departures (#19); status enum replaces is_active (#24)
-- ============================================================================
alter table public.trip_instances rename to departures;

alter table public.departures add column status text not null default 'open'
  check (status in ('open', 'closed', 'cancelled'));
alter table public.departures drop column is_active;

-- keep constraint names aligned with the new table name (cosmetic)
alter table public.departures rename constraint trip_instances_capacity_ck      to departures_capacity_ck;
alter table public.departures rename constraint trip_instances_max_capacity_check to departures_max_capacity_check;
alter table public.departures rename constraint trip_instances_min_capacity_check to departures_min_capacity_check;
alter table public.departures rename constraint trip_instances_price_check      to departures_price_check;

-- ============================================================================
-- 3. trip_registrations -> bookings (#19)
-- ============================================================================
alter table public.trip_registrations rename to bookings;
alter table public.bookings rename column trip_instance_id to departure_id;

-- 3a. reservation lifecycle: held/confirmed/cancelled/expired, default held (#20)
alter table public.bookings drop constraint trip_registrations_status_check;
alter table public.bookings alter column status set default 'held';
alter table public.bookings add constraint bookings_status_check
  check (status in ('held', 'confirmed', 'cancelled', 'expired'));

-- 3b. seat hold timer (#21) — a held booking occupies capacity only while unexpired
alter table public.bookings add column hold_expires_at timestamptz;

-- 3c. payment plan snapshot (#22) — deposit rule (% vs ₪) is an open question,
--     so the amount is nullable for now; tighten to NOT NULL once the rule lands
alter table public.bookings add column deposit_amount numeric
  check (deposit_amount >= 0);

-- 3d. consent proof (#27)
alter table public.bookings add column accepted_terms_at timestamptz;
alter table public.bookings add column terms_version text;

-- 3e. cancellation record (#25) — reason drives which refund policy applied
alter table public.bookings add column cancelled_at timestamptz;
alter table public.bookings add column cancellation_reason text
  check (cancellation_reason in ('customer_request', 'admin', 'departure_cancelled'));

-- 3f. reschedule audit (#26) — booking keeps identity; departure_id is repointed
alter table public.bookings add column rescheduled_at timestamptz;
alter table public.bookings add column rescheduled_from_departure_id uuid
  references public.departures(id);

-- cosmetic constraint renames
alter table public.bookings rename constraint trip_registrations_participants_count_check to bookings_participants_count_check;
alter table public.bookings rename constraint trip_registrations_total_amount_check       to bookings_total_amount_check;

-- magic-link lookups + capacity queries
create unique index bookings_access_token_key on public.bookings (access_token);
create index bookings_departure_status_idx on public.bookings (departure_id, status);

-- ============================================================================
-- 4. payments — local money ledger (#22, ADR 0001). Never stores card data.
-- ============================================================================
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid not null references public.bookings(id),
  kind         text not null check (kind in ('deposit', 'balance', 'refund')),
  amount       numeric not null check (amount > 0),   -- direction is in `kind`
  status       text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  provider     text not null,                          -- e.g. 'cardcom'
  provider_ref text,                                   -- provider transaction id
  paid_at      timestamptz,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id)
);

create index payments_booking_id_idx on public.payments (booking_id);

-- RLS on (deny-all until policies are defined — matches the other tables).
-- Actual policies are handled in the separate RLS branch.
alter table public.payments enable row level security;

commit;
