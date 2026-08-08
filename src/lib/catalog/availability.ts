import { isPastDate } from "@/lib/format/date";
import type { DepartureAvailability } from "./types";

/** Seats already taken = capacity minus free spots (never negative). */
export function bookedCount(departure: DepartureAvailability): number {
  return Math.max(0, departure.max_capacity - departure.free_spots);
}

/** "0/20" booked-over-capacity label, as shown on the POC. */
export function capacityLabel(departure: DepartureAvailability): string {
  return `${bookedCount(departure)}/${departure.max_capacity}`;
}

/** True when no seats remain. */
export function isFull(departure: DepartureAvailability): boolean {
  return departure.free_spots <= 0;
}

/**
 * Whether a customer could register for this departure: sales open, not full,
 * and not in the past. (The register action itself lands in a later increment.)
 */
export function isBookable(
  departure: DepartureAvailability,
  now: Date = new Date(),
): boolean {
  return (
    departure.status === "open" &&
    !isFull(departure) &&
    !isPastDate(departure.date, now)
  );
}

/**
 * The next upcoming (non-past) departure from a date-ascending list, or null.
 * Used for the trail card's "next date" summary.
 */
export function nextUpcomingDeparture(
  departures: DepartureAvailability[],
  now: Date = new Date(),
): DepartureAvailability | null {
  return departures.find((d) => !isPastDate(d.date, now)) ?? null;
}

/** Hebrew status label for a departure's seat availability. */
export function spotsLabel(
  departure: DepartureAvailability,
  now: Date = new Date(),
): string {
  if (isPastDate(departure.date, now)) {
    return "התקיים";
  }
  if (departure.status === "cancelled") {
    return "בוטל";
  }
  if (isFull(departure)) {
    return "אזל";
  }
  return `${departure.free_spots} מקומות פנויים`;
}
