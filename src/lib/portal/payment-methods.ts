import type { SecureEnvelopeV1 } from "../secure-payload";

export type PaymentMethodOperation = "save_only" | "save_and_pay" | "pay_saved";

export type OpaquePaymentMethodRequest = {
  invoiceId: string;
  operation: PaymentMethodOperation;
  envelope: SecureEnvelopeV1;
};

const ENVELOPE_KEYS = new Set([
  "v",
  "kid",
  "ts",
  "requestId",
  "contextId",
  "purpose",
  "nonce",
  "ciphertext",
  "tag",
]);

function isEnvelope(value: unknown): value is SecureEnvelopeV1 {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === ENVELOPE_KEYS.size && keys.every((key) => ENVELOPE_KEYS.has(key));
}

export function createOpaquePaymentMethodRequest(
  invoiceId: string,
  operation: PaymentMethodOperation,
  envelope: SecureEnvelopeV1,
): OpaquePaymentMethodRequest {
  if (!invoiceId || !isEnvelope(envelope)) {
    throw new Error("invalid_payment_method_request");
  }

  return { invoiceId, operation, envelope };
}

export async function submitOpaquePaymentMethodRequest(
  request: OpaquePaymentMethodRequest,
): Promise<Response> {
  if (!isEnvelope(request.envelope)) throw new Error("invalid_payment_method_request");

  return fetch("/api/portal/payment-methods/secure", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
}
