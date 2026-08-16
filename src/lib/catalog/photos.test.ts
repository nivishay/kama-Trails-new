import { describe, expect, it } from "vitest";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { resolveTrailPhotoUrl, withResolvedPhotos } from "./photos";
import type { Trail } from "./types";

const PUBLIC_BASE = `${SUPABASE_URL}/storage/v1/object/public/trip_photos`;

describe("resolveTrailPhotoUrl", () => {
  it("builds a public URL from a bucket-relative storage key", () => {
    expect(resolveTrailPhotoUrl("dalton-cliff/d1-scaled.jpg")).toBe(
      `${PUBLIC_BASE}/dalton-cliff/d1-scaled.jpg`,
    );
  });

  it("passes absolute URLs through unchanged (legacy base44 seed rows)", () => {
    const url = "https://media.base44.com/images/public/abc/hero.jpg";
    expect(resolveTrailPhotoUrl(url)).toBe(url);
  });

  it("tolerates a leading slash on the storage key", () => {
    expect(resolveTrailPhotoUrl("/nahal-qumran/IMG_6763.jpg")).toBe(
      `${PUBLIC_BASE}/nahal-qumran/IMG_6763.jpg`,
    );
  });

  it("URL-encodes unsafe characters in each path segment", () => {
    expect(resolveTrailPhotoUrl("keshet cave/photo (1).jpg")).toBe(
      `${PUBLIC_BASE}/keshet%20cave/photo%20(1).jpg`,
    );
  });
});

function makeTrail(overrides: Partial<Trail>): Trail {
  return {
    id: "t1",
    slug: "t1",
    name: "t1",
    short_name: null,
    region: "north",
    region_label: null,
    difficulty: null,
    difficulty_label: null,
    price: 180,
    height: null,
    duration: null,
    hero_image: null,
    gallery: [],
    excerpt: null,
    description: null,
    gear: null,
    audience: null,
    included: null,
    sort_order: 0,
    ...overrides,
  };
}

describe("withResolvedPhotos", () => {
  it("resolves the hero and every gallery key to a public URL", () => {
    const resolved = withResolvedPhotos(
      makeTrail({
        hero_image: "dalton-cliff/first.jpg",
        gallery: ["dalton-cliff/second.jpg", "dalton-cliff/third.jpg"],
      }),
    );

    expect(resolved.hero_image).toBe(`${PUBLIC_BASE}/dalton-cliff/first.jpg`);
    expect(resolved.gallery).toEqual([
      `${PUBLIC_BASE}/dalton-cliff/second.jpg`,
      `${PUBLIC_BASE}/dalton-cliff/third.jpg`,
    ]);
  });

  it("leaves a null hero as null and an empty gallery empty", () => {
    const resolved = withResolvedPhotos(
      makeTrail({ hero_image: null, gallery: [] }),
    );

    expect(resolved.hero_image).toBeNull();
    expect(resolved.gallery).toEqual([]);
  });
});
