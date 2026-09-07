import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { POST } from "./route";

function cookieStore(token?: string) {
  return {
    get: (name: string) => (name === "db_portal_at" && token ? { value: token } : undefined),
  };
}

function req(form: FormData) {
  return new Request("http://localhost/api/portal/recebimentos/documents/grp_abc", {
    method: "POST",
    body: form,
  });
}

const params = Promise.resolve({ group_id: "grp_abc" });

describe("POST /api/portal/recebimentos/documents/[group_id]", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
    cookiesMock.mockReset();
  });

  it("401s without the portal session cookie and never calls the backend", async () => {
    cookiesMock.mockResolvedValue(cookieStore(undefined));
    const form = new FormData();
    form.append("file", new File(["x"], "doc.pdf", { type: "application/pdf" }));

    const res = await POST(req(form), { params });

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("422s when no file is attached", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));

    const res = await POST(req(new FormData()), { params });

    expect(res.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("422s on an unsupported mime type", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));
    const form = new FormData();
    form.append("file", new File(["x"], "doc.txt", { type: "text/plain" }));

    const res = await POST(req(form), { params });

    expect(res.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("422s on a file larger than 10 MB", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.pdf", {
      type: "application/pdf",
    });
    const form = new FormData();
    form.append("file", big);

    const res = await POST(req(form), { params });

    expect(res.status).toBe(422);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forwards a valid file to the backend with the bearer token", async () => {
    cookiesMock.mockResolvedValue(cookieStore("token-abc"));
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ status: "PENDING" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );
    const form = new FormData();
    form.append("file", new File(["hello"], "doc.pdf", { type: "application/pdf" }));

    const res = await POST(req(form), { params });

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/accounts/subaccount/documents/grp_abc");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer token-abc");
    expect(init.body).toBeInstanceOf(FormData);
  });
});
