import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const hosts = "127.0.0.1";
const portalCookie = "db_portal_at=portal-token; db_conversation_id=conv_1";
const adminCookie = "db_admin_at=admin-token";
const upstreamCalls = [];
const frontendCalls = [];

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function routeUpstream(request, response) {
  const url = new URL(request.url, "http://upstream.test");
  upstreamCalls.push(`${request.method} ${url.pathname}`);

  if (url.pathname === "/waitlist") return json(response, 204, {});
  if (url.pathname === "/accounts/login" || url.pathname === "/accounts/signup" || url.pathname === "/accounts/password-setup") {
    return json(response, 200, { access_token: "access", refresh_token: "refresh" });
  }
  if (url.pathname === "/accounts/me") return json(response, 200, { name: "Cliente", email: "cliente@example.test", is_admin: false });
  if (url.pathname.startsWith("/accounts/password-setup/")) return json(response, 200, { email: "cliente@example.test" });
  if (url.pathname === "/conversations" && request.method === "POST") return json(response, 201, { id: "conv_1" });
  if (url.pathname.startsWith("/conversations/")) {
    if (url.pathname.endsWith("/draft-quote")) return json(response, 200, { quote_id: "quote_1", reference: "DB-1", scope_summary: "Site", price_range: null, timeline: null, tokens: null, pending_account_link: false });
    return json(response, 200, { id: "conv_1", status: "collecting" });
  }
  if (url.pathname === "/payment-methods" && request.method === "GET") return json(response, 200, []);
  if (url.pathname === "/payment-methods" || url.pathname === "/payment-methods/session") return json(response, 200, { id: "pm_1", status: "active" });
  if (url.pathname.startsWith("/payment-methods/")) return json(response, 200, {});
  if (url.pathname === "/payments") return json(response, 200, { id: "attempt_1", status: "PENDING" });
  if (url.pathname === "/accounts/subaccount/commercial-info") return json(response, 200, { status: "PENDING" });
  if (url.pathname === "/accounts/subaccount/onboarding") return json(response, 200, { status: "PENDING", groups: [] });
  if (url.pathname === "/accounts/subaccount/resend-activation") return json(response, 204, {});
  if (url.pathname.startsWith("/accounts/subaccount/documents/")) return json(response, 200, { status: "PENDING" });
  if (url.pathname.startsWith("/admin/clients")) return json(response, 200, { items: [{ id: "client_1", name: "Cliente", email: "cliente@example.test" }] });
  if (url.pathname.startsWith("/admin/companies")) return json(response, 200, { items: [] });
  if (url.pathname.startsWith("/admin/orders") || url.pathname.startsWith("/admin/invoices") || url.pathname.startsWith("/admin/quotes/all")) return json(response, 200, { items: [] });
  return json(response, 404, { detail: `Unhandled upstream path: ${url.pathname}` });
}

async function listen(server) {
  server.listen(0, hosts);
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return address.port;
}

async function freePort() {
  const probe = createServer();
  const port = await listen(probe);
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

async function waitFor(url, child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Next encerrou com código ${child.exitCode}`);
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ready@example.test" }),
        signal: AbortSignal.timeout(1_000),
      });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Next não ficou disponível em 30 segundos");
}

async function stop(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 5_000))]);
  if (child.exitCode === null) child.kill("SIGKILL");
}

async function main() {
  const upstream = createServer(routeUpstream);
  const upstreamPort = await listen(upstream);
  const nextPort = await freePort();
  const reservation = createServer();
  // Reserve the chosen port only long enough to avoid a race before Next binds it.
  reservation.listen(nextPort, hosts);
  await once(reservation, "listening");
  await new Promise((resolve) => reservation.close(resolve));

  const next = spawn(process.execPath, [nextBin, "dev", "--hostname", hosts, "--port", String(nextPort)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      API_BASE_URL: `http://${hosts}:${upstreamPort}`,
      WAITLIST_WEBHOOK_URL: `http://${hosts}:${upstreamPort}/waitlist`,
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  next.stdout.on("data", (chunk) => { logs += chunk; });
  next.stderr.on("data", (chunk) => { logs += chunk; });
  const baseUrl = `http://${hosts}:${nextPort}`;

  try {
    await waitFor(`${baseUrl}/api/waitlist`, next);
    const request = async (method, path, { body, cookie } = {}) => {
      frontendCalls.push(`${method} ${path}`);
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        redirect: "manual",
        headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(cookie ? { Cookie: cookie } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      return response;
    };
    const expectStatus = async (method, path, status, options) => {
      const response = await request(method, path, options);
      assert.equal(response.status, status, `${method} ${path}`);
      return response;
    };

    await expectStatus("POST", "/api/waitlist", 200, { body: { email: "lead@example.test" } });
    await expectStatus("POST", "/api/admin/auth/logout", 303, { cookie: adminCookie });
    await expectStatus("GET", "/api/admin/search?q=cliente", 200, { cookie: adminCookie });
    await expectStatus("POST", "/api/portal/auth/login", 200, { body: { email: "cliente@example.test", password: "secret" } });
    await expectStatus("POST", "/api/portal/auth/logout", 303, { cookie: portalCookie });
    await expectStatus("GET", "/api/portal/auth/password-setup/token_1", 200);
    await expectStatus("POST", "/api/portal/auth/password-setup", 200, { body: { token: "token_1", password: "senha-segura" } });
    await expectStatus("POST", "/api/portal/auth/signup", 200, { body: { name: "Cliente", email: "novo@example.test", password: "senha-segura" } });
    await expectStatus("POST", "/api/portal/conversations", 201, { cookie: portalCookie });
    await expectStatus("GET", "/api/portal/conversations/current", 200, { cookie: portalCookie });
    await expectStatus("GET", "/api/portal/conversations/conv_1", 200, { cookie: portalCookie });
    await expectStatus("POST", "/api/portal/conversations/conv_1/messages", 200, { cookie: portalCookie, body: { content: "Preciso de um site" } });
    await expectStatus("POST", "/api/portal/conversations/conv_1/select-option", 200, { cookie: portalCookie, body: { option_id: "site" } });
    await expectStatus("PATCH", "/api/portal/conversations/conv_1/business-profile", 200, { cookie: portalCookie, body: { company_name: "Cliente" } });
    await expectStatus("POST", "/api/portal/conversations/conv_1/draft-quote", 201, { cookie: portalCookie, body: {} });
    await expectStatus("GET", "/api/portal/payment-methods", 200, { cookie: portalCookie });
    await expectStatus("POST", "/api/portal/payment-methods/session", 201, { cookie: portalCookie, body: { invoice_id: "inv_1" } });
    await expectStatus("POST", "/api/portal/payment-methods/secure", 201, { cookie: portalCookie, body: { ciphertext: "opaque" } });
    await expectStatus("POST", "/api/portal/payment-methods/pay", 202, { cookie: portalCookie, body: { invoice_id: "inv_1", payment_method_id: "pm_1" } });
    await expectStatus("DELETE", "/api/portal/payment-methods/pm_1", 204, { cookie: portalCookie });
    await expectStatus("GET", "/api/portal/recebimentos/commercial-info", 200, { cookie: portalCookie });
    await expectStatus("POST", "/api/portal/recebimentos/commercial-info", 200, { cookie: portalCookie, body: { incomeValue: 1000 } });
    const documentResponse = await fetch(`${baseUrl}/api/portal/recebimentos/documents/identity`, {
      method: "POST",
      headers: { Cookie: portalCookie },
      body: (() => { const form = new FormData(); form.append("file", new Blob(["pdf"], { type: "application/pdf" }), "documento.pdf"); return form; })(),
    });
    frontendCalls.push("POST /api/portal/recebimentos/documents/identity");
    assert.equal(documentResponse.status, 200, "POST /api/portal/recebimentos/documents/identity");
    await expectStatus("GET", "/api/portal/recebimentos/onboarding", 200, { cookie: portalCookie });
    await expectStatus("POST", "/api/portal/recebimentos/resend-activation", 200, { cookie: portalCookie });
    await expectStatus("GET", "/api/portal/recebimentos/status", 200, { cookie: portalCookie });

    assert.equal(frontendCalls.length, 26, "todos os métodos BFF foram chamados por HTTP");
    assert.ok(upstreamCalls.length >= 26, "o BFF chamou o upstream controlado");
    console.log(`E2E BFF OK: ${frontendCalls.length} métodos HTTP via Next real e ${upstreamCalls.length} chamadas upstream.`);
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : error}\nLogs do Next:\n${logs}`);
  } finally {
    await stop(next);
    await new Promise((resolve) => upstream.close(resolve));
  }
}

await main();
