import { notFound } from "next/navigation";
import { getOrder, getOrderInvoices } from "@/lib/admin/services/orders";
import { formatCurrency, formatDate, formatDateTime, invoiceStatusLabel, invoiceStatusTone, orderStatusTone } from "@/lib/admin/format";
import Badge from "@/components/admin/ui/Badge/Badge";
import Button from "@/components/admin/ui/Button/Button";
import styles from "./OrderDetail.module.scss";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let data;
  try {
    data = await getOrder(id);
  } catch {
    notFound();
  }

  const { order, account_name, scope_summary, deliverables, timeline, quote_label } = data;
  const invoicesRaw = await getOrderInvoices(id);
  const invoices = invoicesRaw.map((inv) => ({
    amount: inv.amount,
    status: inv.status,
    due_date: inv.due_date,
    payment_link: inv.payment_link,
  }));

  const clientName = account_name;
  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const orderIdLabel = `#${id.slice(0, 8)}`;

  return (
    <div className={styles.panel}>
      <div className={styles.breadcrumb}>
        <span>
          Orders / <span style={{ color: "var(--db-text-primary)" }}>{orderIdLabel}</span>
        </span>
        <Badge tone={orderStatusTone(order.status)}>● {order.status}</Badge>
      </div>

      <div className={styles.split}>
        <div className={`${styles.col} ${styles.colBorder}`}>
          <h1 className={styles.name}>{clientName}</h1>

          <div className={styles.label}>escopo contratado</div>
          <div className={styles.body}>{scope_summary || "—"}</div>

          {deliverables.length > 0 && (
            <>
              <div className={styles.label} style={{ marginTop: 20 }}>
                entregáveis
              </div>
              <div className={styles.deliverables}>
                {deliverables.map((d) => (
                  <div key={d}>· {d}</div>
                ))}
              </div>
            </>
          )}

          <div className={styles.statsRow}>
            <div>
              <div className={styles.label}>valor</div>
              <div className={styles.statValue}>{formatCurrency(totalAmount)}</div>
            </div>
            <div>
              <div className={styles.label}>prazo</div>
              <div className={styles.statValue}>{timeline || "—"}</div>
            </div>
          </div>

          {quote_label && (
            <div style={{ marginTop: 22 }}>
              <Button variant="outline" href={`/admin/quotes/${order.quote_id}`}>
                Ver quote {quote_label}
              </Button>
              <span style={{ marginLeft: 10, fontSize: 11.5, color: "var(--db-text-muted)", fontFamily: "'Geist Mono', monospace" }}>
                somente leitura
              </span>
            </div>
          )}
        </div>

        <div className={styles.col}>
          <div className={styles.label}>invoices</div>
          {invoices.length === 0 && (
            <div style={{ color: "var(--db-text-muted)", fontSize: 13 }}>Nenhuma invoice ainda.</div>
          )}
          {invoices.map((inv, i) => (
            <div key={i} className={styles.invoiceCard}>
              <div className={styles.invoiceTop}>
                <span>{formatCurrency(inv.amount)}</span>
                <Badge tone={invoiceStatusTone(inv.status)}>{invoiceStatusLabel(inv.status)}</Badge>
              </div>
              <div className={styles.invoiceSub}>
                venc. {formatDate(inv.due_date)}
                {inv.payment_link ? " · link ⧉" : ""}
              </div>
            </div>
          ))}

          <div className={styles.label} style={{ marginTop: 22 }}>
            timeline
          </div>
          <div className={styles.timeline}>
            <div className={styles.timelineItem}>order criada a partir do quote · {formatDateTime(order.created_at)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
