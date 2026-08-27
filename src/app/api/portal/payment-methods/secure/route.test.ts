import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { POST } from "./route";

function cookieStore(token?: string) {
  return {
    get: (name: string) => (name === "db_portal_at" && token ? { value: token } : undefined),
  };
}

describe("POST /api/portal/payment-methods/secure", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    cookiesMock.mockReset();
  });

  it("returns 401 without the portal session cookie, and never calls the backend", async () => {
    cookiesMock.mockResolvedValue(cookieStore(undefined));

    const request = new Request("http://localhost/api/portal/payment-methods/secure", {
      method: "POST",
      body: '{"v":1}',
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards the request body byte-for-byte, with no JSON re-serialization", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ paymentMethod: { id: "pm_1" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    // Deliberately non-canonical formatting (extra whitespace, specific key
    // order) -- a parse+stringify round trip would normalize this away.
    // Real envelopes are RFC 8785 canonical JSON, but the BFF must not rely
    // on that; it must forward whatever bytes it received.
    const rawEnvelope =
      '{\n  "v": 1,\n  "kid": "info-web-prod-2026-08",\n  "ts": 1700000000,\n  "requestId": "req_1",\n  "contextId": "secctx_1",\n  "purpose": "payment_method.create",\n  "nonce": "bm9uY2U",\n  "ciphertext": "Y2lwaGVy",\n  "tag": "dGFn"\n}';

    const request = new Request("http://localhost/api/portal/payment-methods/secure", {
      method: "POST",
      body: rawEnvelope,
    });
    const response = await POST(request);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/payment-methods");
    expect(init.method).toBe("POST");
    // Byte-for-byte: the exact string that arrived at the BFF, untouched.
    expect(init.body).toBe(rawEnvelope);
    expect(response.status).toBe(201);
  });

  it("returns invalid_body for an empty request body without contacting the backend", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));

    const request = new Request("http://localhost/api/portal/payment-methods/secure", {
      method: "POST",
      body: "",
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_body" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes backend error codes through unchanged (e.g. invalid_secure_payload)", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "invalid_secure_payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const request = new Request("http://localhost/api/portal/payment-methods/secure", {
      method: "POST",
      body: '{"v":1,"kid":"k","ts":1,"requestId":"r","contextId":"c","purpose":"payment_method.create","nonce":"n","ciphertext":"c","tag":"t"}',
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_secure_payload" });
  });
});
