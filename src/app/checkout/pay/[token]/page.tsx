import Link from "next/link";
import type { Metadata } from "next";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { formatHebrewWeekday, formatTrailDate } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/price";
import { PayForm } from "./pay-form";

// The pay-link is a transactional, capability-gated page — never indexed (#45/#33).
export const metadata: Metadata = {
  title: "תשלום עבור טיול",
  robots: { index: false, follow: false },
};

interface TokenBooking {
  id: string;
  status: string;
  trail_name: string;
  trip_date: string | null;
  registrant_name: string;
  participants_count: number;
  total_amount: number;
  deposit_amount: number;
}

export default async function PayLinkPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createSupabasePublicClient();
  const { data } = await supabase.rpc("get_booking_by_token", {
    p_access_token: token,
  });
  const booking = (data as unknown as TokenBooking[] | null)?.[0] ?? null;

  if (!booking) {
    return (
      <PayShell>
        <p className="text-sm text-muted-foreground">
          קישור התשלום אינו תקין או שפג תוקפו.{" "}
          <Link href="/" className="text-primary underline">
            לעמוד הבית
          </Link>
        </p>
      </PayShell>
    );
  }

  if (booking.status !== "held") {
    return (
      <PayShell>
        <h1 className="text-xl font-bold text-ink">{booking.trail_name}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {booking.status === "confirmed"
            ? "התשלום כבר בוצע וההזמנה אושרה."
            : "ההזמנה אינה זמינה לתשלום."}
        </p>
      </PayShell>
    );
  }

  return (
    <PayShell>
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-ink">{booking.trail_name}</h1>
        {booking.trip_date && (
          <p className="mt-1 text-sm text-muted-foreground">
            {formatTrailDate(booking.trip_date)} ·{" "}
            {formatHebrewWeekday(booking.trip_date)}
          </p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          {booking.participants_count} משתתפים ·{" "}
          {formatPrice(booking.total_amount)}
        </p>
      </div>

      <PayForm
        token={token}
        bookingId={booking.id}
        total={Number(booking.deposit_amount)}
      />
    </PayShell>
  );
}

function PayShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}
