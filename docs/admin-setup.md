# Creating the admin user

The Admin Dashboard is invite-only (DECISIONS #11, #34): there is no public signup.
`is_admin()` is true only for a `public.profiles` row with `role = 'admin'`. The
`handle_new_user` trigger (migration `20260809180000_admin_auth_bootstrap.sql`) creates
a `profiles` row for every new auth user with the default `role = 'user'`; promoting to
`admin` is a deliberate one-time step.

## Local development

1. Start the stack: `npm run db:start` (applies the baseline + this migration).
2. Open Supabase Studio at http://127.0.0.1:54323 → **Authentication → Add user** →
   create e.g. `admin@kama.test` with a password, and mark the email as confirmed.
3. Promote it (Studio → **SQL Editor**, or `psql`):

   ```sql
   select public.promote_to_admin('admin@kama.test');
   ```

4. `npm run dev`, go to `/admin/login`, sign in. A non-admin user is bounced back to
   the login page.

## Production (Supabase project)

The migration **is already applied** to the live project (`nbjkcszrxtpkbqyaccmw`), and one
admin already exists: **nivi.ishay@gmail.com**. To add another admin (e.g. Stav):

1. Supabase dashboard → **Authentication → Users → Add user** (or invite) for the
   email; have them set a password.
2. Run once in the SQL editor: `select public.promote_to_admin('<email>');`

`promote_to_admin` is revoked from `anon`/`authenticated`, so it can only be run from the
SQL console / service role — never from the app.
