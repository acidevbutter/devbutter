"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logomark from "@/components/icons/Logomark";
import styles from "./Login.module.scss";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "credenciais inválidas — tente novamente",
  not_admin: "esta conta não tem acesso ao painel interno",
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(ERROR_MESSAGES[body?.error] ?? "não foi possível entrar — tente novamente");
        setLoading(false);
        return;
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch {
      setError("falha de conexão — tente novamente");
      setLoading(false);
    }
  }

  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>
          <Logomark width={24} height={28} />
          <span className={styles.wordmark}>
            Dev<span className="gn">Butter</span>
          </span>
        </div>
        <div className={styles.eyebrow}>painel interno</div>

        <div className={styles.fields}>
          <div>
            <div className={styles.fieldLabel}>E-MAIL</div>
            <input
              className={styles.input}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <div className={styles.fieldLabel}>SENHA</div>
            <input
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <div className={styles.errorText}>{error}</div>}
          </div>
          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
          <div className={styles.forgot}>Esqueci minha senha</div>
        </div>
      </form>
    </div>
  );
}
