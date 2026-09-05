/** Timezone helpers for admin inputs. The app is Israel-local; the DB stores timestamptz. */

export const ISRAEL_TIME_ZONE = "Asia/Jerusalem";

/**
 * Interpret a `<input type="datetime-local">` wall-clock value (e.g. "2026-12-01T08:00", no
 * zone) as Israel local time and return the matching UTC instant as an ISO string — so it can
 * be stored in a timestamptz column consistently with how the DB derives the default deadline
 * (date + time at Asia/Jerusalem). Returns null for empty/invalid input.
 *
 * DST-correct: the Asia/Jerusalem offset is resolved for that specific instant, not hard-coded.
 */
export function israelWallTimeToUtcIso(
  localDateTime: string | null | undefined,
): string | null {
  const value = (localDateTime ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null;

  // Treat the wall time as if it were UTC, then subtract the zone's offset at that instant.
  const pretendUtc = new Date(`${value.slice(0, 16)}:00Z`);
  if (Number.isNaN(pretendUtc.getTime())) return null;

  const offsetMs = israelOffsetMs(pretendUtc);
  return new Date(pretendUtc.getTime() - offsetMs).toISOString();
}

/**
 * Format a UTC ISO instant back into an Israel-local `datetime-local` value
 * ("YYYY-MM-DDTHH:MM"), for pre-filling the edit form. Returns "" for empty input.
 */
export function utcIsoToIsraelWallTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ISRAEL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/** The Asia/Jerusalem UTC offset (ms) in effect at a given instant. */
function israelOffsetMs(instant: Date): number {
  const inTz = new Date(instant.toLocaleString("en-US", { timeZone: ISRAEL_TIME_ZONE }));
  const inUtc = new Date(instant.toLocaleString("en-US", { timeZone: "UTC" }));
  return inTz.getTime() - inUtc.getTime();
}
