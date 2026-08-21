import "server-only";
import { portalFetch } from "../api";
import type { PortalCatalogEntry } from "../types";

export async function listCatalogEntries(): Promise<PortalCatalogEntry[]> {
  return portalFetch<PortalCatalogEntry[]>("/service-catalog");
}

export async function saveCatalogEntry(entry: {
  id?: string;
  type: PortalCatalogEntry["type"];
  description: string;
}): Promise<void> {
  if (entry.id) {
    await portalFetch(`/service-catalog/${entry.id}`, {
      method: "PATCH",
      body: JSON.stringify({ type: entry.type, description: entry.description }),
    });
    return;
  }
  await portalFetch("/service-catalog", {
    method: "POST",
    body: JSON.stringify({ type: entry.type, description: entry.description }),
  });
}

export async function deleteCatalogEntry(id: string): Promise<void> {
  await portalFetch(`/service-catalog/${id}`, { method: "DELETE", parseJson: false });
}
