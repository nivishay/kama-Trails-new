import { describe, it, expect } from "vitest";
import {
  anon,
  admin,
  createDeparture,
  book,
  getBooking,
  expireHold,
  attachPaymentSession,
  recordPaymentAndConfirm,
  freeSpots,
} from "./helpers";

// Regression tests for the stale-hold bug (#61): a hold whose window lapsed used to stay
// status='held' forever, so the seat silently freed for capacity math while every guard that
// trusts the literal status kept treating the dead hold as payable → oversell risk.
// Fix: expire_stale_holds() flips lapsed holds -> expired, and the pre-payment guards refuse a
// hold that is no longer live even before the sweep runs.

const ok = (r: { data: unknown; error: unknown }) => !r.error && r.data != null;

const expireStaleHolds = () =>
  admin.rpc("expire_stale_holds"); // service_role has the EXECUTE grant; anon does not.

describe("expire_stale_holds — the sweep that stops `held` from lying (#61)", () => {
  it("flips a booking whose hold has lapsed from held to expired", async () => {
    const { departure } = await createDeparture({ maxCapacity: 2 });
    const held = await book(departure.id, 1);
    await expireHold(held.data.id);

    const swept = await expireStaleHolds();
    expect(swept.error).toBeFalsy();
    expect(swept.data as number).toBeGreaterThanOrEqual(1);
    expect((await getBooking(held.data.id)).status).toBe("expired");
  });

  it("leaves a live hold and a confirmed booking untouched", async () => {
    const { departure } = await createDeparture({ maxCapacity: 5 });
    const live = await book(departure.id, 1); // still within its hold window
    const confirmed = await book(departure.id, 1);
    await recordPaymentAndConfirm(
      confirmed.data.id,
      `tx-live-${confirmed.data.id}`,
      Number(confirmed.data.deposit_amount),
    );
    const lapsed = await book(departure.id, 1);
    await expireHold(lapsed.data.id);

    await expireStaleHolds();

    expect((await getBooking(live.data.id)).status).toBe("held");
    expect((await getBooking(confirmed.data.id)).status).toBe("confirmed");
    expect((await getBooking(lapsed.data.id)).status).toBe("expired");
  });

  it("is privileged: the anon (public) path cannot run the sweep", async () => {
    const r = await anon.rpc("expire_stale_holds");
    expect(r.error).toBeTruthy(); // no EXECUTE grant for anon
  });

  it("releases the seat so the departure can be booked again (back to valid)", async () => {
    const { departure } = await createDeparture({ maxCapacity: 1 });
    const first = await book(departure.id, 1);
    await expireHold(first.data.id);
    await expireStaleHolds();

    expect(await freeSpots(departure.id)).toMatchObject({ data: 1 });
    const second = await book(departure.id, 1); // the freed seat is bookable, no oversell
    expect(ok(second)).toBe(true);
    expect(second.data.status).toBe("held");
  });
});

describe("a lapsed hold is no longer payable, even before the sweep runs (#61)", () => {
  it("attach_payment_session rejects a hold that has expired", async () => {
    const { departure } = await createDeparture({ maxCapacity: 1 });
    const held = await book(departure.id, 1);
    await expireHold(held.data.id); // lapsed, but the row still literally reads 'held'

    const r = await attachPaymentSession(held.data.id, held.data.access_token, "lp-late");
    expect(r.error).toBeTruthy();
    expect((await getBooking(held.data.id)).payment_session_id).toBeNull();
  });

  it("sign_booking_consents rejects a hold that has expired", async () => {
    const { departure } = await createDeparture({ maxCapacity: 1 });
    const held = await book(departure.id, 1);
    await expireHold(held.data.id);

    const r = await anon.rpc("sign_booking_consents", {
      p_booking_id: held.data.id,
      p_access_token: held.data.access_token,
      p_accept_policy: true,
      p_sign_waiver: true,
      p_marketing_opt_in: false,
    });
    expect(r.error).toBeTruthy();
  });
});
