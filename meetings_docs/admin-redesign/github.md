repo: nivishay/kama-Trails-new
branch: main
path: src/app/admin

## Last sync
date: 2026-09-06T09:35:56Z

### Updated in this project
- Audited the admin server actions: departures create/edit/open-close, late participant, private trip. No cancel or refund action exists (`setDepartureStatus` refuses `cancelled`).
- Added turn 2 to `Admin Panel Directions.dc.html`: booking action menu + cancel-booking dialog with refund tiers, and a cancel-departure flow.
- Built three admin-panel directions (ledger / day board / calendar) in turn 1.
- Sample data taken from `supabase/seed.sql` (five real trails) and the domain glossary in `CONTEXT.md`.

## Sync history
- 2026-09-06T09:27:01Z — read baseline `/admin` pages, built turn 1 directions.

## Screen map
| Screen | Built from |
| --- | --- |
| לוח בקרה | src/app/admin/(dashboard)/page.tsx, src/lib/admin/stats |
| יציאות | src/app/admin/(dashboard)/departures/page.tsx |
| הזמנות | src/app/admin/(dashboard)/bookings/page.tsx, bookings/[id]/page.tsx |
| לקוחות | src/app/admin/(dashboard)/customers/page.tsx |
| ניווט / shell | src/app/admin/(dashboard)/admin-sidebar.tsx, layout.tsx |
| Theme reference | src/app/globals.css |
| Admin actions audit | (dashboard)/bookings/actions.ts, departures/actions.ts, private-trips/actions.ts, late-add-form.tsx, booking-status-badge.tsx |
| Cancellation policy tiers | CONTEXT.md (Cancellation Policy), DECISIONS.md #13 |
