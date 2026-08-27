import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { GET } from "./route";

function cookieStore(token?: string) {
  return {
    get: (name: string) => (name === "db_portal_at" && token ? { value: token } : undefined),
  };
}

describe("GET /api/portal/payment-methods", () => {
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

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthenticated" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards to GET /payment-methods and returns the list unchanged", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));
    const methods = [
      { id: "pm_1", brand: "visa", last4: "4242", expiry_month: 12, expiry_year: 2028, status: "active", created_at: "2026-01-01T00:00:00Z", revoked_at: null },
    ];
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(methods), { status: 200, headers: { "Content-Type": "application/json" } }),
    );

    const response = await GET();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/payment-methods");
    expect(init.method).toBeUndefined();
    expect(init.headers.Authorization).toBe("Bearer token-abc");
    expect(await response.json()).toEqual(methods);
  });
});
