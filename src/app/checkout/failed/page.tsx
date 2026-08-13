import Link from "next/link";
import type { Metadata } from "next";
import { XCircle } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Return page — display only, never indexed (#45).
export const metadata: Metadata = {
  title: "התשלום לא הושלם",
  robots: { index: false, follow: false },
};

/** Resolve where "try again" should go: back to the same departure's checkout if we can. */
async function retryHref(token: string | undefined): Promise<string> {
  if (!token) return "/trails";
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.rpc("get_booking_by_token", {
    p_access_token: token,
  });
  const departureId = (data as { departure_id: string }[] | null)?.[0]
    ?.departure_id;
  return departureId ? `/checkout?departure=${departureId}` : "/trails";
}

export default async function CheckoutFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const href = await retryHref(token);

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <XCircle className="mx-auto size-12 text-destructive" />
        <h1 className="mt-3 text-2xl font-bold text-ink">התשלום לא הושלם</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          לא בוצע חיוב. אפשר לנסות שוב, המקום שמור לכם לזמן קצר.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href={href}
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
          >
            לנסות שוב
          </Link>
          <Link href="/contact" className="text-sm text-primary underline">
            צריכים עזרה? צרו קשר
          </Link>
        </div>
      </div>
    </main>
  );
}
