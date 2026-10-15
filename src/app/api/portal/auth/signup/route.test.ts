import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { setPortalSessionCookiesMock } = vi.hoisted(() => ({ setPortalSessionCookiesMock: vi.fn() }));
vi.mock("@/lib/portal/session", () => ({ setPortalSessionCookies: setPortalSessionCookiesMock }));

import { POST } from "./route";

function request(body: string) {
  return new Request("http://localhost/api/portal/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

const SIGNUP = { name: " Ana ", email: " ana@empresa.com.br ", password: "segredo123" };

describe("POST /api/portal/auth/signup", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    setPortalSessionCookiesMock.mockReset();
  });

  it("creates the account and stores the returned session in cookies", async () => {
    const tokens = { access_token: "at", refresh_token: "rt", token_type: "bearer" };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(tokens), { status: 201 }));

    const response = await POST(request(JSON.stringify(SIGNUP)));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/accounts/signup");
    expect(JSON.parse(init.body)).toEqual({ name: "Ana", email: "ana@empresa.com.br", password: "segredo123" });
    expect(setPortalSessionCookiesMock).toHaveBeenCalledWith(tokens);
  });

  it("maps a backend 409 to email_exists and sets no session", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: "exists" }), { status: 409 }));

    const response = await POST(request(JSON.stringify(SIGNUP)));

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "email_exists" });
    expect(setPortalSessionCookiesMock).not.toHaveBeenCalled();
  });

  it("rejects an unparseable body with 400 invalid_body", async () => {
    const response = await POST(request("{not json"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_body" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects missing fields with 400 invalid_signup", async () => {
    const response = await POST(request(JSON.stringify({ email: "ana@empresa.com.br" })));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_signup" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("never forwards FastAPI's 422 detail list as the error (#64)", async () => {
    const detail = [{ loc: ["body", "email"], msg: "value is not a valid email address", type: "value_error" }];
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail }), { status: 422 }));

    const response = await POST(request(JSON.stringify(SIGNUP)));

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: "invalid_signup" });
  });

  it("answers 502 upstream_failed when the backend is unreachable (#64)", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await POST(request(JSON.stringify(SIGNUP)));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "upstream_failed" });
    expect(setPortalSessionCookiesMock).not.toHaveBeenCalled();
  });
});
