import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { isProductionDeployment } from "@/lib/env/deployment";

// Serverless has no shared memory, so a naive in-process counter can't rate-limit across lambdas
// (DECISIONS #51). Upstash gives a shared sliding window. When it isn't configured the limiter is
// disabled in local/preview so dev isn't blocked — but on a production deployment a missing config
// means the gate is silently off, so we fail CLOSED (see checkContactRateLimit). Production MUST set
// the Upstash env.

const CONTACT_MAX_PER_WINDOW = 5;
const CONTACT_WINDOW = "1 h";

let cachedLimiter: Ratelimit | null | undefined;

function getContactLimiter(): Ratelimit | null {
  if (cachedLimiter !== undefined) return cachedLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "[rate-limit] Upstash not configured — contact rate limiting disabled (dev only).",
    );
    cachedLimiter = null;
    return null;
  }

  cachedLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(CONTACT_MAX_PER_WINDOW, CONTACT_WINDOW),
    prefix: "ratelimit:contact",
  });
  return cachedLimiter;
}

/**
 * True if the contact submission is allowed, false if rate-limited. Two failure modes, handled
 * differently on purpose: a *missing config* on a production deployment means the gate is entirely
 * off, so we fail CLOSED (block) to surface the misconfiguration; a transient *runtime* Upstash
 * error fails OPEN so an outage never blocks a genuine lead (capture-always, #50). In local/preview
 * a missing config simply disables the limiter so dev isn't blocked.
 */
export async function checkContactRateLimit(
  identifier: string,
): Promise<boolean> {
  const limiter = getContactLimiter();
  if (!limiter) return !isProductionDeployment();

  try {
    const { success } = await limiter.limit(identifier);
    return success;
  } catch (error) {
    console.error("[rate-limit] check failed, allowing:", error);
    return true;
  }
}
