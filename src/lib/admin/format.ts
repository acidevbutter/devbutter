const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: string | number): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "—";
  return currencyFormatter.format(value);
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  // Date-only strings (e.g. an invoice due_date) parse as UTC midnight —
  // format them in UTC too, or negative-offset timezones show the day before.
  const timeZone = DATE_ONLY_RE.test(iso) ? "UTC" : undefined;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${date.toLocaleTimeString(
    "pt-BR",
    { hour: "2-digit", minute: "2-digit" }
  )}`;
}

export type BadgeTone = "green" | "pink" | "pinkFilled" | "amber" | "neutral";

const QUOTE_STATUS_TONE: Record<string, BadgeTone> = {
  draft: "amber",
  approved: "green",
  edited: "neutral",
  rejected: "pink",
};

export function quoteStatusTone(status: string): BadgeTone {
  return QUOTE_STATUS_TONE[status] ?? "neutral";
}

const ORDER_STATUS_TONE: Record<string, BadgeTone> = {
  created: "amber",
  invoiced: "amber",
  completed: "green",
  cancelled: "pink",
};

export function orderStatusTone(status: string): BadgeTone {
  return ORDER_STATUS_TONE[status] ?? "neutral";
}

const INVOICE_STATUS_TONE: Record<string, BadgeTone> = {
  PENDING: "amber",
  OVERDUE: "pinkFilled",
  RECEIVED: "green",
  REFUNDED: "neutral",
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  PENDING: "pendente",
  OVERDUE: "vencida",
  RECEIVED: "paga",
  REFUNDED: "reemb.",
};

export function invoiceStatusTone(status: string): BadgeTone {
  return INVOICE_STATUS_TONE[status] ?? "neutral";
}

export function invoiceStatusLabel(status: string): string {
  return INVOICE_STATUS_LABEL[status] ?? status.toLowerCase();
}

export function formatRelative(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes}min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "ontem";
  return `há ${days}d`;
}
