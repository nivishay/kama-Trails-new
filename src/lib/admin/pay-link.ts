// Pure pay-link builders (issue #32). Framework- and I/O-free on purpose — only depends on the
// site origin — so it stays trivially unit-testable and importing it never pulls in the Supabase
// client. The DB orchestration that *uses* these lives in admin-created-bookings.ts / bookings.ts.
import { getSiteUrl } from "@/lib/site-url";
import type { BookingStatus } from "./bookings";

/** The public pay-link (a capability URL carrying the booking's access token). */
export function payLinkForToken(accessToken: string): string {
  return `${getSiteUrl()}/checkout/pay/${accessToken}`;
}

/**
 * The pay-link to re-send for a booking the admin may still need to collect on — only a `held`
 * (awaiting-payment) booking has a live pay-link; a confirmed/cancelled/expired booking has
 * nothing left to pay, so it returns null. Lets the admin retrieve the link any time after the
 * one-time creation panel is gone.
 */
export function payLinkForBooking(
  status: BookingStatus,
  accessToken: string,
): string | null {
  return status === "held" ? payLinkForToken(accessToken) : null;
}
