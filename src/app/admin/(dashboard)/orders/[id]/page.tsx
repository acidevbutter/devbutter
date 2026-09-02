import { notFound } from "next/navigation";
import { getOrder, getOrderInvoices } from "@/lib/admin/services/orders";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  invoiceStatusLabel,
  invoiceStatusTone,
} from "@/lib/admin/format";
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
  const invoices = [...invoicesRaw].sort(
    (a, b) => +new Date(a.created_at) - +new Date(b.created_at)
  );

  const totalAmount = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
  const orderIdLabel = `#${id.slice(0, 8)}`;
  const firstInvoice = invoices[0];
  const paidInvoice = invoices.find((i) => i.status === "RECEIVED");

  // Derived from order + invoice timestamps until the backend exposes a
  // first-class order-events feed.
  const events: { label: string; at: string }[] = [
    { label: "order criada a partir do quote", at: order.created_at },
  ];
  if (invoices.length > 0) {
    events.push({ label: "asaas customer criado", at: order.created_at });
  }
  if (firstInvoice) {
    events.push({ label: "invoice de entrada gerada", at: firstInvoice.created_at });
  }
  if (paidInvoice) {
    events.push({
      label: "pagamento confirmado via webhook",
      at: paidInvoice.created_at,
    });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.breadcrumb}>
        <span>
          Orders / <span style={{ color: "var(--db-text-primary)" }}>{orderIdLabel}</span>
        </span>
        <span style={{ color: "var(--db-green)" }}>● {order.status}</span>
      </div>

      <div className={styles.split}>
        <div className={`${styles.col} ${styles.colBorder}`}>
          <div className={styles.label}>cliente</div>
          <h1 className={styles.name}>{account_name}</h1>

          <div className={styles.label} style={{ marginTop: 16 }}>
            escopo contratado
          </div>
          <div className={styles.body}>{scope_summary || "—"}</div>

          {deliverables.length > 0 && (
            <>
              <div className={styles.label} style={{ marginTop: 18 }}>
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
            <div className={styles.quoteRow}>
              <Button variant="outline" size="sm" href={`/admin/quotes/${order.quote_id}`}>
                Ver quote {quote_label}
              </Button>
              <span className={styles.readonly}>somente leitura</span>
            </div>
          )}
        </div>

        <div className={styles.col}>
          <div className={styles.label}>invoices</div>
          {invoices.length === 0 && (
            <div style={{ color: "var(--db-text-muted)", fontSize: 13 }}>Nenhuma invoice ainda.</div>
          )}
          <div className={styles.invoiceList}>
            {invoices.map((inv) => (
              <div key={inv.id} className={styles.invoiceCard}>
                <div className={styles.invoiceTop}>
                  <span>{formatCurrency(inv.amount)}</span>
                  <Badge tone={invoiceStatusTone(inv.status)}>
                    {invoiceStatusLabel(inv.status)}
                  </Badge>
                </div>
                <div className={styles.invoiceSub}>
                  venc. {formatDate(inv.due_date)}
                  {inv.payment_link ? " · link ⧉ copiar" : ""}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.label} style={{ marginTop: 24 }}>
            timeline
          </div>
          <div className={styles.timeline}>
            {events.map((e, i) => (
              <div key={i} className={styles.timelineItem}>
                <span style={{ color: "var(--db-green)" }}>●</span> {e.label} ·{" "}
                {formatDateTime(e.at)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
