import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Users, Baby, Building2 } from "lucide-react";
import { getDeparturesForTrail, getTrails } from "@/lib/catalog";
import { nextUpcomingDeparture } from "@/lib/catalog/availability";
import { Button } from "@/components/ui/button";
import { TrailCard } from "@/components/catalog/trail-card";

const AUDIENCE_FEATURES = [
  { Icon: Users, label: "משפחות וקבוצות פרטיות" },
  { Icon: Baby, label: "ילדים ונוער" },
  { Icon: Building2, label: "ארגונים ובתי ספר" },
];

function Hero({ backgroundImage }: { backgroundImage?: string | null }) {
  return (
    <section className="relative flex min-h-[560px] items-center overflow-hidden text-ink-foreground">
      {backgroundImage && (
        <Image
          src={backgroundImage}
          alt=""
          fill
          sizes="100vw"
          className="z-0 object-cover"
          priority
        />
      )}
      <div className="absolute inset-0 z-10 bg-gradient-to-l from-ink/85 via-ink/50 to-ink/30" />
      <div className="relative z-20 mx-auto w-full max-w-6xl px-4 text-right">
        <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/90 px-4 py-1.5 text-sm font-medium text-primary-foreground">
          <ShieldCheck className="size-4" />
          מוסמכים ומבוטחים · משרד התרבות והספורט
        </span>
        <h1 className="text-5xl font-bold sm:text-6xl">שבילי קמה</h1>
        <p className="mt-3 text-2xl font-semibold text-primary">
          טיולי סנפלינג ואתגר
        </p>
        <p className="mt-2 text-lg text-ink-muted">
          לארגונים · בתי ספר · טיולי זוגות ומשפחות
        </p>
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href="/trails">
              לטיולים שלנו
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-ink-foreground/40 text-ink-foreground hover:bg-ink-foreground hover:text-ink"
          >
            <Link href="/contact">צרו קשר</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const [trails, departures] = await Promise.all([
    getTrails(),
    getDeparturesForTrail(),
  ]);

  const featured = trails.slice(0, 3).map((trail) => ({
    trail,
    nextDeparture: nextUpcomingDeparture(
      departures.filter((d) => d.trail_id === trail.id),
    ),
  }));

  return (
    <div>
      <Hero backgroundImage={trails[0]?.hero_image} />

      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-3">
          {AUDIENCE_FEATURES.map(({ Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-lg bg-card p-4 shadow-sm"
            >
              <Icon className="size-6 text-primary" />
              <span className="font-medium text-ink">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div className="text-right">
            <p className="mb-1 text-sm font-medium text-primary">
              קטלוג מסלולים
            </p>
            <h2 className="text-3xl font-bold text-ink">טיולים קרובים</h2>
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
    </div>
  );
}
