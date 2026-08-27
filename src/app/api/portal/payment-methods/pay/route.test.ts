import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { POST } from "./route";

function cookieStore(token?: string) {
  return {
    get: (name: string) => (name === "db_portal_at" && token ? { value: token } : undefined),
  };
}

describe("POST /api/portal/payment-methods/pay", () => {
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

    const request = new Request("http://localhost/api/portal/payment-methods/pay", {
      method: "POST",
      body: JSON.stringify({ invoice_id: "inv_1", payment_method_id: "pm_1", idempotency_key: "k1" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards {invoiceId, paymentMethodId, idempotencyKey} to POST /payments", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: "pay_1", state: "pending", provider_payment_id: null }), {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const body = { invoice_id: "inv_1", payment_method_id: "pm_1", idempotency_key: "k1" };
    const request = new Request("http://localhost/api/portal/payment-methods/pay", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const response = await POST(request);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/payments");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual(body);
    expect(response.status).toBe(202);
  });

  it("passes backend error codes through unchanged (idempotency_conflict)", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "idempotency_conflict" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const request = new Request("http://localhost/api/portal/payment-methods/pay", {
      method: "POST",
      body: JSON.stringify({ invoice_id: "inv_1", payment_method_id: "pm_1", idempotency_key: "reused" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "idempotency_conflict" });
  });

  it("passes provider-unavailable errors through unchanged", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "payment_provider_unavailable" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const request = new Request("http://localhost/api/portal/payment-methods/pay", {
      method: "POST",
      body: JSON.stringify({ invoice_id: "inv_1", payment_method_id: "pm_1", idempotency_key: "k2" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "payment_provider_unavailable" });
  });
});
