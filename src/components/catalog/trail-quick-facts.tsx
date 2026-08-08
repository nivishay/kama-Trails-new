import { Clock, Gauge, MapPin, Ruler } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Trail } from "@/lib/catalog/types";

/** Compact facts row on the trail detail page (area / difficulty / height / duration). */
export function TrailQuickFacts({ trail }: { trail: Trail }) {
  const facts: { Icon: LucideIcon; label: string; value: string | null }[] = [
    { Icon: MapPin, label: "אזור", value: trail.region_label },
    { Icon: Gauge, label: "רמת קושי", value: trail.difficulty_label },
    { Icon: Ruler, label: "גובה הגלישה", value: trail.height },
    { Icon: Clock, label: "משך", value: trail.duration },
  ].filter((fact) => Boolean(fact.value));

  if (facts.length === 0) {
    return null;
  }

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {facts.map(({ Icon, label, value }) => (
        <div
          key={label}
          className="rounded-lg border border-border bg-card p-4 text-center"
        >
          <Icon className="mx-auto mb-2 size-5 text-primary" />
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 text-sm font-semibold text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
