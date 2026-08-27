import "server-only";
import { adminFetch } from "../api";
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

// Real: GET /admin/subaccounts/{id}/access-tokens
export function listAccessTokens(
  accountId: string
): Promise<AsaasListEnvelope<AsaasAccessToken> | AsaasAccessToken[]> {
  return adminFetch(`/admin/subaccounts/${encodeURIComponent(accountId)}/access-tokens`);
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
