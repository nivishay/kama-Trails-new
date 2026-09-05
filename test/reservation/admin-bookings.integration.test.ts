import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  anon,
  book,
  createDeparture,
  createPrivateDeparture,
  closeRegistrationDeadline,
  adminSession,
  recordPaymentAndConfirm,
  getBooking,
} from './helpers';

// Integration coverage for the admin manage-actions (#24) and admin-created bookings (#32),
// against a local Supabase stack. The public path runs over anon; the admin RPCs run over a
// genuinely signed-in admin session so is_admin() is true (not service_role bypass).

const contact = () => ({
  name: 'לקוח פרטי',
  phone: `053${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`,
  email: `priv-${randomUUID().slice(0, 8)}@example.com`,
});

describe('registration deadline / auto-close (#24, DECISIONS #53)', () => {
  it('book_trip refuses a departure past its registration deadline', async () => {
    const { departure } = await createDeparture();
    await closeRegistrationDeadline(departure.id); // deadline in the past

    const { error } = await book(departure.id, 1);
    expect(error).not.toBeNull();
    expect(/closed/.test(error!.message)).toBe(true);
  });

  it('list_availability reports a past-deadline open departure as closed to the public', async () => {
    const { trail, departure } = await createDeparture();
    await closeRegistrationDeadline(departure.id);

    const { data, error } = await anon.rpc('list_availability', { p_trail_id: trail.id });
    expect(error).toBeNull();
    const row = (data as { id: string; status: string }[]).find((d) => d.id === departure.id);
    expect(row?.status).toBe('closed');
  });

  it('a closed departure stops public sales', async () => {
    const { departure } = await createDeparture({ status: 'closed' });
    const { error } = await book(departure.id, 1);
    expect(error).not.toBeNull();
    expect(/not open/.test(error!.message)).toBe(true);
  });

  it('excludes private departures from the public catalog', async () => {
    const { trail, departure } = await createPrivateDeparture();
    const { data } = await anon.rpc('list_availability', { p_trail_id: trail.id });
    const ids = (data as { id: string }[]).map((d) => d.id);
    expect(ids).not.toContain(departure.id);
  });
});

describe('admin_create_booking primitive (#32)', () => {
  it('refuses a non-admin caller', async () => {
    const { departure } = await createDeparture();
    const { error } = await anon.rpc('admin_create_booking', {
      p_departure_id: departure.id,
      p_registrant_name: 'x',
      p_phone: '0500000000',
      p_email: 'x@example.com',
      p_participants_count: 1,
    });
    expect(error).not.toBeNull();
  });

  it('private trip: admin books an unlisted departure, then the pay-link confirms it', async () => {
    const client = await adminSession();
    const { departure } = await createPrivateDeparture(250);
    const person = contact();

    const { data: booking, error } = await client.rpc('admin_create_booking', {
      p_departure_id: departure.id,
      p_registrant_name: person.name,
      p_phone: person.phone,
      p_email: person.email,
      p_participants_count: 3,
    });
    expect(error).toBeNull();
    expect(booking!.status).toBe('held');
    expect(Number(booking!.total_amount)).toBe(750); // 3 × 250, pricing identical to standard
    expect(Number(booking!.deposit_amount)).toBe(750); // pay in full immediately (#58)
    expect(booking!.customer_id).toBeTruthy();

    // Pay-link: the customer signs the mandatory consents over the token path, then pays.
    const { error: consentError } = await anon.rpc('sign_booking_consents', {
      p_booking_id: booking!.id,
      p_access_token: booking!.access_token,
      p_accept_policy: true,
      p_sign_waiver: true,
      p_marketing_opt_in: false,
    });
    expect(consentError).toBeNull();

    await recordPaymentAndConfirm(booking!.id, `ref-${randomUUID().slice(0, 8)}`, 750);
    const confirmed = await getBooking(booking!.id);
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.policy_accepted_at).not.toBeNull();
    expect(confirmed.waiver_signed_at).not.toBeNull();
  });

  it('late add: admin adds a participant after public registration closed', async () => {
    const client = await adminSession();
    const { departure } = await createDeparture({ maxCapacity: 5 });
    await closeRegistrationDeadline(departure.id); // public sales closed

    // Public path is blocked by the deadline…
    const publicAttempt = await book(departure.id, 1);
    expect(publicAttempt.error).not.toBeNull();

    // …but the admin is unbounded by it and can still add the late participant.
    const person = contact();
    const { data: booking, error } = await client.rpc('admin_create_booking', {
      p_departure_id: departure.id,
      p_registrant_name: person.name,
      p_phone: person.phone,
      p_email: person.email,
      p_participants_count: 1,
    });
    expect(error).toBeNull();
    expect(booking!.status).toBe('held');
  });

  it('is still capacity-guarded (never oversells)', async () => {
    const client = await adminSession();
    const { departure } = await createDeparture({ maxCapacity: 2 });
    const person = contact();

    const { error } = await client.rpc('admin_create_booking', {
      p_departure_id: departure.id,
      p_registrant_name: person.name,
      p_phone: person.phone,
      p_email: person.email,
      p_participants_count: 3, // over capacity
    });
    expect(error).not.toBeNull();
    expect(/seats remaining/.test(error!.message)).toBe(true);
  });
});
