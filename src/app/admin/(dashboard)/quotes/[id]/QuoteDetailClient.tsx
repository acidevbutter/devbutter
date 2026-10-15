"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
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

export type LinkedClient = {
  business_name: string | null;
  name: string;
  email: string;
  cnpj: string | null;
  asaas_customer_id: string | null;
};

export default function QuoteDetailClient({
  quote,
  clientLabel,
  linkedClient,
  conversationMessageCount,
  readOnly,
}: {
  quote: QuoteRead;
  clientLabel: string;
  linkedClient: LinkedClient | null;
  conversationMessageCount: number | null;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [priceMin = "", priceMax = ""] = (quote.price_range ?? "")
    .split(/[–-]/)
    .map((s) => s.trim());

  const [deliverables, setDeliverables] = useState<string[]>(quote.deliverables ?? []);

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
  // In-page confirmation: window.confirm() is invisible to automated tests and
  // freezes the tab under CDP, which made "Rejeitar" look like a no-op (DVB-358).
  const [confirmingReject, setConfirmingReject] = useState(false);

  async function handleReject() {
    setRejectPending(true);
    setRejectError(null);
    const result = await rejectQuoteAction(quote.id);
    setRejectPending(false);
    setConfirmingReject(false);
    if (result?.error) {
      setRejectError(result.error);
      return;
    }
    router.refresh();
  }

  const canAct = !readOnly && quote.status === "draft";
  const savedAt = new Date(quote.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={styles.panel}>
      <div className={styles.breadcrumb}>
        <span>
          Quotes / <span style={{ color: "var(--db-text-primary)" }}>{quote.reference}</span>
        </span>
        <span>
          {readOnly ? "dado de exemplo · somente leitura" : `rascunho salvo automaticamente · ${savedAt}`}
        </span>
      </div>

      <div className={styles.split}>
        <div className={styles.main}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{clientLabel}</h1>
            <Badge tone={quoteStatusTone(quote.status)} size="md">
              {quote.status}
            </Badge>
            <Badge tone={quote.source === "ai" ? "green" : "neutral"} size="md">
              {quote.source === "ai" ? "origem IA" : "origem manual"}
            </Badge>
          </div>

          {quote.conversation_id && (
            <Link href={`/admin/conversations?open=${quote.conversation_id}`} className={styles.convBar}>
              <span>
                ▸ conversa que originou este draft
                {conversationMessageCount ? ` · ${conversationMessageCount} mensagens` : ""}
              </span>
              <span className={styles.convOpen}>Abrir</span>
            </Link>
          )}

          <form id="edit-quote-form" action={editFormAction}>
            <div className={styles.sectionLabel} style={{ marginTop: 24 }}>
              resumo do escopo
            </div>
            <textarea
              className={styles.textarea}
              name="scope_summary"
              defaultValue={quote.scope_summary}
              disabled={!canAct}
            />

            <div className={styles.sectionLabel} style={{ marginTop: 20 }}>
              entregáveis
            </div>
            <div className={styles.deliverables}>
              {deliverables.map((d, i) => (
                <div key={i} className={styles.deliverableRow}>
                  <input
                    className={styles.deliverableInput}
                    name="deliverable"
                    defaultValue={d}
                    disabled={!canAct}
                    aria-label={`entregável ${i + 1}`}
                  />
                  {canAct && (
                    <button
                      type="button"
                      className={styles.deliverableRemove}
                      onClick={() => setDeliverables((xs) => xs.filter((_, j) => j !== i))}
                      aria-label="remover entregável"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              {canAct ? (
                <button
                  type="button"
                  className={styles.deliverableAdd}
                  onClick={() => setDeliverables((xs) => [...xs, ""])}
                >
                  + adicionar entregável
                </button>
              ) : (
                deliverables.length === 0 && (
                  <div className={styles.deliverableAdd}>nenhum entregável registrado</div>
                )
              )}
            </div>

            <div className={styles.row2}>
              <div>
                <div className={styles.sectionLabel}>faixa de preço (R$)</div>
                <div className={styles.rangeRow}>
                  <input
                    className={styles.input}
                    name="price_min"
                    defaultValue={priceMin}
                    disabled={!canAct}
                    aria-label="preço mínimo"
                  />
                  <span className={styles.rangeDash}>—</span>
                  <input
                    className={styles.input}
                    name="price_max"
                    defaultValue={priceMax}
                    disabled={!canAct}
                    aria-label="preço máximo"
                  />
                </div>
              </div>
              <div>
                <div className={styles.sectionLabel}>prazo estimado</div>
                <input
                  className={styles.input}
                  name="timeline"
                  defaultValue={quote.timeline ?? ""}
                  disabled={!canAct}
                />
              </div>
            </div>

            <div className={styles.sectionLabel} style={{ marginTop: 22 }}>
              observações internas
            </div>
            <textarea
              className={styles.notesBox}
              name="internal_notes"
              defaultValue={quote.internal_notes ?? ""}
              placeholder="sem observações internas registradas"
              disabled={!canAct}
            />

            {canAct && (
              <div style={{ marginTop: 18 }}>
                {editState?.error && <div className={styles.error}>{editState.error}</div>}
              </div>
            )}
          </form>

          <div className={styles.history}>
            histórico ·{" "}
            {quote.reviewed_at
              ? `revisado ${new Date(quote.reviewed_at).toLocaleString("pt-BR")} · `
              : ""}
            criado {new Date(quote.created_at).toLocaleString("pt-BR")}
            {quote.source === "ai" ? " · draft gerado pela IA" : ""}
          </div>
        </div>

        <div className={styles.side}>
          <div>
            <div className={styles.sectionLabel} style={{ marginBottom: 10 }}>
              cliente vinculado
            </div>
            <div className={styles.linkedCard}>
              <div className={styles.linkedName}>
                {linkedClient?.business_name ?? linkedClient?.name ?? clientLabel}
              </div>
              <div className={styles.linkedMeta}>
                {linkedClient?.email ?? "—"}
                {linkedClient?.cnpj ? (
                  <>
                    <br />
                    CNPJ {linkedClient.cnpj}
                  </>
                ) : null}
              </div>
              <div
                className={`${styles.linkedPill} ${
                  linkedClient?.asaas_customer_id ? styles.linkedPillOk : styles.linkedPillPending
                }`}
              >
                {linkedClient?.asaas_customer_id
                  ? `Asaas: ${linkedClient.asaas_customer_id}`
                  : "Asaas: criado na aprovação"}
              </div>
            </div>
          </div>

          <div>
            <div className={styles.sectionLabel} style={{ marginBottom: 10 }}>
              ações
            </div>
            {canAct ? (
              <div className={styles.actions}>
                <form action={approveFormAction} className={styles.approveForm}>
                  <input className={styles.input} name="amount" placeholder="valor (R$)" required />
                  <input className={styles.input} name="due_date" type="date" required />
                  <select className={styles.input} name="billing_type" defaultValue="UNDEFINED">
                    <option value="UNDEFINED">forma de cobrança a definir</option>
                    <option value="BOLETO">boleto</option>
                    <option value="PIX">pix</option>
                    <option value="CREDIT_CARD">cartão</option>
                  </select>
                  <button type="submit" disabled={approvePending} className={styles.btnSolid}>
                    {approvePending ? "Aprovando…" : "Aprovar e criar order"}
                  </button>
                  {approveState?.error && <div className={styles.error}>{approveState.error}</div>}
                </form>
                <button
                  type="submit"
                  form="edit-quote-form"
                  disabled={editPending}
                  className={styles.btnGhost}
                >
                  {editPending ? "Salvando…" : "Salvar alterações"}
                </button>
                {confirmingReject ? (
                  <>
                    <div role="alert">Rejeitar este quote? O cliente deixa de poder aprová-lo.</div>
                    <button
                      type="button"
                      onClick={handleReject}
                      disabled={rejectPending}
                      className={styles.btnDanger}
                    >
                      {rejectPending ? "Rejeitando…" : "Confirmar rejeição"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingReject(false)}
                      disabled={rejectPending}
                      className={styles.btnGhost}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setRejectError(null);
                      setConfirmingReject(true);
                    }}
                    className={styles.btnDanger}
                  >
                    Rejeitar
                  </button>
                )}
                {rejectError && <div className={styles.error}>{rejectError}</div>}
              </div>
            ) : (
              <div className={styles.readonlyNote}>
                {readOnly ? "somente leitura" : `quote ${quote.status} — sem ações disponíveis`}
              </div>
            )}
          </div>

          {quote.status === "draft" && (
            <div className={styles.outcome}>
              <div className={styles.outcomeLabel}>depois de aprovar</div>
              <div className={styles.outcomeTitle}>Order criada a partir deste quote</div>
              <div className={styles.outcomeMeta}>
                cliente Asaas criado · invoice de entrada pendente
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
