-- Migration: admin auth bootstrap for the Admin Dashboard (DECISIONS #34).
-- The authz layer (profiles.role, is_admin(), admin RLS) already exists in the
-- baseline. Two gaps blocked an admin from ever existing:
--   1. Nothing created a public.profiles row when a user signed up, so is_admin()
--      (which reads profiles.role) could never be true.
--   2. No way to promote the first user to 'admin'.
-- This migration closes both. It does NOT create any user or grant anyone admin on
-- its own — promotion is an explicit, privileged one-time call (see docs/admin-setup.md).

-- ---------------------------------------------------------------------------
-- Auto-provision a profile row for every new auth user (role defaults to 'user').
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- One-time admin promotion. Privileged: revoked from anon/authenticated so it can
-- only be run from the SQL console / service role (never callable from the app).
-- Usage: select public.promote_to_admin('stav@example.com');
-- ---------------------------------------------------------------------------
create or replace function public.promote_to_admin(p_email text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then
    raise exception 'no auth user with email %', p_email using errcode = 'no_data_found';
  end if;

  -- Cover the case where the profile predates the trigger above.
  insert into public.profiles (id, role)
  values (v_id, 'admin')
  on conflict (id) do update set role = 'admin', updated_at = now();
end;
$$;

revoke execute on function public.promote_to_admin(text) from public, anon, authenticated;
