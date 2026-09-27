import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Users, Baby, Building2 } from "lucide-react";
import { getDeparturesForTrail, getTrails } from "@/lib/catalog";
import { nextUpcomingDeparture } from "@/lib/catalog/availability";
import { tripPhotosPublicUrl } from "@/lib/catalog/trail-image";
import { SITE_HERO_VIDEO, SITE_HERO_POSTER } from "@/lib/site";
import { COMPANY_INTRO_POINTS } from "@/lib/content/company";
import { getPartnerLogos } from "@/lib/content/partner-logos";
import { Button } from "@/components/ui/button";
import { TrailCard } from "@/components/catalog/trail-card";
import { HeroVideo } from "@/components/home/hero-video";
import { PartnerLogosStrip } from "@/components/home/partner-logos-strip";

const AUDIENCE_FEATURES = [
  { Icon: Users, label: "משפחות וקבוצות פרטיות" },
  { Icon: Baby, label: "ילדים ונוער" },
  { Icon: Building2, label: "ארגונים ובתי ספר" },
];

function Hero({
  videoSrc,
  posterSrc,
}: {
  videoSrc?: string | null;
  posterSrc?: string | null;
}) {
  return (
    <section className="relative flex min-h-[560px] items-center overflow-hidden text-ink-foreground">
      {videoSrc ? (
        <HeroVideo src={videoSrc} poster={posterSrc ?? undefined} />
      ) : (
        posterSrc && (
          <Image
            src={posterSrc}
            alt=""
            fill
            sizes="100vw"
            className="z-0 object-cover"
            priority
          />
        )
      )}
      <div className="relative z-20 mx-auto w-full max-w-6xl px-4 text-right [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/90 px-4 py-1.5 text-sm font-medium text-primary-foreground">
          <ShieldCheck className="size-4" />
          מוסמכים ומבוטחים · משרד התרבות והספורט
        </span>
        <h1 className="text-6xl font-bold tracking-tight sm:text-7xl">
          שבילי קמה
        </h1>
        <p className="mt-4 text-3xl font-semibold text-primary sm:text-4xl">
          טיולי סנפלינג ואתגר
        </p>
        <p className="mt-3 text-lg text-ink-foreground/90 sm:text-xl">
          לארגונים · בתי ספר · טיולי זוגות ומשפחות
        </p>
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href="/trails">
              לטיולים שלנו
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          {/* Private/group trips have no public catalog — the CTA opens a lead
              request. Styled as a solid light button so it stands apart from the
              lime "open trips" path on the dark hero. */}
          <Button
            asChild
            size="lg"
            className="bg-ink-foreground text-ink hover:bg-white"
          >
            <Link href="/contact">
              <Users className="size-4" />
              להזמנת טיול פרטי
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [trails, departures, partnerLogos] = await Promise.all([
    getTrails(),
    getDeparturesForTrail(),
    getPartnerLogos(),
  ]);

  const featured = trails.slice(0, 3).map((trail) => ({
    trail,
    nextDeparture: nextUpcomingDeparture(
      departures.filter((d) => d.trail_id === trail.id),
    ),
  }));

  return (
    <div>
      <Hero
        videoSrc={tripPhotosPublicUrl(SITE_HERO_VIDEO)}
        posterSrc={tripPhotosPublicUrl(SITE_HERO_POSTER)}
      />

      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-3">
          {AUDIENCE_FEATURES.map(({ Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-lg bg-card p-4 shadow-sm"
            >
              <Icon className="size-7 text-primary" />
              <span className="text-lg font-semibold text-ink">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="mb-2 text-sm font-medium text-primary">קצת עלינו</p>
        <h2 className="text-3xl font-bold text-ink">
          נעים מאוד!! אנחנו צוות &quot;שבילי קמה&quot;
        </h2>
        <div className="mt-6 space-y-3 text-lg leading-relaxed text-muted-foreground">
          {COMPANY_INTRO_POINTS.map((point) => (
            <p key={point}>{point}</p>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href="/contact">צרו קשר</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/about">קרא עוד עלינו</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="mb-8 flex items-end justify-between">
          <div className="text-right">
            <p className="mb-1 text-sm font-medium text-primary">
              קטלוג מסלולים
            </p>
            <h2 className="text-4xl font-bold text-ink">טיולים קרובים</h2>
          </div>
          <Link
            href="/trails"
            className="text-sm font-medium text-primary hover:underline"
          >
            לכל הטיולים
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((item) => (
            <TrailCard key={item.trail.id} {...item} />
          ))}
        </div>
      </section>

      <PartnerLogosStrip logos={partnerLogos} />
    </div>
  );
}
