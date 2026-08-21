import "server-only";
import { mockCatalogEntries } from "../mock/data";
import type { PortalCatalogEntry } from "../types";

export async function listCatalogEntries(): Promise<PortalCatalogEntry[]> {
  return mockCatalogEntries;
}

// MOCKED: mutates the in-memory array directly (module-level, resets on
// server restart) — same tradeoff as lib/admin/mock/data.ts, no persistence.
export async function saveCatalogEntry(entry: {
  id?: string;
  type: PortalCatalogEntry["type"];
  description: string;
}): Promise<void> {
  if (entry.id) {
    const existing = mockCatalogEntries.find((e) => e.id === entry.id);
    if (existing) {
      existing.type = entry.type;
      existing.description = entry.description;
      return;
    }
  }
  mockCatalogEntries.push({ id: `cat-${Date.now()}`, type: entry.type, description: entry.description });
}

export async function deleteCatalogEntry(id: string): Promise<void> {
  const idx = mockCatalogEntries.findIndex((e) => e.id === id);
  if (idx !== -1) mockCatalogEntries.splice(idx, 1);
}
