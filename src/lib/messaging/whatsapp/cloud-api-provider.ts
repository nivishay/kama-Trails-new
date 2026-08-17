import type {
  LeadAutoReplyInput,
  MessageResult,
  MessagingProvider,
} from "../types";
import type { WhatsAppEnv } from "./env";

/**
 * Sends the lead auto-reply via the WhatsApp Cloud API *direct* (no BSP, no Twilio — DECISIONS
 * #49). Business-initiated messages must use a Meta-approved template, so the body is a template
 * reference with the customer name as the {{1}} parameter (#50).
 */
export class WhatsAppCloudProvider implements MessagingProvider {
  constructor(private readonly env: WhatsAppEnv) {}

  async sendLeadAutoReply(input: LeadAutoReplyInput): Promise<MessageResult> {
    const url = `https://graph.facebook.com/${this.env.apiVersion}/${this.env.phoneNumberId}/messages`;
    const body = {
      messaging_product: "whatsapp",
      to: input.toPhoneE164,
      type: "template",
      template: {
        name: this.env.templateName,
        language: { code: this.env.templateLanguage },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: input.customerName }],
          },
        ],
      },
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const detail = await response.text();
        return {
          status: "failed",
          error: `WhatsApp API ${response.status}: ${detail}`,
        };
      }

      const json = (await response.json()) as {
        messages?: Array<{ id?: string }>;
      };
      return { status: "sent", providerRef: json.messages?.[0]?.id ?? null };
    } catch (error) {
      return { status: "failed", error: (error as Error).message };
    }
  }
}
