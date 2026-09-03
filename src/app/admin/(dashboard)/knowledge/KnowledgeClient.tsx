"use client";

import { useActionState, useState } from "react";
import {
  deleteKnowledgeEntryAction,
  saveKnowledgeEntryAction,
} from "@/lib/admin/actions/knowledge";
import type { ActionState } from "@/lib/admin/actions/quotes";
import { formatDate } from "@/lib/admin/format";
import type { KnowledgeEntry } from "@/lib/admin/types";
import styles from "./Knowledge.module.scss";

export default function KnowledgeClient({ entries }: { entries: KnowledgeEntry[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(entries[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState("");

  const selected = creating ? null : entries.find((e) => e.id === selectedId) ?? entries[0] ?? null;
  const filtered = entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className={styles.layout}>
      <div className={styles.side}>
        <input
          className={styles.search}
          placeholder="buscar serviço…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {filtered.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`${styles.entryButton} ${
              !creating && selected?.id === entry.id ? styles.entryButtonActive : ""
            }`}
            onClick={() => {
              setCreating(false);
              setSelectedId(entry.id);
            }}
          >
            <div className={styles.entryName}>{entry.name}</div>
            <div className={styles.entryMeta}>
              {Number(entry.price_min) / 1000}–{Number(entry.price_max) / 1000}k · {entry.typical_duration}
            </div>
          </button>
        ))}
        <button type="button" className={styles.addButton} onClick={() => setCreating(true)}>
          + nova entrada
        </button>
      </div>

      <Editor key={creating ? "new" : selected?.id ?? "empty"} entry={creating ? null : selected} />
    </div>
  );
}

function Editor({ entry }: { entry: KnowledgeEntry | null }) {
  const boundSave = saveKnowledgeEntryAction.bind(null, entry?.id ?? null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(boundSave, null);

  return (
    <form className={styles.editor} action={formAction}>
      <input className={styles.input} name="name" defaultValue={entry?.name} placeholder="nome do serviço" style={{ marginBottom: 20, fontSize: 18, fontWeight: 600, fontFamily: "'Geist', sans-serif" }} />

      <div style={{ font: "500 10px 'Geist Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--db-text-muted)", marginBottom: 7 }}>
        descrição / posicionamento
      </div>
      <textarea className={styles.textarea} name="description" defaultValue={entry?.description} />

      <div className={styles.row2}>
        <div>
          <div style={{ font: "500 10px 'Geist Mono', monospace", color: "var(--admin-text-2)", marginBottom: 6 }}>
            faixa sugerida (R$)
          </div>
          <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
            <input className={styles.input} name="price_min" defaultValue={entry?.price_min} required />
            <span>—</span>
            <input className={styles.input} name="price_max" defaultValue={entry?.price_max} required />
          </div>
        </div>
        <div>
          <div style={{ font: "500 10px 'Geist Mono', monospace", color: "var(--admin-text-2)", marginBottom: 6 }}>
            prazo típico
          </div>
          <input className={styles.input} name="typical_duration" defaultValue={entry?.typical_duration} />
        </div>
      </div>

      <div style={{ font: "500 10px 'Geist Mono', monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--db-text-muted)", margin: "18px 0 7px" }}>
        instruções para a IA
      </div>
      <textarea className={styles.textarea} name="ai_instructions" defaultValue={entry?.ai_instructions} />

      <div className={styles.actions}>
        <button
          type="submit"
          disabled={pending}
          style={{ background: "var(--db-green)", color: "var(--admin-bg)", border: "none", borderRadius: 9, padding: "10px 18px", fontWeight: 600, cursor: "pointer" }}
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
        {entry && (
          <button
            type="button"
            onClick={() => deleteKnowledgeEntryAction(entry.id)}
            style={{ background: "none", border: "1px solid rgba(246,76,111,.45)", color: "var(--db-pink)", borderRadius: 9, padding: "10px 18px", cursor: "pointer" }}
          >
            Remover
          </button>
        )}
        {entry && (
          <span style={{ font: "11.5px 'Geist Mono', monospace", color: "var(--db-text-muted)" }}>
            atualizado {formatDate(entry.updated_at)}
          </span>
        )}
        {state?.error && <span style={{ font: "11.5px 'Geist Mono', monospace", color: "var(--db-pink)" }}>{state.error}</span>}
      </div>
    </form>
  );
}
