import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentProvider,
  PaymentResult,
} from "../types";
import type {
  CardcomCreateRequest,
  CardcomCreateResponse,
  CardcomLowProfileResult,
} from "./wire-types";

const CARDCOM_BASE_URL = "https://secure.cardcom.solutions";
const CREATE_PATH = "/api/v11/LowProfile/Create";
const GET_RESULT_PATH = "/api/v11/LowProfile/GetLpResult";

const CARDCOM_SUCCESS_CODE = 0; // ResponseCode 0 == success across v11
const ISO_COIN_ILS = 1; // Cardcom ISOCoinId for shekels — amounts stay in shekels (#35)
const CHECKOUT_LANGUAGE = "he";
// Legal חשבונית מס/קבלה, addressed + emailed to the customer (#36).
const TAX_INVOICE_AND_RECEIPT = "TaxInvoiceAndReceipt";
const RECEIPT_QUANTITY = 1;

export interface CardcomConfig {
  terminalNumber: number;
  apiName: string;
  /** Override the API host (tests). Defaults to Cardcom production host. */
  baseUrl?: string;
  /** Injected for testability; defaults to the global fetch. */
  fetchFn?: typeof fetch;
}

/**
 * Cardcom v11 implementation of the PaymentProvider contract. Maps our neutral checkout
 * request to LowProfile/Create and a session id to GetLpResult, and normalizes both
 * responses. It holds no state beyond its terminal/API-name config and never reads secrets
 * itself — those come from the server-only env reader (see ./env).
 */
export class CardcomProvider implements PaymentProvider {
  private readonly terminalNumber: number;
  private readonly apiName: string;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: CardcomConfig) {
    this.terminalNumber = config.terminalNumber;
    this.apiName = config.apiName;
    this.baseUrl = config.baseUrl ?? CARDCOM_BASE_URL;
    this.fetchFn = config.fetchFn ?? fetch;
  }

  async createCheckout(request: CheckoutRequest): Promise<CheckoutSession> {
    const body: CardcomCreateRequest = {
      TerminalNumber: this.terminalNumber,
      ApiName: this.apiName,
      Operation: "ChargeOnly",
      ReturnValue: request.bookingId,
      Amount: request.amount,
      ISOCoinId: ISO_COIN_ILS,
      Language: CHECKOUT_LANGUAGE,
      ProductName: request.description,
      SuccessRedirectUrl: request.successUrl,
      FailedRedirectUrl: request.failedUrl,
      WebHookUrl: request.webhookUrl,
      Document: {
        DocumentTypeToCreate: TAX_INVOICE_AND_RECEIPT,
        Name: request.customerName,
        Email: request.customerEmail,
        IsSendByEmail: true,
        Products: [
          {
            Description: request.description,
            Quantity: RECEIPT_QUANTITY,
            UnitCost: request.amount,
          },
        ],
      },
    };

    const result = await this.post<CardcomCreateResponse>(CREATE_PATH, body);
    if (
      result.ResponseCode !== CARDCOM_SUCCESS_CODE ||
      !result.Url ||
      !result.LowProfileId
    ) {
      throw new Error(
        `Cardcom LowProfile/Create failed (ResponseCode ${result.ResponseCode}: ` +
          `${result.Description ?? "no description"})`,
      );
    }
    return { redirectUrl: result.Url, sessionId: result.LowProfileId };
  }

  async getResult(sessionId: string): Promise<PaymentResult> {
    const result = await this.post<CardcomLowProfileResult>(GET_RESULT_PATH, {
      TerminalNumber: this.terminalNumber,
      ApiName: this.apiName,
      LowProfileId: sessionId,
    });

    const tranzactionId =
      result.TranzactionId ?? result.TranzactionInfo?.TranzactionId ?? null;
    const documentNumber = result.DocumentInfo?.DocumentNumber;
    const documentUrl = result.DocumentInfo?.DocumentUrl;
    const document =
      documentNumber != null && documentUrl != null
        ? { number: documentNumber, url: documentUrl }
        : null;

    return {
      success: result.ResponseCode === CARDCOM_SUCCESS_CODE,
      sessionId,
      bookingId: result.ReturnValue ?? null,
      providerRef: tranzactionId != null ? String(tranzactionId) : null,
      amount: result.TranzactionInfo?.Amount ?? null,
      document,
    };
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const response = await this.fetchFn(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(
        `Cardcom request to ${path} failed with HTTP ${response.status}`,
      );
    }
    return (await response.json()) as T;
  }
}
