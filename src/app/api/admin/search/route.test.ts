import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { GET } from "./route";

function cookieStore(token?: string) {
  return {
    get: (name: string) => (name === "db_admin_at" && token ? { value: token } : undefined),
  };
}

function req(q: string) {
  return new Request(`http://localhost:3000/api/admin/search?q=${encodeURIComponent(q)}`);
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GET /api/admin/search", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    cookiesMock.mockReset();
  });

  it("returns 401 without the admin session cookie and never calls the backend", async () => {
    cookiesMock.mockResolvedValue(cookieStore(undefined));

    const response = await GET(req("acme"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthenticated" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("short-circuits queries under two characters without hitting the backend", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));

    const response = await GET(req("a"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ groups: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fans out across list endpoints and returns grouped hits", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));

    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/admin/clients")) {
        return Promise.resolve(
          jsonResponse({
            items: [{ id: "c1", name: "Acme Studio", email: "hi@acme.com" }],
            total: 1,
            page: 1,
            page_size: 100,
          })
        );
      }
      if (url.includes("/admin/companies")) {
        return Promise.resolve(
          jsonResponse({ items: [{ id: "co1", name: "Acme Ltda", owner_name: "Ana", cnpj: "1" }] })
        );
      }
      if (url.includes("/admin/orders")) {
        return Promise.resolve(
          jsonResponse({
            items: [{ id: "o1", account_name: "Acme Studio", status: "created", amount: "100" }],
            total: 1,
            page: 1,
            page_size: 100,
          })
        );
      }
      if (url.includes("/admin/invoices")) {
        return Promise.resolve(
          jsonResponse({ items: [], total: 0, page: 1, page_size: 100, synced_at: null })
        );
      }
      if (url.includes("/admin/quotes/all")) {
        return Promise.resolve(
          jsonResponse({ items: [], total: 0, page: 1, page_size: 100 })
        );
      }
      return Promise.resolve(jsonResponse({ items: [] }));
    });

    const response = await GET(req("acme"));
    const body = await response.json();

    expect(response.status).toBe(200);
    const groupNames = body.groups.map((g: { group: string }) => g.group);
    expect(groupNames).toEqual(["Clientes", "Empresas", "Orders"]);
    expect(body.groups[0].items[0]).toEqual({
      label: "Acme Studio",
      sub: "hi@acme.com",
      href: "/admin/clients/c1",
    });
  });
});
