import Link from "next/link";
import { listInvoicesWithSync } from "@/lib/admin/services/invoices";
import {
  formatCurrency,
  formatDate,
  formatRelative,
  invoiceStatusLabel,
  invoiceStatusTone,
} from "@/lib/admin/format";
import Badge from "@/components/admin/ui/Badge/Badge";
import DueMonthFilter from "./DueMonthFilter";
import styles from "@/styles/AdminList.module.scss";

const COLUMNS = "1.2fr .6fr .9fr .7fr .8fr .7fr";
const STATUSES = ["PENDING", "OVERDUE", "RECEIVED", "REFUNDED"] as const;

// The last day of `YYYY-MM` — what the backend `due_before` filter wants.
function endOfMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m, 0).toISOString().slice(0, 10);
}

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; due?: string }>;
}) {
  const { status, due } = await searchParams;
  const { items: invoices, synced_at } = await listInvoicesWithSync(
    due ? endOfMonth(due) : undefined
  );
  const filtered = status ? invoices.filter((i) => i.status === status) : invoices;

  const now = new Date();
  const months = Array.from({ length: 12 }, (_, k) => {
    const d = new Date(now.getFullYear(), now.getMonth() + k, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { ym, label: `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}` };
  });

  function href(next: { status?: string | null; due?: string | null }) {
    const params = new URLSearchParams();
    const ns = "status" in next ? next.status : status;
    const nd = "due" in next ? next.due : due;
    if (ns) params.set("status", ns);
    if (nd) params.set("due", nd);
    const qs = params.toString();
    return qs ? `/admin/invoices?${qs}` : "/admin/invoices";
  }

  return (
    <div className={styles.page}>
      <div className={styles.countBar}>
        <span>Invoices</span>
        <span style={{ color: "var(--db-green)" }}>
          ● {synced_at ? `sincronizado ${formatRelative(synced_at)} via webhook Asaas` : "espelho local do Asaas"}
        </span>
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>Invoices</h1>
      </div>

      <div className={styles.chips}>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={href({ status: status === s ? null : s })}
            className={`${styles.chip} ${status === s ? styles.chipActive : ""} ${
              s === "OVERDUE" ? styles.chipAlert : ""
            }`}
          >
            {invoiceStatusLabel(s)} {invoices.filter((i) => i.status === s).length}
          </Link>
        ))}
        <DueMonthFilter months={months} />
      </div>

      <div className={styles.panel}>
        <div className={styles.headerRow} style={{ ["--cols" as string]: COLUMNS }}>
          <span>cliente</span>
          <span>order</span>
          <span>valor</span>
          <span>venc.</span>
          <span>status</span>
          <span>link</span>
        </div>
        {filtered.length === 0 && <div className={styles.empty}>Nenhuma invoice encontrada.</div>}
        {filtered.map((inv) => (
          <div
            key={inv.id}
            className={`${styles.row} ${inv.status === "OVERDUE" ? styles.rowAlert : ""}`}
            style={{ ["--cols" as string]: COLUMNS }}
          >
            <span style={{ fontWeight: 600 }}>{inv.account_name}</span>
            <Link
              href={`/admin/orders/${inv.order_id}`}
              style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: "var(--admin-text-2)" }}
            >
              #{inv.order_id.slice(0, 8)}
            </Link>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12.5 }}>
              {formatCurrency(inv.amount)}
            </span>
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 12,
                color: inv.status === "OVERDUE" ? "var(--db-pink)" : "var(--admin-text-2)",
              }}
            >
              {formatDate(inv.due_date)}
            </span>
            <Badge tone={invoiceStatusTone(inv.status)} style={{ justifySelf: "start" }}>
              {invoiceStatusLabel(inv.status)}
            </Badge>
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 12,
                color: inv.payment_link ? "var(--db-green)" : "var(--db-text-muted)",
              }}
            >
              {inv.payment_link ? "copiar ⧉" : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
