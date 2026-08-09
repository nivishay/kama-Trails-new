// Connection details for the LOCAL Supabase stack.
//
// The fallback keys below are Supabase's well-known local-dev demo keys — they are
// identical on every local install (derived from the default demo JWT secret in
// supabase/config.toml) and are NOT production secrets. This lets
// `npm run test:integration` work with zero config after `supabase start`.
// Override via env vars to point the suite at a different (e.g. preview branch) target.

const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const LOCAL_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const ANON_KEY = process.env.ANON_KEY ?? LOCAL_ANON_KEY;
export const SERVICE_ROLE_KEY = process.env.SERVICE_ROLE_KEY ?? LOCAL_SERVICE_ROLE_KEY;
