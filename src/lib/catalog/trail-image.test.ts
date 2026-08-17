import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trailImageUrl } from "./trail-image";

const SUPABASE_URL = "https://example.supabase.co";
const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/trip_photos`;

describe("trailImageUrl", () => {
  const originalEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv;
  });

  it("builds a public bucket URL from a relative storage path", () => {
    expect(trailImageUrl("nahal-gilabon/hero.jpg")).toBe(
      `${PUBLIC_PREFIX}/nahal-gilabon/hero.jpg`,
    );
  });

  it("tolerates a leading slash on the stored path", () => {
    expect(trailImageUrl("/nahal-gilabon/hero.jpg")).toBe(
      `${PUBLIC_PREFIX}/nahal-gilabon/hero.jpg`,
    );
  });

  it("passes an already-absolute URL through unchanged (legacy base44 media)", () => {
    const url = "https://media.base44.com/photos/x.jpg";
    expect(trailImageUrl(url)).toBe(url);
  });

  it("returns null for null, undefined, and blank input", () => {
    expect(trailImageUrl(null)).toBeNull();
    expect(trailImageUrl(undefined)).toBeNull();
    expect(trailImageUrl("   ")).toBeNull();
  });

  it("returns null for a relative path when the Supabase URL env is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(trailImageUrl("nahal-gilabon/hero.jpg")).toBeNull();
  });
});
