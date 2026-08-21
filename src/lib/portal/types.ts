import type { OrderStatus, QuoteStatus } from "@/lib/admin/types";

// Types for the client portal adapter. Deliberately reuse OrderStatus/
// QuoteStatus from lib/admin/types (they mirror devbutter_backend's real
// enums) and invoice status strings ("PENDING"|"OVERDUE"|"RECEIVED"|
// "REFUNDED") so this can swap onto lib/admin/format.ts's tone/label
// helpers and onto the real GET /orders, /quotes, /orders/{id}/invoices
// responses with no shape changes downstream.

export interface PortalSession {
  name: string;
  email: string;
  businessName: string | null;
}

export interface PortalAccount extends PortalSession {
  document: string | null;
  phone: string | null;
  address: string | null;
}

export interface PortalProjectStep {
  label: string;
  done: boolean;
  current: boolean;
}

export interface PortalProject {
  id: string;
  title: string;
  status: OrderStatus;
  statusLabel: string;
  progressPct: number;
  steps: PortalProjectStep[];
  startDate: string;
  dueDate: string;
  scopeItems: string[];
  quoteId: string;
  latestUpdate: { message: string; at: string } | null;
}

export interface PortalQuote {
  id: string;
  status: QuoteStatus;
  title: string;
  description: string;
  priceRange: string | null;
  timeline: string | null;
  createdAt: string;
  projectId: string | null;
}

export interface PortalInvoice {
  id: string;
  projectId: string;
  projectTitle: string;
  installmentLabel: string;
  amount: string;
  dueDate: string;
  status: "PENDING" | "OVERDUE" | "RECEIVED" | "REFUNDED";
  pixCode: string | null;
  boletoUrl: string | null;
}

export interface PortalCatalogEntry {
  id: string;
  type: "Produto" | "Serviço" | "Loja / ponto físico";
  description: string;
}
