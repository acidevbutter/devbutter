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

// Mirrors app/subaccounts/schemas.py::SubaccountCreate in asaas_payment --
// same required fields and CPF-vs-CNPJ conditional rules -- so the admin
// "nova subconta" form can tell the operator what's still missing before a
// round trip to the backend/Asaas, not just after a rejected submit.
export interface SubaccountCreatePayload {
  name: string;
  email: string;
  loginEmail?: string;
  cpfCnpj: string;
  companyType?: "MEI" | "LIMITED" | "INDIVIDUAL" | "ASSOCIATION";
  birthDate?: string;
  phone?: string;
  mobilePhone: string;
  incomeValue: string;
  address: string;
  addressNumber: string;
  complement?: string;
  province: string;
  postalCode: string;
  site?: string;
}

export type SubaccountFieldIssue = {
  field: keyof SubaccountCreatePayload;
  label: string;
  kind: "missing" | "invalid";
};

const _EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// DDD (2 digits, can't start with 0) + a 9-digit mobile number starting
// with 9 -- the format every Brazilian mobile has had since the 2016-2019
// migration. Asaas rejects anything else with "O número informado não é um
// número móvel válido" (learned from a real submission during manual
// testing, e.g. a landline-shaped or too-long number).
const _BR_MOBILE_RE = /^[1-9]\d9\d{8}$/;
// DDD (2 digits) + an 8-digit landline number that must not start with 9
// (that prefix is reserved for mobiles). Only checked when `phone` is
// filled in -- it's optional on SubaccountCreate.
const _BR_LANDLINE_RE = /^[1-9]\d[2-8]\d{7}$/;
// Loose "is this a domain/URL" check for the optional `site` field -- not a
// full RFC 3986 parse, just enough to catch "forgot the dot" typos before a
// round trip.
const _SITE_RE = /^(https?:\/\/)?[^\s.]+(\.[^\s.]+)+$/i;

const _FIELD_LABELS: Record<string, string> = {
  name: "Nome ou razão social",
  email: "E-mail principal",
  cpfCnpj: "CPF ou CNPJ",
  companyType: "Tipo de empresa (obrigatório para CNPJ)",
  birthDate: "Data de nascimento (obrigatório para CPF)",
  phone: "Telefone fixo",
  mobilePhone: "Celular",
  incomeValue: "Renda/faturamento mensal declarado",
  address: "Endereço",
  addressNumber: "Número",
  province: "Bairro",
  postalCode: "CEP",
  site: "Site",
};

function _onlyDigits(value: string | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function _blank(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

/** Input masks -- applied on every keystroke so a malformed number (wrong
 * digit count, letters, a copy-pasted phone with country code, ...) is
 * visibly wrong before the field is even submitted, instead of only
 * failing the format checks in getSubaccountFieldIssues after the fact.
 * Each formats from the raw digits, so they're safe to re-run on every
 * change (including backspace) without fighting the cursor. */

export function formatCnpj(value: string): string {
  const d = _onlyDigits(value).slice(0, 14);
  if (d.length > 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length > 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return d;
}

export function formatBrMobile(value: string): string {
  const d = _onlyDigits(value).slice(0, 11);
  if (d.length > 7) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 0) return `(${d}`;
  return d;
}

export function formatCep(value: string): string {
  const d = _onlyDigits(value).slice(0, 8);
  if (d.length > 5) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return d;
}

/** Currency mask for incomeValue: typed digits shift in from the right as
 * cents (like every BR banking app's amount field), so "10000" reads as
 * "100,00" not "10000,00" -- the only way to stop a pasted or fat-fingered
 * huge/garbage number from ever reaching the field. `parseCurrencyDisplay`
 * turns the display string back into the plain decimal SubaccountCreate
 * expects (e.g. "1.000,00" -> "1000.00"); `toCurrencyDisplay` is the
 * reverse, for formatting a prefilled plain decimal on first render. */
export function formatCurrencyInput(value: string): string {
  const digits = _onlyDigits(value).replace(/^0+(?=\d)/, "").slice(0, 13);
  if (digits === "") return "";
  const cents = digits.padStart(3, "0");
  const intPart = cents.slice(0, -2);
  const centPart = cents.slice(-2);
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withThousands},${centPart}`;
}

export function parseCurrencyDisplay(display: string): string {
  const digits = _onlyDigits(display);
  if (digits === "") return "";
  const cents = digits.padStart(3, "0");
  const intPart = cents.slice(0, -2).replace(/^0+(?=\d)/, "") || "0";
  const centPart = cents.slice(-2);
  return `${intPart}.${centPart}`;
}

export function toCurrencyDisplay(value: string | undefined): string {
  if (_blank(value)) return "";
  const num = Number(value);
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Real CPF check-digit algorithm (not just the 11-digit length check) --
 * Asaas validates the checksum, so a fat-fingered digit (right length,
 * wrong number) would otherwise only surface as an opaque Asaas rejection
 * after submit. */
function _isValidCpf(digits: string): boolean {
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const calcCheckDigit = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return (
    calcCheckDigit(9) === Number(digits[9]) && calcCheckDigit(10) === Number(digits[10])
  );
}

/** Real CNPJ check-digit algorithm, same rationale as _isValidCpf. */
function _isValidCnpj(digits: string): boolean {
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  const calcCheckDigit = (length: number): number => {
    const weights =
      length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return (
    calcCheckDigit(12) === Number(digits[12]) && calcCheckDigit(13) === Number(digits[13])
  );
}

/** Every field POST /v3/accounts (via /admin/subaccounts) still needs before
 * it can be sent -- required fields left blank, plus the ones that fail a
 * format check Asaas itself enforces (email shape, CPF/CNPJ check digits,
 * CEP digit count, BR mobile/landline phone shape, a site that looks like a
 * domain, positive income). Returns [] when the payload is ready to submit. */
export function getSubaccountFieldIssues(
  payload: Partial<SubaccountCreatePayload>
): SubaccountFieldIssue[] {
  const issues: SubaccountFieldIssue[] = [];
  const requireField = (field: keyof SubaccountCreatePayload, value: string | undefined) => {
    if (_blank(value)) {
      issues.push({ field, label: _FIELD_LABELS[field], kind: "missing" });
    }
  };

  requireField("name", payload.name);

  if (_blank(payload.email)) {
    issues.push({ field: "email", label: _FIELD_LABELS.email, kind: "missing" });
  } else if (!_EMAIL_RE.test(payload.email!)) {
    issues.push({ field: "email", label: _FIELD_LABELS.email, kind: "invalid" });
  }

  const cpfCnpjDigits = _onlyDigits(payload.cpfCnpj);
  if (cpfCnpjDigits.length === 0) {
    issues.push({ field: "cpfCnpj", label: _FIELD_LABELS.cpfCnpj, kind: "missing" });
  } else if (cpfCnpjDigits.length !== 11 && cpfCnpjDigits.length !== 14) {
    issues.push({ field: "cpfCnpj", label: _FIELD_LABELS.cpfCnpj, kind: "invalid" });
  } else if (cpfCnpjDigits.length === 11 && !_isValidCpf(cpfCnpjDigits)) {
    issues.push({ field: "cpfCnpj", label: _FIELD_LABELS.cpfCnpj, kind: "invalid" });
  } else if (cpfCnpjDigits.length === 14 && !_isValidCnpj(cpfCnpjDigits)) {
    issues.push({ field: "cpfCnpj", label: _FIELD_LABELS.cpfCnpj, kind: "invalid" });
  } else if (cpfCnpjDigits.length === 14 && _blank(payload.companyType)) {
    issues.push({ field: "companyType", label: _FIELD_LABELS.companyType, kind: "missing" });
  } else if (cpfCnpjDigits.length === 11 && _blank(payload.birthDate)) {
    issues.push({ field: "birthDate", label: _FIELD_LABELS.birthDate, kind: "missing" });
  }

  const mobileDigits = _onlyDigits(payload.mobilePhone);
  if (mobileDigits.length === 0) {
    issues.push({ field: "mobilePhone", label: _FIELD_LABELS.mobilePhone, kind: "missing" });
  } else if (!_BR_MOBILE_RE.test(mobileDigits)) {
    issues.push({ field: "mobilePhone", label: _FIELD_LABELS.mobilePhone, kind: "invalid" });
  }

  if (_blank(payload.incomeValue)) {
    issues.push({ field: "incomeValue", label: _FIELD_LABELS.incomeValue, kind: "missing" });
  } else if (!(Number(payload.incomeValue) > 0)) {
    issues.push({ field: "incomeValue", label: _FIELD_LABELS.incomeValue, kind: "invalid" });
  }

  requireField("address", payload.address);
  requireField("addressNumber", payload.addressNumber);
  requireField("province", payload.province);

  const postalDigits = _onlyDigits(payload.postalCode);
  if (postalDigits.length === 0) {
    issues.push({ field: "postalCode", label: _FIELD_LABELS.postalCode, kind: "missing" });
  } else if (postalDigits.length !== 8) {
    issues.push({ field: "postalCode", label: _FIELD_LABELS.postalCode, kind: "invalid" });
  }

  // phone and site are optional on SubaccountCreate -- only checked when filled in.
  if (!_blank(payload.phone) && !_BR_LANDLINE_RE.test(_onlyDigits(payload.phone))) {
    issues.push({ field: "phone", label: _FIELD_LABELS.phone, kind: "invalid" });
  }
  if (!_blank(payload.site) && !_SITE_RE.test(payload.site!.trim())) {
    issues.push({ field: "site", label: _FIELD_LABELS.site, kind: "invalid" });
  }

  return issues;
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
