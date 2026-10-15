"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/admin/ui/Button/Button";
import ExpiredLink from "@/components/auth/ExpiredLink";
import PasswordRules, { passwordRules } from "@/components/auth/PasswordRules";
import styles from "@/components/auth/AuthForm.module.scss";

const ERROR_ID = "reset-error";
const RULES_ID = "reset-rules";
const EXPIRED_PATH = "/link-expirado";

export default function ResetPassword() {
  const token = useSearchParams().get("token");
  if (!token) return <ExpiredLink />;
  return <ResetPasswordForm token={token} />;
}

function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const doneHeadingRef = useRef<HTMLHeadingElement>(null);

  // Check the link before showing the form. Only a definite 404 means
  // expired/used; on an upstream hiccup we still show the form, since the
  // submit re-validates the token anyway.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/portal/auth/password-recovery/${encodeURIComponent(token)}`, { cache: "no-store" })
      .then((res) => {
        if (cancelled) return;
        if (res.status === 404) {
          router.replace(EXPIRED_PATH);
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  // The form (and its focused button) goes away: hand focus to the result.
  useEffect(() => {
    if (done) doneHeadingRef.current?.focus();
  }, [done]);

  const rules = passwordRules(password, confirmation);
  const blocked = !rules.every((rule) => rule.ok);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/auth/password-recovery/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (res.ok) {
        setDone(true);
        return;
      }
      if (res.status === 410) {
        router.replace(EXPIRED_PATH);
        return;
      }
      setError(
        res.status === 400
          ? "A senha precisa ter 8 caracteres ou mais."
          : "Não foi possível salvar a senha agora — tente novamente.",
      );
      setLoading(false);
    } catch {
      setError("Falha de conexão — tente novamente.");
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className={`${styles.center} ${styles.rise}`} role="status">
        <div className={`${styles.badge} ${styles.badgeRing}`} aria-hidden="true">
          ✓
        </div>
        <h1 ref={doneHeadingRef} tabIndex={-1} className={styles.title}>
          Senha alterada
        </h1>
        <p className={`${styles.body} ${styles.bodySpaced}`}>Pronto. Use a senha nova pra entrar.</p>
        <Button variant="solid" href="/entrar" className={styles.action}>
          Entrar
        </Button>
      </div>
    );
  }

  if (checking) {
    return (
      <p className={styles.hint} role="status">
        verificando o link…
      </p>
    );
  }

  const describedBy = error ? `${RULES_ID} ${ERROR_ID}` : RULES_ID;

  return (
    <>
      <h1 className={styles.title}>Crie uma nova senha</h1>
      <p className={styles.lede}>Depois de salvar, saímos das outras sessões por segurança.</p>
      <form className={styles.fields} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="reset-password" className={styles.label}>
            nova senha
          </label>
          <input
            id="reset-password"
            className={styles.input}
            type="password"
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="reset-confirmation" className={styles.label}>
            repita a senha
          </label>
          <input
            id="reset-confirmation"
            className={styles.input}
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => {
              setConfirmation(e.target.value);
              setError(null);
            }}
            aria-describedby={describedBy}
            required
          />
        </div>
        <PasswordRules rules={rules} id={RULES_ID} />
        {error && (
          <div id={ERROR_ID} className={styles.error} role="alert">
            {error}
          </div>
        )}
        <Button type="submit" variant="solid" className={styles.submit} disabled={blocked || loading}>
          {loading ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>
    </>
  );
}
