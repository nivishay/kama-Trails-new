// Cardcom v11 wire shapes, pinned against the live OpenAPI schema
// (https://secure.cardcom.solutions/swagger/v11/swagger.json). Only the fields we use are
// declared. NOTE: Cardcom spells the nested result objects with a "z" — TranzactionInfo /
// TranzactionId — while other endpoints use "Transaction"; the casing below matches the
// LowProfile result exactly. These types never leak past CardcomProvider.

/** Request body for POST /api/v11/LowProfile/Create. */
export interface CardcomCreateRequest {
  TerminalNumber: number;
  ApiName: string;
  Operation: "ChargeOnly";
  ReturnValue: string;
  Amount: number;
  ISOCoinId: number;
  Language: string;
  ProductName: string;
  SuccessRedirectUrl: string;
  FailedRedirectUrl: string;
  WebHookUrl: string;
  Document: CardcomDocumentRequest;
}

export interface CardcomDocumentRequest {
  DocumentTypeToCreate: string;
  Name: string;
  Email: string;
  IsSendByEmail: boolean;
  Products: CardcomProductLine[];
}

export interface CardcomProductLine {
  Description: string;
  Quantity: number;
  UnitCost: number;
}

/** Response body from POST /api/v11/LowProfile/Create. */
export interface CardcomCreateResponse {
  ResponseCode: number;
  Description?: string;
  LowProfileId?: string;
  Url?: string;
}

/** Response body from POST /api/v11/LowProfile/GetLpResult. */
export interface CardcomLowProfileResult {
  ResponseCode: number;
  Description?: string;
  LowProfileId?: string;
  TranzactionId?: number;
  ReturnValue?: string;
  TranzactionInfo?: CardcomTranzactionInfo;
  DocumentInfo?: CardcomDocumentInfo;
}

export interface CardcomTranzactionInfo {
  Amount?: number;
  TranzactionId?: number;
}

export interface CardcomDocumentInfo {
  DocumentNumber?: number;
  DocumentUrl?: string;
}
