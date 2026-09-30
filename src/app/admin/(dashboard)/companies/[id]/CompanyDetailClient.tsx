"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import {
  disableFeatureAction,
  enableFeatureAction,
  linkSubaccountAction,
  setSplitQuotaAction,
  type ActionState,
} from "@/lib/admin/actions/companies";
import Badge from "@/components/admin/ui/Badge/Badge";
import Button from "@/components/admin/ui/Button/Button";
import type { SubaccountCreatePayload } from "@/lib/admin/asaas-types";
import type { AdminCompanyDetail, AdminCompanyFeature } from "@/lib/admin/types";
import ManualSubaccountForm from "./ManualSubaccountForm";
import styles from "./CompanyDetail.module.scss";

const FEATURE_LABELS: Record<string, string> = {
  sells_via_api: "Venda via API",
};

export default function CompanyDetailClient({
  company,
  features,
}: {
  company: AdminCompanyDetail;
  features: AdminCompanyFeature[];
}) {
  const boundQuota = setSplitQuotaAction.bind(null, company.id);
  const [quotaState, quotaFormAction, quotaPending] = useActionState<ActionState, FormData>(
    boundQuota,
    null
  );

  const boundLink = linkSubaccountAction.bind(null, company.id);
  const [linkState, linkFormAction, linkPending] = useActionState<ActionState, FormData>(
    boundLink,
    null
  );

  // company.link is non-null as soon as a creation attempt is *tried*, not
  // only once one succeeds -- a CREATION_FAILED attempt leaves a link row
  // with asaas_account_id still null so it can be retried. Only
  // asaas_account_id means there's an actual usable subaccount.
  const hasPaymentMethod = company.link?.asaas_account_id != null;
  const creationFailed = company.link?.provisioning_status === "CREATION_FAILED";
  const [openTab, setOpenTab] = useState<"manual" | "existing">("manual");

  const manualPrefill: Partial<SubaccountCreatePayload> = company.billing_profile
    ? {
        name: company.billing_profile.legal_name,
        email: company.billing_profile.billing_email,
        cpfCnpj: company.billing_profile.cnpj,
        companyType: company.billing_profile.company_type as SubaccountCreatePayload["companyType"],
        mobilePhone: company.billing_profile.mobile_phone,
        incomeValue: company.billing_profile.income_value,
        address: company.billing_profile.address,
        addressNumber: company.billing_profile.address_number,
        complement: company.billing_profile.complement ?? "",
        province: company.billing_profile.province,
        postalCode: company.billing_profile.postal_code,
        site: company.billing_profile.site ?? "",
      }
    : {
        name: company.name,
        cpfCnpj: company.cnpj ?? "",
        email: company.owner_email,
      };

  const usedPercent = company.used_percent ? Number(company.used_percent) : 0;
  const quotaPercent = company.link?.split_quota_percent
    ? Number(company.link.split_quota_percent)
    : null;

  return (
    <div className={styles.panel}>
      <div className={styles.breadcrumb}>
        Empresas / <span style={{ color: "var(--db-text-primary)" }}>{company.name}</span>
      </div>

      <div className={styles.header}>
        <h1 className={styles.name}>{company.name}</h1>
        <div className={styles.meta}>
          {company.owner_name} · {company.owner_email}
          {company.cnpj ? ` · CNPJ ${company.cnpj}` : ""}
        </div>
      </div>

      <div className={styles.blocks}>
        <div className={styles.block}>
          <div className={styles.blockTitle}>Meio de pagamento</div>
          {hasPaymentMethod ? (
            <div className={styles.blockBody}>
              <div>
                <span className={styles.fieldLabel}>subconta</span>{" "}
                <span className={styles.mono}>{company.link!.asaas_account_id}</span>
              </div>
              <div>
                <span className={styles.fieldLabel}>wallet</span>{" "}
                <span className={styles.mono}>{company.link!.wallet_id ?? "—"}</span>
              </div>
              <div>
                <Badge tone={company.link!.approval_status === "APPROVED" ? "green" : "amber"}>
                  {company.link!.onboarding_status ?? "—"} / {company.link!.approval_status ?? "—"}
                </Badge>
              </div>
            </div>
          ) : (
            <div className={styles.blockBody}>
              <p className={styles.emptyHint}>
                {creationFailed
                  ? "Uma tentativa anterior de abrir a subconta falhou (veja o erro abaixo). Corrija os dados e tente de novo."
                  : "Esta empresa ainda não tem meio de pagamento configurado."}
              </p>

              <div className={styles.toggleRow}>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${openTab === "manual" ? styles.toggleBtnActive : ""}`}
                  onClick={() => setOpenTab("manual")}
                >
                  abrir subconta nova
                </button>
                <button
                  type="button"
                  className={`${styles.toggleBtn} ${openTab === "existing" ? styles.toggleBtnActive : ""}`}
                  onClick={() => setOpenTab("existing")}
                >
                  vincular subconta existente
                </button>
              </div>

              {openTab === "manual" ? (
                <ManualSubaccountForm
                  companyId={company.id}
                  prefill={manualPrefill}
                  initialError={creationFailed ? (company.link?.last_error ?? null) : null}
                />
              ) : (
                <form action={linkFormAction} className={styles.blockBody}>
                  <input
                    className={styles.input}
                    name="asaas_account_id"
                    placeholder="id da subconta Asaas existente"
                  />
                  {linkState?.error && <p className={styles.error}>{linkState.error}</p>}
                  <Button type="submit" disabled={linkPending}>
                    {linkPending ? "Vinculando…" : "Configurar meio de pagamento"}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>

        {hasPaymentMethod && (
          <div className={styles.block}>
            <div className={styles.blockTitle}>Cota de split</div>
            <div className={styles.blockBody}>
              <div className={styles.quotaBar}>
                <div
                  className={styles.quotaBarFill}
                  style={{
                    width: `${quotaPercent ? Math.min(100, (usedPercent / quotaPercent) * 100) : usedPercent}%`,
                  }}
                />
              </div>
              <div className={styles.quotaLabel}>
                {usedPercent}% em uso {quotaPercent !== null ? `de ${quotaPercent}%` : "(sem teto)"}
              </div>
              <form action={quotaFormAction} className={styles.inlineForm}>
                <input
                  className={styles.input}
                  name="split_quota_percent"
                  placeholder="ex: 30.00"
                  defaultValue={company.link?.split_quota_percent ?? ""}
                />
                {quotaState?.error && <p className={styles.error}>{quotaState.error}</p>}
                <Button type="submit" variant="outline" disabled={quotaPending}>
                  {quotaPending ? "Salvando…" : "Salvar cota"}
                </Button>
              </form>
            </div>
          </div>
        )}

        {hasPaymentMethod && (
          <div className={styles.block}>
            <div className={styles.blockTitle}>Regras de split</div>
            <div className={styles.blockBody}>
              {company.split_rules.length === 0 ? (
                <p className={styles.emptyHint}>Nenhuma regra de split cadastrada.</p>
              ) : (
                <TableList
                  columns="1.4fr .8fr .8fr .6fr"
                  header={["wallet", "tipo", "valor", "status"]}
                  rows={company.split_rules.map((r) => [
                    <span key="wallet" className={styles.mono}>
                      {r.walletId ?? r.wallet_id}
                    </span>,
                    r.type,
                    r.type === "PERCENTAGE" ? `${r.value}%` : `R$ ${r.value}`,
                    <Badge key="status" tone={r.active ? "green" : "neutral"}>
                      {r.active ? "ativa" : "inativa"}
                    </Badge>,
                  ])}
                />
              )}
            </div>
          </div>
        )}

        <div className={styles.block}>
          <div className={styles.blockTitle}>Features</div>
          <div className={styles.blockBody}>
            {Object.keys(FEATURE_LABELS).map((code) => {
              const feature = features.find((f) => f.feature_code === code);
              return (
                <FeatureRow
                  key={code}
                  companyId={company.id}
                  featureCode={code}
                  label={FEATURE_LABELS[code]}
                  feature={feature}
                  disabled={!hasPaymentMethod}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  companyId,
  featureCode,
  label,
  feature,
  disabled,
}: {
  companyId: string;
  featureCode: string;
  label: string;
  feature: AdminCompanyFeature | undefined;
  disabled: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleToggle(action: (companyId: string, featureCode: string) => Promise<ActionState>) {
    setPending(true);
    setError(null);
    const result = await action(companyId, featureCode);
    setPending(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const isActive = feature?.status === "active";
  const tone = feature?.status === "active" ? "green" : feature?.status === "error" ? "pink" : "neutral";

  return (
    <div className={styles.featureRow}>
      <div>
        <div className={styles.fieldLabel}>{label}</div>
        <Badge tone={tone}>{feature?.status ?? "não configurada"}</Badge>
        {feature?.last_error && <p className={styles.error}>{feature.last_error}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </div>
      {isActive ? (
        <Button
          variant="danger"
          disabled={pending}
          onClick={() => handleToggle(disableFeatureAction)}
        >
          {pending ? "Desativando…" : "Desativar"}
        </Button>
      ) : (
        <Button
          disabled={disabled || pending}
          title={disabled ? "Configure o meio de pagamento primeiro" : undefined}
          onClick={() => handleToggle(enableFeatureAction)}
        >
          {pending ? "Ativando…" : "Ativar"}
        </Button>
      )}
    </div>
  );
}

function TableList({
  columns,
  header,
  rows,
}: {
  columns: string;
  header: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div
      style={{
        background: "var(--admin-card)",
        border: "1px solid var(--admin-border)",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: columns,
          gap: 12,
          padding: "10px 14px",
          font: "500 10px 'Geist Mono', monospace",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--db-text-muted)",
          borderBottom: "1px solid var(--admin-border)",
        }}
      >
        {header.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: columns,
            gap: 12,
            padding: "12px 14px",
            fontSize: 13.5,
            borderBottom: i === rows.length - 1 ? "none" : "1px solid rgba(255,255,255,.05)",
            alignItems: "center",
          }}
        >
          {row.map((cell, j) => (
            <span key={j}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  );
}
