import { listInvoices } from "@/lib/portal/services/invoices";
import InvoicesClient from "./InvoicesClient";

export default async function PortalInvoicesPage() {
  const invoices = await listInvoices();
  return <InvoicesClient invoices={invoices} />;
}
