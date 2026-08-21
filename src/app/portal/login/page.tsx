"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Logomark from "@/components/icons/Logomark";
import styles from "./Login.module.scss";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "e-mail ou senha incorretos",
  invalid_signup: "preencha nome, e-mail e senha",
  email_exists: "este e-mail já está cadastrado",
};

export default function PortalLoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"entrar" | "criar">("entrar");

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Logomark width={24} height={28} />
          <span className={styles.wordmark}>
            Dev<span className="gn">Butter</span>
          </span>
        </div>

        <div className={styles.hint}>Crie uma conta para salvar e acompanhar seu orçamento</div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${tab === "entrar" ? styles.tabActive : ""}`}
            onClick={() => setTab("entrar")}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`${styles.tab} ${tab === "criar" ? styles.tabActive : ""}`}
            onClick={() => setTab("criar")}
          >
            Criar conta
          </button>
        </div>

        {tab === "entrar" ? <LoginForm router={router} /> : <SignupForm router={router} />}
      </div>
    </div>
  );
}

function LoginForm({ router }: { router: ReturnType<typeof useRouter> }) {
  const [email, setEmail] = useState("ana@atelie-corvo.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/portal/auth/login", {
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
      router.push("/portal");
      router.refresh();
    } catch {
      setError("falha de conexão — tente novamente");
      setLoading(false);
    }
  }

  return (
    <form className={styles.fields} onSubmit={handleSubmit}>
      <div>
        <div className={styles.fieldLabel}>E-MAIL</div>
        <input
          className={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <div className={styles.fieldLabel}>SENHA</div>
        <input
          className={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="sua senha"
          required
        />
      </div>
      {error && <div className={styles.errorText}>{error}</div>}
      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? "Entrando…" : "Entrar"}
      </button>
      <div className={styles.forgot}>Esqueci minha senha</div>
    </form>
  );
}

function SignupForm({ router }: { router: ReturnType<typeof useRouter> }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/portal/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(ERROR_MESSAGES[body?.error] ?? "não foi possível criar a conta — tente novamente");
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
    <form className={styles.fields} onSubmit={handleSubmit}>
      <div>
        <div className={styles.fieldLabel}>NOME</div>
        <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <div className={styles.fieldLabel}>E-MAIL</div>
        <input
          className={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <div className={styles.fieldLabel}>SENHA</div>
        <input
          className={styles.input}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && <div className={styles.errorText}>{error}</div>}
      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? "Criando…" : "Criar conta"}
      </button>
    </form>
  );
}
