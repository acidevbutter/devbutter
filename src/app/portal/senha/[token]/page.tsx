"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Logomark from "@/components/icons/Logomark";
import styles from "./Senha.module.scss";

type CheckState =
  | { status: "loading" }
  | { status: "invalid" }
  | { status: "valid"; email: string };

export default function PasswordSetupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [check, setCheck] = useState<CheckState>({ status: "loading" });
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/portal/auth/password-setup/${token}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((body: { email: string }) => {
        if (!cancelled) setCheck({ status: "valid", email: body.email });
      })
      .catch(() => {
        if (!cancelled) setCheck({ status: "invalid" });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("a senha precisa ter pelo menos 8 caracteres");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/auth/password-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        setError("não foi possível definir sua senha — tente novamente");
        setLoading(false);
        return;
      }
      router.push("/portal");
      router.refresh();
    } catch {
      setError("falha de conexão — tente novamente");
      setLoading(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Logomark width={24} height={28} />
          <span className={styles.wordmark}>
            Dev<span className="gn">Butter</span>
          </span>
        </div>

        {check.status === "loading" && <div className={styles.hint}>verificando o link…</div>}

        {check.status === "invalid" && (
          <>
            <div className={styles.errorText} style={{ textAlign: "center" }}>
              Esse link é inválido, expirou, ou já foi usado.
            </div>
          </>
        )}

        {check.status === "valid" && (
          <>
            <div className={styles.hint}>definir senha para {check.email}</div>
            <form className={styles.fields} onSubmit={handleSubmit}>
              <div>
                <div className={styles.fieldLabel}>NOVA SENHA</div>
                <input
                  className={styles.input}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="mínimo 8 caracteres"
                  required
                  autoFocus
                />
              </div>
              {error && <div className={styles.errorText}>{error}</div>}
              <button type="submit" className={styles.submit} disabled={loading}>
                {loading ? "Salvando…" : "Definir senha e entrar"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
