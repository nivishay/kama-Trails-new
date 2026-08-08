"use client";

import { useState } from "react";
import { REGION_FILTERS, type RegionFilterValue } from "@/lib/catalog/region";
import { TrailCard, type TrailCardItem } from "./trail-card";
import { cn } from "@/lib/utils";

/** Region filter pills + responsive grid of trail cards (client-side filtering). */
export function CatalogGrid({ items }: { items: TrailCardItem[] }) {
  const [region, setRegion] = useState<RegionFilterValue>("all");

  const visible =
    region === "all"
      ? items
      : items.filter((item) => item.trail.region === region);

  return (
    <div>
      <div className="mb-8 flex flex-wrap justify-center gap-2">
        {REGION_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setRegion(filter.value)}
            aria-pressed={region === filter.value}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-colors",
              region === filter.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          אין טיולים באזור זה כרגע.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <TrailCard key={item.trail.id} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}
