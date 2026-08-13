// The public base URL of this deployment, used to build absolute redirect + webhook URLs for
// Cardcom (SuccessRedirectUrl / FailedRedirectUrl / WebHookUrl). Set NEXT_PUBLIC_SITE_URL to
// the live origin in production (https://kamatrails.co.il); defaults to localhost in dev.
const DEFAULT_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (raw && raw.replace(/\/+$/, "")) || DEFAULT_SITE_URL;
}
