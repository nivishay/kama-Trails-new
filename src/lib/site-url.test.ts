import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl } from "./site-url";

describe("getSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function clearVercelEnv() {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");
  }

  it("returns the configured origin and strips trailing slashes", () => {
    clearVercelEnv();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://kamatrails.co.il/");
    expect(getSiteUrl()).toBe("https://kamatrails.co.il");
  });

  it("falls back to localhost in local dev when nothing is configured", () => {
    clearVercelEnv();
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });

  it("never emits a localhost URL on a deployed environment — uses the Vercel origin instead", () => {
    // The production bug: NEXT_PUBLIC_SITE_URL left at its committed localhost value on a deploy.
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "kama-trails.vercel.app");
    vi.stubEnv("VERCEL_URL", "");
    expect(getSiteUrl()).toBe("https://kama-trails.vercel.app");
  });

  it("uses the preview deployment host when only VERCEL_URL is present", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "kama-trails-git-feat.vercel.app");
    expect(getSiteUrl()).toBe("https://kama-trails-git-feat.vercel.app");
  });

  it("throws on a deployed environment when no reachable origin can be resolved", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(() => getSiteUrl()).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });
});
