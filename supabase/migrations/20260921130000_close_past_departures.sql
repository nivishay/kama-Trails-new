-- Migration: auto-close departures whose date has passed.
--
-- A departure keeps its stored status (open/closed/cancelled) forever; "past" is derived from the
-- date. That leaves trips that already ran still sitting as 'open', which is misleading in the
-- admin list and lets the raw status lie. This flips a past, still-open departure to 'closed'
-- (sales stopped — the trip already ran; #24). Cancelled departures are left untouched.
--
-- Same shape as expire_stale_holds (20260906120000): an idempotent sweep + a pg_cron schedule.
-- Runs once a day (departures are day-granular) and is backfilled once at apply time.

create or replace function public.close_past_departures()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_count integer;
begin
  update public.departures
  set status     = 'closed',
      updated_at = now()
  where status = 'open'
    and date < current_date;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Mutates departures broadly, so keep it off the public roles: only the cron job (postgres) and a
-- service/admin caller may invoke it.
revoke all on function public.close_past_departures() from public;
grant execute on function public.close_past_departures() to service_role;

-- Backfill once: close departures that are already in the past when this migration is applied.
select public.close_past_departures();

-- Schedule daily at 00:05. pg_cron is available on Supabase cloud; on a local/CI stack that can't
-- load it this block no-ops so `supabase start` / `db reset` still apply cleanly.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('close-past-departures', '5 0 * * *', 'select public.close_past_departures();');
exception when others then
  raise notice 'pg_cron unavailable (%); skipping schedule. close_past_departures() is still callable.', sqlerrm;
end;
$$;
