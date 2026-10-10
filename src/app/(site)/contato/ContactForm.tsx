"use client";

import { useId, useState, type FormEvent } from "react";
import Button from "@/components/admin/ui/Button/Button";
import styles from "./Contato.module.scss";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "sending" | "sent" | "invalid" | "unavailable" | "failed";

export default function ContactForm() {
  const id = useId();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !EMAIL_RE.test(email.trim()) || !message.trim()) {
      setStatus("invalid");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/contato", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, website }),
      });
      if (res.ok) setStatus("sent");
      else if (res.status === 400) setStatus("invalid");
      else if (res.status === 503) setStatus("unavailable");
      else setStatus("failed");
    } catch {
      setStatus("failed");
    }
  }

  if (status === "sent") {
    return (
      <div className={styles.sent} role="status">
        <span className={styles.sentIcon} aria-hidden="true">
          ✓
        </span>
        <h2 className={styles.formTitle}>Recado recebido.</h2>
        <p className={styles.sentText}>Alguém do time responde no seu e-mail em horário comercial.</p>
      </div>
    );
  }

  const invalid = status === "invalid";
  const errorId = `${id}-error`;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.formTitle}>Deixar um recado</h2>
      <label className={styles.field}>
        <span className={styles.label}>nome</span>
        <input
          className={styles.input}
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={invalid && !name.trim() ? true : undefined}
          aria-describedby={invalid ? errorId : undefined}
          maxLength={120}
          required
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>e-mail</span>
        <input
          className={styles.input}
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={invalid && !EMAIL_RE.test(email.trim()) ? true : undefined}
          aria-describedby={invalid ? errorId : undefined}
          required
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>o que está travando?</span>
        <textarea
          className={`${styles.input} ${styles.textarea}`}
          name="message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-invalid={invalid && !message.trim() ? true : undefined}
          aria-describedby={invalid ? errorId : undefined}
          maxLength={4000}
          required
        />
      </label>
      {/* honeypot — fora da tela e da ordem de tabulação */}
      <label className={styles.honeypot} aria-hidden="true">
        site
        <input
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </label>
      {invalid && (
        <div id={errorId} className={styles.error} role="alert">
          Preencha nome, um e-mail válido e o recado.
        </div>
      )}
      {status === "unavailable" && (
        <div className={styles.error} role="alert">
          O recado não pôde ser enviado agora. Escreva para{" "}
          <a href="mailto:contato@devbutter.tech">contato@devbutter.tech</a>.
        </div>
      )}
      {status === "failed" && (
        <div className={styles.error} role="alert">
          Falha de conexão — tente de novo em instantes.
        </div>
      )}
      <div>
        <Button type="submit" variant="outline" className={styles.submit} disabled={status === "sending"}>
          {status === "sending" ? "Enviando…" : "Enviar recado"}
        </Button>
      </div>
    </form>
  );
}
