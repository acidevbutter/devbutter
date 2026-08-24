import "server-only";
import { AdminApiError, adminFetch } from "../api";
import type { AdminConversationDetail, AdminConversationListItem } from "../types";

interface AdminConversationListPage {
  items: AdminConversationListItem[];
  total: number;
  page: number;
  page_size: number;
}

// Real: GET /admin/conversations.
export async function listConversations(filter?: {
  hasQuote?: boolean;
}): Promise<AdminConversationListItem[]> {
  const params = new URLSearchParams({ page_size: "100" });
  if (filter?.hasQuote !== undefined) params.set("has_quote", String(filter.hasQuote));
  const page = await adminFetch<AdminConversationListPage>(
    `/admin/conversations?${params.toString()}`
  );
  return page.items;
}

// Real: GET /admin/conversations/{id}.
export async function getConversation(id: string): Promise<AdminConversationDetail | null> {
  try {
    return await adminFetch<AdminConversationDetail>(`/admin/conversations/${id}`);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) return null;
    throw err;
  }
}
