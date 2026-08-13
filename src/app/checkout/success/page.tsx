import Link from "next/link";
import type { Metadata } from "next";
import { BookingStatusPoller } from "./booking-status-poller";

// Return page — display only, never indexed (#45).
export const metadata: Metadata = {
  title: "אישור הרשמה",
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        {token ? (
          <BookingStatusPoller token={token} />
        ) : (
          <div className="text-center">
            <h1 className="text-xl font-bold text-ink">חסר מזהה הזמנה</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              לא הצלחנו לזהות את ההרשמה.{" "}
              <Link href="/contact" className="text-primary underline">
                צרו קשר
              </Link>{" "}
              ונשמח לעזור.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
