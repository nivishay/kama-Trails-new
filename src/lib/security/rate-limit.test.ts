import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkContactRateLimit } from "./rate-limit";

// With no Upstash env configured the limiter is null; the behaviour then depends on the deployment:
// allowed in local/preview (so dev isn't blocked) but blocked in production (so a missing config
// surfaces as a visibly broken form rather than a silently-off gate).
describe("checkContactRateLimit (no Upstash configured)", () => {
  beforeEach(() => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("allows the submission in local/preview (limiter disabled)", async () => {
    vi.stubEnv("VERCEL_ENV", "");
    await expect(checkContactRateLimit("1.2.3.4")).resolves.toBe(true);
  });

  it("fails closed (blocks) in production so the misconfiguration is visible", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    await expect(checkContactRateLimit("1.2.3.4")).resolves.toBe(false);
  });
});
