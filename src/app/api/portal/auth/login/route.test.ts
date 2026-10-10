import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookieSetMock } = vi.hoisted(() => ({ cookieSetMock: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ set: cookieSetMock }) }));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/portal/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const CREDENTIALS = { email: "ana@empresa.com.br", password: "segredo123" };

describe("POST /api/portal/auth/login", () => {
  const fetchMock = vi.fn();

  beforeEach(() => vi.stubGlobal("fetch", fetchMock));
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    cookieSetMock.mockReset();
  });

  it("sets the portal session for a client account", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "at", refresh_token: "rt" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ is_admin: false }), { status: 200 }));

    const response = await POST(request(CREDENTIALS));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, isAdmin: false });
    expect(cookieSetMock.mock.calls.map(([name]) => name)).toEqual(["db_portal_at", "db_portal_rt"]);
  });

  it("maps a backend 401 to invalid_credentials", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: "nope" }), { status: 401 }));

    const response = await POST(request(CREDENTIALS));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "invalid_credentials" });
    expect(cookieSetMock).not.toHaveBeenCalled();
  });

  it("answers 502 upstream_failed instead of crashing when the backend is down (#64)", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await POST(request(CREDENTIALS));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "upstream_failed" });
  });
});
