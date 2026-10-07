"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/admin/ui/Button/Button";
import TypingDots from "@/components/auth/TypingDots";
import styles from "@/components/auth/AuthForm.module.scss";
import { isValidEmail } from "@/lib/portal/login-client";

type Stage = "ask" | "sending" | "sent";

const ERROR_ID = "forgot-error";
const INVALID_EMAIL = "Digite um e-mail válido.";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<Stage>("ask");
  const [error, setError] = useState<{ message: string; field: boolean } | null>(null);
  const sentHeadingRef = useRef<HTMLHeadingElement>(null);

  // The submit button disappears with the form: hand focus to the result.
  useEffect(() => {
    if (stage === "sent") sentHeadingRef.current?.focus();
  }, [stage]);

  async function send() {
    const value = email.trim();
    if (!isValidEmail(value)) {
      setError({ message: INVALID_EMAIL, field: true });
      setStage("ask");
      return;
    }
    setError(null);
    setStage("sending");
    try {
      const res = await fetch("/api/portal/auth/password-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value }),
      });
      if (res.ok) {
        setStage("sent");
        return;
      }
      setError(
        res.status === 400
          ? { message: INVALID_EMAIL, field: true }
          : { message: "Não foi possível enviar o link agora — tente novamente.", field: false },
      );
    } catch {
      setError({ message: "Falha de conexão — tente novamente.", field: false });
    }
    setStage("ask");
  }

  if (stage === "sending") {
    return (
      <div className={styles.sending} role="status">
        <TypingDots />
        <div>Enviando…</div>
      </div>
    );
  }

  if (stage === "sent") {
    return (
      <div className={`${styles.center} ${styles.rise}`} role="status">
        <div className={styles.badge} aria-hidden="true">
          ✓
        </div>
        <h1 ref={sentHeadingRef} tabIndex={-1} className={styles.title}>
          Confira seu e-mail
        </h1>
        <p className={styles.body}>
          Se existir uma conta com <span className={styles.strong}>{email.trim()}</span>, o link chega
          em instantes. Ele vale por 30 minutos.
        </p>
        <div className={`${styles.meta} ${styles.metaTight}`}>
          não chegou?{" "}
          <button type="button" className={styles.inlineButton} onClick={send}>
            reenviar
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <h1 className={styles.title}>Esqueceu a senha?</h1>
      <p className={styles.lede}>
        Digite o e-mail da sua conta e mandamos um link para criar uma nova.
      </p>
      <form
        className={styles.fields}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        noValidate
      >
        <div className={styles.field}>
          <label htmlFor="forgot-email" className={styles.label}>
            e-mail
          </label>
          <input
            id="forgot-email"
            className={styles.input}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="voce@empresa.com.br"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            aria-invalid={error?.field || undefined}
            aria-describedby={error ? ERROR_ID : undefined}
            required
          />
        </div>
        {error && (
          <div id={ERROR_ID} className={styles.error} role="alert">
            {error.message}
          </div>
        )}
        <Button type="submit" variant="solid" className={styles.submit}>
          Enviar link
        </Button>
      </form>
      <p className={styles.foot}>
        <Link href="/entrar" className={styles.back}>
          ← voltar para entrar
        </Link>
      </p>
    </>
  );
}
