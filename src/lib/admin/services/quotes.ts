import "server-only";
import { adminFetch } from "../api";
import { mockNonDraftQuotes } from "../mock/data";
import type { OrderApprovalRequest, OrderRead, QuoteEdit, QuoteManualCreate, QuoteRead } from "../types";

/** Real: GET /admin/quotes — the draft review queue. */
export function listReviewQueue() {
  return adminFetch<QuoteRead[]>("/admin/quotes");
}

/**
 * Quotes List screen (1c) needs every status, but GET /admin/quotes only
 * returns drafts (see docs/admin-api-contracts.md — no "list all" route
 * exists). Merge the real drafts with mocked approved/edited/rejected rows.
 */
export async function listAllQuotesForTable(): Promise<QuoteRead[]> {
  const drafts = await listReviewQueue();
  return [...drafts, ...mockNonDraftQuotes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function isMockQuoteId(id: string) {
  return id.startsWith("mock-");
}

export async function getQuote(id: string): Promise<QuoteRead> {
  if (isMockQuoteId(id)) {
    const found = mockNonDraftQuotes.find((q) => q.id === id);
    if (!found) throw new Error("Mock quote not found");
    return found;
  }
  return adminFetch<QuoteRead>(`/quotes/${id}`);
}

export function editQuote(id: string, payload: QuoteEdit) {
  return adminFetch<QuoteRead>(`/admin/quotes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function rejectQuote(id: string) {
  return adminFetch<QuoteRead>(`/admin/quotes/${id}/reject`, { method: "POST" });
}

export function approveQuote(id: string, payload: OrderApprovalRequest) {
  return adminFetch<OrderRead>(`/admin/quotes/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createManualQuote(payload: QuoteManualCreate) {
  return adminFetch<QuoteRead>("/quotes/manual", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
