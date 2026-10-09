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

// Integration coverage for the race-safe admin cancel primitives (QA sweep 2026-10-09):
// admin_begin_cancellation (atomic claim) + admin_record_refund (idempotent ledger write). The
// point of the split is that only the caller that actually transitions the booking may refund at
// Cardcom — so two simultaneous cancels can't both issue a real refund (the previous bug).

interface BeginRow {
  did_cancel: boolean;
  amount_paid: number;
  charge_provider_ref: string | null;
  departure_date: string | null;
  participants_count: number;
  status_before: string;
}

async function bookAndConfirm(departureId: string, participants: number, amount: number) {
  const { data: booking, error } = await book(departureId, participants);
  expect(error).toBeNull();
  const bookingId = (booking as { id: string }).id;
  const chargeRef = `charge-${randomUUID().slice(0, 8)}`;
  const { error: payError } = await recordPaymentAndConfirm(bookingId, chargeRef, amount);
  expect(payError).toBeNull();
  return { bookingId, chargeRef };
}

describe('admin_begin_cancellation + admin_record_refund (race-safe cancel)', () => {
  it('transitions the booking and returns the paid snapshot under the lock', async () => {
    const { departure } = await createDeparture({ price: 180 });
    const { bookingId, chargeRef } = await bookAndConfirm(departure.id, 2, 360);
    const client = await adminSession();

    const { data, error } = await client.rpc('admin_begin_cancellation', {
      p_booking_id: bookingId,
      p_reason: 'customer_request',
    });
    expect(error).toBeNull();
    const claim = (data as BeginRow[])[0];

    expect(claim.did_cancel).toBe(true);
    expect(claim.status_before).toBe('confirmed');
    expect(Number(claim.amount_paid)).toBe(360);
    expect(claim.charge_provider_ref).toBe(chargeRef);
    expect(claim.participants_count).toBe(2);
    expect((await getBooking(bookingId)).status).toBe('cancelled');
  });

  it('a second claim is a no-op (did_cancel=false) so a repeated cancel cannot refund again', async () => {
    const { departure } = await createDeparture({ price: 180 });
    const { bookingId } = await bookAndConfirm(departure.id, 1, 180);
    const client = await adminSession();

    const first = (
      (await client.rpc('admin_begin_cancellation', {
        p_booking_id: bookingId,
        p_reason: 'customer_request',
      })).data as BeginRow[]
    )[0];
    const second = (
      (await client.rpc('admin_begin_cancellation', {
        p_booking_id: bookingId,
        p_reason: 'customer_request',
      })).data as BeginRow[]
    )[0];

    expect(first.did_cancel).toBe(true);
    expect(second.did_cancel).toBe(false);
  });

  it('serializes concurrent claims — exactly one wins (the double-refund guard)', async () => {
    const { departure } = await createDeparture({ price: 180 });
    const { bookingId } = await bookAndConfirm(departure.id, 1, 180);
    const client = await adminSession();

    // Two near-simultaneous cancels (two admins / two tabs). The booking row lock must let only one
    // transition it, so only one caller would go on to refund at Cardcom.
    const [a, b] = await Promise.all([
      client.rpc('admin_begin_cancellation', { p_booking_id: bookingId, p_reason: 'admin' }),
      client.rpc('admin_begin_cancellation', { p_booking_id: bookingId, p_reason: 'admin' }),
    ]);
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();

    const winners = [(a.data as BeginRow[])[0], (b.data as BeginRow[])[0]].filter(
      (row) => row.did_cancel,
    );
    expect(winners).toHaveLength(1);
  });

  it('admin_record_refund writes one refund row and is idempotent on the same txn', async () => {
    const { departure } = await createDeparture({ price: 180 });
    const { bookingId } = await bookAndConfirm(departure.id, 2, 360);
    const client = await adminSession();
    await client.rpc('admin_begin_cancellation', {
      p_booking_id: bookingId,
      p_reason: 'customer_request',
    });

    const args = {
      p_booking_id: bookingId,
      p_refund_amount: 310,
      p_refund_provider_ref: 'refund-abc',
      p_provider: 'cardcom',
    };
    expect((await client.rpc('admin_record_refund', args)).error).toBeNull();
    expect((await client.rpc('admin_record_refund', args)).error).toBeNull(); // replay

    const refunds = (await getPayments(bookingId)).filter((p) => p.kind === 'refund');
    expect(refunds).toHaveLength(1);
    expect(Number(refunds[0].amount)).toBe(310);
    expect(refunds[0].provider_ref).toBe('refund-abc');
  });

  it('rejects a non-admin caller on both primitives', async () => {
    const { departure } = await createDeparture({ price: 180 });
    const { bookingId } = await bookAndConfirm(departure.id, 1, 180);

    const begin = await anon.rpc('admin_begin_cancellation', {
      p_booking_id: bookingId,
      p_reason: 'admin',
    });
    expect(begin.error).not.toBeNull();

    const record = await anon.rpc('admin_record_refund', {
      p_booking_id: bookingId,
      p_refund_amount: 10,
      p_refund_provider_ref: 'x',
    });
    expect(record.error).not.toBeNull();
    expect((await getBooking(bookingId)).status).toBe('confirmed'); // untouched
  });
});
