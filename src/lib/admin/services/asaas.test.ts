import { afterEach, describe, expect, it, vi } from "vitest";

const { adminFetchMock } = vi.hoisted(() => ({ adminFetchMock: vi.fn() }));
vi.mock("../api", () => ({ adminFetch: adminFetchMock }));

import { createAccessToken, listAccessTokens } from "./asaas";

describe("listAccessTokens", () => {
  afterEach(() => {
    adminFetchMock.mockReset();
  });

  it("masks apiKey on every token when the backend returns a bare array", async () => {
    const rawKey = "$aact_prod_ABCDEF123456";
    adminFetchMock.mockResolvedValue([
      { id: "tok_1", name: "Chave prod", status: "active", apiKey: rawKey },
    ]);

    const result = await listAccessTokens("acc_1");

    expect(adminFetchMock).toHaveBeenCalledWith(
      "/admin/subaccounts/acc_1/access-tokens"
    );
    const tokens = Array.isArray(result) ? result : result.data;
    expect(tokens[0].apiKey).not.toBe(rawKey);
    expect(tokens[0].apiKey).not.toContain(rawKey);
    expect(tokens[0].apiKey).toBe(`••••${rawKey.slice(-6)}`);
  });

  it("masks apiKey on every token when the backend returns a list envelope", async () => {
    const rawKey = "$aact_prod_ZZZZZZ999999";
    adminFetchMock.mockResolvedValue({
      object: "list",
      hasMore: false,
      data: [{ id: "tok_2", apiKey: rawKey }],
    });

    const result = await listAccessTokens("acc_2");

    const tokens = Array.isArray(result) ? result : result.data;
    expect(tokens[0].apiKey).toBe(`••••${rawKey.slice(-6)}`);
    expect(JSON.stringify(result)).not.toContain(rawKey);
  });

  it("leaves tokens without an apiKey untouched", async () => {
    adminFetchMock.mockResolvedValue([{ id: "tok_3", status: "revoked" }]);

    const result = await listAccessTokens("acc_3");

    const tokens = Array.isArray(result) ? result : result.data;
    expect(tokens[0]).toEqual({ id: "tok_3", status: "revoked" });
  });

  it("creates an internal token without handling a raw apiKey in the browser", async () => {
    adminFetchMock.mockResolvedValue({ id: "tok_4", name: "Internal integration" });

    await createAccessToken("acc_4", "Internal integration");

    expect(adminFetchMock).toHaveBeenCalledWith("/admin/subaccounts/acc_4/access-tokens", {
      method: "POST",
      body: JSON.stringify({ name: "Internal integration" }),
    });
  });
});
