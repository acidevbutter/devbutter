import "server-only";
import { adminFetch } from "../api";
import { maskTail } from "../asaas-types";
import type {
  AsaasAccessToken,
  AsaasAuditLog,
  AsaasListEnvelope,
  AsaasPayment,
  AsaasSplitRule,
  AsaasSubaccount,
} from "../asaas-types";

export type {
  AsaasAccessToken,
  AsaasAuditLog,
  AsaasListEnvelope,
  AsaasPayment,
  AsaasSplitRule,
  AsaasSubaccount,
} from "../asaas-types";
export { maskTail, unwrapList } from "../asaas-types";

// Real: GET /admin/subaccounts
export function listSubaccounts(params?: {
  name?: string;
  limit?: number;
  offset?: number;
}): Promise<AsaasListEnvelope<AsaasSubaccount>> {
  const q = new URLSearchParams();
  if (params?.name) q.set("name", params.name);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const qs = q.toString();
  return adminFetch<AsaasListEnvelope<AsaasSubaccount>>(`/admin/subaccounts${qs ? `?${qs}` : ""}`);
}

// Real: GET /admin/subaccounts/{id}
export function getSubaccount(accountId: string): Promise<AsaasSubaccount> {
  return adminFetch<AsaasSubaccount>(`/admin/subaccounts/${encodeURIComponent(accountId)}`);
}

// Real: POST /admin/subaccounts/{id}/resend-activation-link
export function resendActivationLink(accountId: string): Promise<unknown> {
  return adminFetch(`/admin/subaccounts/${encodeURIComponent(accountId)}/resend-activation-link`, {
    method: "POST",
  });
}

// Real: POST /admin/subaccounts/{id}/access-tokens. The proxy deliberately
// strips the raw apiKey: it is retained only in its encrypted server-side
// store and never crosses into the browser.
export function createAccessToken(accountId: string, name: string): Promise<unknown> {
  return adminFetch(`/admin/subaccounts/${encodeURIComponent(accountId)}/access-tokens`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

// Real: GET /admin/subaccounts/{id}/access-tokens
//
// The backend returns the raw Asaas apiKey. That value must never reach a
// client component -- it's masked here, server-side, before it leaves this
// function. See docs/prompts/nao-vazar-apikey-asaas-client.md.
export async function listAccessTokens(
  accountId: string
): Promise<AsaasListEnvelope<AsaasAccessToken> | AsaasAccessToken[]> {
  const result = await adminFetch<AsaasListEnvelope<AsaasAccessToken> | AsaasAccessToken[]>(
    `/admin/subaccounts/${encodeURIComponent(accountId)}/access-tokens`
  );
  return maskAccessTokens(result);
}

function maskAccessTokens<T extends AsaasListEnvelope<AsaasAccessToken> | AsaasAccessToken[]>(
  result: T
): T {
  const mask = (token: AsaasAccessToken): AsaasAccessToken =>
    token.apiKey ? { ...token, apiKey: maskTail(token.apiKey, 6) } : token;

  return Array.isArray(result)
    ? (result.map(mask) as T)
    : ({ ...result, data: result.data.map(mask) } as T);
}

// Real: DELETE /admin/subaccounts/{id}/access-tokens/{tokenId}
export function revokeAccessToken(accountId: string, tokenId: string): Promise<unknown> {
  return adminFetch(
    `/admin/subaccounts/${encodeURIComponent(accountId)}/access-tokens/${encodeURIComponent(tokenId)}`,
    { method: "DELETE" }
  );
}

// Real: GET /admin/subaccounts/{id}/split-rules
export function listSplitRules(accountId: string): Promise<AsaasSplitRule[]> {
  return adminFetch<AsaasSplitRule[]>(
    `/admin/subaccounts/${encodeURIComponent(accountId)}/split-rules`
  );
}

// Real: PATCH /admin/subaccounts/{id}/split-rules/{ruleId}
export function updateSplitRule(
  accountId: string,
  ruleId: string,
  payload: Record<string, unknown>
): Promise<AsaasSplitRule> {
  return adminFetch<AsaasSplitRule>(
    `/admin/subaccounts/${encodeURIComponent(accountId)}/split-rules/${encodeURIComponent(ruleId)}`,
    { method: "PATCH", body: JSON.stringify(payload) }
  );
}

// Real: GET /admin/subaccounts/{id}/payments
export function listPayments(
  accountId: string,
  params?: { status?: string; limit?: number; offset?: number }
): Promise<AsaasListEnvelope<AsaasPayment>> {
  const q = new URLSearchParams();
  if (params?.status) q.set("status", params.status);
  if (params?.limit != null) q.set("limit", String(params.limit));
  if (params?.offset != null) q.set("offset", String(params.offset));
  const qs = q.toString();
  return adminFetch<AsaasListEnvelope<AsaasPayment>>(
    `/admin/subaccounts/${encodeURIComponent(accountId)}/payments${qs ? `?${qs}` : ""}`
  );
}

// Real: POST /admin/subaccounts/{id}/payments/{paymentId}/refund
export function refundPayment(
  accountId: string,
  paymentId: string,
  payload: Record<string, unknown> = {}
): Promise<unknown> {
  return adminFetch(
    `/admin/subaccounts/${encodeURIComponent(accountId)}/payments/${encodeURIComponent(paymentId)}/refund`,
    { method: "POST", body: JSON.stringify(payload) }
  );
}

// Real: POST /admin/subaccounts/{id}/payments/{paymentId}/cancel
export function cancelPayment(accountId: string, paymentId: string): Promise<unknown> {
  return adminFetch(
    `/admin/subaccounts/${encodeURIComponent(accountId)}/payments/${encodeURIComponent(paymentId)}/cancel`,
    { method: "POST" }
  );
}

// Real: GET /admin/asaas/audit-logs
export function listAuditLogs(params?: {
  client_id?: string;
  limit?: number;
}): Promise<AsaasListEnvelope<AsaasAuditLog> | AsaasAuditLog[]> {
  const q = new URLSearchParams();
  if (params?.client_id) q.set("client_id", params.client_id);
  if (params?.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  return adminFetch(`/admin/asaas/audit-logs${qs ? `?${qs}` : ""}`);
}
