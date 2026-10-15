import type { OrderStatus, QuoteStatus, SubaccountStatusRead } from "@/lib/admin/types";

export type { SubaccountStatusRead } from "@/lib/admin/types";

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
  /** True while the Asaas subaccount onboarding is unfinished — the whole
   * dashboard is gated to /portal/recebimentos (see portal-recebimentos-onboarding.md §2). */
  onboardingRequired: boolean;
  subaccount: SubaccountStatusRead | null;
}

// ---- recebimentos / Asaas subaccount onboarding -------------------------
// Contracts: docs/design/portal-recebimentos-onboarding.md §3.

/** The 10 UI states from §4 — used to pick the copy/card the screen renders. */
export type RecebimentosUiState =
  | "not_provisioned"
  | "AWAITING_ONBOARDING"
  | "PENDING_DOCUMENTS"
  | "UNDER_REVIEW"
  | "REJECTED"
  | "APPROVED"
  | "COMMERCIAL_INFO_EXPIRING"
  | "COMMERCIAL_INFO_EXPIRED"
  | "CREATION_FAILED"
  | "CLOSED";

export interface SubaccountPendingDocument {
  id: string;
  type: string;
  status: string;
  title: string;
  onboardingUrl: string | null;
}

/** GET /accounts/subaccount/onboarding */
export interface SubaccountOnboarding {
  /** = onboarding_status, or "not_provisioned". */
  state: string;
  general: string;
  commercialInfo: string;
  bankAccountInfo: string;
  documentation: string;
  pending_documents: SubaccountPendingDocument[];
  /** First non-null onboardingUrl, or null. */
  onboarding_url: string | null;
}

/** GET/POST /accounts/subaccount/commercial-info — the Asaas `commercialInfo`
 * object. Only the fields the form touches are typed; the rest passes through. */
export interface SubaccountCommercialInfo {
  companyName?: string | null;
  availableCompanyNames?: string[] | null;
  incomeValue?: number | string | null;
  postalCode?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  complement?: string | null;
  province?: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  email?: string | null;
  site?: string | null;
}

/** GET /api/portal/recebimentos/status — one poll payload for the client. */
export interface RecebimentosStatus {
  onboarding_required: boolean;
  subaccount_status: SubaccountStatusRead | null;
  onboarding: SubaccountOnboarding | null;
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
  billingType: string | null;
}

export interface PortalCatalogEntry {
  id: string;
  type: "Produto" | "Serviço" | "Loja / ponto físico";
  description: string;
}
