import "server-only";
import { mockInvoices } from "../mock/data";
import type { PortalInvoice } from "../types";

export async function listInvoices(): Promise<PortalInvoice[]> {
  return [...mockInvoices].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}
