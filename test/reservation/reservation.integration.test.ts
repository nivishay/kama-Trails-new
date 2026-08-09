import { describe, it, expect } from 'vitest';
import {
  anon,
  createDeparture,
  book,
  freeSpots,
  expireHold,
  getBooking,
  occupiedSeats,
} from './helpers';

// Integration tests for the reservation engine RPCs against a local Supabase stack.
// Requires `supabase start` first (see test/reservation/README.md).

const ok = (r: { data: unknown; error: unknown }) => !r.error && r.data != null;

describe('capacity guard — never oversell (the crown jewel)', () => {
  it('a single contended seat is won by exactly one of many concurrent bookers', async () => {
    const { departure } = await createDeparture({ maxCapacity: 1 });

    const attempts = await Promise.all(Array.from({ length: 8 }, () => book(departure.id, 1)));
    const wins = attempts.filter(ok);
    const losses = attempts.filter((r) => r.error);

    expect(wins).toHaveLength(1);
    expect(losses).toHaveLength(7);
    expect(losses.every((r) => /seats remaining/.test(r.error!.message))).toBe(true);
    expect(await occupiedSeats(departure.id)).toBe(1);
    expect((await freeSpots(departure.id)).data).toBe(0);
  });

  it('N concurrent single-seat bookings on capacity N fill exactly, no more', async () => {
    const capacity = 4;
    const { departure } = await createDeparture({ maxCapacity: capacity });

    const attempts = await Promise.all(Array.from({ length: 10 }, () => book(departure.id, 1)));

    expect(attempts.filter(ok)).toHaveLength(capacity);
    expect(attempts.filter((r) => r.error)).toHaveLength(10 - capacity);
    expect(await occupiedSeats(departure.id)).toBe(capacity);
  });

  it('concurrent multi-seat bookings cannot straddle the capacity boundary', async () => {
    const capacity = 5;
    const { departure } = await createDeparture({ maxCapacity: capacity });

    // Three parties of 3 competing for 5 seats: at most one fits; total must stay <= 5.
    const attempts = await Promise.all([
      book(departure.id, 3),
      book(departure.id, 3),
      book(departure.id, 3),
    ]);

    expect(attempts.filter(ok).length).toBeLessThanOrEqual(1);
    expect(await occupiedSeats(departure.id)).toBeLessThanOrEqual(capacity);
  });

  it('rejects a booking larger than remaining capacity', async () => {
    const { departure } = await createDeparture({ maxCapacity: 2 });
    const r = await book(departure.id, 3);
    expect(r.error).toBeTruthy();
    expect(r.error!.message).toMatch(/seats remaining/);
  });
});

describe('seat holds', () => {
  it('an unexpired hold occupies capacity; an expired hold releases it', async () => {
    const { departure } = await createDeparture({ maxCapacity: 1 });

    const held = await book(departure.id, 1);
    expect(ok(held)).toBe(true);
    expect((await freeSpots(departure.id)).data).toBe(0); // hold blocks the seat

    await expireHold(held.data.id);
    expect((await freeSpots(departure.id)).data).toBe(1); // seat auto-released

    const second = await book(departure.id, 1);
    expect(ok(second)).toBe(true); // freed seat is rebookable
  });
});

describe('confirm flow', () => {
  it('confirms a held booking with the correct access token and keeps the seat', async () => {
    const { departure } = await createDeparture({ maxCapacity: 1 });
    const held = await book(departure.id, 1);

    const confirmed = await anon.rpc('confirm_registration', {
      p_id: held.data.id,
      p_access_token: held.data.access_token,
    });
    expect(ok(confirmed)).toBe(true);
    expect(confirmed.data.status).toBe('confirmed');
    expect((await freeSpots(departure.id)).data).toBe(0); // confirmed still occupies
  });

  it('rejects confirmation with a wrong access token', async () => {
    const { departure } = await createDeparture({ maxCapacity: 1 });
    const held = await book(departure.id, 1);

    const r = await anon.rpc('confirm_registration', {
      p_id: held.data.id,
      p_access_token: '00000000-0000-0000-0000-000000000000',
    });
    expect(r.error).toBeTruthy();
    expect((await getBooking(held.data.id)).status).toBe('held'); // unchanged
  });
});

describe('cancel flow', () => {
  it('cancels with the correct token, stamps the reason, and releases the seat', async () => {
    const { departure } = await createDeparture({ maxCapacity: 1 });
    const held = await book(departure.id, 1);
    expect((await freeSpots(departure.id)).data).toBe(0);

    const cancelled = await anon.rpc('cancel_registration', {
      p_id: held.data.id,
      p_access_token: held.data.access_token,
    });
    expect(ok(cancelled)).toBe(true);
    expect(cancelled.data.status).toBe('cancelled');
    expect(cancelled.data.cancellation_reason).toBe('customer_request');
    expect(cancelled.data.cancelled_at).toBeTruthy();
    expect((await freeSpots(departure.id)).data).toBe(1); // seat released
  });

  it('rejects cancellation with a wrong access token', async () => {
    const { departure } = await createDeparture({ maxCapacity: 1 });
    const held = await book(departure.id, 1);
    const r = await anon.rpc('cancel_registration', {
      p_id: held.data.id,
      p_access_token: '00000000-0000-0000-0000-000000000000',
    });
    expect(r.error).toBeTruthy();
    expect((await getBooking(held.data.id)).status).toBe('held');
  });
});

describe('departure status gate', () => {
  it('refuses to book a closed departure', async () => {
    const { departure } = await createDeparture({ maxCapacity: 5, status: 'closed' });
    const r = await book(departure.id, 1);
    expect(r.error).toBeTruthy();
    expect(r.error!.message).toMatch(/not open/);
  });
});

describe('RLS guard — the public path cannot bypass the RPC', () => {
  it('anon cannot INSERT directly into bookings', async () => {
    const { departure } = await createDeparture({ maxCapacity: 5 });
    const r = await anon.from('bookings').insert({
      departure_id: departure.id,
      trail_name: 'hack',
      registrant_name: 'hack',
      phone: 'x',
      email: 'x@x.com',
      participants_count: 99, // would blow past capacity if it landed
      total_amount: 0,
    });
    expect(r.error).toBeTruthy(); // RLS with_check denies
  });

  it('anon cannot READ booking PII directly', async () => {
    const { departure } = await createDeparture({ maxCapacity: 5 });
    await book(departure.id, 1); // a real row now exists
    const { data, error } = await anon
      .from('bookings')
      .select('*')
      .eq('departure_id', departure.id);
    expect(error).toBeFalsy();
    expect(data).toHaveLength(0); // RLS hides every row from anon
  });
});

describe('snapshot fields are captured at booking time', () => {
  it('freezes trail_name, trip_date, price_per_person and total_amount', async () => {
    const price = 250;
    const { trail, departure } = await createDeparture({ maxCapacity: 5, price });
    const r = await book(departure.id, 3);

    expect(r.data.trail_name).toBe(trail.name);
    expect(r.data.trip_date).toBe(departure.date);
    expect(Number(r.data.price_per_person)).toBe(price);
    expect(Number(r.data.total_amount)).toBe(price * 3);
  });
});
