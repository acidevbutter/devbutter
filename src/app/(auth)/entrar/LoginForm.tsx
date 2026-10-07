"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/admin/ui/Button/Button";
import styles from "@/components/auth/AuthForm.module.scss";
import {
  isValidEmail,
  offerToSaveCredential,
  resolveLoginDestination,
  withLoginParams,
} from "@/lib/portal/login-client";

const ERROR_ID = "login-error";

type LoginError = { message: string; email: boolean; password: boolean };

const CREDENTIALS_ERROR = "E-mail ou senha não conferem.";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { destination, adminDestination } = resolveLoginDestination(searchParams);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<LoginError | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emailOk = isValidEmail(email.trim());
    if (!emailOk || !password) {
      setError({ message: CREDENTIALS_ERROR, email: !emailOk, password: !password });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        setError(
          res.status === 401 || res.status === 400
            ? { message: CREDENTIALS_ERROR, email: false, password: true }
            : { message: "Não foi possível entrar agora — tente novamente.", email: false, password: false },
        );
        setLoading(false);
        return;
      }
      await offerToSaveCredential(email.trim(), password);
      const body = (await res.json().catch(() => null)) as { isAdmin?: boolean } | null;
      router.push(body?.isAdmin ? adminDestination : destination);
      router.refresh();
    } catch {
      setError({ message: "Falha de conexão — tente novamente.", email: false, password: false });
      setLoading(false);
    }
  }

  const describedBy = error ? ERROR_ID : undefined;

  return (
    <>
      <form className={styles.fields} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="login-email" className={styles.label}>
            e-mail
          </label>
          <input
            id="login-email"
            className={styles.input}
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            placeholder="voce@empresa.com.br"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            aria-invalid={error?.email || undefined}
            aria-describedby={describedBy}
            required
          />
        </div>
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="login-password" className={styles.label}>
              senha
            </label>
            <Link href="/esqueci-senha" className={styles.labelLink}>
              esqueci a senha
            </Link>
          </div>
          <input
            id="login-password"
            className={styles.input}
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            aria-invalid={error?.password || undefined}
            aria-describedby={describedBy}
            required
          />
        </div>
        {error && (
          <div id={ERROR_ID} className={styles.error} role="alert">
            {error.message}
          </div>
        )}
        <Button type="submit" variant="solid" className={styles.submit} disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <p className={styles.foot}>
        Ainda não tem conta? <Link href={withLoginParams("/criar-conta", searchParams)}>Criar conta</Link>
      </p>
    </>
  );
}
