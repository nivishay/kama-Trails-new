import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { anon, admin, createDeparture } from './helpers';

// Checkout consents: signed-waiver split (#46) + newsletter opt-in (#33), DECISIONS #59.
// Runs against a local Supabase stack via the anon path, as the website calls it.

function uniqueContact() {
  const n = Math.floor(Math.random() * 1_000_000);
  return {
    name: 'לקוח בדיקה',
    phone: `050${String(n).padStart(7, '0')}`,
    email: `consent-${randomUUID().slice(0, 8)}@example.com`,
  };
}

function book(
  departureId: string,
  contact: { name: string; phone: string; email: string },
  consents: { policy?: boolean; waiver?: boolean; marketing?: boolean } = {},
) {
  return anon.rpc('book_trip', {
    p_departure_id: departureId,
    p_registrant_name: contact.name,
    p_phone: contact.phone,
    p_email: contact.email,
    p_participants_count: 1,
    p_accept_policy: consents.policy ?? true,
    p_sign_waiver: consents.waiver ?? true,
    p_marketing_opt_in: consents.marketing ?? false,
  });
}

async function getCustomer(id: string) {
  const { data, error } = await admin.from('customers').select('*').eq('id', id).single();
  if (error) throw new Error(`getCustomer failed: ${error.message}`);
  return data;
}

describe('Checkout consents — mandatory policy + signed waiver (#46/#59)', () => {
  it('refuses to book when the policy consent is missing', async () => {
    const { departure } = await createDeparture();
    const r = await book(departure.id, uniqueContact(), { policy: false });
    expect(r.error).toBeTruthy();
    expect(r.error!.message).toMatch(/consent/i);
  });

  it('refuses to book when the waiver is not signed', async () => {
    const { departure } = await createDeparture();
    const r = await book(departure.id, uniqueContact(), { waiver: false });
    expect(r.error).toBeTruthy();
    expect(r.error!.message).toMatch(/consent/i);
  });
});

describe('Checkout consents — optional newsletter opt-in (#33/#55)', () => {
  it('opts the Customer in when the newsletter box is ticked', async () => {
    const { departure } = await createDeparture();
    const r = await book(departure.id, uniqueContact(), { marketing: true });
    expect(r.error).toBeNull();

    const customer = await getCustomer(r.data!.customer_id);
    expect(customer.marketing_opt_in).toBe(true);
    expect(customer.marketing_consent_at).toBeTruthy();
    expect(customer.marketing_consent_source).toBe('checkout');
  });

  it('leaves a new Customer opted-out when the box is unticked (#56)', async () => {
    const { departure } = await createDeparture();
    const r = await book(departure.id, uniqueContact(), { marketing: false });
    expect(r.error).toBeNull();

    const customer = await getCustomer(r.data!.customer_id);
    expect(customer.marketing_opt_in).toBe(false);
    expect(customer.marketing_consent_at).toBeNull();
  });

  it('does not revoke a prior opt-in when a later booking leaves the box unticked', async () => {
    const { departure: dep1 } = await createDeparture();
    const { departure: dep2 } = await createDeparture();
    const contact = uniqueContact();

    const optedIn = await book(dep1.id, contact, { marketing: true });
    // Same person books again without ticking — an unticked box is not an opt-out request (#59).
    const later = await book(dep2.id, contact, { marketing: false });
    expect(later.data!.customer_id).toBe(optedIn.data!.customer_id);

    const customer = await getCustomer(later.data!.customer_id);
    expect(customer.marketing_opt_in).toBe(true);
  });

  it('books successfully regardless of the marketing choice', async () => {
    const { departure } = await createDeparture();
    const r = await book(departure.id, uniqueContact(), { marketing: false });
    expect(r.error).toBeNull();
    expect(r.data!.status).toBe('held');
  });
});
