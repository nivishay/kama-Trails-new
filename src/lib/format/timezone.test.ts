import { describe, it, expect } from "vitest";
import { israelWallTimeToUtcIso, utcIsoToIsraelWallTime } from "./timezone";

describe("israelWallTimeToUtcIso", () => {
  it("converts a winter (IST, +02:00) wall time to UTC", () => {
    // December → Israel Standard Time, +02:00. 08:00 local = 06:00 UTC.
    expect(israelWallTimeToUtcIso("2026-12-01T08:00")).toBe(
      "2026-12-01T06:00:00.000Z",
    );
  });

  it("converts a summer (IDT, +03:00) wall time to UTC", () => {
    // July → Israel Daylight Time, +03:00. 08:00 local = 05:00 UTC.
    expect(israelWallTimeToUtcIso("2026-07-01T08:00")).toBe(
      "2026-07-01T05:00:00.000Z",
    );
  });

  it("returns null for empty or malformed input", () => {
    expect(israelWallTimeToUtcIso("")).toBeNull();
    expect(israelWallTimeToUtcIso(null)).toBeNull();
    expect(israelWallTimeToUtcIso("not-a-date")).toBeNull();
  });
});

describe("utcIsoToIsraelWallTime", () => {
  it("round-trips a winter instant back to the local wall time", () => {
    expect(utcIsoToIsraelWallTime("2026-12-01T06:00:00.000Z")).toBe(
      "2026-12-01T08:00",
    );
  });

  it("round-trips a summer instant back to the local wall time", () => {
    expect(utcIsoToIsraelWallTime("2026-07-01T05:00:00.000Z")).toBe(
      "2026-07-01T08:00",
    );
  });

  it("returns an empty string for empty input", () => {
    expect(utcIsoToIsraelWallTime(null)).toBe("");
    expect(utcIsoToIsraelWallTime("")).toBe("");
  });
});
