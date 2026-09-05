-- Migration: checkout consents — signed waiver split + newsletter opt-in (DECISIONS #59).
-- Issues #46 (signed waiver) + #33 (marketing opt-in at checkout).
--
-- Turns the single mandatory-consents pair into THREE independent consents:
--   1. Cancellation-Policy consent  -> policy_accepted_at + policy_version   (mandatory)
--   2. Signed Waiver                -> waiver_signed_at  + waiver_version    (mandatory, signed)
--   3. Newsletter / Marketing       -> Customer.marketing_opt_in (#55/#33)   (optional)
--
-- The signed waiver is a basic e-signature: the stored waiver_version is the auditable "ref
-- to what he signed" (DECISIONS #59); the booker signs per-Booking under ייפוי-כוח (authority
-- for all Participants — per-participant signing stays deferred, #27). Marketing consent lives
-- on the Customer (#55), never on the booking, and never blocks booking.
--
-- Hand-applied to the cloud via MCP; also picked up by `supabase db reset` for local tests.

-- ---------------------------------------------------------------------------
-- 1. Split the consent columns on bookings
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column policy_accepted_at timestamptz,
  add column policy_version     text,
  add column waiver_signed_at   timestamptz,
  add column waiver_version     text;

-- Backfill: today's single accepted_terms_at/terms_version covered BOTH consents, so seed
-- policy_* from it and stamp the waiver_* with the initial waiver version for existing rows.
update public.bookings
set policy_accepted_at = accepted_terms_at,
    policy_version     = terms_version,
    waiver_signed_at   = accepted_terms_at,
    waiver_version     = '2026-08-19'
where accepted_terms_at is not null;

-- The single legacy pair is superseded by the split (DECISIONS #59).
alter table public.bookings
  drop column accepted_terms_at,
  drop column terms_version;

-- ---------------------------------------------------------------------------
-- 2. book_trip — three consents (policy + waiver mandatory, marketing optional)
-- ---------------------------------------------------------------------------
-- Signature grows: p_accepted_terms splits into p_accept_policy + p_sign_waiver (both
-- mandatory), plus p_marketing_opt_in (optional). Arity changes, so drop-and-recreate.
drop function if exists public.book_trip(uuid, text, text, text, integer, boolean);

create function public.book_trip(
  p_departure_id uuid,
  p_registrant_name text,
  p_phone text,
  p_email text,
  p_participants_count integer,
  p_accept_policy boolean,
  p_sign_waiver boolean,
  p_marketing_opt_in boolean default false
)
returns public.bookings
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  c_deposit_percent constant integer := 100;          -- #30/#40: v1 charges the full amount
  c_hold_minutes    constant integer := 40;            -- #44: Cardcom session (~30) + buffer (~10)
  c_policy_version  constant text    := '2026-08-13';  -- #31/#59: cancellation-policy (#13) text version
  c_waiver_version  constant text    := '2026-08-19';  -- #59: signed-waiver text version (git-frozen)

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

  -- Both booking consents are mandatory (#31/#59); never fabricate a consent the caller
  -- did not assert. The waiver assertion is the booker's signature act.
  if p_accept_policy is not true or p_sign_waiver is not true then
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

  -- Dedup the person (#55), then apply the OPTIONAL newsletter opt-in on the Customer (#33).
  -- Only act on an explicit opt-in: an unticked box is not an opt-out request, so it never
  -- revokes a prior opt-in and leaves a new Customer at the opted-OUT default (#56).
  v_customer_id := public.match_or_create_customer(
    p_registrant_name, p_phone, p_email, 'checkout');

  if p_marketing_opt_in is true then
    update public.customers
    set marketing_opt_in         = true,
        marketing_consent_at     = now(),
        marketing_consent_source = 'checkout',
        updated_at               = now()
    where id = v_customer_id;
  end if;

  insert into public.bookings (
    departure_id, trail_id, trail_name, trip_date,
    registrant_name, phone, email, participants_count,
    price_per_person, total_amount, deposit_amount,
    policy_accepted_at, policy_version, waiver_signed_at, waiver_version,
    customer_id,
    status, hold_expires_at, created_by
  )
  values (
    v_departure.id, v_departure.trail_id, coalesce(v_trail_name, ''), v_departure.date,
    p_registrant_name, p_phone, p_email, p_participants_count,
    v_departure.price, v_total_amount, v_deposit_amount,
    now(), c_policy_version, now(), c_waiver_version,
    v_customer_id,
    'held', now() + make_interval(mins => c_hold_minutes), auth.uid()
  )
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function
  public.book_trip(uuid, text, text, text, integer, boolean, boolean, boolean)
  to anon, authenticated;
