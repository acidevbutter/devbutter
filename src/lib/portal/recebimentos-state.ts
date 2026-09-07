// Pure derivation for the Recebimentos screen: turns the /accounts/me
// `subaccount_status` + GET /accounts/subaccount/onboarding payloads into the
// single UI state (and its copy) from portal-recebimentos-onboarding.md §4.
// No "server-only" import — the client component and unit tests both use it.

import type { BadgeTone } from "@/lib/admin/format";
import type {
  RecebimentosUiState,
  SubaccountOnboarding,
  SubaccountStatusRead,
} from "./types";

export type StepStatus = "none" | "pending" | "action" | "review" | "rejected" | "ok";

export interface RecebimentosStep {
  label: string;
  status: StepStatus;
  tag: string;
}

export interface RecebimentosView {
  state: RecebimentosUiState;
  /** Whether the rest of the portal is blocked in this state. */
  gated: boolean;
  badgeTone: BadgeTone;
  badgeLabel: string;
  lede: string;
  steps: RecebimentosStep[];
  /** Show the discreet "Reenviar link de ativação" row. */
  showResend: boolean;
  /** Show the commercial-info form (expiration states only). */
  showCommercialForm: boolean;
  commercialExpiresAt: string | null;
  /** Poll GET status while true (state still settling). */
  polling: boolean;
}

const STEP_LABELS = ["Dados comerciais", "Conta bancária", "Documentos", "Aprovação geral"] as const;

const STEP_TAG: Record<StepStatus, string> = {
  none: "não iniciado",
  pending: "pendente",
  action: "ação necessária",
  review: "em análise",
  rejected: "recusado",
  ok: "concluído",
};

// Per-state fallback step shapes, mirroring the approved design copy
// (Recebimentos.dc.html). Used when the onboarding payload has no per-dimension
// values to derive from.
const STATE_STEPS: Record<RecebimentosUiState, StepStatus[]> = {
  not_provisioned: ["none", "none", "none", "none"],
  AWAITING_ONBOARDING: ["pending", "pending", "pending", "pending"],
  PENDING_DOCUMENTS: ["ok", "ok", "action", "pending"],
  UNDER_REVIEW: ["ok", "ok", "ok", "review"],
  REJECTED: ["ok", "ok", "rejected", "rejected"],
  APPROVED: ["ok", "ok", "ok", "ok"],
  COMMERCIAL_INFO_EXPIRING: ["action", "ok", "ok", "ok"],
  COMMERCIAL_INFO_EXPIRED: ["rejected", "ok", "ok", "pending"],
  CREATION_FAILED: ["none", "none", "none", "none"],
  CLOSED: ["none", "none", "none", "none"],
};

const STATE_META: Record<
  RecebimentosUiState,
  { gated: boolean; badgeTone: BadgeTone; badgeLabel: string; lede: string }
> = {
  not_provisioned: {
    gated: false,
    badgeTone: "neutral",
    badgeLabel: "PENDING",
    lede: "Sua conta de recebimentos ainda não foi criada. Ela nasce automaticamente quando o primeiro pagamento for confirmado.",
  },
  AWAITING_ONBOARDING: {
    gated: true,
    badgeTone: "neutral",
    badgeLabel: "PENDING",
    lede: "Sua conta foi criada e estamos sincronizando com a instituição de pagamento. Em instantes você poderá enviar os documentos.",
  },
  PENDING_DOCUMENTS: {
    gated: true,
    badgeTone: "pink",
    badgeLabel: "PENDING",
    lede: "Faltam documentos para liberar seus recebimentos. Você pode concluir no ambiente da Asaas ou enviar o arquivo por aqui.",
  },
  UNDER_REVIEW: {
    gated: true,
    badgeTone: "amber",
    badgeLabel: "AWAITING_APPROVAL",
    lede: "Tudo enviado. A Asaas está conferindo seus dados e documentos — nada mais é necessário da sua parte agora.",
  },
  REJECTED: {
    gated: true,
    badgeTone: "pink",
    badgeLabel: "REJECTED",
    lede: "Um dos documentos não foi aceito. Reenvie o arquivo para retomar a aprovação da conta.",
  },
  APPROVED: {
    gated: false,
    badgeTone: "green",
    badgeLabel: "APPROVED",
    lede: "Sua conta de recebimentos está ativa. Esta tela agora é só um resumo — o portal está liberado.",
  },
  COMMERCIAL_INFO_EXPIRING: {
    gated: false,
    badgeTone: "amber",
    badgeLabel: "APPROVED",
    lede: "Seus recebimentos seguem ativos, mas os dados comerciais precisam ser confirmados antes do prazo.",
  },
  COMMERCIAL_INFO_EXPIRED: {
    gated: true,
    badgeTone: "pink",
    badgeLabel: "PENDING",
    lede: "Os dados comerciais expiraram e os recebimentos estão suspensos. Regularize para reativar a conta.",
  },
  CREATION_FAILED: {
    gated: true,
    badgeTone: "pink",
    badgeLabel: "PENDING",
    lede: "Não conseguimos criar sua conta de recebimentos. O caso já está com a nossa equipe.",
  },
  CLOSED: {
    gated: true,
    badgeTone: "neutral",
    badgeLabel: "PENDING",
    lede: "Esta conta de recebimentos foi encerrada. Fale com o suporte para entender os próximos passos.",
  },
};

function normalize(value: string | null | undefined): string {
  return (value ?? "").toString().trim().toUpperCase();
}

function isExpired(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && t < Date.now();
}

/** Map an Asaas dimension value ("PENDING"/"APPROVED"/...) to a step status. */
function dimensionStatus(value: string | null | undefined): StepStatus {
  const v = normalize(value);
  if (!v || v === "NONE") return "none";
  if (v === "APPROVED" || v === "OK" || v === "DONE" || v === "COMPLETED") return "ok";
  if (v === "REJECTED" || v === "FAILED" || v === "EXPIRED") return "rejected";
  if (v === "AWAITING_APPROVAL" || v === "UNDER_REVIEW" || v === "IN_REVIEW") return "review";
  return "pending";
}

export function deriveRecebimentosState(
  subaccount: SubaccountStatusRead | null,
  onboarding: SubaccountOnboarding | null
): RecebimentosUiState {
  const provisioning = normalize(subaccount?.provisioning_status);
  const approval = normalize(subaccount?.approval_status);
  const onboardingState = normalize(onboarding?.state ?? subaccount?.onboarding_status);
  const commercialInfoStatus = normalize(subaccount?.commercial_info_status);
  const docs = onboarding?.pending_documents ?? [];
  const hasRejectedDoc = docs.some((d) => normalize(d.status) === "REJECTED");

  if (provisioning === "CREATION_FAILED") return "CREATION_FAILED";
  if (provisioning === "CLOSED") return "CLOSED";

  const commercialExpired =
    isExpired(subaccount?.commercial_info_expires_at) &&
    commercialInfoStatus !== "" &&
    commercialInfoStatus !== "OK" &&
    commercialInfoStatus !== "APPROVED";

  if (commercialInfoStatus === "EXPIRED" || provisioning === "RESTRICTED" || commercialExpired) {
    return "COMMERCIAL_INFO_EXPIRED";
  }

  if (
    subaccount?.commercial_info_expires_at &&
    !isExpired(subaccount.commercial_info_expires_at) &&
    (approval === "APPROVED" || onboardingState === "APPROVED")
  ) {
    return "COMMERCIAL_INFO_EXPIRING";
  }

  if (approval === "APPROVED" || onboardingState === "APPROVED") return "APPROVED";
  if (approval === "REJECTED" || onboardingState === "REJECTED" || hasRejectedDoc) return "REJECTED";
  if (approval === "AWAITING_APPROVAL" || onboardingState === "UNDER_REVIEW") return "UNDER_REVIEW";
  if (docs.length > 0 || onboardingState === "PENDING_DOCUMENTS") return "PENDING_DOCUMENTS";

  if (
    !subaccount ||
    provisioning === "" ||
    provisioning === "NONE" ||
    onboardingState === "NOT_PROVISIONED"
  ) {
    return onboardingState === "AWAITING_ONBOARDING" ? "AWAITING_ONBOARDING" : "not_provisioned";
  }

  return "AWAITING_ONBOARDING";
}

export function deriveRecebimentosView(
  subaccount: SubaccountStatusRead | null,
  onboarding: SubaccountOnboarding | null
): RecebimentosView {
  const state = deriveRecebimentosState(subaccount, onboarding);
  const meta = STATE_META[state];

  const hasDimensions =
    !!onboarding &&
    [onboarding.commercialInfo, onboarding.bankAccountInfo, onboarding.documentation, onboarding.general].some(
      (d) => normalize(d) !== ""
    );

  const stepStatuses: StepStatus[] = hasDimensions
    ? [
        dimensionStatus(onboarding!.commercialInfo),
        dimensionStatus(onboarding!.bankAccountInfo),
        dimensionStatus(onboarding!.documentation),
        dimensionStatus(onboarding!.general),
      ]
    : STATE_STEPS[state];

  // In PENDING_DOCUMENTS a "pending" documents dimension reads better as
  // "ação necessária".
  if (state === "PENDING_DOCUMENTS" && stepStatuses[2] === "pending") stepStatuses[2] = "action";

  return {
    state,
    gated: meta.gated,
    badgeTone: meta.badgeTone,
    badgeLabel: meta.badgeLabel,
    lede: meta.lede,
    steps: stepStatuses.map((status, i) => ({
      label: STEP_LABELS[i],
      status,
      tag: STEP_TAG[status],
    })),
    showResend: ["AWAITING_ONBOARDING", "PENDING_DOCUMENTS", "REJECTED", "UNDER_REVIEW"].includes(state),
    showCommercialForm: state === "COMMERCIAL_INFO_EXPIRING" || state === "COMMERCIAL_INFO_EXPIRED",
    commercialExpiresAt: subaccount?.commercial_info_expires_at ?? null,
    polling: state === "AWAITING_ONBOARDING",
  };
}
