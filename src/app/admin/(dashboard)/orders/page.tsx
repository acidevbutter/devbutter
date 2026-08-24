import Link from "next/link";
import { listOrders } from "@/lib/admin/services/orders";
import { formatCurrency, formatDate, orderStatusTone } from "@/lib/admin/format";
import Badge from "@/components/admin/ui/Badge/Badge";
import styles from "@/styles/AdminList.module.scss";

const COLUMNS = ".6fr 1.4fr 1fr .8fr .8fr";
const STATUSES = ["created", "invoiced", "completed", "cancelled"] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const orders = await listOrders();
  const filtered = status ? orders.filter((o) => o.status === status) : orders;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Orders</h1>
      </div>

      <div className={styles.chips}>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={status === s ? "/admin/orders" : `/admin/orders?status=${s}`}
            className={`${styles.chip} ${status === s ? styles.chipActive : ""}`}
          >
            {s} {orders.filter((o) => o.status === s).length}
          </Link>
        ))}
      </div>

      <div className={styles.panel}>
        <div className={styles.headerRow} style={{ ["--cols" as string]: COLUMNS }}>
          <span>id</span>
          <span>cliente</span>
          <span>valor</span>
          <span>status</span>
          <span>data</span>
        </div>
        {filtered.length === 0 && <div className={styles.empty}>Nenhuma order encontrada.</div>}
        {filtered.map((o) => (
          <Link
            key={o.id}
            href={`/admin/orders/${o.id}`}
            className={styles.row}
            style={{ ["--cols" as string]: COLUMNS }}
          >
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>
              #{o.id.slice(0, 8)}
            </span>
            <span style={{ fontWeight: 600 }}>{o.account_name}</span>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>
              {formatCurrency(o.amount)}
            </span>
            <Badge tone={orderStatusTone(o.status)}>{o.status}</Badge>
            <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: "var(--db-text-muted)" }}>
              {formatDate(o.created_at)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
