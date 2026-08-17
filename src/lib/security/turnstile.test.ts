import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyTurnstile } from "./turnstile";

describe("verifyTurnstile", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("bypasses (returns true) when no secret is configured, for local dev", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(verifyTurnstile("any-token")).resolves.toBe(true);
  });

  it("fails a missing token when a secret IS configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    // No token → rejected before any network call.
    await expect(verifyTurnstile(null)).resolves.toBe(false);
  });
});
