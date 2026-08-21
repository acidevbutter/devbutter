import "server-only";

import type { InvoiceRead, OrderRead, QuoteRead } from "@/lib/admin/types";
import { portalFetch } from "../api";

export interface PortalOrderContext {
  order: OrderRead;
  quote: QuoteRead;
  invoices: InvoiceRead[];
}

export async function listOrderContexts(): Promise<PortalOrderContext[]> {
  const orders = await portalFetch<OrderRead[]>("/orders");
  return Promise.all(
    orders.map(async (order) => {
      const [quote, invoices] = await Promise.all([
        portalFetch<QuoteRead>(`/quotes/${order.quote_id}`),
        portalFetch<InvoiceRead[]>(`/orders/${order.id}/invoices`),
      ]);
      return { order, quote, invoices };
    })
  );
}
