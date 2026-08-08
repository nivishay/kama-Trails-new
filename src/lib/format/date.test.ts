import { describe, expect, it } from "vitest";
import { formatHebrewWeekday, formatTrailDate, isPastDate } from "./date";

describe("formatTrailDate", () => {
  it("formats an ISO date as DD.MM.YY", () => {
    expect(formatTrailDate("2026-08-20")).toBe("20.08.26");
  });

  it("keeps a two-digit year for later months", () => {
    expect(formatTrailDate("2026-10-19")).toBe("19.10.26");
  });

  it("throws on malformed input", () => {
    expect(() => formatTrailDate("not-a-date")).toThrow();
  });
});

describe("formatHebrewWeekday", () => {
  it("returns the Hebrew weekday name (Thu 2026-08-20 → יום חמישי)", () => {
    expect(formatHebrewWeekday("2026-08-20")).toBe("יום חמישי");
  });
});

describe("isPastDate", () => {
  // Local-midnight constructor avoids timezone drift in the comparison.
  const today = new Date(2026, 7, 20); // 2026-08-20

  it("is false for a future date", () => {
    expect(isPastDate("2026-08-25", today)).toBe(false);
  });

  it("is false for today (same calendar day is not past)", () => {
    expect(isPastDate("2026-08-20", today)).toBe(false);
  });

  it("is true for a past date", () => {
    expect(isPastDate("2026-08-19", today)).toBe(true);
  });
});
