import Link from "next/link";
import { listWebhookEvents } from "@/lib/admin/services/webhooks";
import { reprocessWebhookEventAction } from "@/lib/admin/actions/webhooks";
import { formatDateTime } from "@/lib/admin/format";
import Badge from "@/components/admin/ui/Badge/Badge";
import styles from "@/styles/AdminList.module.scss";

const COLUMNS = "1.4fr .8fr .8fr .9fr .4fr";
const EVENT_TYPES = ["PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_REFUNDED", "CHARGEBACK"];

export default async function AdminWebhooksPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; error?: string; open?: string }>;
}) {
  const { event, error, open } = await searchParams;
  const events = await listWebhookEvents();
  const errorCount = events.filter((e) => !e.processed_ok).length;

  const filtered = events.filter((e) => {
    if (event && e.event_type !== event) return false;
    if (error === "true" && e.processed_ok) return false;
    return true;
  });

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Webhooks</h1>
        {errorCount > 0 && (
          <span style={{ font: "11.5px 'Geist Mono', monospace", color: "var(--db-pink)" }}>
            {errorCount} eventos com erro
          </span>
        )}
      </div>

      <div className={styles.chips}>
        {EVENT_TYPES.map((t) => (
          <Link
            key={t}
            href={event === t ? "/admin/webhooks" : `/admin/webhooks?event=${t}`}
            className={`${styles.chip} ${event === t ? styles.chipActive : ""}`}
          >
            {t}
          </Link>
        ))}
        <Link
          href={error === "true" ? "/admin/webhooks" : "/admin/webhooks?error=true"}
          className={`${styles.chip} ${error === "true" ? styles.chipAlert : ""}`}
        >
          com erro {errorCount}
        </Link>
      </div>

      <div className={styles.panel}>
        <div className={styles.headerRow} style={{ ["--cols" as string]: COLUMNS }}>
          <span>evento</span>
          <span>relacionado</span>
          <span>processamento</span>
          <span>timestamp</span>
          <span />
        </div>
        {filtered.length === 0 && <div className={styles.empty}>Nenhum evento encontrado.</div>}
        {filtered.map((e) => {
          const isOpen = open === e.id;
          return (
            <div key={e.id}>
              <div
                className={`${styles.row} ${!e.processed_ok ? styles.rowAlert : ""}`}
                style={{ ["--cols" as string]: COLUMNS }}
              >
                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12.5 }}>{e.event_type}</span>
                <span style={{ color: "var(--db-text-secondary)", fontFamily: "'Geist Mono', monospace", fontSize: 12 }}>
                  {e.related_label}
                </span>
                <Badge tone={e.processed_ok ? "green" : "pink"}>{e.processed_ok ? "ok" : "erro"}</Badge>
                <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12, color: "var(--db-text-muted)" }}>
                  {formatDateTime(e.received_at)}
                </span>
                {e.processed_ok ? (
                  <Link
                    href={isOpen ? "/admin/webhooks" : `/admin/webhooks?open=${e.id}`}
                    style={{ color: "var(--db-text-muted)", justifySelf: "end" }}
                  >
                    ▸
                  </Link>
                ) : (
                  <form action={reprocessWebhookEventAction.bind(null, e.id)} style={{ justifySelf: "end" }}>
                    <button type="submit" style={{ background: "none", border: "none", color: "var(--db-pink)", cursor: "pointer", fontSize: 14 }}>
                      ↻
                    </button>
                  </form>
                )}
              </div>
              {(isOpen || !e.processed_ok) && (
                <pre
                  style={{
                    margin: "0 16px 14px",
                    padding: 12,
                    background: "var(--admin-card)",
                    border: "1px dashed var(--admin-border-interactive)",
                    borderRadius: 10,
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: 12,
                    color: "var(--db-text-secondary)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {JSON.stringify(e.payload, null, 2)}
                  {e.error_message ? `\nerro: ${e.error_message}` : ""}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
