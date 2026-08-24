import "server-only";
import { AdminApiError, adminFetch } from "../api";
import type { AdminClientDetail, AdminClientListItem } from "../types";

interface AdminClientListPage {
  items: AdminClientListItem[];
  total: number;
  page: number;
  page_size: number;
}

// Real: GET /admin/clients.
export async function listClients(search?: string): Promise<AdminClientListItem[]> {
  const query = search ? `?search=${encodeURIComponent(search)}&page_size=100` : "?page_size=100";
  const page = await adminFetch<AdminClientListPage>(`/admin/clients${query}`);
  return page.items;
}

// Real: GET /admin/clients/{account_id}.
export async function getClient(id: string): Promise<AdminClientDetail | null> {
  try {
    return await adminFetch<AdminClientDetail>(`/admin/clients/${id}`);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) return null;
    throw err;
  }
}

/**
 * Real quotes/orders only carry an account_id — there's no bulk
 * id-to-name resolver, so this falls back to a short id label if the
 * per-account lookup fails (e.g. a stale/deleted account).
 */
export async function resolveClientLabel(accountId: string): Promise<string> {
  const client = await getClient(accountId);
  return client?.name ?? `Conta ${accountId.slice(0, 8)}`;
}
