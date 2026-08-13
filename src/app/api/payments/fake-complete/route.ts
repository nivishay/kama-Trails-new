import { NextResponse } from "next/server";
import {
  getPaymentProvider,
  isFakePaymentProviderEnabled,
} from "@/lib/payments";
import {
  confirmPaymentFromSession,
  createBookingPaymentStore,
} from "@/lib/payments/webhook";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

// DEV/TEST-ONLY (ADR 0003). The fake stand-in for Cardcom's "redirect the browser back AND POST
// the webhook" step: it runs the real confirm path (record_payment_and_confirm) for the fake
// session, then forwards the browser to our success page. It 404s whenever the fake provider is
// not active, so it can never run in production.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isFakePaymentProviderEnabled()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session");
  const redirectTarget = url.searchParams.get("redirect");
  if (!sessionId || !redirectTarget) {
    return new NextResponse("Missing session or redirect", { status: 400 });
  }

  // Open-redirect guard: only ever forward to our own origin.
  let destination: URL;
  try {
    destination = new URL(redirectTarget, url.origin);
  } catch {
    return new NextResponse("Bad redirect target", { status: 400 });
  }
  if (destination.origin !== url.origin) {
    return new NextResponse("Cross-origin redirect refused", { status: 400 });
  }

  // Confirm exactly as the webhook would (pull-verify via the fake provider, then the atomic
  // record-and-confirm RPC). Anomalies/ignores are fine — the success page reads booking status.
  await confirmPaymentFromSession({
    provider: getPaymentProvider(),
    store: createBookingPaymentStore(createSupabaseServiceClient()),
    sessionId,
  });

  return NextResponse.redirect(destination, { status: 303 });
}
