import "server-only";
import { adminFetch } from "../api";
import type {
  AdminCompanyDetail,
  AdminCompanyFeature,
  AdminCompanyListItem,
  AdminSubaccountLink,
} from "../types";

// Real: GET /admin/companies (see docs/plano-admin-empresas-cota-split.md §5).
export async function listCompanies(search?: string): Promise<AdminCompanyListItem[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const page = await adminFetch<{ items: AdminCompanyListItem[] }>(`/admin/companies${query}`);
  return page.items;
}

// Real: GET /admin/companies/{id}.
export async function getCompany(id: string): Promise<AdminCompanyDetail> {
  return adminFetch<AdminCompanyDetail>(`/admin/companies/${id}`);
}

// Real: PATCH /admin/companies/{id}/split-quota.
export function setSplitQuota(id: string, splitQuotaPercent: number | null) {
  return adminFetch<AdminSubaccountLink>(`/admin/companies/${id}/split-quota`, {
    method: "PATCH",
    body: JSON.stringify({ split_quota_percent: splitQuotaPercent }),
  });
}

// Real: POST /admin/companies/{id}/link-subaccount.
export function linkSubaccount(id: string, payload: Record<string, unknown>) {
  return adminFetch<AdminSubaccountLink>(`/admin/companies/${id}/link-subaccount`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Real: POST /admin/companies/{id}/subaccount/manual. Fallback for when
// /provision-subaccount can't run (no/incomplete billing profile) or already
// left the link CREATION_FAILED -- the admin supplies the Asaas fields by
// hand instead of them coming from CompanyBillingProfile. A "successful"
// call can still come back with provisioning_status "CREATION_FAILED" (the
// backend swallows the Asaas rejection into the link row) -- callers must
// check the returned link, not just whether the promise resolved.
export function createManualSubaccount(id: string, payload: Record<string, unknown>) {
  return adminFetch<AdminSubaccountLink>(`/admin/companies/${id}/subaccount/manual`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Real: GET /admin/companies/{id}/features.
export function listFeatures(id: string) {
  return adminFetch<AdminCompanyFeature[]>(`/admin/companies/${id}/features`);
}

// Real: POST /admin/companies/{id}/features/{featureCode}/enable.
export function enableFeature(id: string, featureCode: string) {
  return adminFetch<AdminCompanyFeature>(
    `/admin/companies/${id}/features/${featureCode}/enable`,
    { method: "POST" }
  );
}

// Real: POST /admin/companies/{id}/features/{featureCode}/disable.
export function disableFeature(id: string, featureCode: string) {
  return adminFetch<AdminCompanyFeature>(
    `/admin/companies/${id}/features/${featureCode}/disable`,
    { method: "POST" }
  );
}
