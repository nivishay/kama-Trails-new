import { CardcomProvider } from "./cardcom/cardcom-provider";
import { readCardcomEnv } from "./cardcom/env";
import { FakePaymentProvider } from "./fake/fake-provider";
import type { PaymentProvider } from "./types";

export type {
  CheckoutRequest,
  CheckoutSession,
  PaymentDocument,
  PaymentProvider,
  PaymentResult,
} from "./types";
export { CardcomProvider } from "./cardcom/cardcom-provider";
export { FakePaymentProvider } from "./fake/fake-provider";

/**
 * Whether to use the in-app fake payment provider (ADR 0003). This is a TEST SEAM: the fake
 * confirms bookings without a real charge, so it is fail-closed for production — it needs an
 * explicit opt-in (`PAYMENT_PROVIDER=fake`) AND is never honoured on a production deployment.
 *
 * The guard is the *deployment* signal (`VERCEL_ENV`), not the build mode: CI runs the flow test
 * against a real production build (`next build`), so a `NODE_ENV`-based guard would wrongly
 * disable the fake there. A real Vercel production deploy has `VERCEL_ENV === "production"`.
 */
export function isFakePaymentProviderEnabled(): boolean {
  if (process.env.PAYMENT_PROVIDER !== "fake") return false;
  // Hard block: a production deployment must never fake payments, even if misconfigured.
  if (process.env.VERCEL_ENV === "production") return false;
  return true;
}

/** The configured payment provider for this deployment (server-only). */
export function getPaymentProvider(): PaymentProvider {
  if (isFakePaymentProviderEnabled()) {
    return new FakePaymentProvider();
  }
  const env = readCardcomEnv();
  return new CardcomProvider({
    terminalNumber: env.terminalNumber,
    apiName: env.apiName,
  });
}
