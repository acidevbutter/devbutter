"use client";

import { useRef, useState } from "react";
import styles from "./Recebimentos.module.scss";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";
const ACCEPTED_MIME = new Set(ACCEPT.split(","));

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading"; name: string }
  | { kind: "done"; name: string; size: number }
  | { kind: "error"; message: string };

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(mb < 1 ? 2 : 1).replace(".", ",")} mb`;
}

export default function DocumentUploader({
  groupId,
  onUploaded,
}: {
  groupId: string;
  onUploaded?: () => void;
}) {
  const [state, setState] = useState<UploadState>({ kind: "idle" });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function send(file: File) {
    if (file.size > MAX_BYTES) {
      setState({ kind: "error", message: "Arquivo acima de 10 MB." });
      return;
    }
    if (file.type && !ACCEPTED_MIME.has(file.type)) {
      setState({ kind: "error", message: "Formato não aceito. Use PDF, JPG, PNG ou WebP." });
      return;
    }

    setState({ kind: "uploading", name: file.name });
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(
        `/api/portal/recebimentos/documents/${encodeURIComponent(groupId)}`,
        { method: "POST", body }
      );
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        const message =
          res.status === 422
            ? "Não foi possível validar o arquivo. Confira o formato e o tamanho."
            : typeof detail?.error === "string"
              ? detail.error
              : "Não foi possível enviar o documento. Tente de novo.";
        setState({ kind: "error", message });
        return;
      }
      setState({ kind: "done", name: file.name, size: file.size });
      onUploaded?.();
    } catch {
      setState({ kind: "error", message: "Falha de conexão ao enviar. Tente de novo." });
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void send(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void send(file);
  }

  if (state.kind === "done") {
    return (
      <div className={styles.fileChip}>
        <span className={styles.fileChipOk} aria-hidden="true">
          ✓
        </span>
        <div className={styles.fileChipMeta}>
          <div className={styles.fileChipName}>{state.name}</div>
          <div className={styles.fileChipSub}>
            {formatSize(state.size)} · enviado · aguardando análise
          </div>
        </div>
        <button
          type="button"
          className={styles.btnOutlineSm}
          onClick={() => setState({ kind: "idle" })}
        >
          Trocar arquivo
        </button>
      </div>
    );
  }

  const uploading = state.kind === "uploading";

  return (
    <div>
      <div
        className={`${styles.uploader} ${dragging ? styles.uploaderActive : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <div className={styles.uploaderText}>
          {uploading ? "Enviando…" : "Arraste o arquivo aqui ou selecione no seu computador"}
        </div>
        <div className={styles.uploaderHint}>1 arquivo · pdf, jpg, png, webp · máx. 10 mb</div>
        <button
          type="button"
          className={styles.btnGhost}
          disabled={uploading}
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          {uploading ? "Enviando…" : "Enviar documento"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={onPick}
        />
      </div>
      {state.kind === "error" && <div className={styles.errorText}>{state.message}</div>}
    </div>
  );
}
