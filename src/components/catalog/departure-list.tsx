import { Clock, ShieldCheck, Users } from "lucide-react";
import type { DepartureAvailability } from "@/lib/catalog/types";
import {
  capacityLabel,
  isBookable,
  spotsLabel,
} from "@/lib/catalog/availability";
import { formatHebrewWeekday, formatTrailDate } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/price";
import { Button } from "@/components/ui/button";

function DepartureRow({ departure }: { departure: DepartureAvailability }) {
  const bookable = isBookable(departure);

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="size-4" />
          {departure.departure_time}
        </div>
        <div className="text-left">
          <div className="text-lg font-bold text-ink">
            {formatTrailDate(departure.date)}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatHebrewWeekday(departure.date)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Users className="size-4" />
          {spotsLabel(departure)}
        </span>
        <span className="text-muted-foreground">
          {capacityLabel(departure)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <div className="text-right">
          <div className="text-xs text-muted-foreground">מחיר לאדם</div>
          <div className="font-bold text-ink">
            {formatPrice(departure.price)}
          </div>
        </div>
        {/* Registration lands in the booking increment; disabled for now. */}
        <Button
          variant="primary"
          size="sm"
          disabled
          title={bookable ? "בקרוב" : undefined}
        >
          {bookable ? "הרשמה לתאריך זה" : spotsLabel(departure)}
        </Button>
      </div>
    </li>
  );
}

/** Sticky "available dates" booking sidebar on the trail detail page. */
export function DepartureList({
  departures,
}: {
  departures: DepartureAvailability[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="rounded-t-xl bg-ink px-5 py-4 text-ink-foreground">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="text-lg font-bold">תאריכים זמינים</h2>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          הזמנה אונליין · תשלום מאובטח
        </p>
      </div>

      {departures.length === 0 ? (
        <p className="p-5 text-sm text-muted-foreground">
          אין תאריכים זמינים כרגע. חזרו בקרוב או צרו קשר.
        </p>
      ) : (
        <ul className="space-y-3 p-4">
          {departures.map((departure) => (
            <DepartureRow key={departure.id} departure={departure} />
          ))}
        </ul>
      )}

      <p className="border-t border-border px-5 py-4 text-xs text-muted-foreground">
        מדיניות ביטולים: ביטול 7+ ימים לפני הטיול — החזר מלא. לפרטים המלאים צרו
        קשר.
      </p>
    </div>
  );
}
