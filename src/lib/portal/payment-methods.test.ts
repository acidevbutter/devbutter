import { afterEach, describe, expect, it, vi } from "vitest";
import type { SecureEnvelopeV1 } from "../secure-payload";
import {
  createOpaquePaymentMethodRequest,
  listPortalPaymentMethods,
  payWithPortalPaymentMethod,
  revokePortalPaymentMethod,
  submitOpaquePaymentMethodRequest,
  type OpaquePaymentMethodRequest,
} from "./payment-methods";

function validEnvelope(overrides: Partial<SecureEnvelopeV1> = {}): SecureEnvelopeV1 {
  return {
    v: 1,
    kid: "kid_test",
    ts: 1735689600000,
    requestId: "req_1",
    contextId: "secctx_abc",
    purpose: "payment_method.save",
    nonce: "nonce_b64url",
    ciphertext: "ciphertext_b64url",
    tag: "tag_b64url",
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("createOpaquePaymentMethodRequest", () => {
  it("builds the request when invoice_id and envelope are valid", () => {
    const envelope = validEnvelope();
    expect(createOpaquePaymentMethodRequest("inv_1", "save_only", envelope)).toEqual({
      invoice_id: "inv_1",
      operation: "save_only",
      envelope,
    });
  });

  it("throws when invoice_id is empty", () => {
    expect(() => createOpaquePaymentMethodRequest("", "save_only", validEnvelope())).toThrow(
      "invalid_payment_method_request"
    );
  });

  it("throws when the envelope is missing a required key", () => {
    const incomplete = { ...validEnvelope() } as Partial<SecureEnvelopeV1>;
    delete incomplete.tag;
    expect(() =>
      createOpaquePaymentMethodRequest("inv_1", "save_only", incomplete as unknown as SecureEnvelopeV1)
    ).toThrow("invalid_payment_method_request");
  });

  it("throws when the envelope has an unexpected extra key", () => {
    const withExtra = { ...validEnvelope(), extra: "nope" };
    expect(() =>
      createOpaquePaymentMethodRequest("inv_1", "save_only", withExtra as unknown as SecureEnvelopeV1)
    ).toThrow("invalid_payment_method_request");
  });

  it("throws when the envelope is not a plain object", () => {
    expect(() =>
      createOpaquePaymentMethodRequest("inv_1", "save_only", null as unknown as SecureEnvelopeV1)
    ).toThrow("invalid_payment_method_request");
    expect(() =>
      createOpaquePaymentMethodRequest("inv_1", "save_only", [] as unknown as SecureEnvelopeV1)
    ).toThrow("invalid_payment_method_request");
  });
});

describe("submitOpaquePaymentMethodRequest", () => {
  it("posts the request to the secure endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const request: OpaquePaymentMethodRequest = {
      invoice_id: "inv_1",
      operation: "save_and_pay",
      envelope: validEnvelope(),
    };

    const response = await submitOpaquePaymentMethodRequest(request);

    expect(fetchMock).toHaveBeenCalledWith("/api/portal/payment-methods/secure", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    expect(response.status).toBe(200);
  });

  it("throws without calling fetch when the envelope is malformed", async () => {
    const badEnvelope = { ...validEnvelope() } as Partial<SecureEnvelopeV1>;
    delete badEnvelope.nonce;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const request = {
      invoice_id: "inv_1",
      operation: "save_only",
      envelope: badEnvelope,
    } as unknown as OpaquePaymentMethodRequest;

    await expect(submitOpaquePaymentMethodRequest(request)).rejects.toThrow(
      "invalid_payment_method_request"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("listPortalPaymentMethods", () => {
  it("returns the parsed list when the response is ok", async () => {
    const methods = [
      {
        id: "pm_1",
        brand: "visa",
        last4: "4242",
        expiry_month: 12,
        expiry_year: 2030,
        status: "active",
        created_at: "2026-01-01T00:00:00.000Z",
        revoked_at: null,
      },
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(methods), { status: 200 }))
    );

    await expect(listPortalPaymentMethods()).resolves.toEqual(methods);
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(listPortalPaymentMethods()).rejects.toThrow("payment_methods_load_failed");
  });
});

describe("revokePortalPaymentMethod", () => {
  it("throws without calling fetch for an empty id", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(revokePortalPaymentMethod("")).rejects.toThrow("invalid_payment_method_id");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("deletes the encoded payment method id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(revokePortalPaymentMethod("pm 1/2")).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith("/api/portal/payment-methods/pm%201%2F2", {
      method: "DELETE",
      credentials: "same-origin",
      cache: "no-store",
    });
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(revokePortalPaymentMethod("pm_1")).rejects.toThrow("payment_method_revoke_failed");
  });
});

describe("payWithPortalPaymentMethod", () => {
  it("posts invoice, payment method and a fresh idempotency key", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "fixed-uuid" });
    const result = { id: "pay_1", state: "confirmed", provider_payment_id: "prov_1" };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(result), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(payWithPortalPaymentMethod("inv_1", "pm_1")).resolves.toEqual(result);

    expect(fetchMock).toHaveBeenCalledWith("/api/portal/payment-methods/pay", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoice_id: "inv_1",
        payment_method_id: "pm_1",
        idempotency_key: "fixed-uuid",
      }),
    });
  });

  it("throws when the response is not ok", async () => {
    vi.stubGlobal("crypto", { randomUUID: () => "fixed-uuid" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 402 })));

    await expect(payWithPortalPaymentMethod("inv_1", "pm_1")).rejects.toThrow("saved_payment_failed");
  });
});
