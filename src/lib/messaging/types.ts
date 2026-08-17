// Provider-neutral messaging contract (DECISIONS #5/#49). Business code depends only on these
// shapes; the WhatsApp Cloud API specifics live behind WhatsAppCloudProvider, so swapping the
// channel (or adding a BSP later) is one new class — nothing in the lead flow changes.

/** A lead's auto-reply reduced to exactly what the send needs — no DB/framework coupling. */
export interface LeadAutoReplyInput {
  /** Recipient in E.164 digits, no '+', e.g. "972501234567" — the WhatsApp `to` form. */
  toPhoneE164: string;
  /** Customer's name — the {{1}} body parameter in the approved template (#50). */
  customerName: string;
}

/** Outcome of a send. Expected failures are values (for logging), not thrown exceptions. */
export type MessageResult =
  | { status: "sent"; providerRef: string | null }
  | { status: "skipped"; reason: string }
  | { status: "failed"; error: string };

export interface MessagingProvider {
  /** Send the "we got your inquiry" auto-reply. Best-effort: never throws for expected errors. */
  sendLeadAutoReply(input: LeadAutoReplyInput): Promise<MessageResult>;
}
