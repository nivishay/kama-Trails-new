/**
 * Date presenters for the catalog. Input dates are ISO calendar dates
 * ("YYYY-MM-DD") with no time/zone, so we parse the parts explicitly and format
 * in UTC — this keeps the displayed day and weekday stable regardless of the
 * server's timezone (avoids off-by-one shifts).
 */

const HEBREW_WEEKDAY = new Intl.DateTimeFormat("he-IL", {
  weekday: "long",
  timeZone: "UTC",
});

/** Parse "YYYY-MM-DD" into a UTC Date. Throws on malformed input. */
function parseIsoDate(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    throw new Error(`Invalid ISO date: "${iso}"`);
  }
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

/** "2026-08-20" → "20.08.26" (DD.MM.YY), matching the POC card format. */
export function formatTrailDate(iso: string): string {
  const [, year, month, day] = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) ?? [];
  if (!year) {
    throw new Error(`Invalid ISO date: "${iso}"`);
  }
  return `${day}.${month}.${year.slice(2)}`;
}

/** "2026-08-20" → "יום חמישי". */
export function formatHebrewWeekday(iso: string): string {
  return HEBREW_WEEKDAY.format(parseIsoDate(iso));
}

/** Local calendar date of `now` as "YYYY-MM-DD". */
function todayIso(now: Date): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** True when the departure's calendar date is before today (date-only compare). */
export function isPastDate(iso: string, now: Date = new Date()): boolean {
  return iso.slice(0, 10) < todayIso(now);
}
