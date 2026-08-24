import "server-only";
import { adminFetch } from "../api";
import { getQuote } from "./quotes";
import { resolveClientLabel } from "./clients";
import type { AdminOrderListItem, InvoiceRead, OrderRead } from "../types";

interface AdminOrderListPage {
  items: AdminOrderListItem[];
  total: number;
  page: number;
  page_size: number;
}

// Real: GET /admin/orders.
export async function listOrders(): Promise<AdminOrderListItem[]> {
  const page = await adminFetch<AdminOrderListPage>("/admin/orders?page_size=100");
  return page.items;
}

// Real: GET /orders/{id}. Scope/timeline live on the quote it was approved
// from (deliverables aren't tracked as a separate field in the backend --
// scope_summary covers it).
export async function getOrder(id: string): Promise<{
  order: OrderRead;
  account_name: string;
  scope_summary: string;
  deliverables: string[];
  timeline: string;
  quote_label: string;
}> {
  const order = await adminFetch<OrderRead>(`/orders/${id}`);
  const [quote, accountName] = await Promise.all([
    getQuote(order.quote_id).catch(() => null),
    resolveClientLabel(order.account_id),
  ]);
  return {
    order,
    account_name: accountName,
    scope_summary: quote?.scope_summary ?? "",
    deliverables: [],
    timeline: quote?.timeline ?? "",
    quote_label: order.quote_id.slice(0, 8),
  };
}

// Real: GET /orders/{order_id}/invoices.
export async function getOrderInvoices(orderId: string): Promise<InvoiceRead[]> {
  return adminFetch<InvoiceRead[]>(`/orders/${orderId}/invoices`);
}
