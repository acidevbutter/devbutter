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

// The Credential Management API's PasswordCredential isn't in TypeScript's
// bundled DOM lib (dropped upstream years ago), even though Chrome/Edge still
// implement it -- declared locally rather than reaching for a global .d.ts.
interface PasswordCredentialCtor {
  new (data: { id: string; password: string; name?: string }): Credential;
}

/** Prompts the browser's own password manager to offer saving the
 *  credential. Login/signup submit via fetch() instead of a real form
 *  navigation, so browsers have nothing to key a save-password heuristic
 *  off of without this -- best effort, never blocks the auth flow. */
async function offerToSaveCredential(email: string, password: string): Promise<void> {
  const PasswordCredentialImpl = (window as { PasswordCredential?: PasswordCredentialCtor })
    .PasswordCredential;
  if (!PasswordCredentialImpl || !navigator.credentials) return;
  try {
    const credential = new PasswordCredentialImpl({ id: email, password, name: email });
    await navigator.credentials.store(credential);
  } catch {
    // Unsupported browser, user declined, or a private-browsing restriction --
    // none of that should surface as an auth error.
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

  // Non-admins never land on an /admin path; admins fall back to the dashboard.
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

        {tab === "entrar" ? (
          <LoginForm router={router} destination={destination} adminDestination={adminDestination} />
        ) : (
          <SignupForm router={router} destination={destination} />
        )}
      </div>
    </div>
  );
}

function LoginForm({
  router,
  destination,
  adminDestination,
}: {
  router: ReturnType<typeof useRouter>;
  destination: string;
  adminDestination: string;
}) {
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
      <div>
        <div className={styles.fieldLabel}>E-MAIL</div>
        <input
          className={styles.input}
          type="email"
          name="email"
          id="login-email"
          autoComplete="username"
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
          name="password"
          id="login-password"
          autoComplete="current-password"
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

const COMPANY_TYPES = [
  ["MEI", "MEI"],
  ["LIMITED", "LTDA / EIRELI"],
  ["INDIVIDUAL", "Empresário individual"],
  ["ASSOCIATION", "Associação"],
] as const;

const onlyDigits = (value: string) => value.replace(/\D/g, "");

/** Local mirror of the backend BillingProfileInput CNPJ check-digit rule so
 *  the user gets a clear message before the round trip. */
function isValidCnpj(raw: string): boolean {
  const cnpj = onlyDigits(raw);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const check = (slice: number) => {
    const weights =
      slice === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + Number(cnpj[i]) * w, 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  return check(12) === Number(cnpj[12]) && check(13) === Number(cnpj[13]);
}

function SignupForm({
  router,
  destination,
}: {
  router: ReturnType<typeof useRouter>;
  destination: string;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 — dados de recebimento (Asaas subaccount, PJ)
  const [legalName, setLegalName] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [companyType, setCompanyType] = useState<string>("LIMITED");
  const [mobilePhone, setMobilePhone] = useState("");
  const [incomeValue, setIncomeValue] = useState("");
  const [address, setAddress] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [site, setSite] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function goToStep2(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || !password) {
      setError("preencha nome, e-mail e senha");
      return;
    }
    setBillingEmail((current) => current || email.trim());
    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidCnpj(cnpj)) {
      setError("CNPJ inválido — confira os dígitos");
      return;
    }
    if (onlyDigits(postalCode).length !== 8) {
      setError("CEP deve ter 8 dígitos");
      return;
    }
    if (!(Number(incomeValue.replace(",", ".")) > 0)) {
      setError("informe o faturamento mensal");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/portal/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          billing_profile: {
            legal_name: legalName.trim(),
            billing_email: (billingEmail || email).trim(),
            cnpj: onlyDigits(cnpj),
            company_type: companyType,
            mobile_phone: onlyDigits(mobilePhone),
            income_value: Number(incomeValue.replace(",", ".")),
            address: address.trim(),
            address_number: addressNumber.trim(),
            complement: complement.trim() || null,
            province: province.trim(),
            postal_code: onlyDigits(postalCode),
            site: site.trim() || null,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(
          ERROR_MESSAGES[body?.error] ??
            body?.error ??
            "não foi possível criar a conta — confira os dados de recebimento",
        );
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

  if (step === 1) {
    return (
      <form className={styles.fields} onSubmit={goToStep2}>
        <div>
          <div className={styles.fieldLabel}>NOME</div>
          <input
            className={styles.input}
            name="name"
            id="signup-name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div>
          <div className={styles.fieldLabel}>E-MAIL</div>
          <input
            className={styles.input}
            type="email"
            name="email"
            id="signup-email"
            autoComplete="username"
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
            name="new-password"
            id="signup-password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className={styles.errorText}>{error}</div>}
        <button type="submit" className={styles.submit}>
          Continuar
        </button>
      </form>
    );
  }

  return (
    <form className={styles.fields} onSubmit={handleSubmit}>
      <div className={styles.hint}>
        Dados de recebimento — usados para abrir sua conta de recebimentos (pessoa jurídica).
      </div>
      <div>
        <div className={styles.fieldLabel}>RAZÃO SOCIAL</div>
        <input
          className={styles.input}
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          required
        />
      </div>
      <div>
        <div className={styles.fieldLabel}>CNPJ</div>
        <input
          className={styles.input}
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          inputMode="numeric"
          placeholder="00.000.000/0000-00"
          required
        />
      </div>
      <div>
        <div className={styles.fieldLabel}>TIPO DE EMPRESA</div>
        <select
          className={styles.input}
          value={companyType}
          onChange={(e) => setCompanyType(e.target.value)}
        >
          {COMPANY_TYPES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <div className={styles.fieldLabel}>E-MAIL DE COBRANÇA</div>
        <input
          className={styles.input}
          type="email"
          value={billingEmail}
          onChange={(e) => setBillingEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <div className={styles.fieldLabel}>CELULAR</div>
        <input
          className={styles.input}
          value={mobilePhone}
          onChange={(e) => setMobilePhone(e.target.value)}
          inputMode="numeric"
          placeholder="(11) 99999-9999"
          required
        />
      </div>
      <div>
        <div className={styles.fieldLabel}>FATURAMENTO MENSAL (R$)</div>
        <input
          className={styles.input}
          value={incomeValue}
          onChange={(e) => setIncomeValue(e.target.value)}
          inputMode="decimal"
          placeholder="5000"
          required
        />
      </div>
      <div>
        <div className={styles.fieldLabel}>CEP</div>
        <input
          className={styles.input}
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          inputMode="numeric"
          placeholder="00000-000"
          required
        />
      </div>
      <div>
        <div className={styles.fieldLabel}>LOGRADOURO</div>
        <input
          className={styles.input}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </div>
      <div>
        <div className={styles.fieldLabel}>NÚMERO</div>
        <input
          className={styles.input}
          value={addressNumber}
          onChange={(e) => setAddressNumber(e.target.value)}
          required
        />
      </div>
      <div>
        <div className={styles.fieldLabel}>COMPLEMENTO (OPCIONAL)</div>
        <input
          className={styles.input}
          value={complement}
          onChange={(e) => setComplement(e.target.value)}
        />
      </div>
      <div>
        <div className={styles.fieldLabel}>BAIRRO</div>
        <input
          className={styles.input}
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          required
        />
      </div>
      <div>
        <div className={styles.fieldLabel}>SITE (OPCIONAL)</div>
        <input className={styles.input} value={site} onChange={(e) => setSite(e.target.value)} />
      </div>
      {error && <div className={styles.errorText}>{error}</div>}
      <button type="submit" className={styles.submit} disabled={loading}>
        {loading ? "Criando…" : "Criar conta"}
      </button>
      <button
        type="button"
        className={styles.forgot}
        onClick={() => {
          setError(null);
          setStep(1);
        }}
      >
        Voltar
      </button>
    </form>
  );
}
