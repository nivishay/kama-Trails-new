import { isDeployedEnvironment } from "@/lib/env/deployment";

// The public base URL of this deployment, used to build absolute redirect + webhook URLs for
// Cardcom (SuccessRedirectUrl / FailedRedirectUrl / WebHookUrl) and the admin pay-links we send to
// customers. NEXT_PUBLIC_SITE_URL must be the live origin in production (https://kamatrails.co.il).
//
// A silent localhost fallback on a deployed environment is a production-breaking bug: Cardcom would
// POST its confirming webhook to localhost (every booking stays unconfirmed) and admin pay-links
// would be dead localhost links. So on a deployed environment we never return localhost — we fall
// back to Vercel's own deployment origin, and if even that is absent we throw loudly rather than
// hand out an unreachable URL.
const DEFAULT_SITE_URL = "http://localhost:3000";

function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, "");
}

function isLocalhost(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url);
}

/** Vercel injects the deployment's own host (no protocol); use it as a safety net. */
function vercelOrigin(): string | null {
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  return host ? `https://${host}` : null;
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && !isLocalhost(configured)) {
    return stripTrailingSlashes(configured);
  }

  if (isDeployedEnvironment()) {
    const fallback = vercelOrigin();
    if (fallback) return stripTrailingSlashes(fallback);
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not set to the live origin on a deployed environment. " +
        "Set it (e.g. https://kamatrails.co.il) so Cardcom return/webhook URLs and pay-links are reachable.",
    );
  }

  return stripTrailingSlashes(configured || DEFAULT_SITE_URL);
}
