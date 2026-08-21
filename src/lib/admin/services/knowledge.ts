import "server-only";
import { mockKnowledgeEntries } from "../mock/data";
import type { KnowledgeEntry } from "../types";

// MOCK: contract in docs/admin-api-contracts.md#knowledge-base--feeds-ai-quote-suggestions
// No knowledge-base model exists on the backend at all yet. Mutates the
// in-memory seed array directly — resets on server restart, same as every
// other mock in this file tree.

export async function listKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  return mockKnowledgeEntries;
}

export async function getKnowledgeEntry(id: string): Promise<KnowledgeEntry | null> {
  return mockKnowledgeEntries.find((e) => e.id === id) ?? null;
}

export async function saveKnowledgeEntry(
  input: Omit<KnowledgeEntry, "id" | "updated_at"> & { id?: string }
): Promise<KnowledgeEntry> {
  const now = new Date().toISOString();

  if (input.id) {
    const existing = mockKnowledgeEntries.find((e) => e.id === input.id);
    if (!existing) throw new Error("Knowledge entry not found");
    Object.assign(existing, input, { updated_at: now });
    return existing;
  }

  const created: KnowledgeEntry = {
    ...input,
    id: `mock-kb-${crypto.randomUUID()}`,
    updated_at: now,
  };
  mockKnowledgeEntries.push(created);
  return created;
}

export async function deleteKnowledgeEntry(id: string): Promise<void> {
  const index = mockKnowledgeEntries.findIndex((e) => e.id === id);
  if (index !== -1) mockKnowledgeEntries.splice(index, 1);
}
