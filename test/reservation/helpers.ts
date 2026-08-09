import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { SUPABASE_URL, ANON_KEY, SERVICE_ROLE_KEY } from './env';

// anon: the public customer path — exactly what the website uses.
export const anon: SupabaseClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false },
});
// admin: service_role, bypasses RLS — used only to arrange/inspect, never under test.
export const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export interface Trail {
  id: string;
  name: string;
  price: number;
}

export interface Departure {
  id: string;
  date: string;
  max_capacity: number;
}

/** Create an isolated trail; unique slug so parallel tests never collide. */
export async function createTrail(price = 100): Promise<Trail> {
  const suffix = randomUUID().slice(0, 8);
  const { data, error } = await admin
    .from('trails')
    .insert({
      slug: `test-${suffix}`,
      name: `מסלול בדיקה ${suffix}`,
      short_name: `בדיקה ${suffix}`,
      region: 'north',
      price,
    })
    .select()
    .single();
  if (error) throw new Error(`createTrail failed: ${error.message}`);
  return data as Trail;
}

/** Create an isolated departure under a fresh trail. */
export async function createDeparture({
  maxCapacity = 4,
  status = 'open',
  price = 100,
}: { maxCapacity?: number; status?: string; price?: number } = {}): Promise<{
  trail: Trail;
  departure: Departure;
}> {
  const trail = await createTrail(price);
  const { data, error } = await admin
    .from('departures')
    .insert({
      trail_id: trail.id,
      date: '2026-12-01',
      departure_time: randomUUID().slice(0, 8), // keep the unique-slot constraint happy across tests
      price,
      max_capacity: maxCapacity,
      status,
    })
    .select()
    .single();
  if (error) throw new Error(`createDeparture failed: ${error.message}`);
  return { trail, departure: data as Departure };
}

/** A valid book_trip call over the anon (public) path. */
export function book(departureId: string, participants = 1) {
  return anon.rpc('book_trip', {
    p_departure_id: departureId,
    p_registrant_name: 'בודק',
    p_phone: '050-0000000',
    p_email: 'test@example.com',
    p_participants_count: participants,
  });
}

export function freeSpots(departureId: string) {
  return anon.rpc('free_spots', { p_departure_id: departureId });
}

/** Force a held booking past its hold window (simulates the 15-min timeout). */
export async function expireHold(bookingId: string): Promise<void> {
  const { error } = await admin
    .from('bookings')
    .update({ hold_expires_at: new Date(Date.now() - 60_000).toISOString() })
    .eq('id', bookingId);
  if (error) throw new Error(`expireHold failed: ${error.message}`);
}

export async function getBooking(bookingId: string) {
  const { data, error } = await admin.from('bookings').select('*').eq('id', bookingId).single();
  if (error) throw new Error(`getBooking failed: ${error.message}`);
  return data;
}

/** Sum of seats actually occupying capacity (confirmed + unexpired-held), read directly. */
export async function occupiedSeats(departureId: string): Promise<number> {
  const { data, error } = await admin
    .from('bookings')
    .select('participants_count, status, hold_expires_at')
    .eq('departure_id', departureId);
  if (error) throw new Error(`occupiedSeats failed: ${error.message}`);
  const now = Date.now();
  return (data ?? [])
    .filter(
      (b) =>
        b.status === 'confirmed' ||
        (b.status === 'held' && new Date(b.hold_expires_at).getTime() > now),
    )
    .reduce((sum, b) => sum + b.participants_count, 0);
}
