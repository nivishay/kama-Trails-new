import { describe, expect, it, vi } from "vitest";
import { confirmPaymentFromSession, type BookingPaymentStore } from "./webhook";
import type { PaymentProvider, PaymentResult } from "./types";

const SESSION = "lp-1";
const BOOKING_ID = "booking-abc";

function makeProvider(result: Partial<PaymentResult>): PaymentProvider {
  const full: PaymentResult = {
    success: true,
    sessionId: SESSION,
    bookingId: BOOKING_ID,
    providerRef: "987654",
    amount: 250,
    document: { number: 42, url: "https://cardcom/doc/42" },
    ...result,
  };
  return {
    createCheckout: vi.fn(),
    getResult: vi.fn(async () => full),
    refund: vi.fn(),
  };
}

function makeStore(
  over: Partial<BookingPaymentStore> = {},
): BookingPaymentStore {
  return {
    getDepositAmount: vi.fn(async () => 250),
    recordPaymentAndConfirm: vi.fn(async () => ({ status: "confirmed" })),
    ...over,
  };
}

describe("confirmPaymentFromSession", () => {
  it("confirms when the pulled result is successful and the amount matches", async () => {
    const store = makeStore();
    const outcome = await confirmPaymentFromSession({
      provider: makeProvider({}),
      store,
      sessionId: SESSION,
    });

    expect(outcome).toEqual({
      kind: "confirmed",
      bookingId: BOOKING_ID,
      providerRef: "987654",
    });
    expect(store.recordPaymentAndConfirm).toHaveBeenCalledWith({
      bookingId: BOOKING_ID,
      providerRef: "987654",
      amount: 250,
      documentNumber: 42,
      documentUrl: "https://cardcom/doc/42",
    });
  });

  it("ignores an unsuccessful charge without touching the store", async () => {
    const store = makeStore();
    const outcome = await confirmPaymentFromSession({
      provider: makeProvider({ success: false }),
      store,
      sessionId: SESSION,
    });

    expect(outcome).toEqual({ kind: "ignored", reason: "unsuccessful" });
    expect(store.getDepositAmount).not.toHaveBeenCalled();
    expect(store.recordPaymentAndConfirm).not.toHaveBeenCalled();
  });

  it("rejects when the charged amount does not equal the booking's deposit", async () => {
    const store = makeStore({ getDepositAmount: vi.fn(async () => 250) });
    const outcome = await confirmPaymentFromSession({
      provider: makeProvider({ amount: 200 }), // customer charged the wrong amount
      store,
      sessionId: SESSION,
    });

    expect(outcome).toEqual({
      kind: "rejected",
      reason: "amount-mismatch",
      bookingId: BOOKING_ID,
    });
    expect(store.recordPaymentAndConfirm).not.toHaveBeenCalled();
  });

  it("rejects when the correlated booking is unknown", async () => {
    const store = makeStore({ getDepositAmount: vi.fn(async () => null) });
    const outcome = await confirmPaymentFromSession({
      provider: makeProvider({}),
      store,
      sessionId: SESSION,
    });

    expect(outcome).toEqual({
      kind: "rejected",
      reason: "booking-not-found",
      bookingId: BOOKING_ID,
    });
    expect(store.recordPaymentAndConfirm).not.toHaveBeenCalled();
  });

  it("flags an anomaly when the payment is recorded but the booking was not held (#43)", async () => {
    const store = makeStore({
      recordPaymentAndConfirm: vi.fn(async () => ({ status: "expired" })),
    });
    const outcome = await confirmPaymentFromSession({
      provider: makeProvider({}),
      store,
      sessionId: SESSION,
    });

    expect(outcome).toEqual({
      kind: "anomaly",
      bookingId: BOOKING_ID,
      providerRef: "987654",
      status: "expired",
    });
  });

  it("ignores a result missing the correlation or charge id", async () => {
    const outcome = await confirmPaymentFromSession({
      provider: makeProvider({ bookingId: null }),
      store: makeStore(),
      sessionId: SESSION,
    });
    expect(outcome).toEqual({ kind: "ignored", reason: "incomplete-result" });
  });
});
