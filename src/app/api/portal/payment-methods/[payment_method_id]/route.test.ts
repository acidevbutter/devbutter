import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { DELETE } from "./route";

function cookieStore(token?: string) {
  return {
    get: (name: string) => (name === "db_portal_at" && token ? { value: token } : undefined),
  };
}

function params(payment_method_id: string) {
  return { params: Promise.resolve({ payment_method_id }) };
}

describe("DELETE /api/portal/payment-methods/[payment_method_id]", () => {
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

    const request = new Request("http://localhost/api/portal/payment-methods/pm_1", { method: "DELETE" });
    const response = await DELETE(request, params("pm_1"));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards to DELETE /payment-methods/{id} and returns 204", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    const request = new Request("http://localhost/api/portal/payment-methods/pm_1", { method: "DELETE" });
    const response = await DELETE(request, params("pm_1"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/payment-methods/pm_1");
    expect(init.method).toBe("DELETE");
    expect(response.status).toBe(204);
  });

  it("passes backend error codes through unchanged (payment_method_not_found)", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ detail: "payment_method_not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const request = new Request("http://localhost/api/portal/payment-methods/pm_other_tenant", { method: "DELETE" });
    const response = await DELETE(request, params("pm_other_tenant"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "payment_method_not_found" });
  });
});
