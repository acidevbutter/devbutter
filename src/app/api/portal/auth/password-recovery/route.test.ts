import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

function request(body: unknown) {
  return new Request("http://localhost/api/portal/auth/password-recovery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/portal/auth/password-recovery", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("forwards the e-mail and answers ok when the backend accepts (202)", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: "accepted" }), { status: 202 }));

    const response = await POST(request({ email: " ana@empresa.com.br " }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/accounts/password-recovery");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ email: "ana@empresa.com.br" });
  });

  it("maps a backend 422 to 400 invalid_email", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: [] }), { status: 422 }));

    const response = await POST(request({ email: "ana@empresa" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_email" });
  });

  it("answers 502 upstream_failed when the backend can't be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const response = await POST(request({ email: "ana@empresa.com.br" }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "upstream_failed" });
  });

  it("answers 502 upstream_failed on a backend 5xx", async () => {
    fetchMock.mockResolvedValue(new Response("boom", { status: 503 }));

    const response = await POST(request({ email: "ana@empresa.com.br" }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "upstream_failed" });
  });

  it("rejects a missing e-mail without calling the backend", async () => {
    const response = await POST(request({}));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_email" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
