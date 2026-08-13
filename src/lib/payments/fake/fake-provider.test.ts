import { describe, it, expect } from "vitest";
import { FakePaymentProvider } from "./fake-provider";
import type { CheckoutRequest } from "../types";

// The fake is test infrastructure, but its round-trip carries a real invariant: getResult must
// echo back the exact booking id and amount from createCheckout, or the confirm path rejects the
// payment (amount-mismatch / booking-not-found). These tests pin that contract.

const BOOKING_ID = "11111111-1111-1111-1111-111111111111";

function checkoutRequest(
  overrides: Partial<CheckoutRequest> = {},
): CheckoutRequest {
  return {
    bookingId: BOOKING_ID,
    amount: 540,
    customerName: "בודק",
    customerEmail: "e2e@example.com",
    description: "השתתפות בטיול",
    successUrl: "http://localhost:3000/checkout/success?token=tok-123",
    failedUrl: "http://localhost:3000/checkout/failed?token=tok-123",
    webhookUrl: "http://localhost:3000/api/cardcom/webhook",
    ...overrides,
  };
}

describe("FakePaymentProvider", () => {
  it("redirects the browser back to our own fake-complete route, same-origin", async () => {
    const session = await new FakePaymentProvider().createCheckout(
      checkoutRequest(),
    );
    const url = new URL(session.redirectUrl);

    expect(url.origin).toBe("http://localhost:3000");
    expect(url.pathname).toBe("/api/payments/fake-complete");
    expect(url.searchParams.get("session")).toBe(session.sessionId);
    expect(url.searchParams.get("redirect")).toBe(
      "http://localhost:3000/checkout/success?token=tok-123",
    );
  });

  it("getResult echoes the booking id and amount that createCheckout encoded", async () => {
    const provider = new FakePaymentProvider();
    const session = await provider.createCheckout(
      checkoutRequest({ amount: 540 }),
    );

    const result = await provider.getResult(session.sessionId);

    expect(result.success).toBe(true);
    expect(result.bookingId).toBe(BOOKING_ID);
    expect(result.amount).toBe(540);
    expect(result.providerRef).toBeTruthy();
  });

  it("returns a deterministic providerRef so a repeated confirm is idempotent", async () => {
    const provider = new FakePaymentProvider();
    const { sessionId } = await provider.createCheckout(checkoutRequest());

    const first = await provider.getResult(sessionId);
    const second = await provider.getResult(sessionId);

    expect(first.providerRef).toBe(second.providerRef);
  });

  it("reports failure for a session id it did not issue", async () => {
    const result = await new FakePaymentProvider().getResult(
      "not-a-fake-session",
    );
    expect(result.success).toBe(false);
    expect(result.bookingId).toBeNull();
  });
});
