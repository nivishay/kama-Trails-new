import { NoopMessagingProvider } from "./noop-provider";
import type { MessagingProvider } from "./types";
import { readWhatsAppEnv } from "./whatsapp/env";
import { WhatsAppCloudProvider } from "./whatsapp/cloud-api-provider";

export type {
  LeadAutoReplyInput,
  MessageResult,
  MessagingProvider,
} from "./types";
export { WhatsAppCloudProvider } from "./whatsapp/cloud-api-provider";
export { NoopMessagingProvider } from "./noop-provider";

/**
 * The messaging provider for this deployment (server-only). Falls back to a no-op when WhatsApp
 * credentials are absent, so lead capture is never blocked by messaging config (#50).
 */
export function getMessagingProvider(): MessagingProvider {
  const env = readWhatsAppEnv();
  if (!env) return new NoopMessagingProvider();
  return new WhatsAppCloudProvider(env);
}
