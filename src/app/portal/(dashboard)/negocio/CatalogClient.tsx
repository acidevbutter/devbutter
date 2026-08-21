"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { deleteCatalogEntryAction, saveCatalogEntryAction } from "@/lib/portal/actions/catalog";
import type { ActionState } from "@/lib/portal/actions/types";
import type { PortalCatalogEntry } from "@/lib/portal/types";
import styles from "./Catalog.module.scss";

const TYPES: PortalCatalogEntry["type"][] = ["Produto", "Serviço", "Loja / ponto físico"];

export default function CatalogClient({ entries }: { entries: PortalCatalogEntry[] }) {
  const [editing, setEditing] = useState<PortalCatalogEntry | null | "new">(null);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Meu negócio</h1>
          <p className={styles.subtitle}>
            O que você vende, atende ou produz. Esses dados ajudam a DevButter a entender melhor seu
            negócio ao montar orçamentos e projetos.
          </p>
        </div>
        <button type="button" className={styles.addButton} onClick={() => setEditing("new")}>
          + Adicionar
        </button>
      </div>

      <div className={styles.list}>
        {entries.length === 0 && (
          <div className={styles.empty}>
            nada cadastrado ainda
            <br />
            <br />
            "Conte o que seu negócio faz — usamos isso para montar orçamentos mais precisos."
            <br />
            <br />
            <button type="button" className={styles.addButton} onClick={() => setEditing("new")}>
              Adicionar primeira entrada
            </button>
          </div>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className={styles.row}>
            <span className={styles.type}>{entry.type}</span>
            <span className={styles.desc}>{entry.description}</span>
            <button type="button" className={styles.editLink} onClick={() => setEditing(entry)}>
              editar
            </button>
          </div>
        ))}
      </div>

      {editing && <Editor entry={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Editor({ entry, onClose }: { entry: PortalCatalogEntry | null; onClose: () => void }) {
  const boundSave = saveCatalogEntryAction.bind(null, entry?.id ?? null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(boundSave, null);
  const [type, setType] = useState<PortalCatalogEntry["type"]>(entry?.type ?? "Produto");
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) onClose();
    wasPending.current = pending;
  }, [pending, state, onClose]);

  return (
    <div className={styles.editorCard}>
      <form action={formAction}>
        <input type="hidden" name="type" value={type} />
        <div className={styles.editorTop}>
          <div className={styles.editorTitle}>{entry ? "Editar entrada" : "Nova entrada"}</div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className={styles.label}>tipo</div>
        <div className={styles.typeChips}>
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`${styles.typeChip} ${type === t ? styles.typeChipActive : ""}`}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className={styles.label}>descrição</div>
        <textarea
          className={styles.textarea}
          name="description"
          defaultValue={entry?.description}
          placeholder="Descreva em uma frase…"
        />

        {state?.error && <div className={styles.error}>{state.error}</div>}

        <div className={styles.actions}>
          <button type="submit" className={styles.save} disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" className={styles.cancel} onClick={onClose}>
            Cancelar
          </button>
          {entry && (
            <button
              type="button"
              className={styles.remove}
              onClick={async () => {
                await deleteCatalogEntryAction(entry.id);
                onClose();
              }}
            >
              Remover
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
