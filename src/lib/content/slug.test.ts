import { describe, expect, it } from "vitest";
import { isValidSlug, slugify } from "./slug";

describe("slugify", () => {
  it("transliterates a Hebrew title to an ASCII hyphenated slug", () => {
    expect(slugify("סנפלינג בגליל")).toBe("snplyng-bglyl");
  });

  it("lowercases and hyphenates an English title", () => {
    expect(slugify("Rappelling in the Galilee")).toBe(
      "rappelling-in-the-galilee",
    );
  });

  it("collapses punctuation and whitespace into single hyphens", () => {
    expect(slugify("  Safety, gear & ropes!!  ")).toBe("safety-gear-ropes");
  });

  it("mixes Hebrew and digits", () => {
    expect(slugify("5 מסלולים")).toBe("5-mslvlym");
  });

  it("returns an empty string when nothing is usable", () => {
    expect(slugify("—  !!  —")).toBe("");
  });
});

describe("isValidSlug", () => {
  it.each(["a", "hello", "snplyng-bglyl", "5-mslvlym"])(
    "accepts %s",
    (slug) => {
      expect(isValidSlug(slug)).toBe(true);
    },
  );

  it.each(["-lead", "trail-", "double--hyphen", "Upper", "עברית", "has space"])(
    "rejects %s",
    (slug) => {
      expect(isValidSlug(slug)).toBe(false);
    },
  );
});
