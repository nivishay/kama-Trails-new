// Provider-neutral payment contract (DECISIONS #5/#45). Business code depends only on
// these shapes; the Cardcom specifics live behind CardcomProvider, so switching or adding a
// provider is one new class and a go-live credentials swap — nothing else changes.

/** A booking reduced to exactly what a checkout needs — no DB or framework coupling. */
export interface CheckoutRequest {
  /** Correlates the provider's result back to our booking (Cardcom ReturnValue, #38). */
  bookingId: string;
  /** The amount required to confirm, in shekels (#35) — full total in v1 (#40). */
  amount: number;
  customerName: string;
  customerEmail: string;
  /** Receipt line description, e.g. "השתתפות בטיול …" — addresses the חשבונית (#36). */
  description: string;
  successUrl: string;
  failedUrl: string;
  webhookUrl: string;
}

export interface CheckoutSession {
  /** Hosted payment page the browser is redirected to. */
  redirectUrl: string;
  /** Provider session id (Cardcom LowProfileId) — stored on the booking to re-verify (#38). */
  sessionId: string;
}

/** Reference to a receipt/חשבונית the provider issued (#36). */
export interface PaymentDocument {
  number: number;
  url: string;
}

/** The verified, normalized result of a payment session, pulled from the provider (#37). */
export interface PaymentResult {
  /** True only when the charge itself completed successfully. */
  success: boolean;
  /** Echo of the session that was queried. */
  sessionId: string;
  /** The provider's echoed correlation id — our booking id (#38). */
  bookingId: string | null;
  /** The charge id → payments.provider_ref (Cardcom TranzactionId, #38). */
  providerRef: string | null;
  /** Charged amount in shekels — the webhook checks this equals deposit_amount (#37). */
  amount: number | null;
  /** Issued receipt reference, if the provider created one (#36). */
  document: PaymentDocument | null;
}

export interface PaymentProvider {
  /** Open a hosted-page payment session for a booking. Maps to Cardcom LowProfile/Create. */
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  /** Pull the authoritative result of a session. Maps to Cardcom LowProfile/GetLpResult. */
  getResult(sessionId: string): Promise<PaymentResult>;
}
