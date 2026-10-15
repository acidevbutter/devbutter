import "server-only";
import { adminFetch } from "../api";
import type { OrderApprovalRequest, OrderRead, QuoteEdit, QuoteManualCreate, QuoteRead } from "../types";

/** Real: GET /admin/quotes — the draft review queue. */
export function listReviewQueue() {
  return adminFetch<QuoteRead[]>("/admin/quotes");
}

interface AdminQuoteListPage {
  items: QuoteRead[];
  total: number;
  page: number;
  page_size: number;
}

/** Real: GET /admin/quotes/all — every quote, any status. */
export async function listAllQuotesForTable(): Promise<QuoteRead[]> {
  const page = await adminFetch<AdminQuoteListPage>("/admin/quotes/all?page_size=100");
  return page.items;
}

/** Real: GET /admin/quotes/{id} -- unredacted (GET /quotes/{id} hides price_range from non-approved quotes). */
export function getQuote(id: string): Promise<QuoteRead> {
  return adminFetch<QuoteRead>(`/admin/quotes/${id}`);
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
