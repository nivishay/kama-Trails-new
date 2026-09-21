import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import {
  anon,
  book,
  createDeparture,
  adminSession,
  recordPaymentAndConfirm,
  getBooking,
  getPayments,
} from './helpers';

// Integration coverage for admin_cancel_booking (DECISIONS #13/#15/#25/#53/#58) against a local
// Supabase stack. The RPC is the money-critical primitive behind both admin cancel flows: it
// records the refund ledger row and flips the booking to cancelled in one transaction. The Cardcom
// refund itself happens in the app, so here we pass in the already-refunded amount + ref, exactly
// as the server action does.

/** Book on the anon path, then confirm it (a succeeded deposit payment), returning ids. */
async function bookAndConfirm(departureId: string, participants: number, amount: number) {
  const { data: booking, error } = await book(departureId, participants);
  expect(error).toBeNull();
  const bookingId = (booking as { id: string }).id;
  const { error: payError } = await recordPaymentAndConfirm(
    bookingId,
    `charge-${randomUUID().slice(0, 8)}`,
    amount,
  );
  expect(payError).toBeNull();
  return bookingId;
}

describe('admin_cancel_booking (DECISIONS #13/#15/#25)', () => {
  it('records a refund row and flips the booking to cancelled, atomically', async () => {
    const { departure } = await createDeparture({ price: 180 });
    const bookingId = await bookAndConfirm(departure.id, 2, 360);
    const client = await adminSession();

    const { data, error } = await client.rpc('admin_cancel_booking', {
      p_booking_id: bookingId,
      p_reason: 'customer_request',
      p_refund_amount: 310, // e.g. 360 paid − 50 fee
      p_refund_provider_ref: 'refund-xyz',
    });

    expect(error).toBeNull();
    expect((data as { status: string }).status).toBe('cancelled');

    const booking = await getBooking(bookingId);
    expect(booking.status).toBe('cancelled');
    expect(booking.cancelled_at).not.toBeNull();
    expect(booking.cancellation_reason).toBe('customer_request');

    const refunds = (await getPayments(bookingId)).filter((p) => p.kind === 'refund');
    expect(refunds).toHaveLength(1);
    expect(Number(refunds[0].amount)).toBe(310);
    expect(refunds[0].status).toBe('succeeded');
    expect(refunds[0].provider_ref).toBe('refund-xyz');
  });

  it('does not write a refund row when the refund amount is zero (full-forfeit / unpaid)', async () => {
    const { departure } = await createDeparture({ price: 180 });
    const bookingId = await bookAndConfirm(departure.id, 1, 180);
    const client = await adminSession();

    const { error } = await client.rpc('admin_cancel_booking', {
      p_booking_id: bookingId,
      p_reason: 'customer_request',
      p_refund_amount: 0,
    });
    expect(error).toBeNull();

    const refunds = (await getPayments(bookingId)).filter((p) => p.kind === 'refund');
    expect(refunds).toHaveLength(0);
    expect((await getBooking(bookingId)).status).toBe('cancelled');
  });

  it('is idempotent — a second cancel is a no-op and adds no duplicate refund', async () => {
    const { departure } = await createDeparture({ price: 180 });
    const bookingId = await bookAndConfirm(departure.id, 1, 180);
    const client = await adminSession();

    const args = {
      p_booking_id: bookingId,
      p_reason: 'departure_cancelled',
      p_refund_amount: 180,
      p_refund_provider_ref: 'refund-once',
    };
    await client.rpc('admin_cancel_booking', args);
    const { error } = await client.rpc('admin_cancel_booking', args);

    expect(error).toBeNull();
    const refunds = (await getPayments(bookingId)).filter((p) => p.kind === 'refund');
    expect(refunds).toHaveLength(1); // not doubled
  });

  it('rejects a non-admin caller (admin only, #15)', async () => {
    const { departure } = await createDeparture({ price: 180 });
    const bookingId = await bookAndConfirm(departure.id, 1, 180);

    // anon is not is_admin(): the RPC must refuse rather than cancel/refund.
    const { error } = await anon.rpc('admin_cancel_booking', {
      p_booking_id: bookingId,
      p_reason: 'admin',
      p_refund_amount: 0,
    });
    expect(error).not.toBeNull();
    expect((await getBooking(bookingId)).status).toBe('confirmed'); // untouched
  });

  it('rejects an invalid cancellation reason', async () => {
    const { departure } = await createDeparture({ price: 180 });
    const bookingId = await bookAndConfirm(departure.id, 1, 180);
    const client = await adminSession();

    const { error } = await client.rpc('admin_cancel_booking', {
      p_booking_id: bookingId,
      p_reason: 'because',
      p_refund_amount: 0,
    });
    expect(error).not.toBeNull();
  });
});
