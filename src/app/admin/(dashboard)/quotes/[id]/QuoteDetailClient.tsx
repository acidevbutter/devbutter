"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveQuoteAction,
  editQuoteAction,
  rejectQuoteAction,
  type ActionState,
} from "@/lib/admin/actions/quotes";
import Badge from "@/components/admin/ui/Badge/Badge";
import { quoteStatusTone } from "@/lib/admin/format";
import type { QuoteRead } from "@/lib/admin/types";
import styles from "./QuoteDetail.module.scss";

export default function QuoteDetailClient({
  quote,
  clientLabel,
  readOnly,
}: {
  quote: QuoteRead;
  clientLabel: string;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [priceMin = "", priceMax = ""] = (quote.price_range ?? "").split(/[–-]/).map((s) => s.trim());

  const boundEdit = editQuoteAction.bind(null, quote.id);
  const boundApprove = approveQuoteAction.bind(null, quote.id);
  const [editState, editFormAction, editPending] = useActionState<ActionState, FormData>(
    boundEdit,
    null
  );
  const [approveState, approveFormAction, approvePending] = useActionState<ActionState, FormData>(
    boundApprove,
    null
  );

  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejectPending, setRejectPending] = useState(false);

  async function handleReject() {
    if (!confirm("Rejeitar este quote?")) return;
    setRejectPending(true);
    setRejectError(null);
    const result = await rejectQuoteAction(quote.id);
    setRejectPending(false);
    if (result?.error) {
      setRejectError(result.error);
      return;
    }
    router.refresh();
  }

  const canAct = !readOnly && quote.status === "draft";

  return (
    <div className={styles.panel}>
      <div className={styles.breadcrumb}>
        <span>
          Quotes / <span style={{ color: "var(--db-text-primary)" }}>{clientLabel}</span>
        </span>
        <span>{readOnly ? "dado de exemplo · somente leitura" : "revisão de quote"}</span>
      </div>

      <div className={styles.split}>
        <div className={styles.main}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{clientLabel}</h1>
            <Badge tone={quoteStatusTone(quote.status)}>{quote.status}</Badge>
            <Badge tone={quote.source === "ai" ? "green" : "neutral"}>
              {quote.source === "ai" ? "origem IA" : "origem manual"}
            </Badge>
          </div>

          <form id="edit-quote-form" action={editFormAction}>
            <div className={styles.field}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--db-text-muted)", marginBottom: 7 }}>
                resumo do escopo
              </div>
              <textarea
                className={styles.textarea}
                name="scope_summary"
                defaultValue={quote.scope_summary}
                disabled={!canAct}
              />
            </div>

            <div className={styles.row2}>
              <div>
                <div className="mono" style={{ fontSize: 10, color: "var(--db-text-secondary)", marginBottom: 6 }}>
                  FAIXA DE PREÇO
                </div>
                <input
                  className={styles.input}
                  name="price_range"
                  defaultValue={quote.price_range ?? ""}
                  disabled={!canAct}
                />
              </div>
              <div>
                <div className="mono" style={{ fontSize: 10, color: "var(--db-text-secondary)", marginBottom: 6 }}>
                  PRAZO ESTIMADO
                </div>
                <input
                  className={styles.input}
                  name="timeline"
                  defaultValue={quote.timeline ?? ""}
                  disabled={!canAct}
                />
              </div>
            </div>

            {canAct && (
              <div style={{ marginTop: 18 }}>
                <button type="submit" className="mono" disabled={editPending} style={submitGhostStyle}>
                  {editPending ? "Salvando…" : "Salvar alterações"}
                </button>
                {editState?.error && <div className={styles.error}>{editState.error}</div>}
              </div>
            )}
          </form>

          {readOnly && <div className={styles.readonlyNote}>somente leitura</div>}
        </div>

        <div className={styles.side}>
          <div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--db-text-muted)", marginBottom: 10 }}>
              faixa sugerida
            </div>
            <div style={{ fontSize: 13, color: "var(--db-text-secondary)" }}>
              {priceMin || "—"} — {priceMax || "—"}
            </div>
          </div>

          {canAct && (
            <div className={styles.actions}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--db-text-muted)" }}>
                ações
              </div>
              <form action={approveFormAction} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <input className={styles.input} name="amount" placeholder="valor (R$)" required />
                <input className={styles.input} name="due_date" type="date" required />
                <select className={styles.input} name="billing_type" defaultValue="UNDEFINED">
                  <option value="UNDEFINED">forma de cobrança a definir</option>
                  <option value="BOLETO">boleto</option>
                  <option value="PIX">pix</option>
                  <option value="CREDIT_CARD">cartão</option>
                </select>
                <button type="submit" disabled={approvePending} style={submitSolidStyle}>
                  {approvePending ? "Aprovando…" : "Aprovar e criar order"}
                </button>
                {approveState?.error && <div className={styles.error}>{approveState.error}</div>}
              </form>
              <button type="button" onClick={handleReject} disabled={rejectPending} style={submitDangerStyle}>
                {rejectPending ? "Rejeitando…" : "Rejeitar"}
              </button>
              {rejectError && <div className={styles.error}>{rejectError}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const submitSolidStyle: React.CSSProperties = {
  background: "var(--db-green)",
  color: "var(--admin-bg)",
  border: "none",
  borderRadius: 10,
  padding: 12,
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
};

const submitGhostStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--admin-border-interactive)",
  borderRadius: 10,
  padding: "9px 14px",
  color: "var(--db-text-primary)",
  cursor: "pointer",
  fontSize: 13,
};

const submitDangerStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid rgba(246,76,111,.45)",
  color: "var(--db-pink)",
  borderRadius: 10,
  padding: 11,
  fontWeight: 500,
  fontSize: 13.5,
  cursor: "pointer",
};
