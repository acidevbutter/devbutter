import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/portal/auth/password-recovery/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const TOKENS = { access_token: "access-secret", refresh_token: "refresh-secret", token_type: "bearer" };

describe("POST /api/portal/auth/password-recovery/complete", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    cookiesMock.mockReset();
  });

  it("answers ok and discards the backend's TokenPair (no cookies, no tokens)", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(TOKENS), { status: 200 }));

    const response = await POST(request({ token: "tok", password: "novaSenha1" }));

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    const text = await response.text();
    expect(JSON.parse(text)).toEqual({ ok: true });
    expect(text).not.toContain("access-secret");
    expect(text).not.toContain("refresh-secret");
    expect(cookiesMock).not.toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/accounts/password-recovery/complete");
    expect(JSON.parse(init.body)).toEqual({ token: "tok", password: "novaSenha1" });
  });

  it("maps a backend 404 (invalid, expired or used) to 410 invalid_or_expired", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: "invalid" }), { status: 404 }));

    const response = await POST(request({ token: "used", password: "novaSenha1" }));

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({ error: "invalid_or_expired" });
  });

  it("maps a backend 422 to 400 invalid_password", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: "short" }), { status: 422 }));

    const response = await POST(request({ token: "tok", password: "12345678" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_password" });
  });

  it("rejects a short password without calling the backend", async () => {
    const response = await POST(request({ token: "tok", password: "short" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_password" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
