import "server-only";
import { AdminApiError, adminFetch } from "../api";
import type { KnowledgeEntry } from "../types";

// Real: GET /admin/knowledge-entries.
export async function listKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  return adminFetch<KnowledgeEntry[]>("/admin/knowledge-entries");
}

export async function getKnowledgeEntry(id: string): Promise<KnowledgeEntry | null> {
  try {
    const entries = await listKnowledgeEntries();
    return entries.find((e) => e.id === id) ?? null;
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) return null;
    throw err;
  }
}

export async function saveKnowledgeEntry(
  input: Omit<KnowledgeEntry, "id" | "updated_at"> & { id?: string }
): Promise<KnowledgeEntry> {
  const { id, ...payload } = input;
  if (id) {
    return adminFetch<KnowledgeEntry>(`/admin/knowledge-entries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }
  return adminFetch<KnowledgeEntry>("/admin/knowledge-entries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteKnowledgeEntry(id: string): Promise<void> {
  await adminFetch(`/admin/knowledge-entries/${id}`, {
    method: "DELETE",
    parseJson: false,
  });
}
