import { describe, it, expect } from "vitest";
import { payLinkForBooking, payLinkForToken } from "./pay-link";

// A held booking still owes money, so the admin may need to re-send its pay-link; a booking in
// any terminal state (paid/cancelled/expired) has nothing to collect and must expose no link.
describe("payLinkForBooking", () => {
  const token = "11111111-1111-1111-1111-111111111111";

  it("returns the capability pay-link for a held (awaiting-payment) booking", () => {
    const link = payLinkForBooking("held", token);
    expect(link).toBe(payLinkForToken(token));
    expect(link).toContain(`/checkout/pay/${token}`);
  });

  it("returns null for a confirmed booking — nothing left to pay", () => {
    expect(payLinkForBooking("confirmed", token)).toBeNull();
  });

  it("returns null for cancelled and expired bookings", () => {
    expect(payLinkForBooking("cancelled", token)).toBeNull();
    expect(payLinkForBooking("expired", token)).toBeNull();
  });
});
