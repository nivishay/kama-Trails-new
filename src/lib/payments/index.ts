import { CardcomProvider } from "./cardcom/cardcom-provider";
import { readCardcomEnv } from "./cardcom/env";
import type { PaymentProvider } from "./types";

export type {
  CheckoutRequest,
  CheckoutSession,
  PaymentDocument,
  PaymentProvider,
  PaymentResult,
} from "./types";
export { CardcomProvider } from "./cardcom/cardcom-provider";

/** The configured payment provider for this deployment (server-only). */
export function getPaymentProvider(): PaymentProvider {
  const env = readCardcomEnv();
  return new CardcomProvider({
    terminalNumber: env.terminalNumber,
    apiName: env.apiName,
  });
}
