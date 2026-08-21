import "server-only";
import { mockCatalogEntries } from "../mock/data";
import type { AdminCatalogEntry } from "../types";

// MOCK: contract in docs/admin-api-contracts.md#get-admincatalog — the real
// service_catalog router is CRUD-complete but scoped to CurrentAccount, no
// cross-account admin view exists yet.
export async function listCatalogEntries(): Promise<AdminCatalogEntry[]> {
  return mockCatalogEntries;
}
