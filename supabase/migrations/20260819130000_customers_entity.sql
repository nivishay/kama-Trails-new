-- Migration: first-class deduplicated Customer entity (DECISIONS #55/#56, issue #25).
--
-- Promotes Customer from a per-booking contact blob to one row per person that owns
-- contact details + Marketing Consent and aggregates that person's Bookings and Leads.
-- Identity = match-on-either phone or email, PHONE PRIMARY (#55): an incoming
-- Booking/Lead matches by normalized phone first, else email, else creates a new row.
-- A Customer can exist with no Booking (Lead-only, or a later Excel import #56).
--
-- Hand-applied to the cloud via MCP (see supabase/history/README.md); also picked up by
-- `supabase db reset` for local integration tests.

-- ---------------------------------------------------------------------------
-- 1. normalize_phone_il — the dedup key
-- ---------------------------------------------------------------------------
-- Israeli phone numbers arrive in many shapes ('050-123-4567', '+972 50 1234567',
-- '05012345678'). Collapse them to a stable E.164-digits key (no '+') so the same
-- human is one Customer: strip non-digits, then a leading '0' becomes '972'. Pure /
-- immutable so it can back a unique index expression and be reasoned about.
create function public.normalize_phone_il(p_phone text)
returns text
language sql
immutable
set search_path to 'public'
as $$
  with digits as (select regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') as d)
  select nullif(
    case
      when d = ''            then ''
      when left(d, 1) = '0'  then '972' || substring(d from 2)
      else d
    end, ''
  )
  from digits;
$$;

-- ---------------------------------------------------------------------------
-- 2. customers table
-- ---------------------------------------------------------------------------
create table public.customers (
  id                       uuid primary key default gen_random_uuid(),
  full_name                text,
  phone                    text,          -- as last entered (human-readable)
  phone_key                text,          -- normalized IL match key (E.164 digits, no '+')
  email                    text,          -- lower(trim())
  -- Marketing Consent (#55): a Customer-level, tracked-over-time state. Defaults to
  -- opted-OUT — only an explicit opt-in makes a Customer marketable (#56, anti-spam).
  marketing_opt_in         boolean not null default false,
  marketing_consent_at     timestamptz,
  marketing_consent_source text check (
                             marketing_consent_source = any (array['checkout','lead_form','import','admin'])),
  -- Cross-match conflict flag (#55): phone matched customer A but the email belongs to a
  -- different customer B — resolve to phone, never silently merge, flag for the admin.
  needs_review             boolean not null default false,
  review_note              text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Phone is the PRIMARY identity: no two Customers may share a normalized phone (#55).
create unique index customers_phone_key_uk on public.customers (phone_key) where phone_key is not null;
-- Email is the secondary match key; not unique (a cross-match conflict is flagged, not blocked).
create index customers_email_idx on public.customers (lower(email)) where email is not null;

-- ---------------------------------------------------------------------------
-- 3. match_or_create_customer — the dedup entry point (#55)
-- ---------------------------------------------------------------------------
-- Match phone-first, else email, else create. Returns the Customer id. Fills in missing
-- contact fields on a match but never overwrites an existing non-null value, and never
-- touches Marketing Consent (that is owned by the explicit opt-in path, #33). Internal:
-- security definer, called by book_trip / submit_lead — NOT granted to anon.
create function public.match_or_create_customer(
  p_name  text,
  p_phone text,
  p_email text,
  p_source text default 'checkout'
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_phone_key   text := public.normalize_phone_il(p_phone);
  v_phone       text := nullif(trim(coalesce(p_phone, '')), '');
  v_email       text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_name        text := nullif(trim(coalesce(p_name, '')), '');
  v_id          uuid;
  v_email_owner uuid;
begin
  -- (a) match by phone — the primary identity
  if v_phone_key is not null then
    select id into v_id from public.customers where phone_key = v_phone_key;
  end if;

  -- (b) else match by email
  if v_id is null and v_email is not null then
    select id into v_id
    from public.customers
    where lower(email) = v_email
    order by created_at asc
    limit 1;
  end if;

  -- (c) no match — create a new Customer. Guard the concurrent-first-insert race: two
  -- simultaneous bookings by the same person (double-submit / two devices) both see no match
  -- and race to insert the same phone_key; the loser catches the unique_violation and matches
  -- the row the winner just created, instead of failing the booking (#55).
  if v_id is null then
    begin
      insert into public.customers (full_name, phone, phone_key, email)
      values (v_name, v_phone, v_phone_key, v_email)
      returning id into v_id;
      return v_id; -- fresh Customer, nothing to reconcile
    exception when unique_violation then
      select id into v_id from public.customers where phone_key = v_phone_key;
      if v_id is null then
        raise; -- conflict on something other than the phone key — unexpected, surface it
      end if;
      -- fall through to the conflict-check + backfill below, now matched on phone
    end;
  end if;

  -- (d) matched: cross-match conflict? the incoming email already belongs to a DIFFERENT
  -- Customer — resolve to the phone match (v_id) and flag, do not merge (#55).
  if v_email is not null then
    select id into v_email_owner
    from public.customers
    where lower(email) = v_email and id <> v_id
    limit 1;

    if v_email_owner is not null then
      update public.customers
      set needs_review = true,
          review_note  = left(
            concat_ws(' | ', review_note,
              'email ' || v_email || ' also matches customer ' || v_email_owner::text),
            1000),
          updated_at   = now()
      where id = v_id;
    end if;
  end if;

  -- (e) backfill only missing contact fields; never clobber an existing identity
  update public.customers
  set full_name  = coalesce(full_name, v_name),
      email      = coalesce(email, v_email),
      phone      = coalesce(phone, v_phone),
      phone_key  = coalesce(phone_key, v_phone_key),
      updated_at = now()
  where id = v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. customer_id on bookings + leads — aggregate a person's history (#55)
-- ---------------------------------------------------------------------------
alter table public.bookings add column customer_id uuid references public.customers(id) on delete set null;
alter table public.leads    add column customer_id uuid references public.customers(id) on delete set null;
create index bookings_customer_id_idx on public.bookings (customer_id);
create index leads_customer_id_idx    on public.leads (customer_id);

-- ---------------------------------------------------------------------------
-- 5. Wire book_trip + submit_lead to match-or-create the Customer
-- ---------------------------------------------------------------------------
-- book_trip: unchanged signature (6 args) — just stamps customer_id from the contact
-- details it already receives. (Marketing opt-in is a separate change, #33.)
create or replace function public.book_trip(
  p_departure_id uuid,
  p_registrant_name text,
  p_phone text,
  p_email text,
  p_participants_count integer,
  p_accepted_terms boolean
)
returns public.bookings
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c_deposit_percent constant integer := 100;          -- #30/#40: v1 charges the full amount
  c_hold_minutes    constant integer := 40;            -- #44: Cardcom session (~30) + buffer (~10)
  c_terms_version   constant text    := '2026-08-13';  -- #31: cancellation-policy (#13) text version

  v_departure      public.departures;
  v_taken          integer;
  v_remaining      integer;
  v_trail_name     text;
  v_total_amount   numeric;
  v_deposit_amount numeric;
  v_customer_id    uuid;
  v_row            public.bookings;
begin
  if p_participants_count is null or p_participants_count < 1 then
    raise exception 'participants_count must be at least 1' using errcode = 'check_violation';
  end if;

  if p_accepted_terms is not true then
    raise exception 'the mandatory consents must be accepted to book' using errcode = 'check_violation';
  end if;

  select * into v_departure
  from public.departures
  where id = p_departure_id
  for update;

  if not found then
    raise exception 'departure % not found', p_departure_id using errcode = 'no_data_found';
  end if;

  if v_departure.status <> 'open' then
    raise exception 'departure is not open for booking' using errcode = 'check_violation';
  end if;

  select coalesce(sum(participants_count), 0) into v_taken
  from public.bookings
  where departure_id = p_departure_id
    and (status = 'confirmed'
         or (status = 'held' and hold_expires_at > now()));

  v_remaining := v_departure.max_capacity - v_taken;
  if p_participants_count > v_remaining then
    raise exception 'only % seats remaining', greatest(v_remaining, 0)
      using errcode = 'check_violation';
  end if;

  v_total_amount   := v_departure.price * p_participants_count;
  v_deposit_amount := round(v_total_amount * c_deposit_percent / 100.0);

  if v_deposit_amount <= 0 or v_deposit_amount > v_total_amount then
    raise exception 'deposit_amount % must be between 1 and total %', v_deposit_amount, v_total_amount
      using errcode = 'check_violation';
  end if;

  select name into v_trail_name from public.trails where id = v_departure.trail_id;

  -- Dedup the person behind this booking (#55): match-or-create, phone-primary.
  v_customer_id := public.match_or_create_customer(
    p_registrant_name, p_phone, p_email, 'checkout');

  insert into public.bookings (
    departure_id, trail_id, trail_name, trip_date,
    registrant_name, phone, email, participants_count,
    price_per_person, total_amount, deposit_amount,
    accepted_terms_at, terms_version,
    customer_id,
    status, hold_expires_at, created_by
  )
  values (
    v_departure.id, v_departure.trail_id, coalesce(v_trail_name, ''), v_departure.date,
    p_registrant_name, p_phone, p_email, p_participants_count,
    v_departure.price, v_total_amount, v_deposit_amount,
    now(), c_terms_version,
    v_customer_id,
    'held', now() + make_interval(mins => c_hold_minutes), auth.uid()
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- submit_lead: unchanged signature (4 args) — stamps customer_id from the lead's contact.
create or replace function public.submit_lead(p_name text, p_email text, p_phone text, p_message text)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id          uuid;
  v_customer_id uuid;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'name is required' using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_email), '') = '' or trim(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'a valid email is required' using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_phone), '') = '' then
    raise exception 'phone is required' using errcode = 'check_violation';
  end if;

  v_customer_id := public.match_or_create_customer(
    trim(p_name), trim(p_phone), lower(trim(p_email)), 'lead_form');

  insert into public.leads (name, email, phone, message, source, customer_id)
  values (
    trim(p_name),
    lower(trim(p_email)),
    trim(p_phone),
    nullif(trim(p_message), ''),
    'contact_form',
    v_customer_id
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Backfill existing bookings + leads into deduplicated Customers (#25)
-- ---------------------------------------------------------------------------
-- Idempotent: match_or_create is match-first, so re-running collapses onto the same rows.
do $$
declare
  r     record;
  v_cid uuid;
begin
  for r in
    select id, registrant_name as name, phone, email
    from public.bookings
    where customer_id is null
    order by created_at asc
  loop
    v_cid := public.match_or_create_customer(r.name, r.phone, r.email, 'checkout');
    update public.bookings set customer_id = v_cid where id = r.id;
  end loop;

  for r in
    select id, name, phone, email
    from public.leads
    where customer_id is null
    order by created_at asc
  loop
    v_cid := public.match_or_create_customer(r.name, r.phone, r.email, 'lead_form');
    update public.leads set customer_id = v_cid where id = r.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 7. RLS + grants
-- ---------------------------------------------------------------------------
-- customers holds PII: admin-only, mirroring bookings/leads. The public booking/lead
-- paths write customers only through the security-definer match_or_create (below), never
-- by direct table access.
alter table public.customers enable row level security;
create policy "customers: admin all" on public.customers
  for all using (public.is_admin()) with check (public.is_admin());

-- Table grants mirror the baseline model (RLS is the real gate; admin reads via is_admin()).
grant all privileges on public.customers to anon, authenticated, service_role;

-- match_or_create is an internal dedup primitive — keep it off the public API surface so
-- anon can't mint arbitrary Customer rows. book_trip / submit_lead (security definer) still
-- call it as the function owner.
revoke all on function public.match_or_create_customer(text, text, text, text) from public;
revoke all on function public.match_or_create_customer(text, text, text, text) from anon, authenticated;
