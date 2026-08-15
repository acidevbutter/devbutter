"use client";

import { useState } from "react";
import styles from "./Maintenance.module.scss";

type Status = "idle" | "sending" | "done" | "error";

const CONTACT_EMAIL = "contato@devbutter.com";

export default function NotifyForm({ label }: { label: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    setStatus("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={`fu ${styles.notify}`}>
      <div className={`mono ${styles.notifyLabel}`}>{label}</div>

      {status === "done" ? (
        <p className={`mono ${styles.notifyDone}`} role="status">
          <span className="gn">✓</span> anotado. você recebe um único e-mail no dia do lançamento.
        </p>
      ) : (
        <form className={styles.notifyRow} onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="notify-email">
            Seu e-mail
          </label>
          <input
            id="notify-email"
            type="email"
            required
            autoComplete="email"
            placeholder="seu@email.com"
            className={styles.notifyInput}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className={styles.notifyButton} disabled={status === "sending"}>
            {status === "sending" ? "Enviando…" : "Quero ser avisado"}
          </button>
        </form>
      )}

      {status === "error" ? (
        <div className={`mono ${styles.notifyError}`} role="alert">
          não conseguimos registrar agora — escreva para{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </div>
      ) : (
        <div className={`mono ${styles.notifyHint}`}>
          um único e-mail, no dia do lançamento — sem newsletter.
        </div>
      )}
    </div>
  );
}
