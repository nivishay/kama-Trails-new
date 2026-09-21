import type {
  CheckoutRequest,
  CheckoutSession,
  PaymentProvider,
  PaymentResult,
  RefundRequest,
  RefundResult,
} from "../types";
import type {
  CardcomCreateRequest,
  CardcomCreateResponse,
  CardcomLowProfileResult,
  CardcomRefundRequest,
  CardcomRefundResponse,
} from "./wire-types";

const CARDCOM_BASE_URL = "https://secure.cardcom.solutions";
const CREATE_PATH = "/api/v11/LowProfile/Create";
const GET_RESULT_PATH = "/api/v11/LowProfile/GetLpResult";
const REFUND_PATH = "/api/v11/Transactions/RefundByTransactionId";

const CARDCOM_SUCCESS_CODE = 0; // ResponseCode 0 == success across v11
const ISO_COIN_ILS = 1; // Cardcom ISOCoinId for shekels — amounts stay in shekels (#35)
const CHECKOUT_LANGUAGE = "he";
// Legal חשבונית מס/קבלה, addressed + emailed to the customer (#36).
const TAX_INVOICE_AND_RECEIPT = "TaxInvoiceAndReceipt";
const RECEIPT_QUANTITY = 1;

export interface CardcomConfig {
  terminalNumber: number;
  apiName: string;
  /** Refund-only credential; absent unless refunds are configured (see ./env). */
  apiPassword?: string | null;
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
  private readonly apiPassword: string | null;
  private readonly baseUrl: string;
  private readonly fetchFn: typeof fetch;

  constructor(config: CardcomConfig) {
    this.terminalNumber = config.terminalNumber;
    this.apiName = config.apiName;
    this.apiPassword = config.apiPassword ?? null;
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

  async refund(request: RefundRequest): Promise<RefundResult> {
    if (!this.apiPassword) {
      throw new Error(
        "Cardcom refunds require CARDCOM_API_PASSWORD — refund credential is not configured.",
      );
    }
    // Our provider_ref is Cardcom's TranzactionId serialized as text; the refund endpoint wants
    // it back as an integer.
    const transactionId = Number(request.providerRef);
    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      throw new Error(
        `Cannot refund: provider_ref "${request.providerRef}" is not a Cardcom transaction id.`,
      );
    }
    if (!(request.amount > 0)) {
      throw new Error(`Refund amount must be positive, got ${request.amount}.`);
    }

    const body: CardcomRefundRequest = {
      ApiName: this.apiName,
      ApiPassword: this.apiPassword,
      TransactionId: transactionId,
      // Always explicit: refund exactly (paid − cancellation fee) shekels.
      PartialSum: request.amount,
      AllowMultipleRefunds: false,
    };

    const result = await this.post<CardcomRefundResponse>(REFUND_PATH, body);
    if (result.ResponseCode !== CARDCOM_SUCCESS_CODE) {
      throw new Error(
        `Cardcom RefundByTransactionId failed (ResponseCode ${result.ResponseCode}: ` +
          `${result.Description ?? "no description"})`,
      );
    }
    const refundRef = result.NewTranzactionId ?? result.TranzactionId ?? null;
    return {
      success: true,
      providerRef: refundRef != null ? String(refundRef) : null,
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
      console.error(`[cardcom] ${path} — HTTP ${response.status}`);
      throw new Error(
        `Cardcom request to ${path} failed with HTTP ${response.status}`,
      );
    }
    const data = (await response.json()) as T;
    // Log Cardcom's raw response so checkout/charge failures are diagnosable from server logs.
    // Server-side only; the receipt/transaction blocks can carry customer PII — see the
    // pre-launch checklist to gate this to non-production before launch.
    console.info(`[cardcom] ${path} response`, data);
    return data;
  }
}
