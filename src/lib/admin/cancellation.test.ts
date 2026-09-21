import { describe, expect, it } from "vitest";
import {
  computeCancellationCharge,
  customerFeePerParticipant,
  daysUntilDeparture,
} from "./cancellation";

// Fixed "now": 2026-09-01 local. Departure dates below are offsets from this day.
const NOW = new Date(2026, 8, 1, 10, 0, 0);

describe("daysUntilDeparture", () => {
  it("counts a departure later today as 0 days out", () => {
    expect(daysUntilDeparture("2026-09-01", NOW)).toBe(0);
  });

  it("counts whole calendar days regardless of time of day", () => {
    expect(daysUntilDeparture("2026-09-08", NOW)).toBe(7);
  });

  it("is negative for a past departure", () => {
    expect(daysUntilDeparture("2026-08-30", NOW)).toBe(-2);
  });
});

describe("customerFeePerParticipant (#13 tiers)", () => {
  it("is 0 (full refund) at 7+ days before", () => {
    expect(customerFeePerParticipant(7)).toBe(0);
    expect(customerFeePerParticipant(30)).toBe(0);
  });

  it("is 50 at 5–6 days before", () => {
    expect(customerFeePerParticipant(5)).toBe(50);
    expect(customerFeePerParticipant(6)).toBe(50);
  });

  it("is 150 at 3–4 days before", () => {
    expect(customerFeePerParticipant(3)).toBe(150);
    expect(customerFeePerParticipant(4)).toBe(150);
  });

  it("is infinite (full forfeit) within 48 hours", () => {
    expect(customerFeePerParticipant(2)).toBe(Number.POSITIVE_INFINITY);
    expect(customerFeePerParticipant(0)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("computeCancellationCharge — customer_request", () => {
  it("refunds in full 7+ days out", () => {
    const charge = computeCancellationCharge({
      departureDate: "2026-09-10", // 9 days
      participants: 3,
      amountPaid: 540,
      reason: "customer_request",
      now: NOW,
    });
    expect(charge.totalFee).toBe(0);
    expect(charge.refundAmount).toBe(540);
    expect(charge.fullForfeit).toBe(false);
  });

  it("charges 50 ₪ per participant at 5–6 days out", () => {
    const charge = computeCancellationCharge({
      departureDate: "2026-09-06", // 5 days
      participants: 3,
      amountPaid: 540,
      reason: "customer_request",
      now: NOW,
    });
    expect(charge.totalFee).toBe(150); // 3 × 50
    expect(charge.refundAmount).toBe(390);
  });

  it("charges 150 ₪ per participant at 3–4 days out", () => {
    const charge = computeCancellationCharge({
      departureDate: "2026-09-04", // 3 days
      participants: 2,
      amountPaid: 360,
      reason: "customer_request",
      now: NOW,
    });
    expect(charge.totalFee).toBe(300); // 2 × 150
    expect(charge.refundAmount).toBe(60);
  });

  it("forfeits the whole amount within 48 hours", () => {
    const charge = computeCancellationCharge({
      departureDate: "2026-09-02", // 1 day
      participants: 2,
      amountPaid: 360,
      reason: "customer_request",
      now: NOW,
    });
    expect(charge.totalFee).toBe(360);
    expect(charge.refundAmount).toBe(0);
    expect(charge.fullForfeit).toBe(true);
  });

  it("never lets the fee exceed what was paid", () => {
    // 4 participants × 150 = 600 fee, but only 360 was paid.
    const charge = computeCancellationCharge({
      departureDate: "2026-09-04", // 3 days
      participants: 4,
      amountPaid: 360,
      reason: "customer_request",
      now: NOW,
    });
    expect(charge.totalFee).toBe(360);
    expect(charge.refundAmount).toBe(0);
    expect(charge.fullForfeit).toBe(true);
  });
});

describe("computeCancellationCharge — departure_cancelled (#58)", () => {
  it("refunds in full even within 48 hours (company cancel)", () => {
    const charge = computeCancellationCharge({
      departureDate: "2026-09-02", // 1 day
      participants: 2,
      amountPaid: 360,
      reason: "departure_cancelled",
      now: NOW,
    });
    expect(charge.totalFee).toBe(0);
    expect(charge.refundAmount).toBe(360);
    expect(charge.fullForfeit).toBe(false);
  });
});

describe("computeCancellationCharge — guards", () => {
  it("rejects a zero-participant booking", () => {
    expect(() =>
      computeCancellationCharge({
        departureDate: "2026-09-10",
        participants: 0,
        amountPaid: 0,
        reason: "customer_request",
        now: NOW,
      }),
    ).toThrow(/participants/);
  });

  it("treats an unpaid booking as nothing to refund", () => {
    const charge = computeCancellationCharge({
      departureDate: "2026-09-02",
      participants: 1,
      amountPaid: 0,
      reason: "customer_request",
      now: NOW,
    });
    expect(charge.totalFee).toBe(0);
    expect(charge.refundAmount).toBe(0);
    expect(charge.fullForfeit).toBe(false);
  });
});
