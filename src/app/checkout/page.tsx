import Link from "next/link";
import type { Metadata } from "next";
import { getDepartureForCheckout } from "@/lib/catalog";
import { formatHebrewWeekday, formatTrailDate } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/price";
import { CheckoutForm } from "./checkout-form";

// Checkout is a transactional page — never indexed, never part of the SEO cutover (#45/#33).
export const metadata: Metadata = {
  title: "הרשמה לטיול",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ departure?: string }>;
}) {
  const { departure: departureId } = await searchParams;
  const departure = departureId
    ? await getDepartureForCheckout(departureId)
    : null;

  if (!departure) {
    return (
      <CheckoutShell>
        <p className="text-sm text-muted-foreground">
          לא מצאנו את היציאה המבוקשת.{" "}
          <Link href="/trails" className="text-primary underline">
            חזרה לטיולים
          </Link>
        </p>
      </CheckoutShell>
    );
  }

  const bookable = departure.status === "open" && departure.free_spots > 0;
  if (!bookable) {
    return (
      <CheckoutShell>
        <h1 className="text-xl font-bold text-ink">{departure.trail_name}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          התאריך שנבחר אינו זמין להרשמה כרגע.{" "}
          <Link
            href={`/trails/${departure.trail_slug}`}
            className="text-primary underline"
          >
            לתאריכים נוספים
          </Link>
        </p>
      </CheckoutShell>
    );
  }

  return (
    <CheckoutShell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink">{departure.trail_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatTrailDate(departure.date)} ·{" "}
          {formatHebrewWeekday(departure.date)}
          {departure.departure_time ? ` · ${departure.departure_time}` : ""}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatPrice(departure.price)} לאדם · {departure.free_spots} מקומות
          פנויים
        </p>
      </div>

      <CheckoutForm
        departureId={departure.id}
        pricePerPerson={departure.price}
        maxParticipants={departure.free_spots}
      />
    </CheckoutShell>
  );
}

function CheckoutShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}
