-- Migration: leads capture goes to its final-state shape (DECISIONS #50).
-- The concierge funnel now runs on WhatsApp, so the contact-form lead changes shape:
--   1. phone becomes REQUIRED (a valid WhatsApp number is what the whole funnel rides on)
--      and message becomes OPTIONAL (it was mandatory; the auto-reply doesn't need it).
--   2. add a `source` column so every channel (contact form now; Facebook/Instagram/WhatsApp
--      later) flows into this one `leads` hub — closes the CONTEXT.md gap where a Lead already
--      named a *source* the table lacked (#48).
--   3. submit_lead recreated: require phone, validate email format, message optional, stamp
--      source='contact_form'. Signature is unchanged (text,text,text,text), so the existing
--      anon/authenticated grant still applies.

-- ---------------------------------------------------------------------------
-- 1. Column shape: phone required, message optional
-- ---------------------------------------------------------------------------
-- Safe: no lead-capture path was ever wired, so `leads` is empty (nothing to backfill).
alter table public.leads
  alter column phone   set not null,
  alter column message drop not null;

-- ---------------------------------------------------------------------------
-- 2. source — which channel the lead came from (the hub is multi-channel, #48)
-- ---------------------------------------------------------------------------
alter table public.leads
  add column source text not null default 'contact_form'
  check (source = any (array['contact_form', 'facebook', 'instagram', 'whatsapp']));

-- ---------------------------------------------------------------------------
-- 3. submit_lead — validated contact-form insert (final-state fields)
-- ---------------------------------------------------------------------------
create or replace function public.submit_lead(p_name text, p_email text, p_phone text, p_message text)
returns uuid
language plpgsql security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'name is required' using errcode = 'check_violation';
  end if;
  -- Light format check on the trimmed value (matches what we store); the app validates more
  -- strictly at the boundary.
  if coalesce(trim(p_email), '') = '' or trim(p_email) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'a valid email is required' using errcode = 'check_violation';
  end if;
  if coalesce(trim(p_phone), '') = '' then
    raise exception 'phone is required' using errcode = 'check_violation';
  end if;

  insert into public.leads (name, email, phone, message, source)
  values (
    trim(p_name),
    lower(trim(p_email)),
    trim(p_phone),
    nullif(trim(p_message), ''),
    'contact_form'
  )
  returning id into v_id;
  return v_id;
end;
$$;
