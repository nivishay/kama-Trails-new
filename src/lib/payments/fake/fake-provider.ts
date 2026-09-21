import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentProvider,
  PaymentResult,
  RefundRequest,
  RefundResult,
} from "../types";

// An in-app, stateless fake of the PaymentProvider contract for CI/dev flow tests (ADR 0003).
// It makes NO network calls and NEVER charges: createCheckout redirects the browser back into
// our own app, and getResult reports a successful charge for the encoded booking. It must never
// be selected in production — gated in getPaymentProvider()/isFakePaymentProviderEnabled().
//
// A provider is created per request, and createCheckout (the checkout action) and getResult (the
// confirm path) run in *different* requests, so the fake keeps no memory between them: the booking
// id and amount are encoded into the session id and decoded on the way back — exactly how Cardcom
// echoes our ReturnValue via GetLpResult (#38).

const SESSION_PREFIX = "fake";
const SESSION_SEPARATOR = ".";
// The browser is sent here instead of a hosted payment page: a dev/test-only route that runs the
// real confirm path (as Cardcom's webhook would) and then forwards to our success page.
const FAKE_COMPLETE_PATH = "/api/payments/fake-complete";

interface DecodedSession {
  bookingId: string;
  amount: number;
}

/** Encode booking id + amount into an opaque session id (booking ids are UUIDs — no dots). */
function encodeSession(bookingId: string, amount: number): string {
  return [SESSION_PREFIX, bookingId, amount].join(SESSION_SEPARATOR);
}

function decodeSession(sessionId: string): DecodedSession | null {
  const [prefix, bookingId, amountRaw] = sessionId.split(SESSION_SEPARATOR);
  if (prefix !== SESSION_PREFIX || !bookingId) return null;
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount)) return null;
  return { bookingId, amount };
}

export class FakePaymentProvider implements PaymentProvider {
  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const sessionId = encodeSession(request.bookingId, request.amount);
    // Same-origin redirect: derive the origin from the (fully-qualified) success URL.
    const redirect = new URL(
      FAKE_COMPLETE_PATH,
      new URL(request.successUrl).origin,
    );
    redirect.searchParams.set("session", sessionId);
    redirect.searchParams.set("redirect", request.successUrl);
    return { redirectUrl: redirect.toString(), sessionId };
  }

  async getResult(sessionId: string): Promise<PaymentResult> {
    const decoded = decodeSession(sessionId);
    if (!decoded) {
      return {
        success: false,
        sessionId,
        bookingId: null,
        providerRef: null,
        amount: null,
        document: null,
      };
    }
    return {
      success: true,
      sessionId,
      bookingId: decoded.bookingId,
      // Deterministic per booking so a repeated confirm is a no-op (UNIQUE(provider, provider_ref)).
      providerRef: `${SESSION_PREFIX}-${decoded.bookingId}`,
      // Must equal the booking's deposit_amount or the confirm path rejects on amount-mismatch (#37).
      amount: decoded.amount,
      document: null,
    };
  }

  // Never moves money: reports success so the admin cancel/refund flow (and its tests/CI) run
  // end-to-end without a real Cardcom call. Deterministic ref so a re-run stays idempotent.
  async refund(request: RefundRequest): Promise<RefundResult> {
    return {
      success: true,
      providerRef: `${SESSION_PREFIX}-refund-${request.providerRef}`,
    };
  }
}
