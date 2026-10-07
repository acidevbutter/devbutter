import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/contato", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const valid = { name: "Ana", email: "ana@empresa.com.br", message: "O estoque não fecha." };

describe("POST /api/contato", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("WAITLIST_WEBHOOK_URL", "https://hooks.example/forms");
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("encaminha o recado ao webhook com source=contato", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    const res = await POST(req(valid));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://hooks.example/forms");
    expect(JSON.parse(init.body)).toEqual({ ...valid, source: "contato" });
  });

  it("recusa corpo inválido e campos faltando", async () => {
    expect((await POST(req("{nope"))).status).toBe(400);
    expect((await POST(req({ ...valid, email: "ana@" }))).status).toBe(400);
    expect((await POST(req({ ...valid, message: "  " }))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("honeypot preenchido finge sucesso e não envia", async () => {
    const res = await POST(req({ ...valid, website: "http://spam" }));
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sem webhook configurado responde 503 not_configured", async () => {
    vi.stubEnv("WAITLIST_WEBHOOK_URL", "");
    const res = await POST(req(valid));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "not_configured" });
  });

  it("falha do webhook vira 502 upstream_failed", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    expect((await POST(req(valid))).status).toBe(502);
    fetchMock.mockRejectedValue(new Error("down"));
    expect((await POST(req(valid))).status).toBe(502);
  });
});
