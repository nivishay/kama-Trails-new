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

  // The admin fixed the party size + price, so per-person is total ÷ participants (participants
  // is always ≥ 1 from admin_create_booking). Shown read-only — the customer only confirms + pays.
  const perPerson =
    booking.participants_count > 0
      ? Number(booking.total_amount) / booking.participants_count
      : Number(booking.total_amount);

  return (
    <PayShell>
      <div className="mb-5">
        <p className="text-xs font-semibold tracking-wide text-primary">
          הזמנה אישית מקמה
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink">
          {booking.trail_name}
        </h1>
        {booking.trip_date && (
          <p className="mt-1 text-sm text-muted-foreground">
            {formatTrailDate(booking.trip_date)} ·{" "}
            {formatHebrewWeekday(booking.trip_date)}
          </p>
        )}
      </div>

      <dl className="mb-4 divide-y divide-border rounded-lg border border-border">
        <SummaryRow
          label="משתתפים"
          value={`${booking.participants_count}`}
        />
        <SummaryRow label="מחיר לאדם" value={formatPrice(perPerson)} />
      </dl>

      <p className="mb-5 text-xs text-muted-foreground">
        הפרטים נקבעו מראש עבורכם ואינם ניתנים לשינוי. יש לאשר את התנאים ולהמשיך
        לתשלום מאובטח.
      </p>

      <PayForm
        token={token}
        bookingId={booking.id}
        total={Number(booking.deposit_amount)}
      />
    </PayShell>
  );
}

/** One read-only line in the locked booking summary (label on the start, value on the end). */
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
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
