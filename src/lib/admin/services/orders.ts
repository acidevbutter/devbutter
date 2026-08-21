import "server-only";
import { adminFetch } from "../api";
import { mockInvoices, mockOrderDetailExtras, mockOrders } from "../mock/data";
import { getQuote } from "./quotes";
import type { AdminOrderListItem, InvoiceRead, OrderRead } from "../types";

// MOCK: contract in docs/admin-api-contracts.md#get-adminorders — no
// cross-account order listing exists on the backend yet.
export async function listOrders(): Promise<AdminOrderListItem[]> {
  return mockOrders;
}

export function isMockOrderId(id: string) {
  return id.startsWith("mock-");
}

export async function getOrder(id: string): Promise<{
  order: OrderRead | AdminOrderListItem;
  scope_summary: string;
  deliverables: string[];
  timeline: string;
  quote_label: string;
  isMock: boolean;
}> {
  if (isMockOrderId(id)) {
    const order = mockOrders.find((o) => o.id === id);
    const extras = mockOrderDetailExtras[id];
    if (!order || !extras) throw new Error("Mock order not found");
    return { order, ...extras, isMock: true };
  }

  // Real: GET /orders/{id}. Scope/timeline live on the quote it was approved
  // from (deliverables aren't tracked as a separate field in the backend —
  // scope_summary covers it).
  const order = await adminFetch<OrderRead>(`/orders/${id}`);
  const quote = await getQuote(order.quote_id).catch(() => null);
  return {
    order,
    scope_summary: quote?.scope_summary ?? "",
    deliverables: [],
    timeline: quote?.timeline ?? "",
    quote_label: order.quote_id.slice(0, 8),
    isMock: false,
  };
}

export async function getOrderInvoices(orderId: string): Promise<InvoiceRead[] | AdminOrderInvoiceView[]> {
  if (isMockOrderId(orderId)) {
    return mockInvoices.filter((i) => i.order_id === orderId);
  }
  return adminFetch<InvoiceRead[]>(`/orders/${orderId}/invoices`);
}

type AdminOrderInvoiceView = (typeof mockInvoices)[number];
