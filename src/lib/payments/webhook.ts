import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentProvider } from "./types";

// The confirm path (ADR 0002 / DECISIONS #37): a verified Cardcom session is the ONLY thing
// that flips held -> confirmed. We pull the authoritative result via GetLpResult (never trust
// the unsigned webhook body), verify it, then call the atomic record_payment_and_confirm RPC.
// The logic here is pure orchestration over injected dependencies so it unit-tests without a
// network or DB.

const AMOUNT_EPSILON = 0.001; // shekels compare tolerance (guards float representation)

export type WebhookOutcome =
  | { kind: "confirmed"; bookingId: string; providerRef: string }
  | { kind: "anomaly"; bookingId: string; providerRef: string; status: string }
  | { kind: "ignored"; reason: "unsuccessful" | "incomplete-result" }
  | {
      kind: "rejected";
      reason: "booking-not-found" | "amount-mismatch";
      bookingId: string;
    };

/** The booking/ledger operations the confirm path needs, behind a thin seam (#5). */
export interface BookingPaymentStore {
  /** The amount required to confirm this booking, or null if the booking is unknown. */
  getDepositAmount(bookingId: string): Promise<number | null>;
  /** Record the succeeded payment and confirm atomically; returns the booking's new status. */
  recordPaymentAndConfirm(input: {
    bookingId: string;
    providerRef: string;
    amount: number;
    documentNumber: number | null;
    documentUrl: string | null;
  }): Promise<{ status: string }>;
}

export async function confirmPaymentFromSession(deps: {
  provider: PaymentProvider;
  store: BookingPaymentStore;
  sessionId: string;
}): Promise<WebhookOutcome> {
  const { provider, store, sessionId } = deps;

  // Source of truth is Cardcom's pulled result, not the POST body (#37).
  const result = await provider.getResult(sessionId);

  if (!result.success) {
    return { kind: "ignored", reason: "unsuccessful" };
  }
  if (!result.bookingId || !result.providerRef || result.amount == null) {
    return { kind: "ignored", reason: "incomplete-result" };
  }

  const deposit = await store.getDepositAmount(result.bookingId);
  if (deposit == null) {
    return {
      kind: "rejected",
      reason: "booking-not-found",
      bookingId: result.bookingId,
    };
  }

  // Secondary guard (#35/#37): the charge must equal the amount we asked to confirm.
  if (Math.abs(deposit - result.amount) > AMOUNT_EPSILON) {
    return {
      kind: "rejected",
      reason: "amount-mismatch",
      bookingId: result.bookingId,
    };
  }

  const { status } = await store.recordPaymentAndConfirm({
    bookingId: result.bookingId,
    providerRef: result.providerRef,
    amount: result.amount,
    documentNumber: result.document?.number ?? null,
    documentUrl: result.document?.url ?? null,
  });

  if (status === "confirmed") {
    return {
      kind: "confirmed",
      bookingId: result.bookingId,
      providerRef: result.providerRef,
    };
  }
  // Payment recorded but the booking wasn't held (expired/cancelled) — the #43 anomaly:
  // never dropped, never force-confirmed; surfaced to the admin.
  return {
    kind: "anomaly",
    bookingId: result.bookingId,
    providerRef: result.providerRef,
    status,
  };
}

/** Supabase (service-role) implementation of the store — used by the webhook route. */
export function createBookingPaymentStore(
  db: SupabaseClient,
): BookingPaymentStore {
  return {
    async getDepositAmount(bookingId) {
      const { data, error } = await db
        .from("bookings")
        .select("deposit_amount")
        .eq("id", bookingId)
        .maybeSingle();
      if (error) {
        throw new Error(
          `webhook: failed to read booking ${bookingId}: ${error.message}`,
        );
      }
      if (!data || data.deposit_amount == null) return null;
      return Number(data.deposit_amount);
    },

    async recordPaymentAndConfirm(input) {
      const { data, error } = await db.rpc("record_payment_and_confirm", {
        p_booking_id: input.bookingId,
        p_provider_ref: input.providerRef,
        p_amount: input.amount,
        p_provider: "cardcom",
        p_document_number: input.documentNumber,
        p_document_url: input.documentUrl,
      });
      if (error) {
        throw new Error(
          `webhook: record_payment_and_confirm failed: ${error.message}`,
        );
      }
      const booking = data as unknown as { status: string };
      return { status: booking.status };
    },
  };
}
