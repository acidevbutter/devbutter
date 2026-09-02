"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Badge from "@/components/admin/ui/Badge/Badge";
import {
  getWebhookEventDetailAction,
  reprocessWebhookEventAction,
} from "@/lib/admin/actions/webhooks";
import { formatDateTime } from "@/lib/admin/format";
import type { AdminWebhookEvent, AdminWebhookEventDetail } from "@/lib/admin/types";
import listStyles from "@/styles/AdminList.module.scss";
import styles from "./Webhooks.module.scss";

const COLUMNS = "1.4fr .8fr .8fr .9fr .4fr";
const EVENT_TYPES = ["PAYMENT_RECEIVED", "PAYMENT_OVERDUE", "PAYMENT_REFUNDED", "CHARGEBACK"];

export default function WebhooksClient({ events }: { events: AdminWebhookEvent[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [eventType, setEventType] = useState<string | null>(null);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detailById, setDetailById] = useState<Record<string, AdminWebhookEventDetail>>({});
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  const detail = openId ? (detailById[openId] ?? null) : null;

  useEffect(() => {
    if (!openId || detailById[openId]) return;
    let live = true;
    getWebhookEventDetailAction(openId)
      .then((d) => {
        if (live) setDetailById((prev) => ({ ...prev, [d.id]: d }));
      })
      .catch(() => {
        /* drawer falls back to the list-row data */
      });
    return () => {
      live = false;
    };
  }, [openId, detailById]);

  const errorCount = useMemo(() => events.filter((e) => !e.processed_ok).length, [events]);

  const filtered = events.filter((e) => {
    if (eventType && e.event_type !== eventType) return false;
    if (onlyErrors && e.processed_ok) return false;
    return true;
  });

  const open = events.find((e) => e.id === openId) ?? null;

  function closeDrawer() {
    setOpenId(null);
    setConfirming(false);
    setCopied(false);
  }

  function copyPayload() {
    if (!open) return;
    const payload = detail?.payload ?? open.payload;
    navigator.clipboard?.writeText(JSON.stringify(payload, null, 2)).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => setCopied(false)
    );
  }

  function reprocess() {
    if (!open) return;
    startTransition(async () => {
      await reprocessWebhookEventAction(open.id);
      setConfirming(false);
      router.refresh();
    });
  }

  return (
    <div className={listStyles.page}>
      <div className={listStyles.countBar}>
        <span>Webhooks / asaas</span>
        <span style={{ color: errorCount > 0 ? "var(--db-pink)" : "var(--admin-text-2)" }}>
          {errorCount > 0 ? `${errorCount} eventos com erro` : "log técnico para debug"}
        </span>
      </div>

      <div className={listStyles.header}>
        <h1 className={listStyles.title}>Webhooks</h1>
      </div>

      <div className={listStyles.chips}>
        {EVENT_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={`${listStyles.chip} ${eventType === t ? listStyles.chipActive : ""}`}
            onClick={() => setEventType(eventType === t ? null : t)}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          className={`${listStyles.chip} ${onlyErrors ? listStyles.chipAlert : ""}`}
          onClick={() => setOnlyErrors((v) => !v)}
        >
          com erro {errorCount}
        </button>
      </div>

      <div className={listStyles.panel}>
        <div className={listStyles.headerRow} style={{ ["--cols" as string]: COLUMNS }}>
          <span>evento</span>
          <span>relacionado</span>
          <span>processamento</span>
          <span>timestamp</span>
          <span />
        </div>
        {filtered.length === 0 && <div className={listStyles.empty}>Nenhum evento encontrado.</div>}
        {filtered.map((e) => (
          <button
            key={e.id}
            type="button"
            className={`${styles.rowButton}`}
            onClick={() => setOpenId(e.id)}
          >
            <div
              className={`${listStyles.row} ${!e.processed_ok ? listStyles.rowAlert : ""}`}
              style={{ ["--cols" as string]: COLUMNS }}
            >
              <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: 12.5 }}>
                {e.event_type}
              </span>
              <span
                style={{
                  color: "var(--admin-text-2)",
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 12,
                }}
              >
                {e.related_label}
              </span>
              <span
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 12.5,
                  color: e.processed_ok ? "var(--db-green)" : "var(--db-pink)",
                }}
              >
                {e.processed_ok ? "ok" : "erro"}
              </span>
              <span
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: 12,
                  color: "var(--db-text-muted)",
                }}
              >
                {formatDateTime(e.received_at)}
              </span>
              <span
                style={{
                  justifySelf: "end",
                  color: e.processed_ok ? "var(--db-text-muted)" : "var(--db-pink)",
                }}
              >
                {e.processed_ok ? "▸" : "↻"}
              </span>
            </div>
          </button>
        ))}
      </div>

      {open && (
        <div
          className={styles.drawerOverlay}
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) closeDrawer();
          }}
        >
          <div className={styles.drawer} role="dialog" aria-modal="true">
            <div className={styles.drawerHead}>
              <div>
                <div className={styles.drawerTitle}>{open.event_type}</div>
                <div className={styles.drawerMeta}>{formatDateTime(open.received_at)}</div>
              </div>
              <button type="button" className={styles.closeBtn} onClick={closeDrawer} aria-label="Fechar">
                ×
              </button>
            </div>

            <div className={styles.drawerBody}>
              <div>
                <div className={styles.sectionLabel}>status</div>
                <Badge tone={open.processed_ok ? "green" : "pink"}>
                  {open.processed_ok ? "processado" : "erro no processamento"}
                </Badge>
              </div>

              {open.error_message && (
                <div>
                  <div className={styles.sectionLabel}>erro</div>
                  <div className={styles.errorBox}>{open.error_message}</div>
                </div>
              )}

              {detail && detail.attempts.length > 0 && (
                <div>
                  <div className={styles.sectionLabel}>tentativas</div>
                  <div className={styles.attempts}>
                    {detail.attempts.map((a, i) => (
                      <div key={i} className={styles.attemptRow}>
                        <span
                          style={{
                            color:
                              a.result === "erro"
                                ? "var(--db-pink)"
                                : a.result === "ok"
                                  ? "var(--db-green)"
                                  : "var(--db-text-muted)",
                          }}
                        >
                          ●
                        </span>{" "}
                        {formatDateTime(a.at)} · {a.result}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className={styles.sectionLabel}>correlação</div>
                {detail && detail.correlation.length > 0 ? (
                  <div className={styles.corrChips}>
                    {detail.correlation.map((c, i) =>
                      c.href ? (
                        <Link key={i} href={c.href} className={styles.relChip}>
                          {c.label}
                        </Link>
                      ) : (
                        <span key={i} className={styles.relChip}>
                          {c.label}
                        </span>
                      )
                    )}
                  </div>
                ) : open.related_invoice_id ? (
                  <Link href="/admin/invoices" className={styles.relChip}>
                    invoice {open.related_invoice_id.slice(0, 8)} →
                  </Link>
                ) : (
                  <span className={styles.drawerMeta}>nenhuma entidade correlacionada</span>
                )}
              </div>

              <div>
                <div className={styles.sectionLabel}>payload (redigido)</div>
                <pre className={styles.payload}>
                  {JSON.stringify(detail?.payload ?? open.payload, null, 2)}
                </pre>
                <button type="button" className={styles.copyBtn} onClick={copyPayload}>
                  {copied ? "copiado" : "copiar"}
                </button>
              </div>
            </div>

            <div className={styles.drawerFooter}>
              {confirming ? (
                <>
                  <span className={styles.confirmText}>
                    Reprocessar dispara de novo os efeitos deste evento (cobrança, e-mail, sync).
                    Confirmar?
                  </span>
                  <div className={styles.confirmRow}>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => setConfirming(false)}
                    >
                      voltar
                    </button>
                    <button
                      type="button"
                      className={styles.reprocessBtn}
                      onClick={reprocess}
                      disabled={pending}
                    >
                      {pending ? "reprocessando…" : "Confirmar reprocessamento"}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className={styles.reprocessBtn}
                  onClick={() => setConfirming(true)}
                >
                  Reprocessar evento
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
