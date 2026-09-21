import { describe, expect, it, vi } from "vitest";
import { CardcomProvider } from "./cardcom-provider";
import type { CheckoutRequest } from "../types";

/** A fetch stub that returns `payload` as JSON, with a controllable HTTP status. */
function stubFetch(payload: unknown, { ok = true, status = 200 } = {}) {
  return vi.fn(
    async () =>
      ({
        ok,
        status,
        json: async () => payload,
      }) as Response,
  );
}

function makeProvider(
  fetchFn: ReturnType<typeof stubFetch>,
  apiPassword?: string,
) {
  return new CardcomProvider({
    terminalNumber: 1000,
    apiName: "test-api-name",
    apiPassword,
    baseUrl: "https://cardcom.test",
    fetchFn: fetchFn as unknown as typeof fetch,
  });
}

const checkoutRequest: CheckoutRequest = {
  bookingId: "booking-abc",
  amount: 250,
  customerName: "ישראל ישראלי",
  customerEmail: "israel@example.com",
  description: "השתתפות בטיול הר תבור",
  successUrl: "https://kamatrails.co.il/checkout/success?t=tok",
  failedUrl: "https://kamatrails.co.il/checkout/failed?t=tok",
  webhookUrl: "https://kamatrails.co.il/api/cardcom/webhook",
};

function bodyOf(fetchFn: ReturnType<typeof stubFetch>) {
  const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
  return JSON.parse(init.body as string);
}

describe("CardcomProvider.createCheckout", () => {
  it("posts a LowProfile/Create body with correlation, shekel amount, and receipt block", async () => {
    const fetchFn = stubFetch({
      ResponseCode: 0,
      LowProfileId: "lp-1",
      Url: "https://pay/lp-1",
    });
    const session = await makeProvider(fetchFn).createCheckout(checkoutRequest);

    const [url] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://cardcom.test/api/v11/LowProfile/Create");

    const body = bodyOf(fetchFn);
    expect(body).toMatchObject({
      TerminalNumber: 1000,
      ApiName: "test-api-name",
      Operation: "ChargeOnly",
      ReturnValue: "booking-abc", // correlation by booking id (#38)
      Amount: 250, // shekels, not agorot (#35)
      ISOCoinId: 1, // ILS
      SuccessRedirectUrl: checkoutRequest.successUrl,
      FailedRedirectUrl: checkoutRequest.failedUrl,
      WebHookUrl: checkoutRequest.webhookUrl,
    });
    expect(body.Document).toMatchObject({
      DocumentTypeToCreate: "TaxInvoiceAndReceipt", // legal חשבונית מס/קבלה (#36)
      Name: "ישראל ישראלי",
      Email: "israel@example.com",
      IsSendByEmail: true,
    });
    expect(body.Document.Products).toEqual([
      { Description: "השתתפות בטיול הר תבור", Quantity: 1, UnitCost: 250 },
    ]);

    expect(session).toEqual({
      redirectUrl: "https://pay/lp-1",
      sessionId: "lp-1",
    });
  });

  it("throws when Cardcom returns a non-success ResponseCode", async () => {
    const fetchFn = stubFetch({
      ResponseCode: 5,
      Description: "terminal blocked",
    });
    await expect(
      makeProvider(fetchFn).createCheckout(checkoutRequest),
    ).rejects.toThrow(/ResponseCode 5.*terminal blocked/);
  });

  it("throws when the response is missing the redirect Url", async () => {
    const fetchFn = stubFetch({ ResponseCode: 0, LowProfileId: "lp-1" });
    await expect(
      makeProvider(fetchFn).createCheckout(checkoutRequest),
    ).rejects.toThrow(/Create failed/);
  });
});

describe("CardcomProvider.getResult", () => {
  it("normalizes a successful result, reading the z-spelled TranzactionInfo", async () => {
    const fetchFn = stubFetch({
      ResponseCode: 0,
      LowProfileId: "lp-1",
      ReturnValue: "booking-abc",
      TranzactionId: 987654,
      TranzactionInfo: { Amount: 250, TranzactionId: 987654 },
      DocumentInfo: {
        DocumentNumber: 42,
        DocumentUrl: "https://cardcom/doc/42",
      },
    });

    const result = await makeProvider(fetchFn).getResult("lp-1");

    const [url] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://cardcom.test/api/v11/LowProfile/GetLpResult");
    expect(bodyOf(fetchFn)).toEqual({
      TerminalNumber: 1000,
      ApiName: "test-api-name",
      LowProfileId: "lp-1",
    });

    expect(result).toEqual({
      success: true,
      sessionId: "lp-1",
      bookingId: "booking-abc",
      providerRef: "987654", // TranzactionId → string, becomes payments.provider_ref (#38)
      amount: 250,
      document: { number: 42, url: "https://cardcom/doc/42" },
    });
  });

  it("reports success:false when the charge did not complete", async () => {
    const fetchFn = stubFetch({
      ResponseCode: 57,
      Description: "declined",
      ReturnValue: "booking-abc",
      TranzactionInfo: { Amount: 0 },
    });

    const result = await makeProvider(fetchFn).getResult("lp-1");
    expect(result.success).toBe(false);
    expect(result.bookingId).toBe("booking-abc");
  });

  it("returns a null document when no receipt info is present", async () => {
    const fetchFn = stubFetch({
      ResponseCode: 0,
      ReturnValue: "booking-abc",
      TranzactionId: 1,
      TranzactionInfo: { Amount: 250 },
    });

    const result = await makeProvider(fetchFn).getResult("lp-1");
    expect(result.document).toBeNull();
  });
});

describe("CardcomProvider.refund", () => {
  it("posts a RefundByTransactionId body with the txn id, exact PartialSum, and ApiPassword", async () => {
    const fetchFn = stubFetch({ ResponseCode: 0, NewTranzactionId: 555 });
    const result = await makeProvider(fetchFn, "secret-pass").refund({
      providerRef: "987654",
      amount: 390,
    });

    const [url] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://cardcom.test/api/v11/Transactions/RefundByTransactionId",
    );
    expect(bodyOf(fetchFn)).toEqual({
      ApiName: "test-api-name",
      ApiPassword: "secret-pass",
      TransactionId: 987654, // provider_ref text → integer
      PartialSum: 390, // refund exactly paid − fee
      AllowMultipleRefunds: false,
    });
    expect(result).toEqual({ success: true, providerRef: "555" });
  });

  it("throws when no refund credential is configured", async () => {
    const fetchFn = stubFetch({ ResponseCode: 0 });
    await expect(
      makeProvider(fetchFn).refund({ providerRef: "987654", amount: 100 }),
    ).rejects.toThrow(/CARDCOM_API_PASSWORD/);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("throws when Cardcom rejects the refund", async () => {
    const fetchFn = stubFetch({ ResponseCode: 6, Description: "already refunded" });
    await expect(
      makeProvider(fetchFn, "secret-pass").refund({
        providerRef: "987654",
        amount: 100,
      }),
    ).rejects.toThrow(/RefundByTransactionId failed.*already refunded/);
  });

  it("refuses a provider_ref that is not a transaction id", async () => {
    const fetchFn = stubFetch({ ResponseCode: 0 });
    await expect(
      makeProvider(fetchFn, "secret-pass").refund({
        providerRef: "fake-booking-1", // e.g. a fake-provider ref, never Cardcom
        amount: 100,
      }),
    ).rejects.toThrow(/not a Cardcom transaction id/);
  });
});

describe("CardcomProvider HTTP errors", () => {
  it("throws on a non-ok HTTP response", async () => {
    const fetchFn = stubFetch({}, { ok: false, status: 502 });
    await expect(makeProvider(fetchFn).getResult("lp-1")).rejects.toThrow(
      /HTTP 502/,
    );
  });
});
