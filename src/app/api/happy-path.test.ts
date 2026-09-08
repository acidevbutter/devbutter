import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { cookiesMock } = vi.hoisted(() => ({ cookiesMock: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));

import { POST as adminLogout } from "./admin/auth/logout/route";
import { GET as adminSearch } from "./admin/search/route";
import { POST as login } from "./portal/auth/login/route";
import { POST as portalLogout } from "./portal/auth/logout/route";
import { GET as passwordCheck } from "./portal/auth/password-setup/[token]/route";
import { POST as passwordSetup } from "./portal/auth/password-setup/route";
import { POST as signup } from "./portal/auth/signup/route";
import { PATCH as businessProfile } from "./portal/conversations/[id]/business-profile/route";
import { POST as draftQuote } from "./portal/conversations/[id]/draft-quote/route";
import { POST as message } from "./portal/conversations/[id]/messages/route";
import { GET as conversation } from "./portal/conversations/[id]/route";
import { POST as selectOption } from "./portal/conversations/[id]/select-option/route";
import { GET as currentConversation } from "./portal/conversations/current/route";
import { POST as createConversation } from "./portal/conversations/route";
import { DELETE as deletePaymentMethod } from "./portal/payment-methods/[payment_method_id]/route";
import { POST as pay } from "./portal/payment-methods/pay/route";
import { GET as paymentMethods } from "./portal/payment-methods/route";
import { POST as securePaymentMethod } from "./portal/payment-methods/secure/route";
import { POST as paymentMethodSession } from "./portal/payment-methods/session/route";
import { GET as commercialInfo, POST as saveCommercialInfo } from "./portal/recebimentos/commercial-info/route";
import { POST as uploadDocument } from "./portal/recebimentos/documents/[group_id]/route";
import { GET as onboarding } from "./portal/recebimentos/onboarding/route";
import { POST as resendActivation } from "./portal/recebimentos/resend-activation/route";
import { GET as recebimentosStatus } from "./portal/recebimentos/status/route";
import { POST as waitlist } from "./waitlist/route";

type CookieInput = { name: string; value: string } | string;

function makeCookieStore(values: Record<string, string> = {}) {
  const store = new Map(Object.entries(values));
  return {
    get: (name: string) => {
      const value = store.get(name);
      return value ? { value } : undefined;
    },
    set: (name: string, value: string) => store.set(name, value),
    delete: (input: CookieInput) => store.delete(typeof input === "string" ? input : input.name),
  };
}

const params = Promise.resolve({ id: "conv_1" });
const paymentMethodParams = Promise.resolve({ payment_method_id: "pm_1" });
const documentParams = Promise.resolve({ group_id: "identity" });

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("caminhos felizes dos Route Handlers", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    cookiesMock.mockResolvedValue(
      makeCookieStore({ db_portal_at: "portal-token", db_admin_at: "admin-token", db_conversation_id: "conv_1" }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
    cookiesMock.mockReset();
  });

  it("encerra as sessões admin e portal", async () => {
    expect((await adminLogout(new Request("http://localhost/api/admin/auth/logout", { method: "POST" }))).status).toBe(303);
    expect((await portalLogout(new Request("http://localhost/api/portal/auth/logout", { method: "POST" }))).status).toBe(303);
  });

  it("pesquisa no admin", async () => {
    fetchMock.mockImplementation((url: string) => {
      if (url.includes("/admin/clients")) return Promise.resolve(json({ items: [{ id: "client_1", name: "DevButter", email: "oi@devbutter.tech" }] }));
      if (url.includes("/admin/companies")) return Promise.resolve(json({ items: [] }));
      if (url.includes("/admin/orders")) return Promise.resolve(json({ items: [] }));
      if (url.includes("/admin/invoices")) return Promise.resolve(json({ items: [] }));
      return Promise.resolve(json({ items: [] }));
    });
    const response = await adminSearch(new Request("http://localhost/api/admin/search?q=site"));
    expect(response.status).toBe(200);
    expect((await response.json()).groups[0].group).toBe("Clientes");
  });

  it("autentica portal e promove administrador", async () => {
    fetchMock.mockResolvedValueOnce(json({ access_token: "access", refresh_token: "refresh" })).mockResolvedValueOnce(json({ is_admin: true }));
    const response = await login(new Request("http://localhost/api/portal/auth/login", {
      method: "POST", body: JSON.stringify({ email: "admin@devbutter.tech", password: "secret" }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, isAdmin: true });
  });

  it("consulta e conclui definição de senha", async () => {
    fetchMock.mockResolvedValueOnce(json({ email: "cliente@devbutter.tech" }));
    expect((await passwordCheck(new Request("http://localhost/api/portal/auth/password-setup/token_1"), { params: Promise.resolve({ token: "token_1" }) })).status).toBe(200);
    fetchMock.mockResolvedValueOnce(json({ access_token: "access", refresh_token: "refresh" }));
    expect((await passwordSetup(new Request("http://localhost/api/portal/auth/password-setup", { method: "POST", body: JSON.stringify({ token: "token_1", password: "senha-segura" }) }))).status).toBe(200);
  });

  it("cria uma conta do portal", async () => {
    fetchMock.mockResolvedValueOnce(json({ access_token: "access", refresh_token: "refresh" }, 201));
    const response = await signup(new Request("http://localhost/api/portal/auth/signup", {
      method: "POST", body: JSON.stringify({ name: "Cliente", email: "cliente@devbutter.tech", password: "senha-segura" }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it("cria, retoma e avança a conversa de cotação", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "conv_1" }, 201));
    expect((await createConversation()).status).toBe(201);
    fetchMock.mockResolvedValueOnce(json({ id: "conv_1", status: "collecting" }));
    expect((await currentConversation()).status).toBe(200);
    for (const call of [
      () => conversation(new Request("http://localhost/api/portal/conversations/conv_1"), { params }),
      () => message(new Request("http://localhost/api/portal/conversations/conv_1/messages", { method: "POST", body: JSON.stringify({ content: "Preciso de um site" }) }), { params }),
      () => selectOption(new Request("http://localhost/api/portal/conversations/conv_1/select-option", { method: "POST", body: JSON.stringify({ option_id: "site" }) }), { params }),
      () => businessProfile(new Request("http://localhost/api/portal/conversations/conv_1/business-profile", { method: "PATCH", body: JSON.stringify({ company_name: "DevButter" }) }), { params }),
    ]) {
      fetchMock.mockResolvedValueOnce(json({ id: "conv_1", status: "collecting" }));
      expect((await call()).status).toBe(200);
    }
    fetchMock.mockResolvedValueOnce(json({ quote_id: "quote_1", reference: "DB-1", scope_summary: "Site", price_range: null, timeline: null, tokens: null, pending_account_link: false }));
    expect((await draftQuote(new Request("http://localhost/api/portal/conversations/conv_1/draft-quote", { method: "POST", body: "{}" }), { params })).status).toBe(201);
  });

  it("lista, cria contexto, cadastra, cobra e revoga método de pagamento", async () => {
    for (const call of [
      () => paymentMethods(),
      () => paymentMethodSession(new Request("http://localhost/api/portal/payment-methods/session", { method: "POST", body: JSON.stringify({ invoice_id: "inv_1" }) })),
      () => securePaymentMethod(new Request("http://localhost/api/portal/payment-methods/secure", { method: "POST", body: '{"ciphertext":"opaque"}' })),
      () => pay(new Request("http://localhost/api/portal/payment-methods/pay", { method: "POST", body: JSON.stringify({ invoice_id: "inv_1", payment_method_id: "pm_1", operation: "save_and_pay" }) })),
      () => deletePaymentMethod(new Request("http://localhost/api/portal/payment-methods/pm_1", { method: "DELETE" }), { params: paymentMethodParams }),
    ]) {
      fetchMock.mockResolvedValueOnce(json({ id: "pm_1", status: "active" }));
      const response = await call();
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
    }
  });

  it("consulta e atualiza onboarding de recebimentos", async () => {
    for (const call of [
      () => commercialInfo(),
      () => saveCommercialInfo(new Request("http://localhost/api/portal/recebimentos/commercial-info", { method: "POST", body: JSON.stringify({ incomeValue: 1000 }) })),
      () => onboarding(),
      () => resendActivation(),
    ]) {
      fetchMock.mockResolvedValueOnce(json({ status: "PENDING" }));
      expect((await call()).status).toBe(200);
    }
    fetchMock.mockResolvedValueOnce(json({ onboarding_required: true, subaccount_status: "PENDING" })).mockResolvedValueOnce(json({ status: "PENDING" }));
    expect((await recebimentosStatus()).status).toBe(200);
  });

  it("envia um documento de onboarding", async () => {
    fetchMock.mockResolvedValueOnce(json({ status: "PENDING" }));
    const form = new FormData();
    form.append("file", new File(["pdf"], "documento.pdf", { type: "application/pdf" }));
    const response = await uploadDocument(new Request("http://localhost/api/portal/recebimentos/documents/identity", { method: "POST", body: form }), { params: documentParams });
    expect(response.status).toBe(200);
  });

  it("encaminha inscrição válida da waitlist", async () => {
    vi.stubEnv("WAITLIST_WEBHOOK_URL", "https://hooks.example.test/waitlist");
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const response = await waitlist(new Request("http://localhost/api/waitlist", { method: "POST", body: JSON.stringify({ email: "lead@devbutter.tech" }) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
