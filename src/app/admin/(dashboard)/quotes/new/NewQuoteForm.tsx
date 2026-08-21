"use client";

import { useActionState } from "react";
import { createManualQuoteAction, type ActionState } from "@/lib/admin/actions/quotes";
import type { AdminClientListItem } from "@/lib/admin/types";
import styles from "./NewQuote.module.scss";

export default function NewQuoteForm({ clients }: { clients: AdminClientListItem[] }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    createManualQuoteAction,
    null
  );

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Novo quote</span>
        <span className={styles.headerHint}>origem: manual</span>
      </div>

      <form className={styles.body} action={formAction}>
        <div>
          <div className={styles.sectionLabel}>1 · cliente</div>
          <select className={styles.select} name="account_id" required defaultValue="">
            <option value="" disabled>
              buscar cliente existente…
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.business_name ? `· ${c.business_name}` : ""}
              </option>
            ))}
          </select>
          <p className={styles.headerHint} style={{ marginTop: 8 }}>
            criar cliente novo ainda não tem endpoint no backend — selecione um cliente existente.
          </p>
        </div>

        <div>
          <div className={styles.sectionLabel}>2 · escopo e preço</div>
          <textarea
            className={styles.textarea}
            name="scope_summary"
            placeholder="resumo do escopo…"
            required
          />
          <div className={styles.row2}>
            <div>
              <div className={styles.headerHint} style={{ marginBottom: 6 }}>
                FAIXA (MIN / MAX)
              </div>
              <div className={styles.rangeRow}>
                <input className={styles.input} name="price_min" placeholder="min" required />
                <input className={styles.input} name="price_max" placeholder="max" required />
              </div>
            </div>
            <div>
              <div className={styles.headerHint} style={{ marginBottom: 6 }}>
                PRAZO
              </div>
              <input className={styles.input} name="timeline" placeholder="ex: 6 semanas" />
            </div>
          </div>
        </div>

        <div>
          <div className={styles.sectionLabel}>3 · ações</div>
          <div className={styles.actions}>
            <button
              type="submit"
              disabled={pending}
              style={{
                border: "1px solid var(--admin-border-interactive)",
                borderRadius: 10,
                padding: "11px 16px",
                fontWeight: 500,
                fontSize: 13.5,
                background: "none",
                color: "var(--db-text-primary)",
                cursor: "pointer",
              }}
            >
              {pending ? "Salvando…" : "Salvar rascunho"}
            </button>
          </div>
          {state?.error && <div className={styles.error} style={{ marginTop: 10 }}>{state.error}</div>}
        </div>
      </form>
    </div>
  );
}
