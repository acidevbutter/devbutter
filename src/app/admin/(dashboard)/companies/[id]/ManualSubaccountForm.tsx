"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createManualSubaccountAction } from "@/lib/admin/actions/companies";
import {
  formatBrMobile,
  formatCep,
  formatCnpj,
  formatCurrencyInput,
  getSubaccountFieldIssues,
  parseCurrencyDisplay,
  toCurrencyDisplay,
  type SubaccountCreatePayload,
} from "@/lib/admin/asaas-types";
import styles from "./CompanyDetail.module.scss";

const BLANK: SubaccountCreatePayload = {
  name: "",
  email: "",
  cpfCnpj: "",
  companyType: undefined,
  mobilePhone: "",
  incomeValue: "",
  address: "",
  addressNumber: "",
  complement: "",
  province: "",
  postalCode: "",
  site: "",
};

function _hasValue(value: string | undefined): boolean {
  return value !== undefined && value.trim() !== "";
}

/** Companies in this system are always PJ (CompanyBillingProfile has no
 * CPF/birthDate path), so this form only ever asks for a CNPJ + companyType
 * -- unlike the generic SubaccountCreate shape, there's no individual/CPF
 * branch to show here. */
export default function ManualSubaccountForm({
  companyId,
  prefill,
  initialError,
}: {
  companyId: string;
  prefill: Partial<SubaccountCreatePayload>;
  initialError?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<SubaccountCreatePayload>(() => {
    const merged = { ...BLANK, ...prefill };
    return {
      ...merged,
      cpfCnpj: formatCnpj(merged.cpfCnpj),
      mobilePhone: formatBrMobile(merged.mobilePhone),
      postalCode: formatCep(merged.postalCode),
    };
  });
  // incomeValue keeps a plain decimal in `form` (what SubaccountCreate wants)
  // and a separately-masked BR display string here -- the mask shifts digits
  // in as cents from the right, which only works against its own display
  // string, not against "1000.00".
  const [incomeDisplay, setIncomeDisplay] = useState(() => toCurrencyDisplay(prefill.incomeValue));
  const [error, setError] = useState<string | null>(initialError ?? null);

  // Whatever already has a value coming in (from CompanyBillingProfile, or
  // the company/owner fallback) is data already saved elsewhere -- this
  // form is only for filling in what's still missing before Asaas, not for
  // silently overwriting it. A field wrong enough to have caused
  // CREATION_FAILED needs to be corrected at its source (the company's
  // billing profile), not patched over here.
  const lockedFields = useMemo(() => {
    const locked = new Set<keyof SubaccountCreatePayload>();
    (Object.keys(prefill) as (keyof SubaccountCreatePayload)[]).forEach((key) => {
      if (_hasValue(prefill[key])) locked.add(key);
    });
    return locked;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefill is a fresh object every render; only its identity at mount matters
  }, []);

  const issues = useMemo(() => getSubaccountFieldIssues(form), [form]);
  const canSubmit = issues.length === 0 && !pending;

  function set<K extends keyof SubaccountCreatePayload>(key: K, value: SubaccountCreatePayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setError(null);

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim(),
      cpfCnpj: form.cpfCnpj.replace(/\D/g, ""),
      companyType: form.companyType,
      mobilePhone: form.mobilePhone.replace(/\D/g, ""),
      incomeValue: Number(form.incomeValue),
      address: form.address.trim(),
      addressNumber: form.addressNumber.trim(),
      province: form.province.trim(),
      postalCode: form.postalCode.replace(/\D/g, ""),
    };
    if (form.complement?.trim()) payload.complement = form.complement.trim();
    if (form.site?.trim()) payload.site = form.site.trim();

    startTransition(async () => {
      const result = await createManualSubaccountAction(companyId, payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.link.provisioning_status === "CREATION_FAILED") {
        setError(result.link.last_error ?? "Asaas rejeitou a criação da subconta.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <form className={styles.blockBody} onSubmit={handleSubmit}>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.formGrid}>
        <ManualField label="Nome ou razão social" required full locked={lockedFields.has("name")}>
          <input
            className={styles.input}
            style={{ maxWidth: "none" }}
            value={form.name}
            disabled={lockedFields.has("name")}
            onChange={(e) => set("name", e.target.value)}
            maxLength={255}
          />
        </ManualField>
        <ManualField label="E-mail" required locked={lockedFields.has("email")}>
          <input
            type="email"
            className={styles.input}
            style={{ maxWidth: "none" }}
            value={form.email}
            disabled={lockedFields.has("email")}
            onChange={(e) => set("email", e.target.value)}
            maxLength={320}
          />
        </ManualField>
        <ManualField label="CNPJ" required locked={lockedFields.has("cpfCnpj")}>
          <input
            className={styles.input}
            style={{ maxWidth: "none" }}
            value={form.cpfCnpj}
            disabled={lockedFields.has("cpfCnpj")}
            onChange={(e) => set("cpfCnpj", formatCnpj(e.target.value))}
            placeholder="00.000.000/0000-00"
            maxLength={18}
          />
        </ManualField>
        <ManualField label="Tipo de empresa" required locked={lockedFields.has("companyType")}>
          <select
            className={styles.input}
            style={{ maxWidth: "none" }}
            value={form.companyType ?? ""}
            disabled={lockedFields.has("companyType")}
            onChange={(e) =>
              set("companyType", (e.target.value || undefined) as SubaccountCreatePayload["companyType"])
            }
          >
            <option value="">selecione…</option>
            <option value="MEI">MEI</option>
            <option value="LIMITED">Limitada</option>
            <option value="INDIVIDUAL">Empresário individual</option>
            <option value="ASSOCIATION">Associação</option>
          </select>
        </ManualField>
        <ManualField label="Celular" required locked={lockedFields.has("mobilePhone")}>
          <input
            className={styles.input}
            style={{ maxWidth: "none" }}
            value={form.mobilePhone}
            disabled={lockedFields.has("mobilePhone")}
            onChange={(e) => set("mobilePhone", formatBrMobile(e.target.value))}
            placeholder="(11) 99999-9999"
            maxLength={15}
          />
        </ManualField>
        <ManualField
          label="Renda/faturamento mensal (R$)"
          required
          locked={lockedFields.has("incomeValue")}
        >
          <input
            type="text"
            inputMode="decimal"
            className={styles.input}
            style={{ maxWidth: "none" }}
            value={incomeDisplay}
            disabled={lockedFields.has("incomeValue")}
            onChange={(e) => {
              const display = formatCurrencyInput(e.target.value);
              setIncomeDisplay(display);
              set("incomeValue", parseCurrencyDisplay(display));
            }}
            placeholder="0,00"
          />
        </ManualField>
        <ManualField label="Endereço" required full locked={lockedFields.has("address")}>
          <input
            className={styles.input}
            style={{ maxWidth: "none" }}
            value={form.address}
            disabled={lockedFields.has("address")}
            onChange={(e) => set("address", e.target.value)}
            maxLength={255}
          />
        </ManualField>
        <ManualField label="Número" required locked={lockedFields.has("addressNumber")}>
          <input
            className={styles.input}
            style={{ maxWidth: "none" }}
            value={form.addressNumber}
            disabled={lockedFields.has("addressNumber")}
            onChange={(e) => set("addressNumber", e.target.value)}
            placeholder="ex: 120 ou S/N"
            maxLength={32}
          />
        </ManualField>
        <ManualField label="Complemento" locked={lockedFields.has("complement")}>
          <input
            className={styles.input}
            style={{ maxWidth: "none" }}
            value={form.complement}
            disabled={lockedFields.has("complement")}
            onChange={(e) => set("complement", e.target.value)}
            maxLength={255}
          />
        </ManualField>
        <ManualField label="Bairro" required locked={lockedFields.has("province")}>
          <input
            className={styles.input}
            style={{ maxWidth: "none" }}
            value={form.province}
            disabled={lockedFields.has("province")}
            onChange={(e) => set("province", e.target.value)}
            maxLength={120}
          />
        </ManualField>
        <ManualField label="CEP" required locked={lockedFields.has("postalCode")}>
          <input
            className={styles.input}
            style={{ maxWidth: "none" }}
            value={form.postalCode}
            disabled={lockedFields.has("postalCode")}
            onChange={(e) => set("postalCode", formatCep(e.target.value))}
            placeholder="00000-000"
            maxLength={9}
          />
        </ManualField>
        <ManualField label="Site" locked={lockedFields.has("site")}>
          <input
            className={styles.input}
            style={{ maxWidth: "none" }}
            value={form.site}
            disabled={lockedFields.has("site")}
            onChange={(e) => set("site", e.target.value)}
            placeholder="opcional"
            maxLength={255}
          />
        </ManualField>
      </div>

      {issues.length > 0 && (
        <div className={styles.checklist}>
          <span className={styles.fieldLabel}>faltando antes de enviar à asaas</span>
          {issues.map((issue) => (
            <div key={issue.field} className={styles.checklistItem}>
              <span
                className={`${styles.dot} ${issue.kind === "invalid" ? styles.dotInvalid : ""}`}
              />
              {issue.label}
              {issue.kind === "invalid" ? " — formato inválido" : ""}
            </div>
          ))}
        </div>
      )}

      {lockedFields.size > 0 && (
        <p className={styles.emptyHint}>
          Campos marcados (salvo) já vêm de dados salvos da empresa e não são editáveis aqui — só
          o que ainda falta.
        </p>
      )}

      <button type="submit" className={styles.submitBtn} disabled={!canSubmit}>
        {pending ? "enviando…" : "criar subconta no asaas"}
      </button>
    </form>
  );
}

function ManualField({
  label,
  required,
  full,
  locked,
  children,
}: {
  label: string;
  required?: boolean;
  full?: boolean;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`${styles.field} ${full ? styles.fieldFull : ""} ${locked ? styles.fieldLocked : ""}`}>
      <span className={styles.fieldLabel}>
        {label}
        {required ? " *" : ""}
        {locked ? " (salvo)" : ""}
      </span>
      {children}
    </div>
  );
}
