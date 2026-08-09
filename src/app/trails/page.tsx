import type { Metadata } from "next";
import { getDeparturesForTrail, getTrails } from "@/lib/catalog";
import { nextUpcomingDeparture } from "@/lib/catalog/availability";
import type { DepartureAvailability } from "@/lib/catalog/types";
import { PageHero } from "@/components/layout/page-hero";
import { CatalogGrid } from "@/components/catalog/catalog-grid";
import type { TrailCardItem } from "@/components/catalog/trail-card";

// Catalog data changes rarely; serve statically and regenerate in the
// background (ISR) so visitors get a cached page instead of a fresh
// dynamic render + DB round-trips on every request. A short window keeps
// availability near-fresh; the booking flow re-checks the DB at reservation
// time, so a briefly stale card can never cause an overbooking. When booking
// ships, call `revalidatePath("/trails")` on booking events for instant
// freshness.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "הטיולים שלנו",
  description:
    "קטלוג מסלולי הסנפלינג של שבילי קמה — בחרו טיול, בדקו תאריכים זמינים והירשמו אונליין.",
};

/** Group departures by trail id for O(1) lookup when building cards. */
function groupByTrail(
  departures: DepartureAvailability[],
): Map<string, DepartureAvailability[]> {
  const byTrail = new Map<string, DepartureAvailability[]>();
  for (const departure of departures) {
    const list = byTrail.get(departure.trail_id) ?? [];
    list.push(departure);
    byTrail.set(departure.trail_id, list);
  }
  return byTrail;
}

export default async function TrailsPage() {
  const [trails, departures] = await Promise.all([
    getTrails(),
    getDeparturesForTrail(),
  ]);

  const byTrail = groupByTrail(departures);
  const items: TrailCardItem[] = trails.map((trail) => ({
    trail,
    nextDeparture: nextUpcomingDeparture(byTrail.get(trail.id) ?? []),
  }));

  return (
    <div>
      <PageHero
        eyebrow="קטלוג מסלולים"
        title="הטיולים שלנו"
        description="ניתן להצטרף לטיולים הפתוחים שלנו. היציאה לטיול מותנית במספר נרשמים; יש להירשם בעמוד הטיול ולהסדיר תשלום."
        backgroundImage={trails[0]?.hero_image}
      />
      <div className="mx-auto max-w-6xl px-4 py-14">
        <CatalogGrid items={items} />
      </div>
    </div>
  );
}
