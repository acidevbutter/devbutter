import Link from "next/link";
import { listOrders } from "@/lib/admin/services/orders";
import { formatCurrency, formatDate, orderStatusTone } from "@/lib/admin/format";
import Badge from "@/components/admin/ui/Badge/Badge";
import styles from "@/styles/AdminList.module.scss";

const COLUMNS = ".5fr 1.1fr 1.6fr .8fr .9fr 1fr .6fr";
const STATUSES: { key: string; label: string }[] = [
  { key: "created", label: "ativas" },
  { key: "completed", label: "concluídas" },
  { key: "cancelled", label: "canceladas" },
];

// Faturamento progress from the backend's per-order invoice roll-up.
function billing(o: {
  status: string;
  invoices_total: number;
  invoices_paid: number;
  invoices_overdue: number;
}): { pct: number; color: string; caption: string } {
  const { invoices_total: total, invoices_paid: paid, invoices_overdue: overdue } = o;
  if (total === 0) {
    if (o.status === "cancelled")
      return { pct: 0, color: "var(--db-text-muted)", caption: "cancelada" };
    return { pct: 0, color: "var(--db-green)", caption: "aguardando faturamento" };
  }
  const pct = Math.round((paid / total) * 100);
  if (overdue > 0)
    return { pct, color: "var(--db-pink)", caption: `${overdue} vencida${overdue > 1 ? "s" : ""}` };
  if (paid === total) return { pct: 100, color: "var(--db-green)", caption: "quitada" };
  return { pct, color: "var(--db-green)", caption: `${paid} de ${total} pagas` };
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const orders = await listOrders();
  const active = orders.filter((o) => o.status === "created" || o.status === "invoiced").length;
  const filtered =
    status === "created"
      ? orders.filter((o) => o.status === "created" || o.status === "invoiced")
      : status
        ? orders.filter((o) => o.status === status)
        : orders;

  function count(key: string) {
    if (key === "created")
      return orders.filter((o) => o.status === "created" || o.status === "invoiced").length;
    return orders.filter((o) => o.status === key).length;
  }

  return (
    <div className={styles.page}>
      <div className={styles.countBar}>
        <span>Orders</span>
        <span style={{ color: "var(--db-green)" }}>
          <span style={{ animation: "dbPulse 2s ease-in-out infinite", display: "inline-block" }}>
            ●
          </span>{" "}
          {active} ativas
        </span>
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>Orders</h1>
        <div className={styles.chips} style={{ marginTop: 0 }}>
          {STATUSES.map((s) => (
            <Link
              key={s.key}
              href={status === s.key ? "/admin/orders" : `/admin/orders?status=${s.key}`}
              className={`${styles.chip} ${status === s.key ? styles.chipActive : ""}`}
            >
              {s.label} {count(s.key)}
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.headerRow} style={{ ["--cols" as string]: COLUMNS }}>
          <span>id</span>
          <span>cliente</span>
          <span>escopo</span>
          <span>status</span>
          <span>valor</span>
          <span>faturado</span>
          <span>criada</span>
        </div>
        {filtered.length === 0 && <div className={styles.empty}>Nenhuma order encontrada.</div>}
        {filtered.map((o, i) => {
          const b = billing(o);
          return (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              className={styles.row}
              style={{ ["--cols" as string]: COLUMNS }}
            >
              <span
                style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: "var(--admin-text-2)" }}
              >
                {o.id.slice(0, 8)}
              </span>
              <span style={{ fontWeight: 600 }}>{o.account_name}</span>
              <span style={{ color: "var(--admin-text-2)" }}>{o.quote_id ? "escopo herdado do quote" : "—"}</span>
              <Badge tone={orderStatusTone(o.status)} style={{ justifySelf: "start" }}>
                {o.status}
              </Badge>
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12.5 }}>
                {formatCurrency(o.amount)}
              </span>
              <span>
                <span
                  style={{
                    display: "block",
                    height: 5,
                    borderRadius: 4,
                    background: "rgba(255,255,255,.08)",
                    overflow: "hidden",
                  }}
                >
                  <i
                    style={{
                      display: "block",
                      height: "100%",
                      width: `${b.pct}%`,
                      background: b.color,
                      animation: `dbFill .7s cubic-bezier(.2,.8,.2,1) ${i * 60}ms both`,
                    }}
                  />
                </span>
                <span
                  style={{ font: "10.5px 'Geist Mono', monospace", color: "var(--db-text-muted)" }}
                >
                  {b.caption}
                </span>
              </span>
              <span
                style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: "var(--db-text-muted)" }}
              >
                {formatDate(o.created_at)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
