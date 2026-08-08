import { describe, expect, it } from "vitest";
import { filterTrailsByRegion } from "./region";
import type { Trail } from "./types";

function makeTrail(id: string, region: Trail["region"]): Trail {
  return {
    id,
    slug: id,
    name: id,
    short_name: null,
    region,
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
  };
}

const TRAILS: Trail[] = [
  makeTrail("north-a", "north"),
  makeTrail("south-a", "south"),
  makeTrail("north-b", "north"),
];

describe("filterTrailsByRegion", () => {
  it("returns every trail for 'all'", () => {
    expect(filterTrailsByRegion(TRAILS, "all")).toHaveLength(3);
  });

  it("returns only trails in the chosen region", () => {
    const north = filterTrailsByRegion(TRAILS, "north");
    expect(north.map((t) => t.id)).toEqual(["north-a", "north-b"]);
  });

  it("returns an empty list when no trail matches", () => {
    expect(filterTrailsByRegion(TRAILS, "center")).toEqual([]);
  });
});
