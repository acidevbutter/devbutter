import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock, setSessionMock, clearConversationMock } = vi.hoisted(() => ({
  cookiesMock: vi.fn(),
  setSessionMock: vi.fn(),
  clearConversationMock: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("@/lib/portal/session", () => ({
  setPortalSessionCookies: setSessionMock,
  clearConversationCookie: clearConversationMock,
}));

import { POST } from "./route";

const params = { params: Promise.resolve({ id: "conv-1" }) };

function request(body: unknown = {}) {
  return new Request("http://localhost/api/portal/conversations/conv-1/draft-quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const BACKEND_QUOTE = {
  quote_id: "q-1",
  reference: "COT-0042",
  scope_summary: "Plataforma de pedidos e estoque",
  price_range: "R$ 18–24k",
  timeline: "7–9 semanas",
  tokens: { access_token: "at", refresh_token: "rt" },
  pending_account_link: false,
};

describe("POST /api/portal/conversations/[id]/draft-quote", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    cookiesMock.mockResolvedValue({ get: () => undefined });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    setSessionMock.mockReset();
    clearConversationMock.mockReset();
  });

  it("logs the new client in via cookies but never returns tokens or price to the browser", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(BACKEND_QUOTE), { status: 201 }));

    const response = await POST(request({ email: "ana@empresa.com.br" }), params);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(setSessionMock).toHaveBeenCalledWith(BACKEND_QUOTE.tokens);
    expect(clearConversationMock).toHaveBeenCalled();
    expect(body).toEqual({
      quote_id: "q-1",
      reference: "COT-0042",
      scope_summary: "Plataforma de pedidos e estoque",
      timeline: "7–9 semanas",
      tokens: true,
      pending_account_link: false,
    });
    expect(JSON.stringify(body)).not.toMatch(/access_token|refresh_token|R\$/);
  });

  it("keeps the pending_account_link state (existing e-mail) without any session", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ...BACKEND_QUOTE, tokens: null, pending_account_link: true }), { status: 201 })
    );

    const body = await (await POST(request(), params)).json();

    expect(setSessionMock).not.toHaveBeenCalled();
    expect(body.tokens).toBeNull();
    expect(body.pending_account_link).toBe(true);
  });
});
