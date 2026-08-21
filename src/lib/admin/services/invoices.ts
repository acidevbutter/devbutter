import "server-only";
import { mockInvoices } from "../mock/data";
import type { AdminInvoiceListItem } from "../types";

// MOCK: contract in docs/admin-api-contracts.md#get-admininvoices — no
// top-level invoice listing exists on the backend yet (only nested under a
// known order via GET /orders/{order_id}/invoices, which IS real and is
// used from the Order Detail page).
export async function listInvoices(): Promise<AdminInvoiceListItem[]> {
  return mockInvoices;
}
