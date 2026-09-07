"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/admin/ui/Badge/Badge";
import { formatDate } from "@/lib/admin/format";
import { deriveRecebimentosView } from "@/lib/portal/recebimentos-state";
import type {
  RecebimentosStatus,
  SubaccountOnboarding,
  SubaccountStatusRead,
} from "@/lib/portal/types";
import CommercialInfoForm from "./CommercialInfoForm";
import DocumentUploader from "./DocumentUploader";
import styles from "./Recebimentos.module.scss";

const POLL_MS = 15_000;

type Props = {
  companyName: string;
  onboardingRequired: boolean;
  subaccount: SubaccountStatusRead | null;
  onboarding: SubaccountOnboarding | null;
};

function readoutTone(value: string): string {
  const v = value.toUpperCase();
  if (/APPROVED|PROVISIONED|OK/.test(v)) return styles.toneGreen;
  if (/PENDING|AWAITING|REVIEW/.test(v)) return styles.toneAmber;
  if (/REJECTED|FAILED|EXPIRED|RESTRICTED|CLOSED/.test(v)) return styles.tonePink;
  if (v === "—" || v === "") return styles.toneMuted;
  return "";
}

export default function RecebimentosClient({
  companyName,
  onboardingRequired,
  subaccount: initialSubaccount,
  onboarding: initialOnboarding,
}: Props) {
  const router = useRouter();
  const [subaccount, setSubaccount] = useState(initialSubaccount);
  const [onboarding, setOnboarding] = useState(initialOnboarding);
  const [gated, setGated] = useState(onboardingRequired);
  const [refreshing, setRefreshing] = useState(false);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [resend, setResend] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const wasGated = useRef(onboardingRequired);

  const view = deriveRecebimentosView(subaccount, onboarding);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/portal/recebimentos/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as RecebimentosStatus;
      setSubaccount(data.subaccount_status);
      setOnboarding(data.onboarding);
      setGated(data.onboarding_required);
      setCheckedAt(new Date());
      // Gate just lifted (or dropped): re-render the layout so the nav unlocks.
      if (wasGated.current !== data.onboarding_required) {
        wasGated.current = data.onboarding_required;
        router.refresh();
      }
    } finally {
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    if (!view.polling) return;
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [view.polling, refresh]);

  async function onResend() {
    if (resend === "sending" || resend === "sent") return;
    if (!window.confirm("Reenviar o e-mail de ativação da Asaas? O reenvio é permitido uma vez.")) {
      return;
    }
    setResend("sending");
    try {
      const res = await fetch("/api/portal/recebimentos/resend-activation", { method: "POST" });
      setResend(res.ok ? "sent" : "error");
    } catch {
      setResend("error");
    }
  }

  const pendingDocs = onboarding?.pending_documents ?? [];
  const showRefreshToolbar = !["not_provisioned", "APPROVED", "CREATION_FAILED", "CLOSED"].includes(
    view.state
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.kicker}>conta de recebimentos · subconta asaas</div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Recebimentos</h1>
            <Badge tone={view.badgeTone} size="md">
              {view.badgeLabel}
            </Badge>
          </div>
        </div>
      </header>

      {gated && (
        <div className={styles.gateBanner}>
          <span className={styles.gateTag}>portal bloqueado</span>
          <span>
            Conclua a verificação da sua conta de recebimentos para liberar projetos, orçamentos e
            faturas.
          </span>
        </div>
      )}

      <p className={styles.lede}>{view.lede}</p>

      {showRefreshToolbar && (
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.btnSolid}
            onClick={refresh}
            disabled={refreshing}
          >
            {refreshing ? "Atualizando…" : "Atualizar status"}
          </button>
          <span className={styles.toolbarNote}>
            {checkedAt
              ? `última verificação às ${checkedAt.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : view.polling
                ? `verificando automaticamente a cada ${POLL_MS / 1000}s`
                : ""}
          </span>
        </div>
      )}

      <ol className={styles.stepper}>
        {view.steps.map((step, i) => (
          <li key={step.label} className={styles.step} data-status={step.status}>
            <span className={styles.stepNum}>passo {i + 1}</span>
            <span className={styles.stepLabel}>{step.label}</span>
            <span className={styles.stepTag}>{step.tag}</span>
            <span className={styles.stepBar} aria-hidden="true">
              <i />
            </span>
          </li>
        ))}
      </ol>

      <div className={styles.layout}>
        <div className={styles.main}>
          {view.state === "not_provisioned" && (
            <div className={styles.card}>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>
                  Sua conta de recebimentos será criada após a confirmação do primeiro pagamento
                </div>
                <p className={styles.cardText}>
                  Nenhuma ação sua é necessária agora. Assim que a primeira fatura for confirmada,
                  criamos a conta e avisamos por e-mail.
                </p>
              </div>
            </div>
          )}

          {view.state === "AWAITING_ONBOARDING" && (
            <div className={styles.card}>
              <div className={styles.cardBody}>
                <div className={styles.spinnerRow}>
                  <span className={styles.spinner} aria-hidden="true" />
                  <div>
                    <div className={styles.cardTitle}>
                      Estamos preparando sua conta de recebimentos
                    </div>
                    <p className={styles.cardText}>
                      Isso leva alguns segundos. Verificamos o status automaticamente a cada{" "}
                      {POLL_MS / 1000}s.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view.state === "UNDER_REVIEW" && (
            <div className={`${styles.card} ${styles.cardAmber}`}>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>Seus dados estão em análise pela Asaas</div>
                <p className={styles.cardText}>
                  Isso pode levar até 48 horas. Avisaremos por e-mail assim que a conta for aprovada
                  — você não precisa fazer nada agora.
                </p>
              </div>
            </div>
          )}

          {(view.state === "PENDING_DOCUMENTS" || view.state === "REJECTED") && (
            <>
              {view.state === "REJECTED" && (
                <div className={`${styles.card} ${styles.cardPink}`}>
                  <div className={styles.cardBody}>
                    <div className={styles.cardTitle}>Um documento não foi aceito</div>
                    {subaccount?.last_error && (
                      <div className={styles.reason}>motivo informado: {subaccount.last_error}</div>
                    )}
                    <p className={styles.cardText}>
                      Reenvie o documento solicitado ou continue no ambiente da Asaas para refazer a
                      conferência.
                    </p>
                  </div>
                </div>
              )}

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  Documentos pendentes
                  <span className={styles.cardHeadNote}>
                    pdf, jpg, png ou webp · até 10 mb
                  </span>
                </div>
                <div className={styles.docList}>
                  {pendingDocs.length === 0 && (
                    <div className={styles.cardBody}>
                      <p className={styles.cardText}>
                        Nenhum documento pendente no momento. Use “Atualizar status” para
                        sincronizar com a Asaas.
                      </p>
                    </div>
                  )}
                  {pendingDocs.map((doc) => (
                    <div key={doc.id} className={styles.docItem}>
                      <div className={styles.docMetaLine}>
                        {doc.type.toLowerCase()} · {doc.id}
                      </div>
                      <div className={styles.docTitle}>{doc.title}</div>
                      {doc.onboardingUrl ? (
                        <a
                          className={styles.btnSolid}
                          href={doc.onboardingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Continuar no Asaas ↗
                        </a>
                      ) : (
                        <DocumentUploader groupId={doc.id} onUploaded={refresh} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {onboarding?.onboarding_url && (
                <a
                  className={styles.btnOutline}
                  href={onboarding.onboarding_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Continuar no Asaas ↗
                </a>
              )}
            </>
          )}

          {view.state === "APPROVED" && (
            <div className={`${styles.card} ${styles.cardGreen}`}>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>
                  <span className={styles.checkDot} aria-hidden="true">
                    ✓
                  </span>
                  Conta de recebimentos aprovada
                </div>
                <p className={styles.cardText}>
                  Tudo liberado. Seus recebimentos já são processados nesta conta e o portal está
                  desbloqueado.
                </p>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryCell}>
                    <div className={styles.summaryKey}>aprovação</div>
                    <div className={styles.summaryVal}>
                      {subaccount?.approval_status ?? "APPROVED"}
                    </div>
                  </div>
                  <div className={styles.summaryCell}>
                    <div className={styles.summaryKey}>provisionamento</div>
                    <div className={styles.summaryVal}>
                      {subaccount?.provisioning_status ?? "PROVISIONED"}
                    </div>
                  </div>
                  <div className={styles.summaryCell}>
                    <div className={styles.summaryKey}>dados comerciais</div>
                    <div className={styles.summaryVal}>
                      {subaccount?.commercial_info_status ?? "válidos"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view.state === "COMMERCIAL_INFO_EXPIRING" && (
            <>
              <div className={styles.amberBanner}>
                <span className={styles.amberTag}>prazo</span>
                <span>
                  Confirme seus dados comerciais
                  {view.commercialExpiresAt ? ` até ${formatDate(view.commercialExpiresAt)}` : ""}{" "}
                  para manter os recebimentos ativos.
                </span>
              </div>
              <CommercialInfoForm expired={false} onConfirmed={refresh} />
            </>
          )}

          {view.state === "COMMERCIAL_INFO_EXPIRED" && (
            <>
              <div className={styles.redBanner}>
                <span className={styles.redTag}>suspenso</span>
                <span>
                  Seus dados comerciais expiraram. Recebimentos suspensos até a regularização.
                </span>
              </div>
              <CommercialInfoForm expired onConfirmed={refresh} />
            </>
          )}

          {view.state === "CREATION_FAILED" && (
            <div className={`${styles.card} ${styles.cardPink}`}>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>
                  Houve um problema ao criar sua conta de recebimentos
                </div>
                <p className={styles.cardText}>
                  Nossa equipe já foi avisada e está tratando o caso. Nenhuma ação sua é necessária —
                  avisaremos por e-mail quando estiver resolvido.
                </p>
                {subaccount?.last_error && (
                  <div className={styles.reason}>detalhe: {subaccount.last_error}</div>
                )}
              </div>
            </div>
          )}

          {view.state === "CLOSED" && (
            <div className={styles.card}>
              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>Sua conta de recebimentos foi encerrada</div>
                <p className={styles.cardText}>
                  Para reabrir ou entender o encerramento, fale com o suporte da DevButter.
                </p>
                <a className={styles.btnOutline} href="mailto:contact@devbutter.tech">
                  Falar com o suporte
                </a>
              </div>
            </div>
          )}

          {view.showResend && (
            <div className={styles.resendRow}>
              <span>
                Não recebeu o e-mail de ativação da Asaas? O reenvio é permitido uma vez.
              </span>
              {resend === "sent" ? (
                <span className={styles.okText}>E-mail reenviado.</span>
              ) : (
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={onResend}
                  disabled={resend === "sending"}
                >
                  {resend === "sending" ? "Reenviando…" : "Reenviar link de ativação"}
                </button>
              )}
              {resend === "error" && (
                <span className={styles.errorText}>Não foi possível reenviar agora.</span>
              )}
            </div>
          )}
        </div>

        <aside className={styles.aside}>
          <div className={styles.card}>
            <div className={styles.cardHead}>status da subconta</div>
            <div className={styles.readout}>
              {[
                ["provisioning", subaccount?.provisioning_status ?? "—"],
                ["onboarding", onboarding?.state ?? subaccount?.onboarding_status ?? "—"],
                ["aprovação", subaccount?.approval_status ?? "—"],
                ["dados comerciais", onboarding?.commercialInfo ?? "—"],
                ["conta bancária", onboarding?.bankAccountInfo ?? "—"],
                ["documentação", onboarding?.documentation ?? "—"],
              ].map(([k, v]) => (
                <div key={k} className={styles.readoutRow}>
                  <span className={styles.readoutKey}>{k}</span>
                  <span className={`${styles.readoutVal} ${readoutTone(String(v))}`}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`${styles.card} ${styles.cardTeal}`}>
            <div className={styles.cardBody}>
              <div className={styles.kicker}>por que pedimos isso</div>
              <p className={styles.cardText}>
                A verificação é exigida pela instituição de pagamento para liberar recebimentos em
                nome de {companyName}. Nós não armazenamos seus documentos — eles vão direto para o
                ambiente seguro da Asaas.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
