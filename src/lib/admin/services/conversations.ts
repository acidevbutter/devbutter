import "server-only";
import { mockConversationList, mockConversations } from "../mock/data";
import type { AdminConversationDetail, AdminConversationListItem } from "../types";

// MOCK: contract in docs/admin-api-contracts.md#get-adminconversations —
// conversations today are only readable by their owning account, no
// admin-wide list exists.
export async function listConversations(filter?: {
  hasQuote?: boolean;
}): Promise<AdminConversationListItem[]> {
  if (filter?.hasQuote === undefined) return mockConversationList;
  return mockConversationList.filter((c) =>
    filter.hasQuote ? c.resulting_quote_id !== null : c.resulting_quote_id === null
  );
}

export async function getConversation(id: string): Promise<AdminConversationDetail | null> {
  return mockConversations.find((c) => c.id === id) ?? null;
}
