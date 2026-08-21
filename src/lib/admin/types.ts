// Types mirror devbutter_backend's Pydantic response shapes 1:1 for real domains
// (see app/*/schemas.py) and docs/admin-api-contracts.md for mocked domains.

// ---- accounts (real) ----------------------------------------------------

export interface AccountRead {
  id: string;
  email: string;
  name: string;
  document: string | null;
  phone: string | null;
  business_name: string | null;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
}

// ---- quotes (real) -------------------------------------------------------

export type QuoteSource = "ai" | "manual";
export type QuoteStatus = "draft" | "approved" | "edited" | "rejected";

export interface QuoteRead {
  id: string;
  account_id: string;
  conversation_id: string | null;
  source: QuoteSource;
  status: QuoteStatus;
  scope_summary: string;
  price_range: string | null;
  timeline: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface QuoteManualCreate {
  account_id: string;
  scope_summary: string;
  price_range?: string | null;
  timeline?: string | null;
}

export interface QuoteEdit {
  scope_summary?: string;
  price_range?: string | null;
  timeline?: string | null;
}

// ---- orders (real) --------------------------------------------------------

export type OrderStatus = "created" | "invoiced" | "completed" | "cancelled";

export interface OrderRead {
  id: string;
  quote_id: string;
  account_id: string;
  status: OrderStatus;
  created_at: string;
}

export interface OrderApprovalRequest {
  amount: string;
  due_date: string;
  billing_type?: "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED";
}

// ---- invoices (real) --------------------------------------------------------

export interface InvoiceRead {
  id: string;
  order_id: string;
  asaas_invoice_id: string;
  amount: string;
  currency: string;
  status: string;
  due_date: string;
  payment_link: string | null;
  created_at: string;
}

// ---- service catalog (real, account-scoped) --------------------------------

export interface ServiceCatalogEntryRead {
  id: string;
  account_id: string;
  type: string;
  description: string;
  created_at: string;
}

// ---- catalog cross-account view (mocked — #get-admincatalog) ---------------

export interface AdminCatalogEntry {
  id: string;
  account_id: string;
  account_name: string;
  type: string;
  description: string;
  created_at: string;
}

// ---- clients (mocked — docs/admin-api-contracts.md#get-adminclients) -------

export interface AdminClientListItem {
  id: string;
  name: string;
  business_name: string | null;
  email: string;
  document: string | null;
  created_at: string;
  asaas_customer_id: string | null;
  quotes_count: number;
  orders_count: number;
}

export type AsaasLinkStatus = "vinculado" | "em_analise" | "nao_vinculado";

export interface AdminClientDetail {
  id: string;
  name: string;
  business_name: string | null;
  email: string;
  document: string | null;
  phone: string | null;
  created_at: string;
  asaas_customer_id: string | null;
  asaas_status: AsaasLinkStatus;
  counts: {
    quotes: number;
    orders: number;
    invoices: number;
    catalog_entries: number;
    conversations: number;
  };
}

// ---- orders/invoices list (mocked — #get-adminorders / #get-admininvoices) --

export interface AdminOrderListItem {
  id: string;
  quote_id: string;
  account_id: string;
  account_name: string;
  status: OrderStatus;
  amount: string;
  created_at: string;
}

export interface AdminInvoiceListItem {
  id: string;
  order_id: string;
  account_name: string;
  asaas_invoice_id: string;
  amount: string;
  currency: string;
  status: string;
  due_date: string;
  payment_link: string | null;
}

// ---- dashboard (mocked — #get-admindashboard) -------------------------------

export interface AdminDashboardMetrics {
  active_orders: number;
  receivable_open_amount: string;
  overdue_amount: string;
  overdue_invoice_count: number;
  overdue_client_name: string | null;
  recent_activity: Array<{
    kind: "invoice_paid" | "quote_approved" | "client_created" | "webhook_processed";
    message: string;
    at: string;
  }>;
}

// ---- knowledge base (mocked — #knowledge-base) ------------------------------

export interface KnowledgeEntry {
  id: string;
  name: string;
  description: string;
  price_min: string;
  price_max: string;
  typical_duration: string;
  ai_instructions: string;
  updated_at: string;
}

// ---- conversations (mocked — #get-adminconversations) -----------------------

export interface AdminConversationListItem {
  id: string;
  account_id: string | null;
  account_name: string | null;
  message_count: number;
  resulting_quote_id: string | null;
  started_at: string;
}

export interface ConversationMessage {
  role: "assistant" | "visitor";
  content: string;
  at: string;
}

export interface AdminConversationDetail extends AdminConversationListItem {
  messages: ConversationMessage[];
  draft: {
    scope_summary: string;
    price_range: string;
    timeline: string;
  } | null;
}

// ---- webhook event log (mocked — #webhook-event-log) -------------------------

export interface AdminWebhookEvent {
  id: string;
  event_type: string;
  related_invoice_id: string | null;
  related_label: string;
  processed_ok: boolean;
  error_message: string | null;
  payload: Record<string, unknown>;
  received_at: string;
}
