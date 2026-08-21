import "server-only";
import { mockClientDetails, mockClients } from "../mock/data";
import type { AdminClientDetail, AdminClientListItem } from "../types";

// MOCK: contract in docs/admin-api-contracts.md#get-adminclients — no
// cross-account client listing exists on the backend yet (GET /accounts/me
// only returns the caller's own account).
export async function listClients(search?: string): Promise<AdminClientListItem[]> {
  if (!search) return mockClients;
  const needle = search.toLowerCase();
  return mockClients.filter(
    (c) => c.name.toLowerCase().includes(needle) || c.email.toLowerCase().includes(needle)
  );
}

// MOCK: contract in docs/admin-api-contracts.md#get-adminclientsaccount_id
export async function getClient(id: string): Promise<AdminClientDetail | null> {
  return mockClientDetails[id] ?? null;
}

/**
 * Real quotes/orders only carry an account_id (see app/quotes/schemas.py) —
 * there's no admin endpoint to resolve it to a name yet (same gap as
 * GET /admin/clients/{account_id} above). Falls back to a short id label so
 * real-backend rows still render something readable instead of nothing.
 */
export function resolveClientLabel(accountId: string): string {
  return mockClientDetails[accountId]?.name ?? `Conta ${accountId.slice(0, 8)}`;
}
