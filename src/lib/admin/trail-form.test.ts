import { describe, expect, it } from "vitest";
import { parseGallery, parseTrailForm } from "./trail-form";

/** Build a FormData from a plain record (all values coerced to strings). */
function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }
  return data;
}

/** The minimum required fields for a valid trail. */
const VALID: Record<string, string> = {
  slug: "nahal-example",
  name: "סנפלינג בנחל דוגמה",
  short_name: "נחל דוגמה",
  region: "north",
  price: "180",
};

describe("parseTrailForm — valid input", () => {
  it("parses required fields and defaults the rest", () => {
    const input = parseTrailForm(form(VALID));
    expect(input.slug).toBe("nahal-example");
    expect(input.region).toBe("north");
    expect(input.price).toBe(180);
    expect(input.sort_order).toBe(0);
    expect(input.difficulty).toBeNull();
    expect(input.gallery).toEqual([]);
  });

  it("trims empty optional text fields to null", () => {
    const input = parseTrailForm(form({ ...VALID, excerpt: "  ", height: "" }));
    expect(input.excerpt).toBeNull();
    expect(input.height).toBeNull();
  });

  it("keeps a provided difficulty and splits the gallery into paths", () => {
    const input = parseTrailForm(
      form({
        ...VALID,
        difficulty: "medium-hard",
        gallery: "a/1.jpg\n  a/2.jpg \n\na/3.jpg\n",
      }),
    );
    expect(input.difficulty).toBe("medium-hard");
    expect(input.gallery).toEqual(["a/1.jpg", "a/2.jpg", "a/3.jpg"]);
  });
});

describe("parseTrailForm — invalid input", () => {
  it("rejects a missing slug", () => {
    expect(() => parseTrailForm(form({ ...VALID, slug: "" }))).toThrow(
      /slug/i,
    );
  });

  it("rejects a slug with illegal characters", () => {
    expect(() =>
      parseTrailForm(form({ ...VALID, slug: "Nahal_Example" })),
    ).toThrow();
  });

  it("rejects a missing short_name (DB NOT NULL)", () => {
    expect(() =>
      parseTrailForm(form({ ...VALID, short_name: "" })),
    ).toThrow();
  });

  it("rejects an unknown region", () => {
    expect(() =>
      parseTrailForm(form({ ...VALID, region: "east" })),
    ).toThrow();
  });

  it("rejects an unknown difficulty", () => {
    expect(() =>
      parseTrailForm(form({ ...VALID, difficulty: "extreme" })),
    ).toThrow();
  });

  it("rejects a negative price", () => {
    expect(() => parseTrailForm(form({ ...VALID, price: "-5" }))).toThrow();
  });

  it("rejects a non-integer sort order", () => {
    expect(() =>
      parseTrailForm(form({ ...VALID, sort_order: "1.5" })),
    ).toThrow();
  });
});

describe("parseGallery", () => {
  it("drops blank lines and trims each path", () => {
    expect(parseGallery(" x/1.jpg \n\n x/2.jpg ")).toEqual([
      "x/1.jpg",
      "x/2.jpg",
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseGallery("")).toEqual([]);
  });
});
