"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Button from "@/components/admin/ui/Button/Button";
import PasswordStrength from "@/components/auth/PasswordStrength";
import styles from "@/components/auth/AuthForm.module.scss";
import {
  clearSignupPrefill,
  isValidEmail,
  offerToSaveCredential,
  readSignupPrefill,
  resolveLoginDestination,
  withLoginParams,
  type SignupPrefill,
} from "@/lib/portal/login-client";

const ERROR_ID = "signup-error";
const STRENGTH_ID = "signup-strength";

type SignupError =
  | { kind: "invalid"; name: boolean; email: boolean; password: boolean }
  | { kind: "email_exists" }
  | { kind: "failed"; message: string };

export default function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { destination } = resolveLoginDestination(searchParams);
  const fromChat = searchParams.get("origem") === "chat";
  // Chat handoff: name/e-mail come from sessionStorage, never the URL. Read
  // once on mount; readSignupPrefill() is `{}` on the server.
  const [prefill] = useState<SignupPrefill>(() => (fromChat ? readSignupPrefill() : {}));
  const [name, setName] = useState(prefill.name ?? "");
  const [email, setEmail] = useState(prefill.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<SignupError | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const invalid = {
      name: !name.trim(),
      email: !isValidEmail(email.trim()),
      password: password.length < 8,
    };
    if (invalid.name || invalid.email || invalid.password) {
      setError({ kind: "invalid", ...invalid });
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      if (!res.ok) {
        setError(
          res.status === 409
            ? { kind: "email_exists" }
            : { kind: "failed", message: "Não foi possível criar a conta agora — tente novamente." },
        );
        setLoading(false);
        return;
      }
      // Decision: no detour through /verificar-email. The backend has no
      // e-mail verification — signup returns a TokenPair, the BFF already set
      // the session cookies and the account is active — so we go straight to
      // the destination (/portal unless ?next= / ?intent= say otherwise).
      clearSignupPrefill();
      await offerToSaveCredential(email.trim(), password);
      router.push(destination);
      router.refresh();
    } catch {
      setError({ kind: "failed", message: "Falha de conexão — tente novamente." });
      setLoading(false);
    }
  }

  const invalid = error?.kind === "invalid" ? error : null;
  const describedBy = error ? ERROR_ID : undefined;
  const clearError = () => setError(null);

  return (
    <>
      {fromChat && (
        <div className={styles.banner} role="status">
          ✓ seu diagnóstico fica salvo nesta conta
        </div>
      )}
      <form className={styles.fields} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="signup-name" className={styles.label}>
            nome
          </label>
          <input
            id="signup-name"
            className={styles.input}
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError();
            }}
            aria-invalid={invalid?.name || undefined}
            aria-describedby={describedBy}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="signup-email" className={styles.label}>
            e-mail
          </label>
          <input
            id="signup-email"
            className={styles.input}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clearError();
            }}
            aria-invalid={invalid?.email || error?.kind === "email_exists" || undefined}
            aria-describedby={describedBy}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="signup-password" className={styles.label}>
            senha
          </label>
          <input
            id="signup-password"
            className={styles.input}
            type="password"
            name="new-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearError();
            }}
            aria-invalid={invalid?.password || undefined}
            aria-describedby={describedBy ? `${STRENGTH_ID} ${describedBy}` : STRENGTH_ID}
            required
          />
        </div>
        <PasswordStrength password={password} id={STRENGTH_ID} />
        {error && (
          <div id={ERROR_ID} className={styles.error} role="alert">
            {error.kind === "invalid" && "Confira nome, e-mail e uma senha com 8 caracteres ou mais."}
            {error.kind === "email_exists" && (
              <>
                Esse e-mail já tem conta. <Link href={withLoginParams("/entrar", searchParams)}>Entrar</Link> ou{" "}
                <Link href="/esqueci-senha">recuperar a senha</Link>.
              </>
            )}
            {error.kind === "failed" && error.message}
          </div>
        )}
        <Button type="submit" variant="solid" className={styles.submit} disabled={loading}>
          {loading ? "Criando…" : "Criar conta"}
        </Button>
      </form>
      <p className={styles.foot}>
        Já tem conta? <Link href={withLoginParams("/entrar", searchParams)}>Entrar</Link>
      </p>
    </>
  );
}
