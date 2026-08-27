import type { SecureEnvelopeV1 } from "../secure-payload";

export type PaymentMethodOperation = "save_only" | "save_and_pay";

export type OpaquePaymentMethodRequest = {
  invoice_id: string;
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
  invoice_id: string,
  operation: PaymentMethodOperation,
  envelope: SecureEnvelopeV1,
): OpaquePaymentMethodRequest {
  if (!invoice_id || !isEnvelope(envelope)) {
    throw new Error("invalid_payment_method_request");
  }

  return { invoice_id, operation, envelope };
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

export type PaymentMethodSummary = {
  id: string;
  brand: string;
  last4: string;
  expiry_month: number;
  expiry_year: number;
  status: string;
  created_at: string;
  revoked_at: string | null;
};

export async function listPortalPaymentMethods(): Promise<PaymentMethodSummary[]> {
  const response = await fetch("/api/portal/payment-methods", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) throw new Error("payment_methods_load_failed");
  return (await response.json()) as PaymentMethodSummary[];
}

export async function revokePortalPaymentMethod(payment_method_id: string): Promise<void> {
  if (!payment_method_id) throw new Error("invalid_payment_method_id");

  const response = await fetch(`/api/portal/payment-methods/${encodeURIComponent(payment_method_id)}`, {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) throw new Error("payment_method_revoke_failed");
}

export type SavedPaymentResult = {
  id: string;
  state: string;
  provider_payment_id: string | null;
};

export async function payWithPortalPaymentMethod(
  invoice_id: string,
  payment_method_id: string,
): Promise<SavedPaymentResult> {
  const response = await fetch("/api/portal/payment-methods/pay", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      invoice_id,
      payment_method_id,
      idempotency_key: crypto.randomUUID(),
    }),
  });

  if (!response.ok) throw new Error("saved_payment_failed");
  return (await response.json()) as SavedPaymentResult;
}
