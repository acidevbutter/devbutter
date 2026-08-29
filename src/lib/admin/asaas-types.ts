// Client-safe types + pure helpers for the Asaas admin config screen. The
// actual fetch functions live in services/asaas.ts (server-only). Keep this
// module free of "server-only" so client components can import the types and
// helpers below.

export interface AsaasListEnvelope<T> {
  object?: string;
  hasMore?: boolean;
  totalCount?: number;
  limit?: number;
  offset?: number;
  data: T[];
}

export interface AsaasSubaccount {
  id: string;
  name?: string;
  email?: string;
  cpfCnpj?: string;
  walletId?: string;
  accountNumber?: { agency?: string; account?: string; accountDigit?: string };
  status?: string;
  onboardingStatus?: string;
  [key: string]: unknown;
}

export interface AsaasAccessToken {
  id: string;
  name?: string;
  status?: string;
  createdAt?: string;
  /** Já mascarada pelo servidor (ex: "••••ab12cd") -- nunca a chave crua. */
  apiKey?: string;
  [key: string]: unknown;
}

export interface AsaasSplitRule {
  id: string;
  walletId?: string;
  percentualValue?: number | string;
  fixedValue?: number | string;
  status?: string;
  [key: string]: unknown;
}

export interface AsaasPayment {
  id: string;
  value?: number | string;
  netValue?: number | string;
  status?: string;
  billingType?: string;
  dueDate?: string;
  customer?: string;
  description?: string;
  invoiceUrl?: string;
  [key: string]: unknown;
}

export interface AsaasAuditLog {
  id?: string;
  action?: string;
  actor?: string;
  client_id?: string;
  created_at?: string;
  detail?: unknown;
  [key: string]: unknown;
}

export function unwrapList<T>(value: AsaasListEnvelope<T> | T[] | null | undefined): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return Array.isArray(value.data) ? value.data : [];
}

export function maskTail(value: string | null | undefined, visible = 4): string {
  if (!value) return "—";
  if (value.length <= visible) return `••••${value}`;
  return `••••${value.slice(-visible)}`;
}
