import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { anon, admin, createDeparture } from './helpers';

// Integration coverage for the first-class deduplicated Customer entity (#25, DECISIONS #55).
// Runs against a local Supabase stack (`supabase start` + `db reset`) via the anon path,
// exactly as the website calls it. Inspects the customers table with the service role.

/** Book over the anon path with explicit contact details (the shared helper hard-codes them). */
function bookAs(
  departureId: string,
  contact: { name: string; phone: string; email: string },
  participants = 1,
) {
  return anon.rpc('book_trip', {
    p_departure_id: departureId,
    p_registrant_name: contact.name,
    p_phone: contact.phone,
    p_email: contact.email,
    p_participants_count: participants,
    p_accepted_terms: true,
  });
}

/** Submit a contact-form lead over the anon path. */
function submitLead(contact: { name: string; phone: string; email: string; message?: string }) {
  return anon.rpc('submit_lead', {
    p_name: contact.name,
    p_email: contact.email,
    p_phone: contact.phone,
    p_message: contact.message ?? 'שאלה על הטיול',
  });
}

async function getCustomer(id: string) {
  const { data, error } = await admin.from('customers').select('*').eq('id', id).single();
  if (error) throw new Error(`getCustomer failed: ${error.message}`);
  return data;
}

/** A phone/email unique to this test run so parallel runs never dedup into each other. */
function uniqueContact(name = 'לקוח בדיקה') {
  const n = Math.floor(Math.random() * 1_000_000);
  // Israeli mobile shape 05X-XXXXXXX; the last digits are the unique part.
  const local = `050${String(n).padStart(7, '0')}`;
  return { name, phone: local, email: `cust-${randomUUID().slice(0, 8)}@example.com` };
}

describe('Customer entity — match-or-create (#25)', () => {
  it('creates a Customer for a new person and links the booking', async () => {
    const { departure } = await createDeparture();
    const contact = uniqueContact();

    const { data: booking, error } = await bookAs(departure.id, contact);
    expect(error).toBeNull();
    expect(booking!.customer_id).toBeTruthy();

    const customer = await getCustomer(booking!.customer_id);
    expect(customer.email).toBe(contact.email.toLowerCase());
    expect(customer.marketing_opt_in).toBe(false); // opted-out by default (#56)
    expect(customer.needs_review).toBe(false);
  });

  it('matches the same person by phone across different phone formats', async () => {
    const { departure: dep1 } = await createDeparture();
    const { departure: dep2 } = await createDeparture();
    const contact = uniqueContact();

    const first = await bookAs(dep1.id, contact);
    // Same number, different human formatting + an email typo → still one Customer (phone primary).
    const reformatted = { ...contact, phone: `+972-${contact.phone.slice(1)}`, email: 'typo@example.com' };
    const second = await bookAs(dep2.id, reformatted);

    expect(first.data!.customer_id).toBe(second.data!.customer_id);
  });

  it('matches by email when phone does not match', async () => {
    const { departure: dep1 } = await createDeparture();
    const { departure: dep2 } = await createDeparture();
    const contact = uniqueContact();

    const first = await bookAs(dep1.id, contact);
    // New phone, same email → email fallback match (#55).
    const sameEmail = { ...contact, phone: `052${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}` };
    const second = await bookAs(dep2.id, sameEmail);

    expect(first.data!.customer_id).toBe(second.data!.customer_id);
  });

  it('flags a cross-match conflict (phone→A, email→B) and resolves to phone', async () => {
    const { departure: depA } = await createDeparture();
    const { departure: depB } = await createDeparture();
    const { departure: depConflict } = await createDeparture();
    const personA = uniqueContact('פלוני');
    const personB = uniqueContact('אלמוני');

    const a = await bookAs(depA.id, personA);
    await bookAs(depB.id, personB);

    // Book with A's phone but B's email: must resolve to A (phone primary) and flag for review.
    const conflict = { name: 'פלוני', phone: personA.phone, email: personB.email };
    const c = await bookAs(depConflict.id, conflict);

    expect(c.data!.customer_id).toBe(a.data!.customer_id); // resolved to the phone match
    const customer = await getCustomer(c.data!.customer_id);
    expect(customer.needs_review).toBe(true);
    expect(customer.review_note).toContain(personB.email);
  });

  it('links a Lead to the same Customer as that person’s booking', async () => {
    const { departure } = await createDeparture();
    const contact = uniqueContact();

    const booking = await bookAs(departure.id, contact);
    const { data: leadId, error } = await submitLead(contact);
    expect(error).toBeNull();

    const { data: lead } = await admin.from('leads').select('customer_id').eq('id', leadId).single();
    expect(lead!.customer_id).toBe(booking.data!.customer_id);
  });

  it('does not expose the customers table to the anon role (RLS)', async () => {
    const { data } = await anon.from('customers').select('*').limit(1);
    // Admin-only RLS: anon sees zero rows (deny), never other people’s PII.
    expect(data).toEqual([]);
  });
});
