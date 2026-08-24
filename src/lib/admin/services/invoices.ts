import "server-only";
import { adminFetch } from "../api";
import type { AdminInvoiceListItem } from "../types";

interface AdminInvoiceListPage {
  items: AdminInvoiceListItem[];
  total: number;
  page: number;
  page_size: number;
  synced_at: string | null;
}

// Real: GET /admin/invoices. page_size capped at 100 server-side; fetch the
// max so the client-side status chips (Pendente/Vencida/Paga/Reemb.) count
// against the same full set they filter, matching the previous mock's
// behavior of counting across everything, not just one page.
export async function listInvoices(): Promise<AdminInvoiceListItem[]> {
  const page = await adminFetch<AdminInvoiceListPage>("/admin/invoices?page_size=100");
  return page.items;
}
