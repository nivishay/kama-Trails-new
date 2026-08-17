import type { MessageResult, MessagingProvider } from "./types";

/**
 * Used when WhatsApp credentials are absent (local dev, or before the token is provisioned).
 * Reports the send as skipped so the lead flow keeps working — capture never depends on the
 * send (#50). Production must configure real credentials (docs/pre-launch-checklist.md).
 */
export class NoopMessagingProvider implements MessagingProvider {
  async sendLeadAutoReply(): Promise<MessageResult> {
    return { status: "skipped", reason: "WhatsApp Cloud API not configured" };
  }
}
