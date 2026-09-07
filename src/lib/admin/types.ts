// Types mirror devbutter_backend's Pydantic response shapes 1:1 for real domains
// (see app/*/schemas.py) and docs/admin-api-contracts.md for mocked domains.

// ---- accounts (real) ----------------------------------------------------

export interface AccountRead {
  id: string;
  user_id: string;
  email: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  product_name: string;
  company_id: string;
  company_name: string;
  cnpj: string | null;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  accounts: AccountSelectionRead[];
  /**
   * Asaas subaccount onboarding gate (see
   * docs/design/portal-recebimentos-onboarding.md §3). Optional so existing
   * mocked payloads keep type-checking; the portal treats an absent flag as
   * "no gate".
   */
  onboarding_required?: boolean;
  subaccount_status?: SubaccountStatusRead | null;
}

/** GET /accounts/me → `subaccount_status`. Mirrors the BaaS subaccount link. */
export interface SubaccountStatusRead {
  provisioning_status: "NONE" | "PROVISIONED" | "CREATION_FAILED" | "CLOSED" | "RESTRICTED" | string;
  onboarding_status: string | null;
  approval_status: "PENDING" | "AWAITING_APPROVAL" | "APPROVED" | "REJECTED" | string | null;
  commercial_info_status: string | null;
  bank_account_info_status: string | null;
  documentation_status: string | null;
  commercial_info_expires_at: string | null;
  last_error: string | null;
}

export interface AccountSelectionRead {
  id: string;
  product_name: string;
  company_id: string;
  company_name: string;
  cnpj: string | null;
  created_at: string;
}

// ---- quotes (real) -------------------------------------------------------

export type QuoteSource = "ai" | "manual";
export type QuoteStatus = "draft" | "approved" | "edited" | "rejected";

export interface QuoteRead {
  id: string;
  /** Human-readable "COT-1000" id assigned at creation. */
  reference: string;
  account_id: string;
  conversation_id: string | null;
  source: QuoteSource;
  status: QuoteStatus;
  scope_summary: string;
  deliverables: string[];
  internal_notes: string | null;
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
  deliverables?: string[];
  internal_notes?: string | null;
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

// ---- catalog cross-account view (real — GET /admin/catalog) ----------------

export interface AdminCatalogEntry {
  id: string;
  account_id: string;
  account_name: string;
  type: string;
  description: string;
  created_at: string;
}

// ---- clients (real — GET /admin/clients) -----------------------------------

export interface AdminClientListItem {
  id: string;
  name: string;
  business_name: string | null;
  email: string;
  cpf: string | null;
  cnpj: string | null;
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
  cpf: string | null;
  cnpj: string | null;
  phone: string | null;
  created_at: string;
  asaas_customer_id: string | null;
  asaas_status: AsaasLinkStatus;
  /** Layer B merchant subaccount (asaas_subaccount_links) — null when unlinked. */
  subaccount_onboarding: string | null;
  subaccount_approval: string | null;
  counts: {
    quotes: number;
    orders: number;
    invoices: number;
    catalog_entries: number;
    conversations: number;
  };
}

// ---- orders/invoices list (real — GET /admin/orders / GET /admin/invoices) --

export interface AdminOrderListItem {
  id: string;
  quote_id: string;
  account_id: string;
  account_name: string;
  status: OrderStatus;
  amount: string;
  created_at: string;
  invoices_total: number;
  invoices_paid: number;
  invoices_overdue: number;
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

// ---- dashboard (real — GET /admin/dashboard) -------------------------------

export interface AdminDashboardMetrics {
  quotes_to_review: number;
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

// ---- butter_mind (real — GET/PATCH /admin/mind/*) -------------------------

export interface AdminMindModelUsage {
  model: string | null;
  turns: number;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  turns_without_token_usage: number;
}

export interface AdminMindDashboard {
  diagnosis_sessions: number;
  sessions_in_progress: number;
  submitted_requests: number;
  possibly_ungrounded_requests: number;
  assistant_turns: number;
  grounded_turns: number;
  turns_without_token_usage: number;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  knowledge_sources: number;
  knowledge_chunks: number;
  last_knowledge_update_at: string | null;
  model_usage: AdminMindModelUsage[];
}

export interface AdminMindGovernance {
  diagnosis_max_output_tokens: number;
  diagnosis_max_history_messages: number;
  diagnosis_max_turns: number;
  diagnosis_grounding_top_k: number;
  diagnosis_grounding_min_score: number;
  uses_runtime_override: boolean;
  maritaca_model: string;
  embeddings_model_name: string;
}

export interface AdminMindTurnMetric {
  id: string;
  assistant_message_id: string;
  chunks_retrieved: Array<{ chunk_id: string; score: number }>;
  chunks_used_count: number;
  input_tokens: number | null;
  cached_input_tokens: number | null;
  output_tokens: number | null;
  model: string | null;
  created_at: string;
}

export interface AdminLLMBudget {
  flow: string;
  monthly_budget_brl: string;
  updated_at: string;
}

export interface AdminLLMFlowUsage {
  flow: string;
  input_tokens: number;
  cached_input_tokens: number;
  output_tokens: number;
  estimated_cost_brl: string;
  monthly_budget_brl: string | null;
}

export interface AdminLLMUsageSummary {
  month: string;
  flows: AdminLLMFlowUsage[];
}

// ---- knowledge base (real — GET/POST /admin/knowledge-entries) -------------

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

// ---- conversations (real — GET /admin/conversations) -----------------------

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
}

export interface AdminConversationDetail extends AdminConversationListItem {
  messages: ConversationMessage[];
  draft: {
    scope_summary: string;
    price_range: string | null;
    timeline: string | null;
  } | null;
}

// ---- webhook event log (real — GET /admin/webhooks/events) -----------------

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

export interface WebhookAttempt {
  at: string;
  result: "recebido" | "ok" | "erro";
}

export interface WebhookCorrelation {
  kind: "client" | "invoice" | "order";
  label: string;
  href: string | null;
}

export interface AdminWebhookEventDetail extends AdminWebhookEvent {
  processed_at: string | null;
  attempts: WebhookAttempt[];
  correlation: WebhookCorrelation[];
}

// ---- companies / split quota / features (real — GET /admin/companies, see
// docs/plano-admin-empresas-cota-split.md and docs/plano-feature-venda-via-api.md) ----

export interface AdminCompanyListItem {
  id: string;
  name: string;
  cnpj: string | null;
  owner_name: string;
  has_payment_method: boolean;
  onboarding_status: string | null;
  approval_status: string | null;
  split_quota_percent: string | null;
  used_percent: string | null;
}

export interface AdminSubaccountLink {
  asaas_account_id: string;
  wallet_id: string | null;
  onboarding_status: string | null;
  approval_status: string | null;
  split_quota_percent: string | null;
  quota_set_by: string | null;
  quota_updated_at: string | null;
}

export interface AdminSplitRule {
  id: string;
  walletId?: string;
  wallet_id?: string;
  type: "FIXED" | "PERCENTAGE";
  value: string;
  active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface AdminCompanyDetail {
  id: string;
  name: string;
  cnpj: string | null;
  owner_name: string;
  owner_email: string;
  link: AdminSubaccountLink | null;
  split_rules: AdminSplitRule[];
  access_tokens: Record<string, unknown>;
  used_percent: string | null;
}

export type CompanyFeatureStatus = "pending" | "active" | "error" | "disabled";

export interface AdminCompanyFeature {
  id: string;
  feature_code: string;
  status: CompanyFeatureStatus;
  asaas_access_token_id: string | null;
  enabled_by: string | null;
  enabled_at: string | null;
  disabled_at: string | null;
  last_error: string | null;
}
