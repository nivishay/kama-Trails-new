import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import {
  anon,
  createDeparture,
  book,
  recordPaymentAndConfirm,
  getPayments,
  getBooking,
  markExpired,
  freeSpots,
  attachPaymentSession,
  getBookingByToken,
} from "./helpers";

// Integration tests for the Cardcom payment path (DECISIONS #38/#39/#43/#44/#45).
// Requires a local Supabase stack with this migration applied (`supabase db reset`).

const ok = (r: { data: unknown; error: unknown }) => !r.error && r.data != null;

const HOLD_MINUTES = 40; // #44 — mirrors the constant in book_trip
const POLICY_VERSION = "2026-08-13"; // #31/#59 — mirrors c_policy_version in book_trip
const WAIVER_VERSION = "2026-08-19"; // #59 — mirrors c_waiver_version in book_trip

describe("book_trip grows: deposit, consents, and the hold window (#44/#45)", () => {
  it("sets deposit_amount to the full total in v1 (DEPOSIT_PERCENT = 100)", async () => {
    const price = 250;
    const { departure } = await createDeparture({ maxCapacity: 5, price });

    const r = await book(departure.id, 2);
    expect(ok(r)).toBe(true);
    expect(Number(r.data.total_amount)).toBe(price * 2);
    expect(Number(r.data.deposit_amount)).toBe(price * 2); // full amount, not a partial deposit
  });

  it("stamps both mandatory consents split into policy_* and waiver_* (#59)", async () => {
    const { departure } = await createDeparture({ maxCapacity: 5 });
    const r = await book(departure.id, 1);

    expect(r.data.policy_accepted_at).toBeTruthy();
    expect(r.data.policy_version).toBe(POLICY_VERSION);
    expect(r.data.waiver_signed_at).toBeTruthy();
    expect(r.data.waiver_version).toBe(WAIVER_VERSION);
  });

  it("holds the seat for HOLD_MINUTES, not the old hardcoded 15 (the #44 regression)", async () => {
    const { departure } = await createDeparture({ maxCapacity: 1 });
    const before = Date.now();
    const r = await book(departure.id, 1);

    const holdMs = new Date(r.data.hold_expires_at).getTime() - before;
    // Comfortably past the old 15-min bug; near HOLD_MINUTES with slack for network/clock.
    expect(holdMs).toBeGreaterThan(30 * 60_000);
    expect(holdMs).toBeLessThanOrEqual((HOLD_MINUTES + 1) * 60_000);
  });

  it("refuses to book when the mandatory consents are not accepted (#31)", async () => {
    const { departure } = await createDeparture({ maxCapacity: 5 });
    const r = await book(departure.id, 1, /* acceptedTerms */ false);

    expect(r.error).toBeTruthy();
    expect(r.error!.message).toMatch(/consent/i);
  });
});

describe("record_payment_and_confirm — atomic record + confirm (#39/#43)", () => {
  it("happy path: a held booking becomes confirmed and a succeeded payment row exists", async () => {
    const { departure } = await createDeparture({ maxCapacity: 1, price: 200 });
    const held = await book(departure.id, 1);
    const ref = `tx-${randomUUID()}`;

    const r = await recordPaymentAndConfirm(
      held.data.id,
      ref,
      Number(held.data.deposit_amount),
    );
    expect(ok(r)).toBe(true);
    expect(r.data.status).toBe("confirmed");

    const payments = await getPayments(held.data.id);
    expect(payments).toHaveLength(1);
    expect(payments![0]).toMatchObject({
      kind: "deposit",
      status: "succeeded",
      provider: "cardcom",
      provider_ref: ref,
    });
    expect(Number(payments![0].amount)).toBe(Number(held.data.deposit_amount));
    expect(payments![0].paid_at).toBeTruthy();
    expect((await freeSpots(departure.id)).data).toBe(0); // confirmed still occupies the seat
  });

  it("is idempotent: a webhook retry with the same provider_ref is a no-op", async () => {
    const { departure } = await createDeparture({ maxCapacity: 1, price: 200 });
    const held = await book(departure.id, 1);
    const ref = `tx-${randomUUID()}`;
    const amount = Number(held.data.deposit_amount);

    const first = await recordPaymentAndConfirm(held.data.id, ref, amount);
    const second = await recordPaymentAndConfirm(held.data.id, ref, amount);

    expect(ok(first)).toBe(true);
    expect(ok(second)).toBe(true);
    expect(second.data.status).toBe("confirmed");
    expect(await getPayments(held.data.id)).toHaveLength(1); // no duplicate ledger row
  });

  it("anomaly: on an expired booking it records the payment but leaves status unchanged (#43)", async () => {
    const { departure } = await createDeparture({ maxCapacity: 1, price: 200 });
    const held = await book(departure.id, 1);
    await markExpired(held.data.id);
    const ref = `tx-${randomUUID()}`;

    const r = await recordPaymentAndConfirm(
      held.data.id,
      ref,
      Number(held.data.deposit_amount),
    );
    expect(ok(r)).toBe(true);
    expect(r.data.status).toBe("expired"); // never force-confirmed

    const payments = await getPayments(held.data.id);
    expect(payments).toHaveLength(1); // charge is still recorded (never silently dropped)
    expect(payments![0].status).toBe("succeeded");
    // The "paid but not confirmed" anomaly is now derivable: a succeeded payment on a
    // non-confirmed booking (surfaced to the admin in the dashboard slice).
    expect((await getBooking(held.data.id)).status).toBe("expired");
  });

  it("is privileged: the anon (public) path cannot call it (#41)", async () => {
    const { departure } = await createDeparture({ maxCapacity: 1, price: 200 });
    const held = await book(departure.id, 1);

    const r = await anon.rpc("record_payment_and_confirm", {
      p_booking_id: held.data.id,
      p_provider_ref: `tx-${randomUUID()}`,
      p_amount: Number(held.data.deposit_amount),
      p_provider: "cardcom",
    });
    expect(r.error).toBeTruthy(); // no EXECUTE grant for anon
    expect((await getBooking(held.data.id)).status).toBe("held"); // unchanged
  });

  it("persists the Cardcom receipt ref on the payment row (#36)", async () => {
    const { departure } = await createDeparture({ maxCapacity: 1, price: 200 });
    const held = await book(departure.id, 1);
    const ref = `tx-${randomUUID()}`;

    await recordPaymentAndConfirm(held.data.id, ref, Number(held.data.deposit_amount), {
      documentNumber: 5150,
      documentUrl: "https://cardcom/doc/5150",
    });

    const payments = await getPayments(held.data.id);
    expect(Number(payments![0].document_number)).toBe(5150);
    expect(payments![0].document_url).toBe("https://cardcom/doc/5150");
  });
});

describe("attach_payment_session — store the Cardcom session id (#38)", () => {
  it("stores the session id on a held booking with the right token", async () => {
    const { departure } = await createDeparture({ maxCapacity: 1 });
    const held = await book(departure.id, 1);

    const r = await attachPaymentSession(held.data.id, held.data.access_token, "lp-xyz");
    expect(r.error).toBeFalsy();
    expect((await getBooking(held.data.id)).payment_session_id).toBe("lp-xyz");
  });

  it("rejects a wrong access token (cannot hijack another booking)", async () => {
    const { departure } = await createDeparture({ maxCapacity: 1 });
    const held = await book(departure.id, 1);

    const r = await attachPaymentSession(
      held.data.id,
      "00000000-0000-0000-0000-000000000000",
      "lp-xyz",
    );
    expect(r.error).toBeTruthy();
    expect((await getBooking(held.data.id)).payment_session_id).toBeNull();
  });
});

describe("get_booking_by_token — the return-page read (#45)", () => {
  it("returns the booking's status and display fields for a valid token", async () => {
    const { departure } = await createDeparture({ maxCapacity: 4, price: 150 });
    const held = await book(departure.id, 2);

    const r = await getBookingByToken(held.data.access_token);
    expect(r.error).toBeFalsy();
    expect(r.data).toHaveLength(1);
    expect(r.data[0]).toMatchObject({
      id: held.data.id,
      departure_id: departure.id,
      status: "held",
      participants_count: 2,
    });
  });

  it("flips to confirmed after the payment is recorded (what the poller sees)", async () => {
    const { departure } = await createDeparture({ maxCapacity: 1, price: 150 });
    const held = await book(departure.id, 1);
    await recordPaymentAndConfirm(
      held.data.id,
      `tx-${randomUUID()}`,
      Number(held.data.deposit_amount),
    );

    const r = await getBookingByToken(held.data.access_token);
    expect(r.data[0].status).toBe("confirmed");
  });

  it("returns nothing for an unknown token", async () => {
    const r = await getBookingByToken("00000000-0000-0000-0000-000000000000");
    expect(r.error).toBeFalsy();
    expect(r.data).toHaveLength(0);
  });
});
