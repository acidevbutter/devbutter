import "server-only";
import { listOrderContexts } from "./orders";
import type { PortalInvoice } from "../types";

export async function listInvoices(): Promise<PortalInvoice[]> {
  const contexts = await listOrderContexts();
  return contexts
    .flatMap(({ order, quote, invoices }) =>
      invoices.map((invoice, index) => ({
        id: invoice.id,
        projectId: order.id,
        projectTitle: quote.scope_summary,
        installmentLabel: `Fatura ${index + 1} de ${invoices.length}`,
        amount: String(invoice.amount),
        dueDate: invoice.due_date,
        status: invoice.status as PortalInvoice["status"],
        pixCode: null,
        boletoUrl: invoice.payment_link,
        billingType: invoice.billing_type ?? null,
      }))
    )
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}
