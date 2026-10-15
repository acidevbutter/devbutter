"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import styles from "@/components/auth/AuthForm.module.scss";
import { readSignupPrefill } from "@/lib/portal/login-client";

const RESEND_SECONDS = 42;

type ResendStatus = "idle" | "sending" | "sent" | "unavailable" | "failed";

// sessionStorage never changes under us here, so there's nothing to
// subscribe to; the server snapshot (null) keeps hydration consistent.
const subscribeNothing = () => () => {};
const readPrefillEmail = () => readSignupPrefill().email ?? null;
const serverEmail = () => null;

export default function VerifyEmail() {
  const email = useSyncExternalStore(subscribeNothing, readPrefillEmail, serverEmail);
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [status, setStatus] = useState<ResendStatus>("idle");
  const counting = seconds > 0;

  useEffect(() => {
    if (!counting) return;
    const id = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(id);
  }, [counting]);

  async function resend() {
    setStatus("sending");
    try {
      const res = await fetch("/api/portal/auth/verify-email/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setStatus("sent");
        setSeconds(RESEND_SECONDS);
        return;
      }
      // 501 until the backend grows POST /accounts/verify-email/resend.
      setStatus(res.status === 501 ? "unavailable" : "failed");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className={styles.center}>
      <div className={styles.tile} aria-hidden="true">
        @
      </div>
      <h1 className={styles.title}>Confirme seu e-mail</h1>
      <p className={styles.body}>
        Mandamos um link para <span className={styles.strong}>{email || "seu e-mail"}</span>. Abra no
        mesmo aparelho pra entrar direto.
      </p>
      <div className={styles.meta}>
        não chegou?{" "}
        {counting ? (
          <span>reenviar em 0:{String(seconds).padStart(2, "0")}</span>
        ) : (
          <button
            type="button"
            className={styles.inlineButton}
            onClick={resend}
            disabled={status === "sending"}
          >
            reenviar
          </button>
        )}
      </div>
      {status === "sent" && (
        <p className={styles.note} role="status">
          Link reenviado — confira a caixa de entrada.
        </p>
      )}
      {status === "unavailable" && (
        <p className={styles.note} role="status">
          Reenvio indisponível no momento — fale com{" "}
          <a href="mailto:contato@devbutter.tech">contato@devbutter.tech</a>.
        </p>
      )}
      {status === "failed" && (
        <p className={styles.error} role="alert">
          Não foi possível reenviar agora — tente de novo em instantes.
        </p>
      )}
    </div>
  );
}
