import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Serverless has no shared memory, so a naive in-process counter can't rate-limit across lambdas
// (DECISIONS #51). Upstash gives a shared sliding window. When it isn't configured (local dev),
// the limiter is disabled so dev isn't blocked — production MUST set the Upstash env.

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
 * True if the contact submission is allowed, false if rate-limited. Fails OPEN on any Upstash
 * error — a rate-limit outage must never block a genuine lead (capture-always, #50).
 */
export async function checkContactRateLimit(
  identifier: string,
): Promise<boolean> {
  const limiter = getContactLimiter();
  if (!limiter) return true;

  try {
    const { success } = await limiter.limit(identifier);
    return success;
  } catch (error) {
    console.error("[rate-limit] check failed, allowing:", error);
    return true;
  }
}
