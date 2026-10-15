import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

function context(token: string) {
  return { params: Promise.resolve({ token }) };
}

const req = new Request("http://localhost/api/portal/auth/password-recovery/x");

describe("GET /api/portal/auth/password-recovery/[token]", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("answers { valid: true } when the backend accepts the token", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ valid: true }), { status: 200 }));

    const response = await GET(req, context("tok/en 1"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ valid: true });
    const [url] = fetchMock.mock.calls[0];
    // The token is a path segment: it must be encoded, never spliced raw.
    expect(url).toBe("http://localhost:8000/accounts/password-recovery/tok%2Fen%201");
  });

  it("maps a backend 404 to 404 invalid_or_expired", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: "invalid" }), { status: 404 }));

    const response = await GET(req, context("expired"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "invalid_or_expired" });
  });
});
