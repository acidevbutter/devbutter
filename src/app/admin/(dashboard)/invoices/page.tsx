import Link from "next/link";
import { listInvoices } from "@/lib/admin/services/invoices";
import { formatCurrency, formatDate, invoiceStatusLabel, invoiceStatusTone } from "@/lib/admin/format";
import Badge from "@/components/admin/ui/Badge/Badge";
import styles from "@/styles/AdminList.module.scss";

const COLUMNS = "1.2fr .6fr .9fr .7fr .8fr .7fr";
const STATUSES = ["PENDING", "OVERDUE", "RECEIVED", "REFUNDED"] as const;

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const invoices = await listInvoices();
  const filtered = status ? invoices.filter((i) => i.status === status) : invoices;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Invoices</h1>
        <span style={{ font: "11.5px 'Geist Mono', monospace", color: "var(--db-green)" }}>
          ● sincronizado via webhook Asaas
        </span>
      </div>

      <div className={styles.chips}>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={status === s ? "/admin/invoices" : `/admin/invoices?status=${s}`}
            className={`${styles.chip} ${status === s ? styles.chipActive : ""} ${
              s === "OVERDUE" ? styles.chipAlert : ""
            }`}
          >
            {invoiceStatusLabel(s)} {invoices.filter((i) => i.status === s).length}
          </Link>
        ))}
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
              style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: "var(--db-green)" }}
            >
              #{inv.order_id.replace("mock-order-", "")}
            </Link>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>
              {formatCurrency(inv.amount)}
            </span>
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: 12,
                color: inv.status === "OVERDUE" ? "var(--db-pink)" : "var(--db-text-secondary)",
              }}
            >
              {formatDate(inv.due_date)}
            </span>
            <Badge tone={invoiceStatusTone(inv.status)}>{invoiceStatusLabel(inv.status)}</Badge>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: "var(--db-green)" }}>
              {inv.payment_link ? "copiar ⧉" : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
