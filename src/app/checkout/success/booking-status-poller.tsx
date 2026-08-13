"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatTrailDate } from "@/lib/format/date";
import { formatPrice } from "@/lib/format/price";

interface BookingView {
  status: string;
  trail_name: string;
  trip_date: string;
  participants_count: number;
  total_amount: number;
}

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 40; // ~2 minutes, then stop hammering and reassure the customer

/**
 * The webhook — not this page — confirms a booking (#37). So the success page only reads the
 * booking by its access token and polls until it flips to `confirmed`, showing a "finalizing"
 * state in the meantime.
 */
export function BookingStatusPoller({ token }: { token: string }) {
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      const { data } = await supabase.rpc("get_booking_by_token", {
        p_access_token: token,
      });
      if (!active) return;

      const row = (data as BookingView[] | null)?.[0] ?? null;
      if (row) setBooking(row);
      if (row?.status === "confirmed") return; // done — stop polling

      attempts += 1;
      if (attempts >= MAX_ATTEMPTS) {
        setTimedOut(true);
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [token]);

  if (booking?.status === "confirmed") {
    return (
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-12 text-primary" />
        <h1 className="mt-3 text-2xl font-bold text-ink">ההרשמה אושרה!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {booking.trail_name} · {formatTrailDate(booking.trip_date)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {booking.participants_count} משתתפים · שולם{" "}
          {formatPrice(booking.total_amount)}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          קבלה נשלחה לאימייל שלכם. נתראה בשטח!
        </p>
        <Link
          href="/trails"
          className="mt-6 inline-block text-sm text-primary underline"
        >
          חזרה לטיולים
        </Link>
      </div>
    );
  }

  if (booking && booking.status !== "held") {
    // cancelled / expired — the payment did not land in time.
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold text-ink">משהו השתבש</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          לא הצלחנו לאשר את ההרשמה. אם חויבתם, נחזור אליכם — או צרו קשר.
        </p>
        <Link
          href="/contact"
          className="mt-6 inline-block text-sm text-primary underline"
        >
          צור קשר
        </Link>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div className="text-center">
        <h1 className="text-xl font-bold text-ink">התשלום בעיבוד</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          האישור לוקח קצת יותר מהרגיל. נשלח לכם אישור באימייל ברגע שהתשלום
          ייקלט.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <Loader2 className="mx-auto size-10 animate-spin text-primary" />
      <h1 className="mt-3 text-xl font-bold text-ink">מסיימים את התשלום…</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        אל תסגרו את החלון, זה ייקח רגע.
      </p>
    </div>
  );
}
