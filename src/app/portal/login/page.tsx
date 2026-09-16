"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logomark from "@/components/icons/Logomark";
import styles from "./Login.module.scss";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "e-mail ou senha incorretos",
  invalid_signup: "preencha nome, e-mail e senha",
  email_exists: "este e-mail já está cadastrado",
};

interface PasswordCredentialCtor {
  new (data: { id: string; password: string; name?: string }): Credential;
}

async function offerToSaveCredential(email: string, password: string): Promise<void> {
  const PasswordCredentialImpl = (window as { PasswordCredential?: PasswordCredentialCtor })
    .PasswordCredential;
  if (!PasswordCredentialImpl || !navigator.credentials) return;
  try {
    await navigator.credentials.store(new PasswordCredentialImpl({ id: email, password, name: email }));
  } catch {
    // Saving credentials is best effort and must not interrupt authentication.
  }
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={null}>
      <PortalLoginForm />
    </Suspense>
  );
}

function PortalLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isQuoteIntent = searchParams.get("intent") === "quote";
  const nextParam = searchParams.get("next");
  const safeNext =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : null;
  const wantsAdmin = safeNext?.startsWith("/admin") ?? false;
  const destination = wantsAdmin
    ? isQuoteIntent
      ? "/portal/orcamentos?new=1"
      : "/portal"
    : safeNext ?? (isQuoteIntent ? "/portal/orcamentos?new=1" : "/portal");
  const adminDestination = wantsAdmin && safeNext ? safeNext : "/admin/dashboard";
  const [tab, setTab] = useState<"entrar" | "criar">(isQuoteIntent ? "criar" : "entrar");

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <Logomark width={24} height={28} />
          <span className={styles.wordmark}>
            Dev<span className="gn">Butter</span>
          </span>
        </div>
        <div className={styles.hint}>
          {isQuoteIntent
            ? "Crie uma conta para conversar com a IA e montar sua cotação"
            : "Crie uma conta para salvar e acompanhar seu orçamento"}
        </div>
        <div className={styles.tabs}>
          <button type="button" className={`${styles.tab} ${tab === "entrar" ? styles.tabActive : ""}`} onClick={() => setTab("entrar")}>
            Entrar
          </button>
          <button type="button" className={`${styles.tab} ${tab === "criar" ? styles.tabActive : ""}`} onClick={() => setTab("criar")}>
            Criar conta
          </button>
        </div>
        {tab === "entrar" ? (
          <LoginForm router={router} destination={destination} adminDestination={adminDestination} />
        ) : (
          <SignupForm router={router} destination={destination} />
        )}
      </div>
    </div>
  );
}

function LoginForm({ router, destination, adminDestination }: { router: ReturnType<typeof useRouter>; destination: string; adminDestination: string }) {
  const [email, setEmail] = useState("ana@atelie-corvo.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/portal/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(ERROR_MESSAGES[body?.error] ?? "não foi possível entrar — tente novamente");
        setLoading(false);
        return;
      }
      await offerToSaveCredential(email, password);
      const body = (await res.json().catch(() => null)) as { isAdmin?: boolean } | null;
      router.push(body?.isAdmin ? adminDestination : destination);
      router.refresh();
    } catch {
      setError("falha de conexão — tente novamente");
      setLoading(false);
    }
  }

  return (
    <form className={styles.fields} onSubmit={handleSubmit}>
      <div><div className={styles.fieldLabel}>E-MAIL</div><input className={styles.input} type="email" name="email" id="login-email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div><div className={styles.fieldLabel}>SENHA</div><input className={styles.input} type="password" name="password" id="login-password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="sua senha" required /></div>
      {error && <div className={styles.errorText}>{error}</div>}
      <button type="submit" className={styles.submit} disabled={loading}>{loading ? "Entrando…" : "Entrar"}</button>
      <div className={styles.forgot}>Esqueci minha senha</div>
    </form>
  );
}

function SignupForm({ router, destination }: { router: ReturnType<typeof useRouter>; destination: string }) {
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
      const res = await fetch("/api/portal/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(ERROR_MESSAGES[body?.error] ?? body?.error ?? "não foi possível criar a conta — tente novamente");
        setLoading(false);
        return;
      }
      await offerToSaveCredential(email, password);
      router.push(destination);
      router.refresh();
    } catch {
      setError("falha de conexão — tente novamente");
      setLoading(false);
    }
  }

  return (
    <form className={styles.fields} onSubmit={handleSubmit}>
      <div><div className={styles.fieldLabel}>PRIMEIRO NOME</div><input className={styles.input} name="name" id="signup-name" autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} required /></div>
      <div><div className={styles.fieldLabel}>E-MAIL</div><input className={styles.input} type="email" name="email" id="signup-email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div><div className={styles.fieldLabel}>SENHA</div><input className={styles.input} type="password" name="new-password" id="signup-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
      {error && <div className={styles.errorText}>{error}</div>}
      <button type="submit" className={styles.submit} disabled={loading}>{loading ? "Criando…" : "Criar conta"}</button>
    </form>
  );
}
