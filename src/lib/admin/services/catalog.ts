import "server-only";
import { adminFetch } from "../api";
import type { AdminCatalogEntry } from "../types";

// Real: GET /admin/catalog.
export async function listCatalogEntries(): Promise<AdminCatalogEntry[]> {
  const page = await adminFetch<{ items: AdminCatalogEntry[] }>("/admin/catalog");
  return page.items;
}
