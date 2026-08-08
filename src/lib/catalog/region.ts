import type { Region, Trail } from "./types";

/** Region filter value used by the catalog UI ("all" = no filter). */
export type RegionFilterValue = Region | "all";

/** Short Hebrew labels for the region filter pills. */
export const REGION_LABELS: Record<Region, string> = {
  north: "צפון",
  south: "דרום",
  center: "מרכז",
};

/** Filter pills in display order. "all" first, matching the POC. */
export const REGION_FILTERS: { value: RegionFilterValue; label: string }[] = [
  { value: "all", label: "הכל" },
  { value: "north", label: REGION_LABELS.north },
  { value: "south", label: REGION_LABELS.south },
  { value: "center", label: REGION_LABELS.center },
];

/** Return trails matching the region filter; "all" returns every trail. */
export function filterTrailsByRegion(
  trails: Trail[],
  region: RegionFilterValue,
): Trail[] {
  if (region === "all") {
    return trails;
  }
  return trails.filter((trail) => trail.region === region);
}
