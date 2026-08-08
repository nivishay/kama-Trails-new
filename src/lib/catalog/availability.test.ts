import { describe, expect, it } from "vitest";
import {
  bookedCount,
  capacityLabel,
  isBookable,
  isFull,
  nextUpcomingDeparture,
  spotsLabel,
} from "./availability";
import type { DepartureAvailability } from "./types";

const NOW = new Date(2026, 7, 20); // 2026-08-20

function makeDeparture(
  overrides: Partial<DepartureAvailability> = {},
): DepartureAvailability {
  return {
    id: "dep-1",
    trail_id: "trail-1",
    date: "2026-08-25",
    departure_time: "07:00",
    price: 180,
    min_capacity: 0,
    max_capacity: 20,
    status: "open",
    free_spots: 20,
    ...overrides,
  };
}

describe("capacity helpers", () => {
  it("computes booked count and capacity label", () => {
    const departure = makeDeparture({ free_spots: 5, max_capacity: 20 });
    expect(bookedCount(departure)).toBe(15);
    expect(capacityLabel(departure)).toBe("15/20");
  });

  it("never reports negative booked count", () => {
    expect(
      bookedCount(makeDeparture({ free_spots: 25, max_capacity: 20 })),
    ).toBe(0);
  });

  it("detects a full departure", () => {
    expect(isFull(makeDeparture({ free_spots: 0 }))).toBe(true);
    expect(isFull(makeDeparture({ free_spots: 3 }))).toBe(false);
  });
});

describe("isBookable", () => {
  it("is true for an open, future, non-full departure", () => {
    expect(isBookable(makeDeparture(), NOW)).toBe(true);
  });

  it("is false when full", () => {
    expect(isBookable(makeDeparture({ free_spots: 0 }), NOW)).toBe(false);
  });

  it("is false when in the past", () => {
    expect(isBookable(makeDeparture({ date: "2026-08-10" }), NOW)).toBe(false);
  });

  it("is false when not open", () => {
    expect(isBookable(makeDeparture({ status: "closed" }), NOW)).toBe(false);
  });
});

describe("spotsLabel", () => {
  it("shows free spots when available", () => {
    expect(spotsLabel(makeDeparture({ free_spots: 12 }), NOW)).toBe(
      "12 מקומות פנויים",
    );
  });

  it("shows sold out when full", () => {
    expect(spotsLabel(makeDeparture({ free_spots: 0 }), NOW)).toBe("אזל");
  });

  it("shows cancelled state", () => {
    expect(spotsLabel(makeDeparture({ status: "cancelled" }), NOW)).toBe(
      "בוטל",
    );
  });

  it("shows past state regardless of seats", () => {
    expect(
      spotsLabel(makeDeparture({ date: "2026-08-01", free_spots: 5 }), NOW),
    ).toBe("התקיים");
  });
});

describe("nextUpcomingDeparture", () => {
  it("returns the first non-past departure from a date-ascending list", () => {
    const departures = [
      makeDeparture({ id: "past", date: "2026-08-01" }),
      makeDeparture({ id: "next", date: "2026-08-25" }),
      makeDeparture({ id: "later", date: "2026-09-10" }),
    ];
    expect(nextUpcomingDeparture(departures, NOW)?.id).toBe("next");
  });

  it("returns null when all departures are past", () => {
    const departures = [makeDeparture({ date: "2026-08-01" })];
    expect(nextUpcomingDeparture(departures, NOW)).toBeNull();
  });
});
