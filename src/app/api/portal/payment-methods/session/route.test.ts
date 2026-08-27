import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { POST } from "./route";

function cookieStore(token?: string) {
  return {
    get: (name: string) => (name === "db_portal_at" && token ? { value: token } : undefined),
  };
}

describe("POST /api/portal/payment-methods/session", () => {
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

    const request = new Request("http://localhost/api/portal/payment-methods/session", {
      method: "POST",
      body: JSON.stringify({ purpose: "payment_method.create", supportedKids: ["kid-1"] }),
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthenticated" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards to POST /payment-methods/session on the backend with the session cookie", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ contextId: "secctx_1", kid: "k1", nonce: "abc", expiresAt: 1, purpose: "payment_method.create", protocolVersion: 1 }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const body = { purpose: "payment_method.create", supportedKids: ["kid-1"] };
    const request = new Request("http://localhost/api/portal/payment-methods/session", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const response = await POST(request);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/payment-methods/session");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer token-abc");
    expect(JSON.parse(init.body as string)).toEqual(body);
    expect(response.status).toBe(201);
  });

  it("passes backend error codes through unchanged", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "invoice_not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const request = new Request("http://localhost/api/portal/payment-methods/session", {
      method: "POST",
      body: JSON.stringify({ purpose: "payment_method.create_and_pay", invoiceId: "inv_1" }),
    });
    const response = await POST(request);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "invoice_not_found" });
  });
});
