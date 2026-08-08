import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import type { DepartureAvailability, Trail } from "@/lib/catalog/types";
import { DIFFICULTY_DOT_CLASS } from "@/lib/catalog/difficulty";
import { formatTrailDate, formatHebrewWeekday } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/price";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TrailCardItem {
  trail: Trail;
  nextDeparture: DepartureAvailability | null;
}

/** Catalog trail card: hero image + region/difficulty, then next-departure footer. */
export function TrailCard({ trail, nextDeparture }: TrailCardItem) {
  const href = `/trails/${trail.slug}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link href={href} className="group relative block aspect-[4/3]">
        {trail.hero_image ? (
          <Image
            src={trail.hero_image}
            alt={trail.name}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="size-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" />

        {/* Visual affordance (the whole image already links to the detail page). */}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-ink/70 px-3 py-1.5 text-xs font-medium text-ink-foreground backdrop-blur-sm transition-colors group-hover:bg-ink/85">
          לפרטים נוספים ותאריכים
          <ArrowLeft className="size-3.5" />
        </span>

        {trail.region_label && (
          <Badge className="absolute top-3 right-3">{trail.region_label}</Badge>
        )}

        <div className="absolute inset-x-0 bottom-0 p-4 text-ink-foreground">
          {trail.difficulty && trail.difficulty_label && (
            <div className="mb-1 flex items-center justify-end gap-1.5 text-xs">
              <span>{trail.difficulty_label}</span>
              <span
                className={cn(
                  "size-2 rounded-full",
                  DIFFICULTY_DOT_CLASS[trail.difficulty],
                )}
              />
            </div>
          )}
          <h3 className="text-lg leading-tight font-bold">{trail.name}</h3>
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {nextDeparture ? (
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <Clock className="size-3.5" />
              {nextDeparture.departure_time}
            </span>
            <div className="border-r-[3px] border-primary pr-3 text-right">
              <div className="text-xl leading-tight font-bold text-ink">
                {formatTrailDate(nextDeparture.date)}
              </div>
              <div className="text-sm text-muted-foreground">
                {formatHebrewWeekday(nextDeparture.date)}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">אין תאריכים קרובים</p>
        )}

        <div className="mt-auto flex items-center justify-between">
          {/* Registration lands in the booking increment; disabled for now. */}
          <Button variant="primary" size="sm" disabled title="בקרוב">
            <Calendar className="size-4" />
            {nextDeparture
              ? `הרשמה ל-${formatTrailDate(nextDeparture.date)}`
              : "בקרוב"}
          </Button>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">מחיר לאדם</div>
            <div className="font-bold text-ink">
              {formatPrice(nextDeparture?.price ?? trail.price)}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
