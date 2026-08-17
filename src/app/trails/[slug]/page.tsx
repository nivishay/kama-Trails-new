import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import {
  getDeparturesForTrail,
  getTrailBySlug,
  getTrails,
} from "@/lib/catalog";
import { isPastDate } from "@/lib/format/date";
import { DIFFICULTY_DOT_CLASS } from "@/lib/catalog/difficulty";
import { trailImageUrl } from "@/lib/catalog/trail-image";
import { TrailQuickFacts } from "@/components/catalog/trail-quick-facts";
import { DepartureList } from "@/components/catalog/departure-list";
import { cn } from "@/lib/utils";

// See /trails: ISR-cache the detail page instead of rendering dynamically per
// request. Availability shown here re-checks the DB at booking time, so a
// briefly stale departure list is display-only, never an overbooking risk.
export const revalidate = 60;

/** Prerender every trail's detail page at build time so no visitor pays a
 * cold dynamic render; new slugs added later render on first request, then
 * cache per `revalidate`. */
export async function generateStaticParams() {
  const trails = await getTrails();
  return trails.map((trail) => ({ slug: trail.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/trails/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const trail = await getTrailBySlug(slug);
  if (!trail) {
    return { title: "טיול לא נמצא" };
  }
  return {
    title: trail.name,
    description: trail.excerpt ?? undefined,
  };
}

/** A titled free-text section on the detail page; renders nothing when empty. */
function TrailSection({ title, body }: { title: string; body: string | null }) {
  if (!body) {
    return null;
  }
  return (
    <section>
      <h2 className="mb-2 text-xl font-bold text-ink">{title}</h2>
      <p className="leading-relaxed whitespace-pre-line text-muted-foreground">
        {body}
      </p>
    </section>
  );
}

export default async function TrailDetailPage({
  params,
}: PageProps<"/trails/[slug]">) {
  const { slug } = await params;
  const trail = await getTrailBySlug(slug);
  if (!trail) {
    notFound();
  }

  const departures = (await getDeparturesForTrail(trail.id)).filter(
    (departure) => !isPastDate(departure.date),
  );

  const heroUrl = trailImageUrl(trail.hero_image);

  return (
    <div>
      <section className="relative flex min-h-[420px] items-end overflow-hidden text-ink-foreground">
        {heroUrl && (
          <Image
            src={heroUrl}
            alt={trail.name}
            fill
            sizes="100vw"
            className="z-0 object-cover"
            priority
          />
        )}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-ink/90 via-ink/40 to-ink/20" />
        <div className="relative z-20 mx-auto w-full max-w-6xl px-4 pb-10 text-right">
          <Link
            href="/trails"
            className="mb-3 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink-foreground"
          >
            <ChevronLeft className="size-4" />
            חזרה לכל הטיולים
          </Link>
          <div className="mb-2 flex items-center justify-end gap-2 text-sm">
            {trail.region_label && <span>{trail.region_label}</span>}
            {trail.difficulty && trail.difficulty_label && (
              <>
                <span aria-hidden>·</span>
                <span className="flex items-center gap-1.5">
                  {trail.difficulty_label}
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      DIFFICULTY_DOT_CLASS[trail.difficulty],
                    )}
                  />
                </span>
              </>
            )}
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">{trail.name}</h1>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <TrailQuickFacts trail={trail} />
          <TrailSection title="על המסלול" body={trail.description} />
          <TrailSection title="ציוד נדרש" body={trail.gear} />
          <TrailSection title="רמת קושי ולמי מתאים" body={trail.audience} />
          <TrailSection title="מה כלול במחיר" body={trail.included} />
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <DepartureList departures={departures} />
        </aside>
      </div>
    </div>
  );
}
