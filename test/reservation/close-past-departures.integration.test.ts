import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { admin, createTrail } from './helpers';

// Integration coverage for close_past_departures() — the daily sweep that flips a past, still-open
// departure to 'closed' (#24) so the stored status stops lying about trips that already ran.

async function makeDeparture(trailId: string, date: string, status = 'open') {
  const { data, error } = await admin
    .from('departures')
    .insert({
      trail_id: trailId,
      date,
      departure_time: randomUUID().slice(0, 8), // keep the unique-slot constraint happy
      price: 100,
      max_capacity: 10,
      status,
    })
    .select()
    .single();
  if (error) throw new Error(`makeDeparture failed: ${error.message}`);
  return data as { id: string };
}

describe('close_past_departures (DECISIONS #24)', () => {
  it('closes past open departures, and leaves future / cancelled ones untouched', async () => {
    const trail = await createTrail();
    const past = await makeDeparture(trail.id, '2020-01-01', 'open');
    const future = await makeDeparture(trail.id, '2999-01-01', 'open');
    const pastCancelled = await makeDeparture(trail.id, '2020-02-02', 'cancelled');

    const { error } = await admin.rpc('close_past_departures');
    expect(error).toBeNull();

    const { data: rows, error: readError } = await admin
      .from('departures')
      .select('id, status')
      .in('id', [past.id, future.id, pastCancelled.id]);
    expect(readError).toBeNull();

    const statusById = Object.fromEntries(
      (rows as { id: string; status: string }[]).map((r) => [r.id, r.status]),
    );
    expect(statusById[past.id]).toBe('closed'); // past & open → closed
    expect(statusById[future.id]).toBe('open'); // future → untouched
    expect(statusById[pastCancelled.id]).toBe('cancelled'); // never resurrect a cancel
  });
});
